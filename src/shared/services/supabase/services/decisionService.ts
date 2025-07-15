// src/shared/services/supabase/services/decisionService.ts
// Enhanced version with missing methods for immediate purchases

import {supabase} from '../client';
import {withRetry} from '../database';
import {DoubleDownDecision, TeamDecision} from '@shared/types';

const TEAM_DECISIONS_TABLE = 'team_decisions';

export const decisionService = {
    async getBySession(sessionId: string): Promise<TeamDecision[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .order('submitted_at', {ascending: false});
            if (error) {
                console.error(`[decisionService.getBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [] as TeamDecision[];
        }, 3, 1000, `Fetch decisions for session ${sessionId.substring(0, 8)}`);
    },

    // ENHANCED: Now protects immediate purchases from being deleted
    async delete(sessionId: string, teamId: string, phaseId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .delete()
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', phaseId)
                .neq('is_immediate_purchase', true); // CRITICAL: Don't delete immediate purchases

            if (error) {
                console.error(`[decisionService.delete(sessionId:${sessionId}, teamId:${teamId.substring(0, 8)}, phaseId:${phaseId})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete regular decision for team ${teamId.substring(0, 8)} phase ${phaseId}`, 5000);
    },

    async deleteBySession(sessionId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .delete()
                .eq('session_id', sessionId);
            if (error) {
                console.error(`[decisionService.deleteBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete all decisions for session ${sessionId.substring(0, 8)}`, 8000);
    },

    // EXISTING: Get regular decisions (non-immediate purchases)
    async getForPhase(sessionId: string, teamId: string, phaseId: string): Promise<TeamDecision | null> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', phaseId)
                .eq('is_immediate_purchase', false)
                .maybeSingle();

            if (error) {
                console.error(`[decisionService.getForPhase(sessionId:${sessionId}, teamId:${teamId.substring(0, 8)}, phaseId:${phaseId})] failed with error: ${error}`)
                throw error;
            }
            return data as TeamDecision | null;
        }, 2, 1000, `Get decision for team ${teamId.substring(0, 8)} phase ${phaseId}`, 8000);
    },

    // NEW: Get immediate purchases for a phase
    async getImmediatePurchases(sessionId: string, teamId: string, phaseId: string): Promise<TeamDecision[]> {
        return withRetry(async () => {
            const immediatePhaseId = `${phaseId}_immediate`;
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', immediatePhaseId)
                .eq('is_immediate_purchase', true);

            if (error) {
                console.error(`[decisionService.getImmediatePurchases(sessionId:${sessionId}, teamId:${teamId.substring(0, 8)}, phaseId:${phaseId})] failed with error: ${error}`)
                throw error;
            }
            return data || [] as TeamDecision[];
        }, 2, 1000, `Get immediate purchases for team ${teamId.substring(0, 8)} phase ${phaseId}`, 8000);
    },

    // NEW: Get all immediate purchases for a session (for host monitoring)
    async getAllImmediatePurchases(sessionId: string): Promise<TeamDecision[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .eq('is_immediate_purchase', true)
                .eq('immediate_purchase_type', 'business_growth_strategy')
                .like('phase_id', '%_immediate');

            if (error) {
                console.error(`[decisionService.getAllImmediatePurchases(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [] as TeamDecision[];
        }, 3, 1000, `Get all immediate purchases for session ${sessionId.substring(0, 8)}`, 8000);
    },

    // Check if team has strategy investment from any round
    async hasStrategyInvestment(sessionId: string, teamId: string): Promise<boolean> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .select('id')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('is_immediate_purchase', true)
                .in('immediate_purchase_type', ['business_growth_strategy', 'strategic_plan']);

            if (error) {
                console.error(`[decisionService.hasStrategyInvestment] failed:`, error);
                throw error;
            }

            return (data || []).length > 0;
        }, 2, 1000, `Check strategy investment for team ${teamId.substring(0, 8)}`, 8000);
    },

    // ENHANCED: Create with longer timeout for submissions
    async create(decisionData: Omit<TeamDecision, 'id' | 'created_at' | 'submitted_at'>): Promise<TeamDecision> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .insert({
                    ...decisionData,
                    submitted_at: new Date().toISOString()
                })
                .select()
                .single();
            if (error) {
                console.error(`[decisionService.create(decisionData:${JSON.stringify({
                    ...decisionData,
                    team_id: decisionData.team_id?.substring(0, 8)
                })})] failed with error: ${error}`)
                throw error;
            }
            return data as TeamDecision;
        }, 2, 1000, `Create decision for team ${decisionData.team_id?.substring(0, 8)}`, 15000); // Longer timeout for submissions
    },

    async upsert(decisionData: Partial<TeamDecision>): Promise<TeamDecision> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .upsert(decisionData, {onConflict: 'session_id,team_id,phase_id'})
                .select()
                .single();
            if (error) {
                console.error(`[decisionService.upsert(decisionData:${JSON.stringify({
                    ...decisionData,
                    team_id: decisionData.team_id?.substring(0, 8)
                })})] failed with error: ${error}`)
                throw error;
            }
            return data as TeamDecision;
        }, 2, 1000, `Upsert decision for team ${decisionData.team_id?.substring(0, 8)}`, 10000);
    },

    async getTeamsDoubledDownOnInvestment(sessionId: string, investmentId: string): Promise<DoubleDownDecision[]> {
        return withRetry(async () => {
            // Fetch with join to get all needed data
            const {data, error} = await supabase
                .from(TEAM_DECISIONS_TABLE)
                .select(`
                team_id,
                double_down_on_id,
                double_down_sacrifice_id,
                teams!inner(name)
            `)
                .eq('session_id', sessionId)
                .eq('phase_id', 'ch-dd-prompt')
                .eq('double_down_on_id', investmentId);

            if (error) {
                console.error(`[decisionService.getTeamsDoubledDownOnInvestment(sessionId:${sessionId}, investmentId:${investmentId})] failed with error: ${error}`);
                throw error;
            }

            if (!data) {
                return [];
            }

            // Transform to flat structure
            const flattenedData: DoubleDownDecision[] = data.map((item: any) => ({
                team_id: item.team_id,
                team_name: item.teams.name,
                double_down_sacrifice_id: item.double_down_sacrifice_id,
                double_down_on_id: item.double_down_on_id
            }));

            return flattenedData;
        }, 3, 1000, `Get teams doubled down on investment ${investmentId}`);
    },
};
