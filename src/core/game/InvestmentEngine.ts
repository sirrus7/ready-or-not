// src/core/game/InvestmentEngine.ts
// SIMPLIFIED: Uses KpiDataUtils instead of inheritance, all bugs fixed

import {
    GameSession,
    Team,
    TeamDecision,
    TeamRoundData,
    GameStructure,
    KpiEffect
} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {KpiDataUtils} from './KpiDataUtils';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';

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

    /**
     * Update props dynamically (useful for hooks that recreate this engine)
     */
    public updateProps(newProps: InvestmentEngineProps): void {
        this.props = newProps;
    }

    /**
     * MAIN METHOD: Processes investment payoffs for a specific round
     * FIXED: Uses correct function names and field names
     * @param roundNumber The round number (1, 2, or 3)
     */
    public async processInvestmentPayoffs(roundNumber: 1 | 2 | 3): Promise<void> {
        const {
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            setTeamRoundDataDirectly,
            fetchTeamRoundDataFromHook
        } = this.props;

        if (!currentDbSession?.id || !gameStructure || !teams.length) {
            console.warn(`[InvestmentEngine] Skipping investment payoff processing due to invalid state for round ${roundNumber}.`);
            return;
        }

        console.log(`[InvestmentEngine] 🎯 Processing investment payoffs for round ${roundNumber}`);

        const payoffKey = `rd${roundNumber}-payoff`;
        const payoffs = allInvestmentPayoffsData[payoffKey] || [];
        if (payoffs.length === 0) {
            console.warn(`[InvestmentEngine] ⚠️ No payoffs found for ${payoffKey}`);
            return;
        }

        try {
            for (const team of teams) {
                console.log(`[InvestmentEngine] Processing payoffs for team: ${team.name}`);

                // Use utility function instead of inherited method
                const teamKpis = await KpiDataUtils.ensureTeamRoundData(
                    currentDbSession.id,
                    team.id,
                    roundNumber,
                    teamRoundData,
                    setTeamRoundDataDirectly
                );

                const investKey = `rd${roundNumber}-invest`;
                const investmentDecision = teamDecisions[team.id]?.[investKey];

                const effectsToApply: KpiEffect[] = [];

                // Apply effects from selected investments
                if (investmentDecision) {
                    const selectedInvestmentIds = investmentDecision.selected_investment_ids || [];
                    selectedInvestmentIds.forEach(investId => {
                        const payoff = payoffs.find(p => p.investment_option_id === investId);
                        if (payoff) {
                            effectsToApply.push(...payoff.effects);
                            console.log(`[InvestmentEngine] Team ${team.name}: Adding payoff effects for investment ${investId}`);
                        }
                    });
                }

                // Handle unspent budget for Round 1 only
                if (roundNumber === 1) {
                    const budget = gameStructure.investment_phase_budgets['rd1-invest'] || 0;
                    const spent = investmentDecision?.total_spent ?? 0; // ✅ FIXED: Use correct field name
                    const unspent = budget - spent;

                    if (unspent > 0) {
                        effectsToApply.push({
                            kpi: 'cost',
                            change_value: -unspent,
                            timing: 'immediate',
                            description: 'RD-1 Unspent Budget'
                        });
                        console.log(`[InvestmentEngine] Team ${team.name}: Adding unspent budget effect: -$${unspent}`);
                    }
                }

                // Apply effects if any exist
                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    const finalKpis = KpiCalculations.calculateFinancialMetrics(updatedKpis); // ✅ FIXED: Use correct function name

                    // Store permanent adjustments using utility function with correct parameters
                    await KpiDataUtils.storePermanentAdjustments(
                        team.id,
                        currentDbSession.id,
                        effectsToApply,
                        'investment',             // challengeId
                        `RD${roundNumber}-Payoff` // optionId
                    );

                    // Update KPI data in database
                    await db.kpis.upsert({...updatedKpis, ...finalKpis, id: teamKpis.id});

                    console.log(`[InvestmentEngine] ✅ Team ${team.name}: Applied ${effectsToApply.length} investment payoff effects for round ${roundNumber}`);
                } else {
                    console.log(`[InvestmentEngine] ℹ️ Team ${team.name}: No investment payoff effects to apply for round ${roundNumber}`);
                }
            }

            // Refresh team round data to update UI
            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`[InvestmentEngine] ✅ Successfully processed investment payoffs for round ${roundNumber}.`);

        } catch (err) {
            console.error(`[InvestmentEngine] ❌ Failed to process investment payoffs for round ${roundNumber}:`, err);
            throw err;
        }
    }
}
