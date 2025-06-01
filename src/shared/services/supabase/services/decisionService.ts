// src/utils/supabase/services/decisionService.ts - Decision operations
import { supabase } from '../client';
import { withRetry, callRPC } from '../database';

export const decisionService = {
    async getBySession(sessionId: string) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('team_decisions')
                .select('*')
                .eq('session_id', sessionId)
                .order('submitted_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch decisions for session ${sessionId.substring(0, 8)}`);
    },

    async delete(sessionId: string, teamId: string, phaseId: string) {
        return withRetry(async () => {
            const { error } = await supabase
                .from('team_decisions')
                .delete()
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', phaseId);
            if (error) throw error;
        }, 2, 1000, `Delete decision for team ${teamId.substring(0, 8)} phase ${phaseId}`);
    },

    async getForPhase(sessionId: string, teamId: string, phaseId: string) {
        return callRPC('get_student_team_decision_for_phase', {
            target_session_id: sessionId,
            target_team_id: teamId,
            target_phase_id: phaseId
        }, {
            expectedSingle: true,
            context: `Get decision for team ${teamId.substring(0, 8)} phase ${phaseId}`,
            maxRetries: 2
        });
    },

    async create(decisionData: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
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

    async update(decisionId: string, updates: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
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
