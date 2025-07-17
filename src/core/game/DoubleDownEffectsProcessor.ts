// src/core/game/DoubleDownEffectsProcessor.ts
import {FinancialMetrics, ScoringEngine} from './ScoringEngine';
import {db} from '@shared/services/supabase';
import {formatCurrency, formatNumber} from "@shared/utils/formatUtils";
import {DoubleDownDecision, DoubleDownResult, KpiEffect, TeamRoundData} from "@shared/types";

export interface KpiChangeDetail {
    kpi: string;
    change_value: number;
    display_value: string;
}

export class DoubleDownEffectsProcessor {

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
                return;
            }

            // Apply effects to each team
            for (const decision of decisions) {
                await this.applyMultiplierToTeam(
                    sessionId,
                    decision.team_id,
                    investmentId,
                    boostPercentage,
                    185 // Default slide ID for double down, could be passed as parameter
                );
            }
        } catch (error) {
            console.error('[DoubleDownEffectsProcessor] Error processing double down for investment:', error);
        }
    }

    private static async applyMultiplierToTeam(
        sessionId: string,
        teamId: string,
        investmentOptionId: string,
        boostPercentage: number,
        slideId: number
    ): Promise<void> {
        try {
            // Check if effects have already been applied to prevent duplicates
            const alreadyApplied: boolean = await db.payoffApplications.hasBeenApplied({
                session_id: sessionId,
                team_id: teamId,
                option_id: investmentOptionId,
                investment_phase_id: 'double-down'
            });

            if (alreadyApplied) {
                return;
            }

            // Get stored KPI changes from database instead of generating new ones
            const storedResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentOptionId);
            if (!storedResult) {
                console.error(`[DoubleDownEffectsProcessor] No stored result found for investment ${investmentOptionId}`);
                return;
            }

            const multipliedEffects: KpiEffect[] = [
                {
                    kpi: 'capacity' as const,
                    change_value: storedResult.capacity_change,
                    timing: 'immediate' as const,
                    description: `Double Down Bonus: ${boostPercentage}%`
                },
                {
                    kpi: 'orders' as const,
                    change_value: storedResult.orders_change,
                    timing: 'immediate' as const,
                    description: `Double Down Bonus: ${boostPercentage}%`
                },
                {
                    kpi: 'asp' as const,
                    change_value: storedResult.asp_change,
                    timing: 'immediate' as const,
                    description: `Double Down Bonus: ${boostPercentage}%`
                },
                {
                    kpi: 'cost' as const,
                    change_value: storedResult.cost_change,
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
        sessionId: string,
        investmentId: string,
    ): Promise<KpiChangeDetail[]> {
        try {
            // Get stored result with pre-calculated KPI changes
            const storedResult: DoubleDownResult | null = await db.doubleDown.getResultForInvestment(sessionId, investmentId);

            if (storedResult) {
                return [
                    {kpi: 'capacity', change_value: storedResult.capacity_change},
                    {kpi: 'orders', change_value: storedResult.orders_change},
                    {kpi: 'asp', change_value: storedResult.asp_change},
                    {kpi: 'cost', change_value: storedResult.cost_change}
                ].filter(effect => effect.change_value !== 0)
                    .map(effect => ({
                        kpi: effect.kpi,
                        change_value: effect.change_value,
                        display_value: this.formatKpiValue(effect.kpi, effect.change_value)
                    }));
            }

            // Return empty array if no stored result
            return [];
        } catch (error) {
            console.error('[DoubleDownEffectsProcessor] Error getting stored KPI changes:', error);
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
            case 'asp':
                return formatCurrency(value);
            default:
                return formatNumber(value);
        }
    }
}
