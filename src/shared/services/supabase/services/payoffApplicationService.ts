// src/shared/services/supabase/services/payoffApplicationService.ts
// Service for managing payoff applications to prevent duplicate KPI updates

import {supabase} from '../client';
import {withRetry} from '../database';

export interface PayoffApplication {
    id: string;
    session_id: string;
    team_id: string;
    investment_id: string;
    slide_id: number;  // Changed to number to match schema
    applied_at: string;
    created_at: string;
}

export interface PayoffApplicationInsert {
    session_id: string;
    team_id: string;
    investment_phase_id: string;
    option_id: string;
    slide_id: number;
}

export const payoffApplicationService = {
     /**
     * Get all payoff applications for a session
     */
    async getBySession(sessionId: string): Promise<PayoffApplication[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('payoff_applications')
                .select('*')
                .eq('session_id', sessionId)
                .order('applied_at', {ascending: true});

            if (error) {
                console.error(`[payoffApplicationService.getBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [];
        }, 3, 1000, `Fetch payoff applications for session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Delete all payoff applications for a session (for game reset)
     */
    async deleteBySession(sessionId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from('payoff_applications')
                .delete()
                .eq('session_id', sessionId);

            if (error) {
                console.error(`[payoffApplicationService.deleteBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete payoff applications for session ${sessionId.substring(0, 8)}`);
    },
};
