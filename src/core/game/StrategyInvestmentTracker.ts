// src/core/game/StrategyInvestmentTracker.ts
// Tracks strategy investments as permanent effects that persist across all resets

import {db} from '@shared/services/supabase';
import {KpiEffect, TeamDecision} from '@shared/types';
import {PermanentKpiAdjustment} from '@shared/types/database';

/**
 * Strategy Investment Effects - These are the permanent effects that persist across all resets
 * Applied when ANY strategy investment is made (RD-1 or RD-2)
 */
export const STRATEGY_INVESTMENT_EFFECTS: KpiEffect[] = [
    {
        kpi: 'capacity',
        change_value: 250,
        timing: 'permanent_next_round_start',
        description: 'Strategy Investment - Capacity Boost',
        applies_to_rounds: [2, 3]
    },
    {
        kpi: 'orders',
        change_value: 250,
        timing: 'permanent_next_round_start',
        description: 'Strategy Investment - Orders Boost',
        applies_to_rounds: [2, 3]
    },
    {
        kpi: 'asp',
        change_value: 20,
        timing: 'permanent_next_round_start',
        description: 'Strategy Investment - ASP Boost',
        applies_to_rounds: [2, 3]
    }
];

/**
 * Strategy Investment Types - Different ways strategy can be purchased
 */
export const STRATEGY_INVESTMENT_TYPES = {
    RD1_BUSINESS_GROWTH: 'business_growth_strategy',
    RD2_STRATEGIC_PLAN: 'strategic_plan'
} as const;

export type StrategyInvestmentType = typeof STRATEGY_INVESTMENT_TYPES[keyof typeof STRATEGY_INVESTMENT_TYPES];

export interface StrategyInvestmentRecord {
    teamId: string;
    sessionId: string;
    investmentType: StrategyInvestmentType;
    purchaseRound: 1 | 2;
    purchasePhase: string;
    cost: number;
    purchasedAt: string;
    isActive: boolean;
}

export interface StrategyInvestmentStatus {
    hasStrategy: boolean;
    investmentRecord?: StrategyInvestmentRecord;
    permanentAdjustments: PermanentKpiAdjustment[];
    effectsApplied: KpiEffect[];
}

export class StrategyInvestmentTracker {

    /**
     * Detect strategy investments from team decisions
     * Looks for both immediate purchases and regular investments
     */
    static async detectStrategyInvestments(sessionId: string, teamId: string): Promise<StrategyInvestmentRecord[]> {
        console.log(`[StrategyInvestmentTracker] Detecting strategy investments for team ${teamId}`);

        try {
            const allDecisions: TeamDecision[] = await db.decisions.getBySession(sessionId);
            const teamDecisions: TeamDecision[] = allDecisions.filter(d => d.team_id === teamId);

            const strategyInvestments: StrategyInvestmentRecord[] = [];

            // Check for RD-1 Business Growth Strategy (immediate purchase)
            const rd1ImmediatePurchases: TeamDecision[] = teamDecisions.filter(d =>
                d.is_immediate_purchase &&
                d.immediate_purchase_type === STRATEGY_INVESTMENT_TYPES.RD1_BUSINESS_GROWTH
            );

            rd1ImmediatePurchases.forEach(decision => {
                strategyInvestments.push({
                    teamId,
                    sessionId,
                    investmentType: STRATEGY_INVESTMENT_TYPES.RD1_BUSINESS_GROWTH,
                    purchaseRound: 1,
                    purchasePhase: decision.phase_id,
                    cost: decision.total_spent_budget || 50000,
                    purchasedAt: decision.submitted_at,
                    isActive: true
                });
            });

            // Check for RD-2 Strategic Plan (immediate purchase)
            const rd2ImmediatePurchases: TeamDecision[] = teamDecisions.filter(d =>
                d.is_immediate_purchase &&
                d.immediate_purchase_type === STRATEGY_INVESTMENT_TYPES.RD2_STRATEGIC_PLAN
            );

            rd2ImmediatePurchases.forEach(decision => {
                strategyInvestments.push({
                    teamId,
                    sessionId,
                    investmentType: STRATEGY_INVESTMENT_TYPES.RD2_STRATEGIC_PLAN,
                    purchaseRound: 2,
                    purchasePhase: decision.phase_id,
                    cost: decision.total_spent_budget || 75000,
                    purchasedAt: decision.submitted_at,
                    isActive: true
                });
            });

            // Check for regular Strategy investments (option 'A' in investment phases)
            const regularInvestments: TeamDecision[] = teamDecisions.filter(d =>
                !d.is_immediate_purchase &&
                (d.phase_id === 'rd1-invest' || d.phase_id === 'rd2-invest') &&
                d.selected_investment_options?.includes('A')
            );

            regularInvestments.forEach(decision => {
                const purchaseRound: 1 | 2 = decision.phase_id === 'rd1-invest' ? 1 : 2;
                const investmentType = purchaseRound === 1
                    ? STRATEGY_INVESTMENT_TYPES.RD1_BUSINESS_GROWTH
                    : STRATEGY_INVESTMENT_TYPES.RD2_STRATEGIC_PLAN;

                strategyInvestments.push({
                    teamId,
                    sessionId,
                    investmentType,
                    purchaseRound: purchaseRound as 1 | 2,
                    purchasePhase: decision.phase_id,
                    cost: decision.total_spent_budget || (purchaseRound === 1 ? 50000 : 75000),
                    purchasedAt: decision.submitted_at,
                    isActive: true
                });
            });

            console.log(`[StrategyInvestmentTracker] Found ${strategyInvestments.length} strategy investments for team ${teamId}`);
            return strategyInvestments;

        } catch (error) {
            console.error(`[StrategyInvestmentTracker] Error detecting strategy investments:`, error);
            return [];
        }
    }

