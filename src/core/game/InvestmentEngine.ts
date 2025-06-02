// src/core/game/InvestmentEngine.ts - Implement InvestmentEngine class with investment logic

import {KpiEffect, TeamRoundData, GameSession, Team, TeamDecision, GameStructure} from '@shared/types'; // Updated imports
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';

interface InvestmentEngineProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null; // Use GameStructure type
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>; // Passed by reference for internal mutation
    // Callbacks to update external state (used by useGameProcessing)
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

/**
 * The InvestmentEngine processes investment payoffs, applying their KPI effects to team data.
 * It also handles unspent budget logic and permanent KPI adjustments resulting from investments.
 */
export class InvestmentEngine {
    private currentDbSession: GameSession | null;
    private gameStructure: GameStructure | null;
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

    /**
     * Ensures that the TeamRoundData for a given team and round exists in the local state
     * (and DB if necessary), creating it with initial values if it doesn't.
     * This is a private helper method used by both DecisionEngine and InvestmentEngine.
     * @param teamId The ID of the team.
     * @param roundNumber The round number.
     * @param sessionId The ID of the current session.
     * @returns The TeamRoundData object for the specified team and round.
     * @private
     */
    private async ensureTeamRoundData(
        teamId: string,
        roundNumber: 1 | 2 | 3,
        sessionId: string
    ): Promise<TeamRoundData> {
        if (!sessionId || sessionId === 'new') throw new Error("Invalid sessionId for KPI data.");

        const existingKpis = this.teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

        // Try to fetch from database if not in local state
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
            console.log(`[InvestmentEngine] No existing round data found for team ${teamId} round ${roundNumber}, creating new.`);
        }

        // If not found, create new round data
        const newRoundData = await KpiCalculations.createNewRoundData(
            sessionId,
            teamId,
            roundNumber,
            this.teamRoundData[teamId]
        );

        // Apply permanent adjustments accumulated from previous rounds/decisions
        const adjustments = await db.adjustments.getBySession(sessionId);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);

        const insertedData = await db.kpis.create(adjustedData);
        this.setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        return insertedData as TeamRoundData;
    }

    /**
     * Stores permanent KPI adjustments in the database, to be applied in future rounds.
     * This is a private helper method used by both DecisionEngine and InvestmentEngine.
     * @param teamId The ID of the team.
     * @param sessionId The ID of the current session.
     * @param effects The KPI effects, which may include permanent effects.
     * @param phaseSourceLabel A label indicating the source of the adjustment (e.g., "RD1 Investment Payoff").
     * @private
     */
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
     * This method is called when advancing past a 'payoff' phase's last slide.
     * @param roundNumber The current round number (1, 2, or 3).
     * @param currentPhaseId The ID of the current payoff phase (e.g., 'rd1-payoff').
     * @returns A promise that resolves when all investment payoffs for the round have been processed.
     * @throws Error if any step of the processing fails.
     */
    public async processInvestmentPayoffs(roundNumber: 1 | 2 | 3, currentPhaseId: string | null): Promise<void> {
        if (!this.currentDbSession?.id || !this.gameStructure || !this.teams.length) {
            console.warn(`[InvestmentEngine] Skipping investment payoff processing due to invalid state for round ${roundNumber}.`);
            return;
        }

        console.log(`[InvestmentEngine] Processing investment payoffs for round ${roundNumber}.`);

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

                // Handle unspent budget for RD1 only, specifically at the rd1-payoff phase
                if (roundNumber === 1 && currentPhaseId === 'rd1-payoff') {
                    const budget = this.gameStructure.investment_phase_budgets['rd1-invest'];
                    const spent = investmentDecision?.total_spent_budget ?? 0;
                    const unspent = budget - spent;
                    if (unspent > 0) {
                        effectsToApply.push({
                            kpi: 'cost',
                            change_value: -unspent,
                            timing: 'immediate',
                            description: 'RD-1 Unspent Budget Cost Reduction'
                        });
                        console.log(`[InvestmentEngine] Team ${team.name}: Applied $${unspent} unspent budget reduction for RD1.`);
                    }
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    await this.storePermanentAdjustments(team.id, this.currentDbSession.id, effectsToApply,
                        `RD${roundNumber} Investment Payoff`);

                    await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                    console.log(`[InvestmentEngine] Team ${team.name}: KPIs updated for investment payoffs of Round ${roundNumber}.`);
                }
            }

            // After processing all teams, refetch the latest KPI data to update the UI
            await this.fetchTeamRoundDataFromHook(this.currentDbSession.id);
            console.log(`[InvestmentEngine] Successfully processed investment payoffs for round ${roundNumber} for all teams.`);
        } catch (err) {
            console.error(`[InvestmentEngine] Failed to process investment payoffs for round ${roundNumber}:`, err);
            throw err; // Re-throw to be caught by the caller (e.g., useGameProcessing)
        }
    }

    // TODO: Add public method for processing double-down payoffs, which would use allInvestmentPayoffsData['dd-payoff']
    // This might be called from DecisionEngine if DecisionEngine orchestrates the double-down dice roll.
}
