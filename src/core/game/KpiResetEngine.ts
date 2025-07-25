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

    static async executeResetSequenceForAllTeams(
        sessionId: string,
        targetRound: 2 | 3
    ): Promise<Record<string, KpiResetResult>> {
        console.log(`[KpiResetEngine] 🔄 Starting BATCH reset for all teams → Round ${targetRound}`);

        try {
            // Get all teams in session
            const teams = await db.teams.getBySession(sessionId);
            console.log(`[KpiResetEngine] Processing ${teams.length} teams in batch operation`);

            // CRITICAL: Check which teams already have data for this round
            const existingKpiData = await db.kpis.getBySession(sessionId);
            const existingTeamIds = new Set(
                existingKpiData
                    .filter(kpi => kpi.round_number === targetRound)
                    .map(kpi => kpi.team_id)
            );

            // Filter out teams that already have data
            const teamsNeedingReset = teams.filter(team => !existingTeamIds.has(team.id));

            console.log(`[KpiResetEngine] ${existingTeamIds.size} teams already have Round ${targetRound} data`);
            console.log(`[KpiResetEngine] ${teamsNeedingReset.length} teams need new Round ${targetRound} data`);

            // If no teams need reset, return early
            if (teamsNeedingReset.length === 0) {
                console.log(`[KpiResetEngine] ✅ All teams already have Round ${targetRound} data, skipping batch operation`);

                // Still return results for existing teams
                const results: Record<string, KpiResetResult> = {};
                existingKpiData.forEach(kpiData => {
                    if (kpiData.round_number === targetRound) {
                        results[kpiData.team_id] = {
                            resetKpis: kpiData,
                            permanentEffectsApplied: [],
                            continuedInvestmentsApplied: [],
                            finalKpis: kpiData
                        };
                    }
                });
                return results;
            }

            // Get permanent adjustments once for all teams
            const allAdjustments = await db.adjustments.getBySession(sessionId);
            console.log(`[KpiResetEngine] Loaded ${allAdjustments.length} permanent adjustments`);

            // Calculate reset data ONLY for teams that need it
            const batchKpiData: Omit<TeamRoundData, 'id' | 'created_at'>[] = [];
            const results: Record<string, KpiResetResult> = {};

            for (const team of teamsNeedingReset) {
                try {
                    // Calculate reset data (same logic as before)
                    const resetKpis = this.resetToBaseline(sessionId, team.id, targetRound);
                    const teamAdjustments = allAdjustments.filter(adj => adj.team_id === team.id);
                    const updatedKpis = {...resetKpis};
                    const effectsApplied: KpiEffect[] = [];

                    const permanentAdjustments = teamAdjustments.filter(adj =>
                        adj.applies_to_round_start === targetRound
                    );

                    permanentAdjustments.forEach(adj => {
                        const effect: KpiEffect = {
                            kpi: adj.kpi_key as any,
                            change_value: adj.change_value,
                            timing: 'immediate',
                            description: adj.description || 'Permanent Effect'
                        };

                        (updatedKpis as any)[`current_${adj.kpi_key}`] += adj.change_value;
                        effectsApplied.push(effect);
                    });

                    const finalKpis = this.calculateFinalKpis(updatedKpis);

                    // Add to batch for database insert
                    batchKpiData.push(finalKpis);

                    // Store result for return
                    results[team.id] = {
                        resetKpis: resetKpis as TeamRoundData,
                        permanentEffectsApplied: effectsApplied,
                        continuedInvestmentsApplied: [],
                        finalKpis: finalKpis as TeamRoundData
                    };

                    console.log(`[KpiResetEngine] ✅ Calculated reset data for team: ${team.name}`);

                } catch (error) {
                    console.error(`[KpiResetEngine] ❌ Failed to calculate reset for team ${team.name}:`, error);
                    throw error;
                }
            }

            // BATCH DATABASE WRITE (only for teams that need it)
            if (batchKpiData.length > 0) {
                console.log(`[KpiResetEngine] 💾 Executing batch write for ${batchKpiData.length} records...`);
                const insertedRecords = await db.kpis.createBatch(batchKpiData);
                console.log(`[KpiResetEngine] ✅ Batch write complete: ${insertedRecords.length} records inserted`);

                // Update results with actual database IDs
                insertedRecords.forEach((record, index) => {
                    const team = teamsNeedingReset[index];
                    if (results[team.id]) {
                        results[team.id].resetKpis.id = record.id;
                        results[team.id].finalKpis.id = record.id;
                    }
                });
            }

            // Add existing records to results
            existingKpiData.forEach(kpiData => {
                if (kpiData.round_number === targetRound && !results[kpiData.team_id]) {
                    results[kpiData.team_id] = {
                        resetKpis: kpiData,
                        permanentEffectsApplied: [],
                        continuedInvestmentsApplied: [],
                        finalKpis: kpiData
                    };
                }
            });

            console.log(`[KpiResetEngine] ✅ BATCH reset complete: ${Object.keys(results).length} teams processed`);
            return results;

        } catch (error) {
            console.error(`[KpiResetEngine] ❌ Batch reset failed:`, error);
            throw error;
        }
    }
}
