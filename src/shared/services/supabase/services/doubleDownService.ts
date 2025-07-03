// src/shared/services/supabase/services/doubleDownService.ts
import {supabase} from '../client';
import {withRetry} from '../database';

export const doubleDownService = {
    async getResultsForSession(sessionId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('double_down_results')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', {ascending: true});

            if (error) {
                console.error(`[doubleDownService.getResultsForSession(sessionId:${sessionId})] failed with error: ${error}`);
                throw error;
            }
            return data || [];
        }, 3, 1000, `Fetch double down results for session ${sessionId.substring(0, 8)}`);
    },

    async getResultForInvestment(sessionId: string, investmentId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('double_down_results')
                .select('*')
                .eq('session_id', sessionId)
                .eq('investment_id', investmentId)
                .limit(1); // Get at most 1 result

            if (error) {
                console.error(`[doubleDownService.getResultForInvestment(sessionId:${sessionId}, investmentId:${investmentId})] failed with error: ${error}`);
                throw error;
            }

            // Return first result or null if no results
            return data && data.length > 0 ? data[0] : null;
        }, 3, 1000, `Get double down result for investment ${investmentId}`);
    },

    async saveResult(sessionId: string, investmentId: string, resultData: {
        dice1_value: number;
        dice2_value: number;
        total_value: number;
        boost_percentage: number;
        affected_teams: string[];
    }) {
        return withRetry(async () => {
            // Use upsert to handle duplicates gracefully
            const {data, error} = await supabase
                .from('double_down_results')
                .upsert({
                    session_id: sessionId,
                    investment_id: investmentId,
                    ...resultData,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'session_id,investment_id', // Handle duplicates on this combination
                    ignoreDuplicates: false // We want to update if exists
                })
                .select()
                .single();

            if (error) {
                console.error(`[doubleDownService.saveResult(sessionId:${sessionId}, investmentId:${investmentId})] failed with error: ${error}`);
                throw error;
            }
            return data;
        }, 2, 1000, `Save double down result for investment ${investmentId}`);
    },

    async getTeamsForInvestment(sessionId: string, investmentId: string) {
        return withRetry(async () => {
            // DEBUG: Log exactly what we're querying for
            console.log('[doubleDownService] getTeamsForInvestment called with:', {
                sessionId,
                investmentId,
                sessionIdType: typeof sessionId,
                investmentIdType: typeof investmentId
            });

            const {data, error} = await supabase
                .from('team_decisions')
                .select(`
                    team_id,
                    double_down_on_id,
                    teams!inner(name)
                `)
                .eq('session_id', sessionId)
                .eq('phase_id', 'ch-dd-prompt')
                .eq('double_down_on_id', investmentId);

            // DEBUG: Log the raw response
            console.log('[doubleDownService] Raw supabase response:', { data, error });

            if (error) {
                console.error(`[doubleDownService.getTeamsForInvestment(sessionId:${sessionId}, investmentId:${investmentId})] failed with error: ${error}`);
                throw error;
            }
            return data || [];
        }, 3, 1000, `Get teams for double down investment ${investmentId}`);
    },

    async getAllDoubleDownDecisions(sessionId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_decisions')
                .select(`
                    team_id,
                    double_down_on_id,
                    teams!inner(name)
                `)
                .eq('session_id', sessionId)
                .not('double_down_on_id', 'is', null);

            if (error) {
                console.error(`[doubleDownService.getAllDoubleDownDecisions(sessionId:${sessionId})] failed with error: ${error}`);
                throw error;
            }
            return data || [];
        }, 3, 1000, `Get all double down decisions for session ${sessionId.substring(0, 8)}`);
    },

    async hasEffectsBeenApplied(sessionId: string, teamId: string, investmentId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('payoff_applications')
                .select('id')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('option_id', investmentId)
                .eq('investment_phase_id', 'double-down')
                .limit(1);

            if (error) {
                console.error(`[doubleDownService.hasEffectsBeenApplied(sessionId:${sessionId}, teamId:${teamId}, investmentId:${investmentId})] failed with error: ${error}`);
                throw error;
            }
            return (data?.length || 0) > 0;
        }, 2, 1000, `Check if double down effects applied for team ${teamId.substring(0, 8)}`);
    },

    async recordEffectsApplied(sessionId: string, teamId: string, investmentId: string, slideId: number) {
        return withRetry(async () => {
            // Check if already exists first to avoid duplicate errors
            const existing = await this.hasEffectsBeenApplied(sessionId, teamId, investmentId);

            if (existing) {
                console.log(`[doubleDownService.recordEffectsApplied] Effects already recorded for team ${teamId.substring(0, 8)}, investment ${investmentId}`);
                return null; // Already exists, return success
            }

            const {data, error} = await supabase
                .from('payoff_applications')
                .insert({
                    session_id: sessionId,
                    team_id: teamId,
                    option_id: investmentId,
                    investment_phase_id: 'double-down',
                    slide_id: slideId,
                    applied_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                // If it's a duplicate error, that's actually OK - effects were already applied
                if (error.code === '23505') { // PostgreSQL unique violation error code
                    console.log(`[doubleDownService.recordEffectsApplied] Effects already recorded (duplicate), continuing...`);
                    return null;
                }

                console.error(`[doubleDownService.recordEffectsApplied(sessionId:${sessionId}, teamId:${teamId}, investmentId:${investmentId})] failed with error: ${error}`);
                throw error;
            }
            return data;
        }, 2, 1000, `Record double down effects applied for team ${teamId.substring(0, 8)}`);
    }
};
