// src/views/team/hooks/useTeamDecisionSubmission.ts
// UPDATED VERSION - Reacts to decision reset triggers

/**
 * ============================================================================
 * TEAM DECISION SUBMISSION HOOK
 * ============================================================================
 *
 * IMPORTANT: This hook does NOT create any real-time subscriptions
 * All real-time communication is handled by useTeamGameState.ts
 *
 * This hook is responsible for:
 * 1. Managing decision submission state
 * 2. Fetching existing decisions via polling
 * 3. Submitting new decisions to database
 * 4. Formatting decision summaries for display
 * 5. UPDATED: Reacting to decision reset triggers from useTeamGameState
 *
 * Real-time updates (like decision resets) are handled by the parent
 * useTeamGameState hook and communicated via the decisionResetTrigger mechanism.
 * ============================================================================
 */

import {useState, useCallback, useMemo, useEffect} from 'react';
import {useSupabaseMutation, useSupabaseQuery} from '@shared/hooks/supabase';
import {db, supabase} from '@shared/services/supabase';
import {Slide, InvestmentOption, ChallengeOption, GameStructure} from '@shared/types';
import {DecisionState} from './useDecisionMaking';

interface UseTeamDecisionSubmissionProps {
    sessionId: string | null;
    teamId: string | null;
    currentSlide: Slide | null;
    decisionState: DecisionState;
    isValidSubmission: boolean;
    investmentOptions?: InvestmentOption[];
    challengeOptions?: ChallengeOption[];
    gameStructure?: GameStructure;
    decisionResetTrigger?: number; // NEW: Reset trigger from useTeamGameState
}

export interface UseTeamDecisionSubmissionReturn {
    isSubmitting: boolean;
    isSubmitDisabled: boolean;
    submissionError: string | null;
    submissionSuccess: boolean;
    hasExistingSubmission: boolean;
    existingSubmissionSummary: string | null;
    onSubmit: () => Promise<void>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

const parseInvestmentIds = (ids: string | string[] | null | undefined): string[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids;
    try {
        const parsed = JSON.parse(ids);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useTeamDecisionSubmission = ({
                                              sessionId,
                                              teamId,
                                              currentSlide,
                                              decisionState,
                                              isValidSubmission,
                                              gameStructure,
                                              decisionResetTrigger = 0 // NEW: Default to 0 if not provided
                                          }: UseTeamDecisionSubmissionProps): UseTeamDecisionSubmissionReturn => {

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const decisionKey = currentSlide?.interactive_data_key;

    console.log('🎯 useTeamDecisionSubmission initialized:', {
        sessionId,
        teamId,
        decisionKey,
        slideType: currentSlide?.type,
        resetTrigger: decisionResetTrigger // NEW: Log the reset trigger
    });

    // ========================================================================
    // DATA FETCHING - REGULAR DECISIONS
    // ========================================================================
    const {
        data: existingDecision,
        refresh: checkForExistingDecision
    } = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId || !decisionKey) return null;

            console.log('🎯 Fetching existing decision for phase:', decisionKey);
            const decision = await db.decisions.getForPhase(sessionId, teamId, decisionKey);
            console.log('🎯 Existing decision found:', !!decision?.submitted_at);

            return decision;
        },
        [sessionId, teamId, decisionKey],
        {
            cacheKey: `decision-${sessionId}-${teamId}-${decisionKey}`,
            cacheTimeout: 5000,
            retryOnError: false
        }
    );

    // ========================================================================
    // NEW: REACT TO DECISION RESET TRIGGERS
    // When the host resets our team's decision, refresh our data
    // ========================================================================
    useEffect(() => {
        if (decisionResetTrigger > 0) {
            console.log('🔄 Decision reset trigger detected, refreshing decision data');

            // Clear any existing submission success/error states
            setSubmissionSuccess(false);
            setSubmissionError(null);

            // Refresh the existing decision data
            checkForExistingDecision();
            refreshImmediatePurchases();

            console.log('🔄 Decision data refresh complete after reset');
        }
    }, [decisionResetTrigger, checkForExistingDecision]);

