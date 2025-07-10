// src/shared/services/supabase/services/sessionService.ts - Session management
import {supabase} from '../client';
import {withRetry} from '../database';
import {GameSession} from "@shared/types";

const SESSIONS_TABLE = 'sessions';

export const sessionService = {
    async getById(sessionId: string): Promise<GameSession> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(SESSIONS_TABLE)
                .select('*')
                .eq('id', sessionId)
                .single();
            if (error) {
                console.error(`[sessionService.getById(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data as GameSession;
        }, 3, 1000, `Fetch session ${sessionId.substring(0, 8)}`);
    },

    async update(sessionId: string, updates: Partial<Omit<GameSession, 'id' | 'created_at' | 'updated_at'>>): Promise<GameSession> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(SESSIONS_TABLE)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)
                .select()
                .single();
            if (error) {
                console.error(`[sessionService.update(sessionId:${sessionId}, updates:${JSON.stringify(updates)})] failed with error: ${error}`)
                throw error;
            }
            return data as GameSession;
        }, 2, 1000, `Update session ${sessionId.substring(0, 8)}`);
    },

    async create(sessionData: Omit<GameSession, 'id' | 'created_at' | 'updated_at'>): Promise<GameSession> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(SESSIONS_TABLE)
                .insert({
                    ...sessionData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            if (error) {
                console.error(`[sessionService.create(sessionData:${JSON.stringify(sessionData)})] failed with error: ${error}`)
                throw error;
            }
            return data as GameSession;
        }, 2, 1000, 'Create session');
    },

    // Updated method name and column reference
    async getByHost(hostId: string): Promise<GameSession[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(SESSIONS_TABLE)
                .select('*')
                .eq('host_id', hostId)
                .order('created_at', {ascending: false});
            if (error) {
                console.error(`[sessionService.getByHost(hostId:${hostId.substring(0, 8)})] failed with error: ${error}`)
                throw error;
            }
            return (data || []) as GameSession[];
        }, 3, 1000, `Fetch sessions for host ${hostId.substring(0, 8)}`);
    },

    async delete(sessionId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from(SESSIONS_TABLE)
                .delete()
                .eq('id', sessionId);
            if (error) {
                console.error(`[sessionService.delete(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete session ${sessionId.substring(0, 8)}`);
    },
};
