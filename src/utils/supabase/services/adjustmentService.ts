// src/utils/supabase/services/adjustmentService.ts - Permanent adjustments
import { supabase } from '../client';
import { withRetry } from '../database';

export const adjustmentService = {
    async getBySession(sessionId: string) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('permanent_kpi_adjustments')
                .select('*')
                .eq('session_id', sessionId);
            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch adjustments for session ${sessionId.substring(0, 8)}`);
    },

    async create(adjustmentData: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('permanent_kpi_adjustments')
                .insert(adjustmentData)
                .select();
            if (error) throw error;
            return data;
        }, 2, 1000, 'Create KPI adjustments');
    },

    async deleteBySession(sessionId: string) {
        return withRetry(async () => {
            const { error } = await supabase
                .from('permanent_kpi_adjustments')
                .delete()
                .eq('session_id', sessionId);
            if (error) throw error;
        }, 2, 1000, `Delete adjustments for session ${sessionId.substring(0, 8)}`);
    }
};
