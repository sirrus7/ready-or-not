// src/shared/services/supabase/services/decisionService.ts
// Enhanced version with missing methods for immediate purchases

import {supabase} from '../client';
import {withRetry} from '../database';
import {TeamDecision} from '@shared/types';

export const decisionService = {
    async getBySession(sessionId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_decisions')
                .select('*')
                .eq('session_id', sessionId)
                .order('submitted_at', {ascending: false});
            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch decisions for session ${sessionId.substring(0, 8)}`);
    },

    // ENHANCED: Now protects immediate purchases from being deleted
    async delete(sessionId: string, teamId: string, phaseId: string) {
        return withRetry(async () => {
            const {error} = await supabase
                .from('team_decisions')
                .delete()
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', phaseId)
                .neq('is_immediate_purchase', true); // CRITICAL: Don't delete immediate purchases

            if (error) throw error;
        }, 2, 1000, `Delete regular decision for team ${teamId.substring(0, 8)} phase ${phaseId}`, 5000);
    },

    async deleteBySession(sessionId: string) {
        return withRetry(async () => {
            const {error} = await supabase
                .from('team_decisions')
                .delete()
                .eq('session_id', sessionId);
            if (error) throw error;
        }, 2, 1000, `Delete all decisions for session ${sessionId.substring(0, 8)}`, 8000);
    },

    // EXISTING: Get regular decisions (non-immediate purchases)
    async getForPhase(sessionId: string, teamId: string, phaseId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_decisions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', phaseId)
                .eq('is_immediate_purchase', false)
                .maybeSingle();

            if (error) throw error;
            return data;
        }, 2, 1000, `Get decision for team ${teamId.substring(0, 8)} phase ${phaseId}`, 8000);
    },

    // NEW: Get immediate purchases for a phase
    async getImmediatePurchases(sessionId: string, teamId: string, phaseId: string) {
        return withRetry(async () => {
            const immediatePhaseId = `${phaseId}_immediate`;
            const {data, error} = await supabase
                .from('team_decisions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', immediatePhaseId)
                .eq('is_immediate_purchase', true);

            if (error) throw error;
            return data || [];
        }, 2, 1000, `Get immediate purchases for team ${teamId.substring(0, 8)} phase ${phaseId}`, 8000);
    },

    // NEW: Get all immediate purchases for a session (for host monitoring)
    async getAllImmediatePurchases(sessionId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_decisions')
                .select('id, team_id, total_spent_budget, submitted_at, report_given, selected_investment_options')
                .eq('session_id', sessionId)
                .eq('is_immediate_purchase', true)
                .eq('immediate_purchase_type', 'business_growth_strategy')
                .like('phase_id', '%_immediate');

            if (error) throw error;
            return data || [];
        }, 3, 1000, `Get all immediate purchases for session ${sessionId.substring(0, 8)}`, 8000);
    },

    // ENHANCED: Create with longer timeout for submissions
    async create(decisionData: Omit<TeamDecision, 'id' | 'created_at'>) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_decisions')
                .insert({
                    ...decisionData,
                    submitted_at: decisionData.submitted_at || new Date().toISOString()
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Create decision for team ${decisionData.team_id?.substring(0, 8)}`, 15000); // Longer timeout for submissions
    },

    async upsert(decisionData: any) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_decisions')
                .upsert(decisionData, {onConflict: 'id'})
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Upsert decision for team ${decisionData.team_id?.substring(0, 8)}`, 10000);
    }
};
