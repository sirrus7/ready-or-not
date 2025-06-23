// src/core/game/KpiResetEngine.ts
// Implements the mandatory 4-step KPI reset sequence from Ready or Not physical game

import {TeamRoundData, KpiEffect} from '@shared/types';
import {db} from '@shared/services/supabase';
import {ScoringEngine} from './ScoringEngine';

export interface KpiResetResult {
    resetKpis: TeamRoundData;
    permanentEffectsApplied: KpiEffect[];
    continuedInvestmentsApplied: Array<{ investmentId: string; effects: KpiEffect[] }>; // Will be empty at reset time
    finalKpis: TeamRoundData;
}

export class KpiResetEngine {

    /**
     * STEP 1: Reset all KPIs to baseline values
     * Ignores all previous investments and effects
     */
    static resetToBaseline(sessionId: string, teamId: string, targetRound: 2 | 3): Omit<TeamRoundData, 'id'> {
        console.log(`[KpiResetEngine] Step 1: Resetting KPIs to baseline for team ${teamId}, round ${targetRound}`);

        // Use existing method to get clean baseline values
        const baselineKpis = ScoringEngine.createNewRoundData(sessionId, teamId, targetRound);

        console.log(`[KpiResetEngine] ✅ Baseline KPIs set:`, {
            capacity: baselineKpis.current_capacity,
            orders: baselineKpis.current_orders,
            cost: baselineKpis.current_cost,
            asp: baselineKpis.current_asp
        });

        return baselineKpis;
    }

    /**
     * STEP 2: Apply permanent effects only (Strategy + permanent KPI cards)
     * These survive all resets and are applied permanently
     */
    static async applyPermanentEffects(
        roundData: Omit<TeamRoundData, 'id'>,
        sessionId: string,
        teamId: string
    ): Promise<{ updatedKpis: Omit<TeamRoundData, 'id'>; effectsApplied: KpiEffect[] }> {
        console.log(`[KpiResetEngine] Step 2: Applying permanent effects for team ${teamId}`);

        const effectsApplied: KpiEffect[] = [];
        const updatedKpis = {...roundData};

        // Get all permanent adjustments for this team
        const allAdjustments = await db.adjustments.getBySession(sessionId);
        const teamAdjustments = allAdjustments.filter(adj => adj.team_id === teamId);

        console.log(`[KpiResetEngine] Found ${teamAdjustments.length} permanent adjustments for team ${teamId}`);

        // FIXED: Apply all permanent adjustments (including Strategy Investment) from database
        // Don't double-apply with hardcoded effects
        const permanentAdjustments = teamAdjustments.filter(adj =>
            adj.applies_to_round_start === roundData.round_number
        );

        permanentAdjustments.forEach(adj => {
            const effect: KpiEffect = {
                kpi: adj.kpi_key as any,
                change_value: adj.change_value,
                timing: 'immediate',
                description: adj.description || 'Permanent Effect'
            };

            console.log(`[KpiResetEngine] Applying: ${adj.description} - ${adj.kpi_key}: ${adj.change_value > 0 ? '+' : ''}${adj.change_value}`);
            (updatedKpis as any)[`current_${adj.kpi_key}`] += adj.change_value;
            effectsApplied.push(effect);
        });

        // REMOVED: Hardcoded STRATEGY_INVESTMENT_EFFECTS application
        // This was causing double-application since Strategy effects are already in database

        console.log(`[KpiResetEngine] ✅ Applied ${effectsApplied.length} permanent effects`);
        return {updatedKpis, effectsApplied};
    }

    /**
     * STEP 4: Calculate final KPIs
     * Computes derived metrics (revenue, net income, net margin)
     */
    static calculateFinalKpis(roundData: Omit<TeamRoundData, 'id'>): Omit<TeamRoundData, 'id'> {
        console.log(`[KpiResetEngine] Step 4: Calculating final KPIs`);

        const financialMetrics = ScoringEngine.calculateFinancialMetrics(roundData as TeamRoundData);

        const finalKpis = {
            ...roundData,
            revenue: financialMetrics.revenue,
            net_income: financialMetrics.net_income,
            net_margin: financialMetrics.net_margin
        };

        console.log(`[KpiResetEngine] ✅ Final KPIs calculated:`, {
            capacity: finalKpis.current_capacity,
            orders: finalKpis.current_orders,
            cost: finalKpis.current_cost,
            asp: finalKpis.current_asp,
            revenue: finalKpis.revenue,
            net_income: finalKpis.net_income,
            net_margin: finalKpis.net_margin
        });

        return finalKpis;
    }

    /**
     * MAIN ORCHESTRATOR: Executes the complete 4-step reset sequence
     * This is the primary method that should be called to perform a KPI reset
     */
    static async executeResetSequence(
        sessionId: string,
        teamId: string,
        targetRound: 2 | 3
    ): Promise<KpiResetResult> {
        console.log(`[KpiResetEngine] 🔄 Starting mandatory reset sequence for team ${teamId} → Round ${targetRound}`);

        try {
            // STEP 1: Reset all KPIs to baseline (ignore all previous investments/effects)
            const resetKpis = this.resetToBaseline(sessionId, teamId, targetRound);

            // STEP 2: Apply permanent effects only (Strategy + permanent KPI cards)
            const {updatedKpis: afterPermanent, effectsApplied: permanentEffectsApplied} =
                await this.applyPermanentEffects(resetKpis, sessionId, teamId);

            // REMOVED STEP 3: Don't apply continued investments at reset time
            // Continuation effects should only be applied AFTER teams decide to continue
            // This was the bug - we were giving bonuses before teams made decisions

            // STEP 3 (was 4): Calculate final KPIs
            const finalKpis = this.calculateFinalKpis(afterPermanent);

            console.log(`[KpiResetEngine] ✅ Reset sequence complete for team ${teamId} (NO continuation effects)`);

            return {
                resetKpis: resetKpis as TeamRoundData,
                permanentEffectsApplied,
                continuedInvestmentsApplied: [], // Empty - no continuation effects at reset
                finalKpis: finalKpis as TeamRoundData
            };

        } catch (error) {
            console.error(`[KpiResetEngine] ❌ Reset sequence failed for team ${teamId}:`, error);
            throw error;
        }
    }

    /**
     * BATCH OPERATION: Execute reset sequence for all teams in a session
     * Useful for advancing all teams to the next round simultaneously
     */
    static async executeResetSequenceForAllTeams(
        sessionId: string,
        targetRound: 2 | 3
    ): Promise<Record<string, KpiResetResult>> {
        console.log(`[KpiResetEngine] 🔄 Starting batch reset for all teams → Round ${targetRound}`);

        // Get all teams in session
        const teams = await db.teams.getBySession(sessionId);

        const results: Record<string, KpiResetResult> = {};

        // Execute reset for each team
        for (const team of teams) {
            try {
                results[team.id] = await this.executeResetSequence(sessionId, team.id, targetRound);
                console.log(`[KpiResetEngine] ✅ Reset complete for team: ${team.name}`);
            } catch (error) {
                console.error(`[KpiResetEngine] ❌ Reset failed for team ${team.name}:`, error);
                throw error;
            }
        }

        console.log(`[KpiResetEngine] ✅ Batch reset complete for ${teams.length} teams`);
        return results;
    }
}
