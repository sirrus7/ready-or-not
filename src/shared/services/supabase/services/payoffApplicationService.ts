// src/shared/services/supabase/services/payoffApplicationService.ts
// Service for managing payoff applications to prevent duplicate KPI updates

import {supabase} from '../client';
import {withRetry} from '../database';
import {PayoffApplication} from "@shared/types";

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

    /**
     * Check if effects have been applied for a specific team, option, and phase
     */
    async hasBeenApplied(payoff: Pick<PayoffApplication, 'session_id' | 'team_id' | 'option_id' | 'investment_phase_id'>): Promise<boolean> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('payoff_applications')
                .select('id')
                .eq('session_id', payoff.session_id)
                .eq('team_id', payoff.team_id)
                .eq('option_id', payoff.option_id)
                .eq('investment_phase_id', payoff.investment_phase_id)
                .limit(1);

            if (error) {
                console.error(`[payoffApplicationService.hasBeenApplied(sessionId:${payoff.session_id}, teamId:${payoff.team_id}, optionId:${payoff.option_id}, phaseId:${payoff.investment_phase_id})] failed with error: ${error}`);
                throw error;
            }
            return (data?.length || 0) > 0;
        }, 2, 1000, `Check if effects applied for team ${payoff.team_id.substring(0, 8)}`);
    },

    /**
     * Record that effects have been applied for a specific team, option, and phase
     */
    async recordApplication(applicationData: Omit<PayoffApplication, 'id' | 'created_at' | 'applied_at'>): Promise<void> {
        return withRetry(async () => {
            // Check if already exists first to avoid duplicate errors
            const existing = await this.hasBeenApplied(applicationData);

            if (existing) {
                console.log(`[payoffApplicationService.recordApplication] Already applied for team ${applicationData.team_id.substring(0, 8)}, option ${applicationData.option_id}, phase ${applicationData.investment_phase_id}`);
                return;
            }

            const {data, error} = await supabase
                .from('payoff_applications')
                .insert({
                    ...applicationData,
                    applied_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                // If it's a duplicate error, that's actually OK - effects were already applied
                if (error.code === '23505') { // PostgreSQL unique violation error code
                    console.log(`[payoffApplicationService.recordApplication] Effects already recorded (duplicate), continuing...`);
                    return null;
                }
                console.error(`[payoffApplicationService.recordApplication] failed with error: ${error}`);
                throw error;
            }
            return data
        }, 2, 1000, `Record payoff application for team ${applicationData.team_id.substring(0, 8)}`);
    },
};