    /**
     * Check if a team has strategy investment (any type)
     */
    static async hasStrategyInvestment(sessionId: string, teamId: string): Promise<boolean> {
        try {
            const investments = await this.detectStrategyInvestments(sessionId, teamId);
            return investments.length > 0;
        } catch (error) {
            console.error(`[StrategyInvestmentTracker] Error checking strategy investment:`, error);
            return false;
        }
    }

    /**
     * Get comprehensive strategy investment status for a team
     */
    static async getStrategyInvestmentStatus(sessionId: string, teamId: string): Promise<StrategyInvestmentStatus> {
        console.log(`[StrategyInvestmentTracker] Getting strategy status for team ${teamId}`);

        try {
            // Detect strategy investments
            const investments: StrategyInvestmentRecord[] = await this.detectStrategyInvestments(sessionId, teamId);
            const hasStrategy: boolean = investments.length > 0;

            if (!hasStrategy) {
                return {
                    hasStrategy: false,
                    permanentAdjustments: [],
                    effectsApplied: []
                };
            }

            // Get the most recent strategy investment
            const mostRecentInvestment: StrategyInvestmentRecord = investments.reduce((latest, current) => {
                return new Date(current.purchasedAt) > new Date(latest.purchasedAt) ? current : latest;
            });

            // Get existing permanent adjustments for strategy
            const allAdjustments = await db.adjustments.getBySession(sessionId);
            const strategyAdjustments = allAdjustments.filter(adj =>
                    adj.team_id === teamId && (
                        adj.challenge_id === 'strategy' ||
                        adj.description?.toLowerCase().includes('strategy') ||
                        (adj.challenge_id?.includes('invest') && adj.option_id === 'A')
                    )
            );

            return {
                hasStrategy: true,
                investmentRecord: mostRecentInvestment,
                permanentAdjustments: strategyAdjustments,
                effectsApplied: STRATEGY_INVESTMENT_EFFECTS
            };

        } catch (error) {
            console.error(`[StrategyInvestmentTracker] Error getting strategy status:`, error);
            return {
                hasStrategy: false,
                permanentAdjustments: [],
                effectsApplied: []
            };
        }
    }

    /**
     * Create permanent adjustment records for strategy investment
     * This should be called when strategy investment is first detected
     */
    static async createStrategyPermanentAdjustments(
        sessionId: string,
        teamId: string,
        investmentType: StrategyInvestmentType,
        purchaseRound: 1 | 2
    ): Promise<void> {
        console.log(`[StrategyInvestmentTracker] Creating permanent adjustments for team ${teamId}, type: ${investmentType}, purchased in RD-${purchaseRound}`);

        try {
            // Check if adjustments already exist to avoid duplicates
            const existingStatus = await this.getStrategyInvestmentStatus(sessionId, teamId);
            if (existingStatus.permanentAdjustments.length > 0) {
                console.log(`[StrategyInvestmentTracker] Strategy adjustments already exist for team ${teamId}, skipping creation`);
                return;
            }

            // Create permanent adjustment records for each effect
            const adjustmentsToCreate: Omit<PermanentKpiAdjustment, 'id' | 'created_at'>[] = [];

            STRATEGY_INVESTMENT_EFFECTS.forEach(effect => {
                if (effect.applies_to_rounds) {
                    effect.applies_to_rounds.forEach(roundNum => {
                        adjustmentsToCreate.push({
                            session_id: sessionId,
                            team_id: teamId,
                            applies_to_round_start: roundNum,
                            kpi_key: effect.kpi,
                            change_value: effect.change_value,
                            description: `${effect.description} (Purchased RD-${purchaseRound})`,
                            challenge_id: 'strategy',
                            option_id: 'A'
                        });
                    });
                }
            });

            if (adjustmentsToCreate.length > 0) {
                await db.adjustments.upsert(adjustmentsToCreate);
                console.log(`[StrategyInvestmentTracker] ✅ Created ${adjustmentsToCreate.length} permanent adjustments for strategy investment purchased in RD-${purchaseRound}`);
            }

        } catch (error) {
            console.error(`[StrategyInvestmentTracker] ❌ Error creating strategy permanent adjustments:`, error);
            throw error;
        }
    }

