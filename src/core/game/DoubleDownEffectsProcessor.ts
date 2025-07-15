// src/core/game/DoubleDownEffectsProcessor.ts
import {FinancialMetrics, ScoringEngine} from './ScoringEngine';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {db} from '@shared/services/supabase';
import {formatCurrency, formatNumber} from "@shared/utils/formatUtils";
import {DoubleDownDecision, KpiEffect, TeamRoundData} from "@shared/types";

interface KpiChangeDetail {
    kpi: string;
    change_value: number;
    display_value: string;
}

interface FixedDoubleDownRanges {
    capacity: number;
    orders: number;
    asp: number;
    cost: number;
}

export class DoubleDownEffectsProcessor {

    /**
     * Calculate the multiplier for double down effects
     * @param boostPercentage The boost percentage from dice roll (0, 25, 75, or 100)
     * @returns The multiplier to apply to base effects (0.75 = 75% additional)
     */
    private static calculateDoubleDownMultiplier(boostPercentage: number): number {
        // Double down adds a percentage of the original effect
        // 75% boost = add 75% more = multiply by 0.75
        // 100% boost = add 100% more = multiply by 1.0 (double)
        return boostPercentage / 100;
    }

    /**
     * Generate fixed-range effects based on client requirements
     * Capacity: up or down by 250
     * Orders: up or down by 250
     * ASP: up or down by 10
     * Cost: up or down by 25k
     */
    private static generateFixedRangeEffects(boostPercentage: number): FixedDoubleDownRanges {
        if (boostPercentage === 0) {
            return {capacity: 0, orders: 0, asp: 0, cost: 0};
        }

        const direction: 1|-1 = Math.random() > 0.5 ? 1 : -1;
        const scaleFactor: number = boostPercentage / 100;

        return {
            capacity: Math.round(250 * scaleFactor * direction),
            orders: Math.round(250 * scaleFactor * direction),
            asp: Math.round(10 * scaleFactor * direction),
            cost: Math.round(25000 * scaleFactor * direction)
        };
    }

    /**
     * Process double down effects for a specific investment when dice are rolled
     */
    static async processDoubleDownForInvestment(
        sessionId: string,
        investmentId: string,
        boostPercentage: number
    ): Promise<void> {
        try {
            // Get all teams that doubled down on this investment
            const decisions: DoubleDownDecision[] = await db.decisions.getTeamsDoubledDownOnInvestment(sessionId, investmentId);

            if (!decisions || decisions.length === 0) {
                console.log(`[DoubleDownEffectsProcessor] No teams found for investment ${investmentId}`);
                return;
            }

            const multiplier: number = this.calculateDoubleDownMultiplier(boostPercentage);

            console.log(`[DoubleDownEffectsProcessor] Applying ${boostPercentage}% bonus (${multiplier}x additional) to ${decisions.length} teams for investment ${investmentId}`);

            // Apply effects to each team
            for (const decision of decisions) {
                await this.applyMultiplierToTeam(
                    sessionId,
                    decision.team_id,
                    investmentId,
                    boostPercentage,
                    185 // Default slide ID for double down, could be passed as parameter
                );

                console.log(`[DoubleDownEffectsProcessor] Applied ${boostPercentage}% bonus to team ${decision.team_name} for investment ${investmentId}`);
            }
        } catch (error) {
            console.error('[DoubleDownEffectsProcessor] Error processing double down for investment:', error);
        }
    }

    /**
     * Process all double down results (existing method)
     */
    static async processDoubleDownResults(sessionId: string) {
        console.log('[DoubleDownEffectsProcessor] Processing double down results...');

        try {
            // Get all double down results for this session
            const results = await db.doubleDown.getResultsForSession(sessionId);

            if (!results || results.length === 0) {
                console.log('[DoubleDownEffectsProcessor] No double down results found');
                return;
            }

            // Process each investment's results
            for (const result of results) {
                await this.processDoubleDownForInvestment(
                    sessionId,
                    result.investment_id,
                    result.boost_percentage
                );
            }
        } catch (error) {
            console.error('[DoubleDownEffectsProcessor] Error processing double down results:', error);
        }
    }

