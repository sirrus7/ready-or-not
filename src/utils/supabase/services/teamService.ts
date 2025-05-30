// src/utils/supabase/services/teamService.ts - Team CRUD operations
import { supabase } from '../client';
import { withRetry, callRPC } from '../database';

export const teamService = {
    async getBySession(sessionId: string) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .eq('session_id', sessionId)
                .order('name');
            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch teams for session ${sessionId.substring(0, 8)}`);
    },

    async verifyLogin(teamId: string, sessionId: string, passcode: string) {
        return callRPC('verify_team_login', {
            p_team_id: teamId,
            p_session_id: sessionId,
            p_passcode: passcode.trim()
        }, {
            expectedSingle: true,
            context: `Team login verification for ${teamId}`,
            maxRetries: 2
        });
    },

    async create(teamData: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('teams')
                .insert(teamData)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, 'Create team');
    },

    async update(teamId: string, updates: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('teams')
                .update(updates)
                .eq('id', teamId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Update team ${teamId}`);
    },

    async delete(teamId: string) {
        return withRetry(async () => {
            const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);
            if (error) throw error;
        }, 2, 1000, `Delete team ${teamId}`);
    }
};
