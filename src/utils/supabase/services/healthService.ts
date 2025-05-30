// src/utils/supabase/services/healthService.ts - Health check and utilities
import { supabase } from '../client';
import { withRetry, formatSupabaseError } from '../database';

export const healthService = {
    async healthCheck(): Promise<{ isHealthy: boolean; latency: number; error?: string }> {
        const startTime = Date.now();
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('count')
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
            const { data, error } = await supabase.rpc('get_server_time');
            if (error) throw error;
            return data;
        }, 1, 500, 'Get server time');
    }
};
