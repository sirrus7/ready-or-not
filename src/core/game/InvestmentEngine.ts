// src/core/game/InvestmentEngine.ts - Implement InvestmentEngine class with investment logic

import {TeamRoundData, GameSession, Team, TeamDecision} from '@shared/types/database';
import {KpiEffect} from '@shared/types/game';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent'; // Import consolidated investment payoffs
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine'; // Assuming KpiCalculations is now here

// TODO: Implement InvestmentEngine class with investment payoff application logic.
// This file should define methods to:
// 1. Process investment payoffs for a given round based on team decisions.
// 2. Apply the KPI effects of these payoffs to team data.
// 3. Potentially handle double-down payoffs (this will also be called from DecisionEngine for the dice roll).

interface InvestmentEngineProps {
    currentDbSession: GameSession | null;
    gameStructure: any; // Use a broader type or specific parts of GameStructure needed
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

export class InvestmentEngine {
    private currentDbSession: GameSession | null;
    private gameStructure: any; // TODO: Refine this type as per actual usage
    private teams: Team[];
    private teamDecisions: Record<string, Record<string, TeamDecision>>;
    private teamRoundData: Record<string, Record<number, TeamRoundData>>;
    private fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    private setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;

    constructor(props: InvestmentEngineProps) {
        this.currentDbSession = props.currentDbSession;
        this.gameStructure = props.gameStructure;
        this.teams = props.teams;
        this.teamDecisions = props.teamDecisions;
        this.teamRoundData = props.teamRoundData;
        this.fetchTeamRoundDataFromHook = props.fetchTeamRoundDataFromHook;
        this.setTeamRoundDataDirectly = props.setTeamRoundDataDirectly;
    }

    // Helper to ensure team round data (copied from DecisionEngine / useGameProcessing)
    private async ensureTeamRoundData(
        teamId: string,
        roundNumber: 1 | 2 | 3,
        sessionId: string
    ): Promise<TeamRoundData> {
        if (!sessionId || sessionId === 'new') throw new Error("Invalid sessionId");

        const existingKpis = this.teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

        try {
            const existingData = await db.kpis.getForTeamRound(sessionId, teamId, roundNumber);
            if (existingData) {
                this.setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.log('[InvestmentEngine] No existing round data found, creating new');
        }

        const newRoundData = await KpiCalculations.createNewRoundData(
            sessionId,
            teamId,
            roundNumber,
            this.teamRoundData[teamId]
        );

        const adjustments = await db.adjustments.getBySession(sessionId);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);

        const insertedData = await db.kpis.create(adjustedData);
        this.setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        return insertedData as TeamRoundData;
    }

    // Helper to store permanent adjustments (copied from DecisionEngine / useGameProcessing)
    private async storePermanentAdjustments(
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        phaseSourceLabel: string
    ) {
        const adjustmentsToInsert = KpiCalculations.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            phaseSourceLabel
        );

        if (adjustmentsToInsert.length > 0) {
            await db.adjustments.create(adjustmentsToInsert);
        }
    }

    /**
     * Processes investment payoffs for a given round based on team decisions.
     * This logic is moved from `useGameProcessing.ts`.
     */
    public async processInvestmentPayoffs(roundNumber: 1 | 2 | 3, currentPhaseId: string | null): Promise<void> {
        if (!this.currentDbSession?.id || !this.teams.length) {
            console.warn(`[InvestmentEngine] Skipping investment payoff processing due to invalid state for round ${roundNumber}.`);
            return;
        }

        const payoffKey = `rd${roundNumber}-payoff`;
        const payoffs = allInvestmentPayoffsData[payoffKey] || []; // Use imported data

        try {
            for (const team of this.teams) {
                const teamKpis = await this.ensureTeamRoundData(team.id, roundNumber, this.currentDbSession.id);
                const investPhaseId = `rd${roundNumber}-invest`;
                const investmentDecision = this.teamDecisions[team.id]?.[investPhaseId];
                const selectedInvestmentIds = investmentDecision?.selected_investment_ids || [];

                const effectsToApply: KpiEffect[] = [];
                selectedInvestmentIds.forEach(investId => {
                    const payoff = payoffs.find(p => p.investment_option_id === investId);
                    if (payoff) effectsToApply.push(...payoff.effects);
                });

                // Handle unspent budget for RD1
                if (roundNumber === 1 && currentPhaseId === 'rd1-payoff') {
                    // TODO: Get investment budgets from GameStructure, not hardcoded.
                    const budget = this.gameStructure?.investment_phase_budgets['rd1-invest'] || 0; // Get from game structure
                    const spent = investmentDecision?.total_spent_budget ?? 0;
                    const unspent = budget - spent;
                    if (unspent > 0) {
                        effectsToApply.push({
                            kpi: 'cost',
                            change_value: -unspent,
                            timing: 'immediate',
                            description: 'RD-1 Unspent Budget Cost Reduction'
                        });
                    }
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    await this.storePermanentAdjustments(team.id, this.currentDbSession.id, effectsToApply,
                        `RD${roundNumber} Investment Payoff`);

                    await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                }
            }

            await this.fetchTeamRoundDataFromHook(this.currentDbSession.id);
            console.log(`[InvestmentEngine] Successfully processed investment payoffs for round ${roundNumber}.`);
        } catch (err) {
            console.error(`[InvestmentEngine] Failed to process investment payoffs for round ${roundNumber}:`, err);
            throw err;
        }
    }

    // TODO: Add public method for processing double-down payoffs, which would use allInvestmentPayoffsData['dd-payoff']
    // This might be called from DecisionEngine if DecisionEngine orchestrates the double-down dice roll.
}

// NOTE: The `useGameProcessing` hook at `src/core/game/useGameProcessing.ts` will need to be updated
// to instantiate and use this `InvestmentEngine` class instead of containing the logic itself.
// After implementing this class, you should remove the `processInvestmentPayoffsExecute`
// function from `useGameProcessing.ts` and modify `useGameProcessing` to use a `new InvestmentEngine(...)` instance.