// src/shared/services/supabase/services/adjustmentService.ts
import {supabase} from '../client';
import {withRetry} from '../database';
import {PermanentKpiAdjustment} from "@shared/types";

const PERMANENT_KPI_ADJUSTMENTS_TABLE = 'permanent_kpi_adjustments';

export const adjustmentService = {
    async getBySession(sessionId: string): Promise<PermanentKpiAdjustment[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(PERMANENT_KPI_ADJUSTMENTS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', {ascending: true});
            if (error) {
                console.error(`[adjustmentService.getBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [] as PermanentKpiAdjustment[];
        }, 3, 1000, `Fetch adjustments for session ${sessionId.substring(0, 8)}`);
    },

    async create(adjustmentData: Omit<PermanentKpiAdjustment, 'id' | 'created_at'>): Promise<PermanentKpiAdjustment> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(PERMANENT_KPI_ADJUSTMENTS_TABLE)
                .insert(adjustmentData)
                .select();
            if (error) {
                console.error(`[adjustmentService.create(adjustmentData:${JSON.stringify(adjustmentData)})] failed with error: ${error}`)
                throw error;
            }
            return data as PermanentKpiAdjustment;
        }, 2, 1000, 'Create KPI adjustments');
    },

    async upsert(adjustments: Omit<PermanentKpiAdjustment, 'id' | 'created_at'>[]): Promise<PermanentKpiAdjustment> {
        return withRetry(async () => {
            if (adjustments.length === 0) return [];

            const {data, error} = await supabase
                .from(PERMANENT_KPI_ADJUSTMENTS_TABLE)
                .upsert(adjustments, {
                    // PRODUCTION: Use the new unique constraint
                    onConflict: 'session_id,team_id,applies_to_round_start,kpi_key,challenge_id,option_id',
                    ignoreDuplicates: true
                })
                .select();

            if (error) {
                // Ignore "no rows returned" error for pure ignore-duplicate upserts
                if (error.code === 'PGRST116') {
                    console.log('[adjustmentService.upsert] Upsert completed, no new rows were inserted (duplicates ignored).');
                    return [];
                }
                console.error(`[adjustmentService.upsert(adjustments:${adjustments.length} items)] failed with error: ${error}`)
                throw error;
            }
            return data as PermanentKpiAdjustment;
        }, 2, 1000, `Upsert KPI adjustments`);
    },

    async deleteBySession(sessionId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from(PERMANENT_KPI_ADJUSTMENTS_TABLE)
                .delete()
                .eq('session_id', sessionId);
            if (error) {
                console.error(`[adjustmentService.deleteBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete adjustments for session ${sessionId.substring(0, 8)}`);
    },
};
