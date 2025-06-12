// src/utils/supabase/services/adjustmentService.ts - Permanent adjustments
import { supabase } from '../client';
import { withRetry } from '../database';
import {PermanentKpiAdjustment} from "@shared/types";

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

    async upsert(adjustments: Omit<PermanentKpiAdjustment, 'id' | 'created_at'>[]) {
        return withRetry(async () => {
            if (adjustments.length === 0) return [];

            const { data, error } = await supabase
                .from('permanent_kpi_adjustments')
                .upsert(adjustments, {
                    // This tells Supabase which columns define a unique record.
                    // If a record with these values already exists, it won't insert a new one.
                    onConflict: 'session_id,team_id,applies_to_round_start,kpi_key',
                    // This tells Supabase to NOT update the row if it already exists.
                    // We just want to ignore duplicates, not overwrite them.
                    ignoreDuplicates: true
                })
                .select();

            if (error) {
                // We can specifically ignore the "no rows returned" error for pure ignore-duplicate upserts
                if (error.code === 'PGRST116') {
                    console.log('[adjustmentService.upsert] Upsert completed, no new rows were inserted (duplicates ignored).');
                    return [];
                }
                throw error;
            }
            return data;
        }, 2, 1000, `Upsert KPI adjustments`);
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
