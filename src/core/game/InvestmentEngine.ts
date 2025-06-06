// src/core/game/InvestmentEngine.ts
import {KpiEffect, TeamRoundData, GameSession, Team, TeamDecision, GameStructure} from '@shared/types';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';

interface InvestmentEngineProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

export class InvestmentEngine {
    private props: InvestmentEngineProps;

    constructor(props: InvestmentEngineProps) {
        this.props = props;
    }

    private async ensureTeamRoundData(teamId: string, roundNumber: 1 | 2 | 3): Promise<TeamRoundData> {
        const {currentDbSession, teamRoundData, setTeamRoundDataDirectly} = this.props;
        if (!currentDbSession?.id || currentDbSession.id === 'new') throw new Error("Invalid sessionId for KPI data.");

        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

        try {
            const existingData = await db.kpis.getForTeamRound(currentDbSession.id, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.log(`[InvestmentEngine] No existing round data found for team ${teamId} round ${roundNumber}, creating new.`);
        }

        const newRoundData = await KpiCalculations.createNewRoundData(currentDbSession.id, teamId, roundNumber, teamRoundData[teamId]);
        const adjustments = await db.adjustments.getBySession(currentDbSession.id);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);
        const insertedData = await db.kpis.create(adjustedData);

        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));
        return insertedData as TeamRoundData;
    }

    private async storePermanentAdjustments(teamId: string, sessionId: string, effects: KpiEffect[], sourceLabel: string) {
        const adjustmentsToInsert = KpiCalculations.createPermanentAdjustments(effects, sessionId, teamId, sourceLabel);
        if (adjustmentsToInsert.length > 0) {
            await db.adjustments.create(adjustmentsToInsert);
        }
    }

    // REFACTOR: Method signature simplified
    public async processInvestmentPayoffs(roundNumber: 1 | 2 | 3): Promise<void> {
        const {currentDbSession, gameStructure, teams, teamDecisions, fetchTeamRoundDataFromHook} = this.props;

        if (!currentDbSession?.id || !gameStructure || !teams.length) {
            console.warn(`[InvestmentEngine] Skipping investment payoff processing due to invalid state for round ${roundNumber}.`);
            return;
        }

        console.log(`[InvestmentEngine] Processing investment payoffs for round ${roundNumber}`);

        const payoffKey = `rd${roundNumber}-payoff`;
        const payoffs = allInvestmentPayoffsData[payoffKey] || [];
        if (payoffs.length === 0) {
            console.warn(`[InvestmentEngine] No payoffs found for ${payoffKey}`);
            return;
        }

        try {
            for (const team of teams) {
                const teamKpis = await this.ensureTeamRoundData(team.id, roundNumber);
                const investKey = `rd${roundNumber}-invest`;
                const investmentDecision = teamDecisions[team.id]?.[investKey];
                const effectsToApply: KpiEffect[] = [];

                if (investmentDecision) {
                    const selectedInvestmentIds = investmentDecision.selected_investment_ids || [];
                    selectedInvestmentIds.forEach(investId => {
                        const payoff = payoffs.find(p => p.investment_option_id === investId);
                        if (payoff) effectsToApply.push(...payoff.effects);
                    });
                }

                // Unspent budget for RD1 only
                if (roundNumber === 1) {
                    const budget = gameStructure.investment_phase_budgets['rd1-invest'] || 0;
                    const spent = investmentDecision?.total_spent_budget ?? 0;
                    const unspent = budget - spent;
                    if (unspent > 0) {
                        effectsToApply.push({
                            kpi: 'cost', change_value: -unspent, timing: 'immediate', description: 'RD-1 Unspent Budget'
                        });
                    }
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    const finalKpis = KpiCalculations.calculateFinalKpis(updatedKpis);
                    await this.storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply, `RD${roundNumber} Payoff`);
                    await db.kpis.upsert({...updatedKpis, ...finalKpis, id: teamKpis.id});
                }
            }
            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`[InvestmentEngine] Successfully processed investment payoffs for round ${roundNumber}.`);
        } catch (err) {
            console.error(`[InvestmentEngine] Failed to process investment payoffs for round ${roundNumber}:`, err);
            throw err;
        }
    }
}