    private static async applyMultiplierToTeam(
        sessionId: string,
        teamId: string,
        investmentOptionId: string,
        boostPercentage: number,
        slideId: number
    ) {
        try {
            // Check if effects have already been applied to prevent duplicates
            const alreadyApplied: boolean = await db.payoffApplications.hasBeenApplied({
                session_id: sessionId,
                team_id: teamId,
                option_id: investmentOptionId,
                investment_phase_id: 'double-down'
            });

            if (alreadyApplied) {
                console.log(`[DoubleDownEffectsProcessor] Double down effects already applied for team ${teamId.substring(0, 8)}, investment ${investmentOptionId}, skipping`);
                return;
            }

            console.log(`[DoubleDownEffectsProcessor] Applying ${boostPercentage}% boost to team ${teamId.substring(0, 8)} for investment ${investmentOptionId}`);

            // Generate fixed-range effects based on client requirements
            const fixedRanges: FixedDoubleDownRanges = this.generateFixedRangeEffects(boostPercentage);

            const multipliedEffects: KpiEffect[] = [
                {
                    kpi: 'capacity' as const,
                    change_value: fixedRanges.capacity,
                    timing: 'immediate' as const,
                    description: `Double Down Bonus: ${boostPercentage}%`
                },
                {
                    kpi: 'orders' as const,
                    change_value: fixedRanges.orders,
                    timing: 'immediate' as const,
                    description: `Double Down Bonus: ${boostPercentage}%`
                },
                {
                    kpi: 'asp' as const,
                    change_value: fixedRanges.asp,
                    timing: 'immediate' as const,
                    description: `Double Down Bonus: ${boostPercentage}%`
                },
                {
                    kpi: 'cost' as const,
                    change_value: fixedRanges.cost,
                    timing: 'immediate' as const,
                    description: `Double Down Bonus: ${boostPercentage}%`
                }
            ].filter(effect => effect.change_value !== 0);

            // Get current team KPIs
            const currentKpis: TeamRoundData | null = await db.kpis.getForTeamRound(sessionId, teamId, 3);

            if (!currentKpis) {
                console.error(`[DoubleDownEffectsProcessor] No KPI data found for team ${teamId.substring(0, 8)}`);
                return;
            }

            // Apply the multiplied effects
            const updatedKpis: TeamRoundData = ScoringEngine.applyKpiEffects(currentKpis, multipliedEffects);
            const finalKpis: FinancialMetrics = ScoringEngine.calculateFinancialMetrics(updatedKpis);

            // Save to database
            await db.kpis.update(currentKpis.id, {
                ...updatedKpis,
                ...finalKpis
            });

            // Record that double down effects have been applied
            await db.payoffApplications.recordApplication({
                session_id: sessionId,
                team_id: teamId,
                option_id: investmentOptionId,
                slide_id: slideId,
                investment_phase_id: 'double-down'
            });

            console.log(`[DoubleDownEffectsProcessor] Successfully applied ${boostPercentage}% boost to team ${teamId.substring(0, 8)} for investment ${investmentOptionId}`);

        } catch (error) {
            console.error(`[DoubleDownEffectsProcessor] Error applying multiplier to team ${teamId.substring(0, 8)}:`, error);

            // Don't throw - we want to continue processing other teams even if one fails
            // The error is logged and the team just won't get the bonus (which is better than crashing)
        }
    }

    /**
     * Get KPI changes for display purposes
     */
    static async getKpiChangesForDisplay(
        _sessionId: string,
        investmentId: string,
        boostPercentage: number
    ): Promise<KpiChangeDetail[]> {
        try {
            const rd3Payoffs = allInvestmentPayoffsData['rd3-payoff'] || [];
            const payoffForOption = rd3Payoffs.find(p => p.id === investmentId);

            if (!payoffForOption?.effects) {
                return [];
            }

            const fixedRanges: FixedDoubleDownRanges = this.generateFixedRangeEffects(boostPercentage);

            return [
                {kpi: 'capacity', change_value: fixedRanges.capacity},
                {kpi: 'orders', change_value: fixedRanges.orders},
                {kpi: 'asp', change_value: fixedRanges.asp},
                {kpi: 'cost', change_value: fixedRanges.cost}
            ].filter(effect => effect.change_value !== 0)
                .map(effect => ({
                    kpi: effect.kpi,
                    change_value: effect.change_value,
                    display_value: this.formatKpiValue(effect.kpi, effect.change_value)
                }));
        } catch (error) {
            console.error('[DoubleDownEffectsProcessor] Error getting KPI changes for display:', error);
            return [];
        }
    }

    // Replace the entire formatKpiValue method with:
    private static formatKpiValue(kpi: string, value: number): string {
        switch (kpi) {
            case 'capacity':
            case 'orders':
                return formatNumber(value);
            case 'cost':
            case 'revenue':
            case 'net_margin':
            case 'net_income':
                return formatCurrency(value);
            case 'asp':
                return formatCurrency(value);
            default:
                return formatNumber(value);
        }
    }
}
