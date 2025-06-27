
// src/shared/services/supabase/services/consequenceApplicationService.ts
// Service for managing consequence applications to prevent duplicate KPI updates

import {supabase} from '../client';
import {withRetry} from '../database';

export interface ConsequenceApplication {
    id: string;
    session_id: string;
    team_id: string;
    challenge_id: string;
    option_id: string;
    slide_id: number;
    applied_at: string;
    created_at: string;
}

export interface ConsequenceApplicationInsert {
    session_id: string;
    team_id: string;
    challenge_id: string;
    option_id: string;
    slide_id: number;
}

export const consequenceApplicationService = {

    /**
     * Get all consequence applications for a session
     */
    async getBySession(sessionId: string): Promise<ConsequenceApplication[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('consequence_applications')
                .select('*')
                .eq('session_id', sessionId)
                .order('applied_at', {ascending: false});

            if (error) {
                console.error(`[consequenceApplicationService.getBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [];
        }, 3, 1000, `Fetch consequence applications for session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Delete all consequence applications for a session
     */
    async deleteBySession(sessionId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from('consequence_applications')
                .delete()
                .eq('session_id', sessionId);

            if (error) {
                console.error(`[consequenceApplicationService.deleteBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete consequence applications for session ${sessionId.substring(0, 8)}`);
    }
};
