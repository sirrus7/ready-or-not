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
     * Check if a consequence has already been applied to a team
     */
    async hasBeenApplied(
        sessionId: string,
        teamId: string,
        challengeId: string,
        optionId: string
    ): Promise<boolean> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('consequence_applications')
                .select('id')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('challenge_id', challengeId)
                .eq('option_id', optionId)
                .limit(1);

            if (error) throw error;
            return (data?.length || 0) > 0;
        }, 2, 1000, `Check consequence application for team ${teamId.substring(0, 8)}, challenge ${challengeId}, option ${optionId}`);
    },

    /**
     * Record that a consequence has been applied to a team
     */
    async recordApplication(applicationData: ConsequenceApplicationInsert): Promise<ConsequenceApplication> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('consequence_applications')
                .insert(applicationData)
                .select()
                .single();

            if (error) {
                // If it's a unique constraint violation, that's actually OK - means already applied
                if (error.code === '23505') { // Unique violation
                    console.log(`[ConsequenceApplicationService] Consequence already recorded for team ${applicationData.team_id.substring(0, 8)}, challenge ${applicationData.challenge_id}`);
                    // Return existing record
                    const {data: existingData, error: fetchError} = await supabase
                        .from('consequence_applications')
                        .select()
                        .eq('session_id', applicationData.session_id)
                        .eq('team_id', applicationData.team_id)
                        .eq('challenge_id', applicationData.challenge_id)
                        .eq('option_id', applicationData.option_id)
                        .single();

                    if (fetchError) throw fetchError;
                    return existingData;
                }
                throw error;
            }

            return data;
        }, 2, 1000, `Record consequence application for team ${applicationData.team_id.substring(0, 8)}`);
    },

    /**
     * Get all consequence applications for a session
     */
    async getBySession(sessionId: string): Promise<ConsequenceApplication[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('consequence_applications')
                .select('*')
                .eq('session_id', sessionId)
                .order('applied_at', {ascending: true});

            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch consequence applications for session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Get all consequence applications for a specific team
     */
    async getByTeam(sessionId: string, teamId: string): Promise<ConsequenceApplication[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('consequence_applications')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .order('applied_at', {ascending: true});

            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch consequence applications for team ${teamId.substring(0, 8)}`);
    },

    /**
     * Get applications for a specific challenge
     */
    async getByChallenge(sessionId: string, challengeId: string): Promise<ConsequenceApplication[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('consequence_applications')
                .select('*')
                .eq('session_id', sessionId)
                .eq('challenge_id', challengeId)
                .order('applied_at', {ascending: true});

            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch consequence applications for challenge ${challengeId}`);
    },

    /**
     * Delete all consequence applications for a session (for game reset)
     */
    async deleteBySession(sessionId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from('consequence_applications')
                .delete()
                .eq('session_id', sessionId);

            if (error) throw error;
        }, 2, 1000, `Delete consequence applications for session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Delete applications for a specific challenge (for challenge reset)
     */
    async deleteByChallenge(sessionId: string, challengeId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from('consequence_applications')
                .delete()
                .eq('session_id', sessionId)
                .eq('challenge_id', challengeId);

            if (error) throw error;
        }, 2, 1000, `Delete consequence applications for challenge ${challengeId} in session ${sessionId.substring(0, 8)}`);
    }
};
