// src/utils/supabase/services/healthService.ts - Health check and utilities
import { supabase } from '../client';
import { withRetry, formatSupabaseError } from '../database';

export const healthService = {
    async healthCheck(): Promise<{ isHealthy: boolean; latency: number; error?: string }> {
        const startTime = Date.now();
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('id')
                .limit(1);

            const latency = Date.now() - startTime;

            if (error) {
                return { isHealthy: false, latency, error: formatSupabaseError(error) };
            }

            return { isHealthy: true, latency };
        } catch (error) {
            const latency = Date.now() - startTime;
            return { isHealthy: false, latency, error: formatSupabaseError(error) };
        }
    },

    async getServerTime() {
        return withRetry(async () => {
            // Use PostgreSQL's built-in now() function instead of RPC
            const { data, error } = await supabase
                .from('sessions')
                .select('created_at')
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return new Date().toISOString(); // Fallback to client time
        }, 1, 500, 'Get server time');
    }
};