    // ========================================================================
    // DATA FETCHING - IMMEDIATE PURCHASES
    // ========================================================================
    const {
        refresh: refreshImmediatePurchases
    } = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId || !decisionKey) return [];

            const immediatePhaseId = `${decisionKey}_immediate`;
            console.log('🎯 Fetching immediate purchases for phase:', immediatePhaseId);

            const {data, error} = await supabase
                .from('team_decisions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', immediatePhaseId)
                .eq('is_immediate_purchase', true);

            if (error) throw error;
            console.log('🎯 Immediate purchases found:', data?.length || 0);
            return data || [];
        },
        [sessionId, teamId, decisionKey],
        {
            cacheKey: `immediate-${sessionId}-${teamId}-${decisionKey}`,
            cacheTimeout: 5000,
            retryOnError: false
        }
    );

    // ========================================================================
    // DECISION SUBMISSION MUTATION
    // ========================================================================
    const {mutate: submitDecision, isLoading: isSubmitting} = useSupabaseMutation(
        async () => {
            if (!sessionId || !teamId || !decisionKey) {
                throw new Error('Missing required data for submission');
            }

            console.log('🎯 Submitting decision:', {
                sessionId,
                teamId,
                decisionKey,
                decisionState
            });

            // Calculate total cost from selected investments
            const totalCost = decisionState.selectedInvestmentIds.reduce((sum, id) => {
                const gameStructureWithData = gameStructure as GameStructure & {
                    all_investment_options?: Record<string, Array<{ id: string; name: string; cost: number }>>;
                };
                const investmentOptions = gameStructureWithData?.all_investment_options?.[decisionKey] || [];
                const investment = investmentOptions.find((inv) => inv.id === id);
                return sum + (investment?.cost || 0);
            }, 0);

            const submissionData = {
                session_id: sessionId,
                team_id: teamId,
                phase_id: decisionKey,
                round_number: currentSlide?.round_number || 1,
                selected_investment_ids: decisionState.selectedInvestmentIds.length > 0
                    ? decisionState.selectedInvestmentIds  // Send as array, not JSON string
                    : null,
                selected_challenge_option_id: decisionState.selectedChallengeOptionId || null,
                total_spent_budget: totalCost,
                submitted_at: new Date().toISOString(),
                is_immediate_purchase: false
            };

            const {data, error} = await supabase
                .from('team_decisions')
                .insert([submissionData])
                .select()
                .single();

            if (error) throw error;

            console.log('🎯 Decision submitted successfully:', data);
            return data;
        },
        {
            onSuccess: () => {
                console.log('🎯 Decision submission successful');
                setSubmissionSuccess(true);
                setSubmissionError(null);

                // Refresh data to show the new submission
                checkForExistingDecision();
                refreshImmediatePurchases();
            },
            onError: (error: unknown) => {
                console.error('🎯 Decision submission failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Submission failed';
                setSubmissionError(errorMessage);
                setSubmissionSuccess(false);
            }
        }
    );

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    const hasExistingSubmission = !!(existingDecision?.submitted_at);
    const isSubmitDisabled = !isValidSubmission || isSubmitting || hasExistingSubmission;

    // ========================================================================
    // SUBMISSION SUMMARY FORMATTING
    // ========================================================================
    const existingSubmissionSummary = useMemo(() => {
        if (!currentSlide || !gameStructure || !existingDecision) return null;

        const key = currentSlide.interactive_data_key;
        if (!key) return null;

        console.log('🎯 Formatting submission summary for:', key);

        try {
            const gameStructureWithData = gameStructure as GameStructure & {
                all_investment_options?: Record<string, Array<{ id: string; name: string; cost: number }>>;
                all_challenge_options?: Record<string, Array<{ id: string; name: string }>>;
            };

            const parts: string[] = [];

            // Add investment selections
            if (existingDecision.selected_investment_ids?.length > 0) {
                const decisionKey = currentSlide.interactive_data_key;
                const investmentOptions = decisionKey ?
                    gameStructureWithData.all_investment_options?.[decisionKey] || [] : [];

                const selectedInvestments = parseInvestmentIds(existingDecision.selected_investment_ids)
                    .map(id => investmentOptions.find(inv => inv.id === id))
                    .filter(Boolean);

                if (selectedInvestments.length > 0) {
                    parts.push(`Investments: ${selectedInvestments.map(inv => inv!.name).join(', ')}`);
                }
            }

            // Add challenge selection
            if (existingDecision.selected_challenge_option_id) {
                const decisionKey = currentSlide.interactive_data_key;
                const challengeOptions = decisionKey ?
                    gameStructureWithData.all_challenge_options?.[decisionKey] || [] : [];
                const selectedChallenge = challengeOptions.find(
                    opt => opt.id === existingDecision.selected_challenge_option_id
                );

                if (selectedChallenge) {
                    parts.push(`Challenge: ${selectedChallenge.id}`);
                }
            }

            // Add total cost
            if (existingDecision.total_spent_budget) {
                parts.push(`Total: ${formatCurrency(existingDecision.total_spent_budget)}`);
            }

            const summary = parts.join(' • ');
            console.log('🎯 Submission summary:', summary);
            return summary;

        } catch (error) {
            console.error('🎯 Error formatting submission summary:', error);
            return 'Previous submission found';
        }
    }, [currentSlide, gameStructure, existingDecision]);

    // ========================================================================
    // SUBMISSION HANDLER
    // ========================================================================
    const onSubmit = useCallback(async () => {
        if (!isValidSubmission || hasExistingSubmission) {
            console.log('🎯 Submission blocked - invalid or already submitted');
            return;
        }

        console.log('🎯 Starting decision submission process');
        setSubmissionError(null);
        try {
            await submitDecision({});
        } catch (error) {
            // Error is handled by the mutation's onError callback
            console.error('🎯 Submission failed:', error);
        }
    }, [isValidSubmission, hasExistingSubmission, submitDecision]);

    // ========================================================================
    // RETURN INTERFACE
    // ========================================================================
    return {
        isSubmitting,
        isSubmitDisabled,
        submissionError,
        submissionSuccess,
        hasExistingSubmission,
        existingSubmissionSummary,
        onSubmit
    };
};
