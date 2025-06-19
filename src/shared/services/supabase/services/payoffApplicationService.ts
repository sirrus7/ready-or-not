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
     * Check if a payoff has already been applied to a team for a specific investment and slide
     */
    async hasBeenApplied(
        sessionId: string,
        teamId: string,
        investmentPhaseId: string,
        optionId: string
    ): Promise<boolean> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('payoff_applications')
                .select('id')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('investment_phase_id', investmentPhaseId)
                .eq('option_id', optionId)
                .limit(1);

            if (error) throw error;
            return (data?.length || 0) > 0;
        }, 2, 1000, `Check payoff application for team ${teamId.substring(0, 8)}, phase ${investmentPhaseId}, option ${optionId}`);
    },

    /**
     * Record that a payoff has been applied to a team
     */
    async recordApplication(applicationData: PayoffApplicationInsert): Promise<PayoffApplication> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('payoff_applications')
                .insert(applicationData)
                .select()
                .single();

            if (error) {
                // If it's a unique constraint violation, that's actually OK - means already applied
                if (error.code === '23505') { // Unique violation
                    console.log(`[PayoffApplicationService] Payoff already recorded for team ${applicationData.team_id.substring(0, 8)}, phase ${applicationData.investment_phase_id}, option ${applicationData.option_id}`);
                    // Return existing record
                    const {data: existingData, error: fetchError} = await supabase
                        .from('payoff_applications')
                        .select()
                        .eq('session_id', applicationData.session_id)
                        .eq('team_id', applicationData.team_id)
                        .eq('investment_phase_id', applicationData.investment_phase_id)
                        .eq('option_id', applicationData.option_id)
                        .single();

                    if (fetchError) throw fetchError;
                    return existingData;
                }
                throw error;
            }

            return data;
        }, 2, 1000, `Record payoff application for team ${applicationData.team_id.substring(0, 8)}, phase ${applicationData.investment_phase_id}, option ${applicationData.option_id}`);
    },

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

            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch payoff applications for session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Get all payoff applications for a specific team
     */
    async getByTeam(sessionId: string, teamId: string): Promise<PayoffApplication[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('payoff_applications')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .order('applied_at', {ascending: true});

            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch payoff applications for team ${teamId.substring(0, 8)}`);
    },

    /**
     * Get applications for a specific investment
     */
    async getByInvestment(sessionId: string, investmentId: string): Promise<PayoffApplication[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('payoff_applications')
                .select('*')
                .eq('session_id', sessionId)
                .eq('investment_id', investmentId)
                .order('applied_at', {ascending: true});

            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch payoff applications for investment ${investmentId}`);
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

            if (error) throw error;
        }, 2, 1000, `Delete payoff applications for session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Delete applications for a specific investment (for investment reset)
     */
    async deleteByInvestment(sessionId: string, investmentId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from('payoff_applications')
                .delete()
                .eq('session_id', sessionId)
                .eq('investment_id', investmentId);

            if (error) throw error;
        }, 2, 1000, `Delete payoff applications for investment ${investmentId} in session ${sessionId.substring(0, 8)}`);
    }
};
