// src/shared/services/supabase/services/doubleDownService.ts
import {supabase} from '../client';
import {withRetry} from '../database';
import {DoubleDownResult} from "@shared/types";

const DOUBLE_DOWN_RESULTS_TABLE = 'double_down_results';

export const doubleDownService = {
    async getResultsForSession(sessionId: string): Promise<DoubleDownResult[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(DOUBLE_DOWN_RESULTS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', {ascending: true});

            if (error) {
                console.error(`[doubleDownService.getResultsForSession(sessionId:${sessionId})] failed with error: ${error}`);
                throw error;
            }
            return data || [] as DoubleDownResult[];
        }, 3, 1000, `Fetch double down results for session ${sessionId.substring(0, 8)}`);
    },

    async getResultForInvestment(sessionId: string, investmentId: string): Promise<DoubleDownResult | null> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(DOUBLE_DOWN_RESULTS_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .eq('investment_id', investmentId)
                .limit(1); // Get at most 1 result

            if (error) {
                console.error(`[doubleDownService.getResultForInvestment(sessionId:${sessionId}, investmentId:${investmentId})] failed with error: ${error}`);
                throw error;
            }

            // Return first result or null if no results
            return data && data.length > 0 ? data[0] : null;
        }, 3, 1000, `Get double down result for investment ${investmentId}`);
    },

    async saveResult(resultData: Omit<DoubleDownResult, 'id' | 'created_at'>): Promise<DoubleDownResult> {
        return withRetry(async () => {
            // Use upsert to handle duplicates gracefully
            const {data, error} = await supabase
                .from('double_down_results')
                .upsert({
                    ...resultData,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'session_id,investment_id', // Handle duplicates on this combination
                    ignoreDuplicates: false // We want to update if exists
                })
                .select()
                .single();

            if (error) {
                console.error(`[doubleDownService.saveResult(sessionId:${resultData.session_id}, investmentId:${resultData.investment_id})] failed with error: ${error}`);
                throw error;
            }
            return data as DoubleDownResult;
        }, 2, 1000, `Save double down result for investment ${resultData.investment_id}`);
    },
};
