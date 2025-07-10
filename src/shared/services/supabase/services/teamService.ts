// src/shared/services/supabase/services/teamService.ts - Team CRUD operations
import {supabase} from '../client';
import {withRetry} from '../database';
import {Team} from "@shared/types";

const TEAMS_TABLE = 'teams';

export const teamService = {
    async getBySession(sessionId: string): Promise<Team[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAMS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .order('name');
            if (error) {
                console.error(`[teamService.getBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [] as Team[];
        }, 3, 1000, `Fetch teams for session ${sessionId.substring(0, 8)}`);
    },

    async verifyLogin(teamId: string, sessionId: string, passcode: string): Promise<Team | null> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAMS_TABLE)
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
            return data as Team | null;
        }, 2, 1000, `Team login verification for ${teamId.substring(0, 8)}`);
    },

    async create(teamData: Omit<Team, 'id' | 'created_at'>): Promise<Team> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAMS_TABLE)
                .insert(teamData)
                .select()
                .single();
            if (error) {
                console.error(`[teamService.create(teamData:${JSON.stringify(teamData)})] failed with error: ${error}`)
                throw error;
            }
            return data as Team;
        }, 2, 1000, 'Create team');
    },

    async update(teamId: string, updates: Partial<Team>): Promise<Team> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAMS_TABLE)
                .update(updates)
                .eq('id', teamId)
                .select()
                .single();
            if (error) {
                console.error(`[teamService.update(teamId:${teamId.substring(0, 8)}, updates:${JSON.stringify(updates)})] failed with error: ${error}`)
                throw error;
            }
            return data as Team;
        }, 2, 1000, `Update team ${teamId}`);
    },

    async delete(teamId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from(TEAMS_TABLE)
                .delete()
                .eq('id', teamId);
            if (error) {
                console.error(`[teamService.delete(teamId:${teamId.substring(0, 8)})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete team ${teamId}`);
    }
};
