// src/core/game/DoubleDownEffectsProcessor.ts
import {ScoringEngine} from './ScoringEngine';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {db} from '@shared/services/supabase';

interface KpiChangeDetail {
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
            const decisions = await db.doubleDown.getTeamsForInvestment(sessionId, investmentId);

            if (!decisions || decisions.length === 0) {
                console.log(`[DoubleDownEffectsProcessor] No teams found for investment ${investmentId}`);
                return;
            }

            // Calculate multiplier from boost percentage
            const multiplier = 1 + (boostPercentage / 100);

            // Apply effects to each team
            for (const decision of decisions) {
                await this.applyMultiplierToTeam(
                    sessionId,
                    decision.team_id,
                    investmentId,
                    multiplier,
                    boostPercentage,
                    185 // Default slide ID for double down, could be passed as parameter
                );

                console.log(`[DoubleDownEffectsProcessor] Applied ${boostPercentage}% boost to team ${decision.teams.name} for investment ${investmentId}`);
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
        multiplier: number,
        boostPercentage: number,
        slideId: number
    ) {
        try {
            // Check if effects have already been applied to prevent duplicates
            const alreadyApplied = await db.doubleDown.hasEffectsBeenApplied(
                sessionId,
                teamId,
                investmentOptionId
            );

            if (alreadyApplied) {
                console.log(`[DoubleDownEffectsProcessor] Double down effects already applied for team ${teamId}, investment ${investmentOptionId}`);
                return;
            }

            // Get the base payoff effects for this investment from RD3 payoffs
            const rd3Payoffs = allInvestmentPayoffsData['rd3-payoff'] || [];
            const payoffForOption = rd3Payoffs.find(p => p.id === investmentOptionId);

            if (!payoffForOption?.effects) {
                console.warn(`[DoubleDownEffectsProcessor] No payoff effects found for investment ${investmentOptionId}`);
                return;
            }

            // Apply multiplier to each effect
            const multipliedEffects = payoffForOption.effects.map(effect => ({
                ...effect,
                change_value: Math.round(effect.change_value * multiplier),
                description: `${effect.description || ''} (+${boostPercentage}% Double Down Bonus)`
            }));

            // Get current team KPIs
            const currentKpis = await db.kpis.getForTeamRound(sessionId, teamId, 3);

            if (!currentKpis) {
                console.error(`[DoubleDownEffectsProcessor] No KPI data found for team ${teamId}`);
                return;
            }

            // Apply the multiplied effects
            const updatedKpis = ScoringEngine.applyKpiEffects(currentKpis, multipliedEffects);
            const finalKpis = ScoringEngine.calculateFinancialMetrics(updatedKpis);

            // Save to database
            await db.kpis.update(currentKpis.id, {
                ...updatedKpis,
                ...finalKpis
            });

            // Record that double down effects have been applied
            await db.doubleDown.recordEffectsApplied(
                sessionId,
                teamId,
                investmentOptionId,
                slideId
            );

            console.log(`[DoubleDownEffectsProcessor] Successfully applied ${boostPercentage}% boost to team ${teamId} for investment ${investmentOptionId}`);

        } catch (error) {
            console.error(`[DoubleDownEffectsProcessor] Error applying multiplier to team ${teamId}:`, error);
        }
    }

    /**
     * Get KPI changes for display purposes
     */
    static async getKpiChangesForDisplay(
        sessionId: string,
        investmentId: string,
        boostPercentage: number
    ): Promise<KpiChangeDetail[]> {
        try {
            const rd3Payoffs = allInvestmentPayoffsData['rd3-payoff'] || [];
            const payoffForOption = rd3Payoffs.find(p => p.id === investmentId);

            if (!payoffForOption?.effects) {
                return [];
            }

            const multiplier = 1 + (boostPercentage / 100);

            return payoffForOption.effects.map(effect => ({
                kpi: effect.kpi,
                change_value: Math.round(effect.change_value * multiplier),
                display_value: this.formatKpiValue(effect.kpi, Math.round(effect.change_value * multiplier))
            }));
        } catch (error) {
            console.error('[DoubleDownEffectsProcessor] Error getting KPI changes for display:', error);
            return [];
        }
    }

    /**
     * Format KPI values for display
     */
    private static formatKpiValue(kpi: string, value: number): string {
        switch (kpi) {
            case 'capacity':
            case 'orders':
                return Math.round(value).toLocaleString();

            case 'cost':
            case 'revenue':
            case 'net_margin':
            case 'net_income':
                if (Math.abs(value) >= 1_000_000) {
                    return `$${(value / 1_000_000).toFixed(1)}M`;
                } else if (Math.abs(value) >= 1_000) {
                    return `$${(value / 1_000).toFixed(0)}K`;
                } else {
                    return `$${Math.round(value).toLocaleString()}`;
                }

            case 'asp':
                return `$${Math.round(value)}`;

            default:
                return Math.round(value).toLocaleString();
        }
    }
}
