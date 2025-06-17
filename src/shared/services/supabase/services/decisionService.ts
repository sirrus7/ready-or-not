// src/shared/services/supabase/services/decisionService.ts
// FIXED VERSION - Added missing deleteBySession method

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

    // FIXED: Now protects immediate purchases from being deleted
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
        }, 2, 1000, `Delete regular decision for team ${teamId.substring(0, 8)} phase ${phaseId}`);
    },

    // ADDED: Missing deleteBySession method
    async deleteBySession(sessionId: string) {
        return withRetry(async () => {
            const {error} = await supabase
                .from('team_decisions')
                .delete()
                .eq('session_id', sessionId);
            if (error) throw error;
        }, 2, 1000, `Delete all decisions for session ${sessionId.substring(0, 8)}`);
    },

    // FIXED: Replace RPC with direct query
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
        }, 2, 1000, `Get decision for team ${teamId.substring(0, 8)} phase ${phaseId}`);
    },

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
        }, 2, 1000, `Create decision for team ${decisionData.team_id?.substring(0, 8)}`);
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
        }, 2, 1000, `Upsert decision for team ${decisionData.team_id?.substring(0, 8)}`);
    }
};