    /**
     * Process strategy investment and create permanent effects
     * This is the main method that should be called when a strategy investment is detected
     */
    static async processStrategyInvestment(
        sessionId: string,
        teamId: string,
        investmentType: StrategyInvestmentType,
        purchaseRound: 1 | 2
    ): Promise<void> {
        console.log(`[StrategyInvestmentTracker] 🎯 Processing strategy investment for team ${teamId}`);

        try {
            // Create permanent adjustments
            await this.createStrategyPermanentAdjustments(sessionId, teamId, investmentType, purchaseRound);

            console.log(`[StrategyInvestmentTracker] ✅ Strategy investment processed successfully for team ${teamId}`);

        } catch (error) {
            console.error(`[StrategyInvestmentTracker] ❌ Error processing strategy investment:`, error);
            throw error;
        }
    }

    /**
     * BATCH OPERATION: Process strategy investments for all teams
     * Useful for ensuring all existing strategy investments have permanent effects
     */
    static async processStrategyInvestmentsForAllTeams(sessionId: string): Promise<void> {
        console.log(`[StrategyInvestmentTracker] 🎯 Processing strategy investments for all teams in session`);

        try {
            const teams = await db.teams.getBySession(sessionId);

            for (const team of teams) {
                const investments = await this.detectStrategyInvestments(sessionId, team.id);

                for (const investment of investments) {
                    await this.processStrategyInvestment(
                        sessionId,
                        team.id,
                        investment.investmentType,
                        investment.purchaseRound
                    );
                }

                if (investments.length > 0) {
                    console.log(`[StrategyInvestmentTracker] ✅ Processed ${investments.length} strategy investments for team: ${team.name}`);
                }
            }

            console.log(`[StrategyInvestmentTracker] ✅ Batch processing complete for ${teams.length} teams`);

        } catch (error) {
            console.error(`[StrategyInvestmentTracker] ❌ Batch processing failed:`, error);
            throw error;
        }
    }

    /**
     * UTILITY: Remove strategy investment effects (for testing or corrections)
     */
    static async removeStrategyInvestmentEffects(sessionId: string, teamId: string): Promise<void> {
        console.log(`[StrategyInvestmentTracker] 🗑️ Removing strategy investment effects for team ${teamId}`);

        try {
            const allAdjustments = await db.adjustments.getBySession(sessionId);
            const strategyAdjustments = allAdjustments.filter(adj =>
                    adj.team_id === teamId && (
                        adj.challenge_id === 'strategy' ||
                        adj.description?.toLowerCase().includes('strategy')
                    )
            );

            // Note: This would require a delete method in adjustmentService
            // For now, we'll just log what would be removed
            console.log(`[StrategyInvestmentTracker] Would remove ${strategyAdjustments.length} strategy adjustments`);
            console.log(`[StrategyInvestmentTracker] ⚠️ Actual removal not implemented - requires delete method in adjustmentService`);

        } catch (error) {
            console.error(`[StrategyInvestmentTracker] ❌ Error removing strategy effects:`, error);
            throw error;
        }
    }

    /**
     * UTILITY: Get all teams with strategy investments in a session
     */
    static async getTeamsWithStrategy(sessionId: string): Promise<Array<{
        teamId: string;
        teamName: string;
        investmentRecord: StrategyInvestmentRecord
    }>> {
        console.log(`[StrategyInvestmentTracker] Getting all teams with strategy investments`);

        try {
            const teams = await db.teams.getBySession(sessionId);
            const teamsWithStrategy: Array<{
                teamId: string;
                teamName: string;
                investmentRecord: StrategyInvestmentRecord
            }> = [];

            for (const team of teams) {
                const investments = await this.detectStrategyInvestments(sessionId, team.id);
                if (investments.length > 0) {
                    const mostRecent = investments.reduce((latest, current) => {
                        return new Date(current.purchasedAt) > new Date(latest.purchasedAt) ? current : latest;
                    });

                    teamsWithStrategy.push({
                        teamId: team.id,
                        teamName: team.name,
                        investmentRecord: mostRecent
                    });
                }
            }

            console.log(`[StrategyInvestmentTracker] Found ${teamsWithStrategy.length} teams with strategy investments`);
            return teamsWithStrategy;

        } catch (error) {
            console.error(`[StrategyInvestmentTracker] Error getting teams with strategy:`, error);
            return [];
        }
    }
}
