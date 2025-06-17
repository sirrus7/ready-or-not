// src/shared/services/supabase/services/sessionService.ts - Session management
import {supabase} from '../client';
import {withRetry} from '../database';

export const sessionService = {
    async get(sessionId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .single();
            if (error) throw error;
            return data;
        }, 3, 1000, `Fetch session ${sessionId.substring(0, 8)}`);
    },

    async update(sessionId: string, updates: any) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('sessions')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Update session ${sessionId.substring(0, 8)}`);
    },

    async create(sessionData: any) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('sessions')
                .insert({
                    ...sessionData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, 'Create session');
    },

    // Updated method name and column reference
    async getByHost(hostId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('sessions')
                .select('*')
                .eq('host_id', hostId) // Changed from teacher_id
                .order('created_at', {ascending: false});
            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch sessions for host ${hostId.substring(0, 8)}`);
    },

    // Keep the old method name for backward compatibility (can remove later)
    async getByTeacher(hostId: string) {
        return this.getByHost(hostId);
    },

    async delete(sessionId: string) {
        return withRetry(async () => {
            // Delete in correct order to respect foreign key constraints
            await supabase.from('permanent_kpi_adjustments').delete().eq('session_id', sessionId);
            await supabase.from('team_round_data').delete().eq('session_id', sessionId);
            await supabase.from('team_decisions').delete().eq('session_id', sessionId);
            await supabase.from('teams').delete().eq('session_id', sessionId);

            const {error} = await supabase
                .from('sessions')
                .delete()
                .eq('id', sessionId);
            if (error) throw error;
        }, 2, 1000, `Delete session ${sessionId.substring(0, 8)}`);
    },
};
