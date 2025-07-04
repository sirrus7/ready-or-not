// src/shared/services/supabase/services/teamService.ts - Team CRUD operations
import { supabase } from '../client';
import { withRetry } from '../database';

export const teamService = {
    async getBySession(sessionId: string) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .eq('session_id', sessionId)
                .order('name');
            if (error) {
                console.error(`[teamService.getBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [];
        }, 3, 1000, `Fetch teams for session ${sessionId.substring(0, 8)}`);
    },

    async verifyLogin(teamId: string, sessionId: string, passcode: string) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .eq('session_id', sessionId)
                .eq('passcode', passcode.trim())
                .single();
            if (error) {
                // If no matching team found, return null instead of throwing
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error(`[teamService.verifyLogin(teamId:${teamId.substring(0, 8)}, sessionId:${sessionId}, passcode:***)] failed with error: ${error}`)
                throw error;
            }
            return data;
        }, 2, 1000, `Team login verification for ${teamId.substring(0, 8)}`);
    },

    async create(teamData: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('teams')
                .insert(teamData)
                .select()
                .single();
            if (error) {
                console.error(`[teamService.create(teamData:${JSON.stringify(teamData)})] failed with error: ${error}`)
                throw error;
            }
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
            if (error) {
                console.error(`[teamService.update(teamId:${teamId.substring(0, 8)}, updates:${JSON.stringify(updates)})] failed with error: ${error}`)
                throw error;
            }
            return data;
        }, 2, 1000, `Update team ${teamId}`);
    },

    async delete(teamId: string) {
        return withRetry(async () => {
            const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);
            if (error) {
                console.error(`[teamService.delete(teamId:${teamId.substring(0, 8)})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete team ${teamId}`);
    }
};
