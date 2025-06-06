// src/core/game/InvestmentEngine.ts - COMPLETED Investment Processing
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

/**
 * The InvestmentEngine processes investment payoffs, applying their KPI effects to team data.
 * It handles unspent budget logic and permanent KPI adjustments resulting from investments.
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
            console.log(`[InvestmentEngine] Stored ${adjustmentsToInsert.length} permanent adjustments for team ${teamId}`);
        }
    }

    /**
     * Processes investment payoffs for a given round based on team decisions.
     * This method is called when advancing past a 'payoff' phase's last slide.
     */
    public async processInvestmentPayoffs(roundNumber: 1 | 2 | 3, currentPhaseId: string | null): Promise<void> {
        if (!this.currentDbSession?.id || !this.gameStructure || !this.teams.length) {
            console.warn(`[InvestmentEngine] Skipping investment payoff processing due to invalid state for round ${roundNumber}.`);
            return;
        }

        console.log(`[InvestmentEngine] Processing investment payoffs for round ${roundNumber}, phase: ${currentPhaseId}`);

        const payoffKey = `rd${roundNumber}-payoff`;
        const payoffs = allInvestmentPayoffsData[payoffKey] || [];

        if (payoffs.length === 0) {
            console.warn(`[InvestmentEngine] No payoffs found for ${payoffKey}`);
            return;
        }

        try {
            let totalInvestmentsProcessed = 0;
            let totalEffectsApplied = 0;

            for (const team of this.teams) {
                console.log(`[InvestmentEngine] Processing payoffs for team: ${team.name} (${team.id})`);

                const teamKpis = await this.ensureTeamRoundData(team.id, roundNumber, this.currentDbSession.id);
                const investPhaseId = `rd${roundNumber}-invest`;
                const investmentDecision = this.teamDecisions[team.id]?.[investPhaseId];

                if (!investmentDecision) {
                    console.log(`[InvestmentEngine] No investment decision found for team ${team.name} in ${investPhaseId}`);
                    // Still process unspent budget for teams with no investments
                    if (roundNumber === 1) {
                        const budget = this.gameStructure.investment_phase_budgets['rd1-invest'] || 0;
                        if (budget > 0) {
                            const unspentEffect: KpiEffect[] = [{
                                kpi: 'cost',
                                change_value: -budget,
                                timing: 'immediate',
                                description: 'RD-1 Unspent Budget Cost Reduction (No Investments)'
                            }];

                            const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, unspentEffect);
                            await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                            console.log(`[InvestmentEngine] Team ${team.name}: Applied full budget ${budget} as cost reduction (no investments)`);
                        }
                    }
                    continue;
                }

                const selectedInvestmentIds = investmentDecision.selected_investment_ids || [];
                console.log(`[InvestmentEngine] Team ${team.name} selected ${selectedInvestmentIds.length} investments:`, selectedInvestmentIds);

                const effectsToApply: KpiEffect[] = [];

                // Apply investment payoffs
                selectedInvestmentIds.forEach(investId => {
                    const payoff = payoffs.find(p => p.investment_option_id === investId);
                    if (payoff) {
                        console.log(`[InvestmentEngine] Applying payoff for investment ${investId}:`, payoff.name);
                        effectsToApply.push(...payoff.effects);
                        totalInvestmentsProcessed++;
                    } else {
                        console.warn(`[InvestmentEngine] No payoff found for investment ${investId}`);
                    }
                });

                // Handle unspent budget for RD1 only
                if (roundNumber === 1) {
                    const budget = this.gameStructure.investment_phase_budgets['rd1-invest'] || 0;
                    const spent = investmentDecision.total_spent_budget ?? 0;
                    const unspent = budget - spent;

                    if (unspent > 0) {
                        effectsToApply.push({
                            kpi: 'cost',
                            change_value: -unspent,
                            timing: 'immediate',
                            description: 'RD-1 Unspent Budget Cost Reduction'
                        });
                        console.log(`[InvestmentEngine] Team ${team.name}: Applied ${unspent} unspent budget reduction for RD1.`);
                    }
                }

                // Apply all effects if any exist
                if (effectsToApply.length > 0) {
                    console.log(`[InvestmentEngine] Applying ${effectsToApply.length} effects to team ${team.name}`);

                    // Apply effects to KPIs
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);

                    // Calculate final KPIs (revenue, net income, net margin)
                    const finalKpis = KpiCalculations.calculateFinalKpis(updatedKpis);
                    const completeKpis = { ...updatedKpis, ...finalKpis };

                    // Store permanent adjustments for future rounds
                    await this.storePermanentAdjustments(
                        team.id,
                        this.currentDbSession.id,
                        effectsToApply,
                        `RD${roundNumber} Investment Payoff`
                    );

                    // Update KPIs in database
                    await db.kpis.upsert({...completeKpis, id: teamKpis.id});

                    totalEffectsApplied += effectsToApply.length;
                    console.log(`[InvestmentEngine] Team ${team.name}: Successfully applied investment payoffs with final calculations`);
                } else {
                    console.log(`[InvestmentEngine] Team ${team.name}: No investment effects to apply`);
                }
            }

            console.log(`[InvestmentEngine] Payoff processing complete. Processed ${totalInvestmentsProcessed} investments with ${totalEffectsApplied} total effects.`);

            // Refresh team data to update UI
            await this.fetchTeamRoundDataFromHook(this.currentDbSession.id);
            console.log(`[InvestmentEngine] Successfully processed investment payoffs for round ${roundNumber} for all teams.`);

        } catch (err) {
            console.error(`[InvestmentEngine] Failed to process investment payoffs for round ${roundNumber}:`, err);
            throw err;
        }
    }

    /**
     * Processes double-down payoffs based on dice roll results
     */
    public async processDoubleDownPayoffs(
        teamId: string,
        diceRoll: number,
        doubleDownDecision: { investmentToSacrificeId: string; investmentToDoubleDownId: string }
    ): Promise<void> {
        if (!this.currentDbSession?.id || !this.gameStructure) {
            throw new Error("Invalid session state for double-down processing");
        }

        console.log(`[InvestmentEngine] Processing double-down for team ${teamId}, dice roll: ${diceRoll}`);

        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            throw new Error(`Team not found: ${teamId}`);
        }

        const teamKpis = await this.ensureTeamRoundData(teamId, 3, this.currentDbSession.id);

        // Get the original payoff for the investment being doubled down on
        const rd3Payoffs = allInvestmentPayoffsData['rd3-payoff'] || [];
        const originalPayoff = rd3Payoffs.find(p => p.investment_option_id === doubleDownDecision.investmentToDoubleDownId);

        if (!originalPayoff) {
            throw new Error(`No RD3 payoff found for investment ${doubleDownDecision.investmentToDoubleDownId}`);
        }

        let multiplier: number;
        let resultType: string;

        // Determine multiplier based on dice roll
        if (diceRoll === 6) {
            multiplier = 3; // Critical success: 3x payoff
            resultType = 'Critical Success';
        } else if (diceRoll >= 4) {
            multiplier = 2; // Success: 2x payoff
            resultType = 'Success';
        } else {
            multiplier = 0; // Failure: lose the investment entirely
            resultType = 'Failure';
        }

        console.log(`[InvestmentEngine] Double-down result: ${resultType} (${multiplier}x multiplier)`);

        // Apply the multiplier to the original payoff effects
        const doubleDownEffects: KpiEffect[] = originalPayoff.effects.map(effect => ({
            ...effect,
            change_value: effect.change_value * multiplier,
            description: `Double Down ${resultType}: ${effect.description}`
        }));

        if (doubleDownEffects.length > 0) {
            const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, doubleDownEffects);

            await this.storePermanentAdjustments(
                teamId,
                this.currentDbSession.id,
                doubleDownEffects,
                `Double Down ${resultType} (Dice: ${diceRoll})`
            );

            await db.kpis.upsert({...updatedKpis, id: teamKpis.id});

            console.log(`[InvestmentEngine] Double-down effects applied for team ${team.name}`);
        }

        // Record the double-down result
        await db.decisions.update(this.currentDbSession.id, teamId, 'dd-payoff', {
            double_down_result: {
                diceRoll,
                resultType,
                multiplier,
                originalInvestmentId: doubleDownDecision.investmentToDoubleDownId,
                sacrificedInvestmentId: doubleDownDecision.investmentToSacrificeId
            }
        });

        console.log(`[InvestmentEngine] Double-down processing complete for team ${team.name}`);
    }

    /**
     * Gets investment summary for a team and round
     */
    public getInvestmentSummary(teamId: string, roundNumber: 1 | 2 | 3): {
        selectedInvestments: string[];
        totalSpent: number;
        budget: number;
        unspentAmount: number;
    } {
        const investPhaseId = `rd${roundNumber}-invest`;
        const decision = this.teamDecisions[teamId]?.[investPhaseId];
        const budget = this.gameStructure?.investment_phase_budgets?.[investPhaseId] || 0;
        const totalSpent = decision?.total_spent_budget || 0;

        return {
            selectedInvestments: decision?.selected_investment_ids || [],
            totalSpent,
            budget,
            unspentAmount: Math.max(0, budget - totalSpent)
        };
    }
}
