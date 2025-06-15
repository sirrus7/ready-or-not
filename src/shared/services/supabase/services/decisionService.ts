// src/shared/services/supabase/services/decisionService.ts
// FIXED VERSION - Protects immediate purchases from deletion

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
        }, 2, 1000, `Create decision for team ${decisionData.team_id?.substring(0, 8)} phase ${decisionData.phase_id}`);
    },

    async upsert(decisionData: Omit<TeamDecision, 'id' | 'created_at'>) {
        return withRetry(async () => {
            const payload = {
                ...decisionData,
                submitted_at: decisionData.submitted_at || new Date().toISOString()
            };

            const {data, error} = await supabase
                .from('team_decisions')
                .upsert(payload, {
                    onConflict: 'session_id, team_id, phase_id'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }, 2, 1000, `Upsert decision for team ${decisionData.team_id?.substring(0, 8)} phase ${decisionData.phase_id}`);
    },

    async update(decisionId: string, updates: Partial<TeamDecision>) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_decisions')
                .update(updates)
                .eq('id', decisionId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Update decision ${decisionId}`);
    }
};
