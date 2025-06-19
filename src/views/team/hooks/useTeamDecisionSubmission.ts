// src/views/team/hooks/useTeamDecisionSubmission.ts
// FIXED VERSION - No endless loops, stable reset handling

import {useState, useCallback, useMemo, useEffect, useRef} from 'react';
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
    decisionResetTrigger?: number;
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

export const useTeamDecisionSubmission = ({
                                              sessionId,
                                              teamId,
                                              currentSlide,
                                              decisionState,
                                              isValidSubmission,
                                              gameStructure,
                                              decisionResetTrigger = 0
                                          }: UseTeamDecisionSubmissionProps): UseTeamDecisionSubmissionReturn => {

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    // ✅ FIXED: Use ref to track last processed reset trigger
    const lastProcessedResetTrigger = useRef<number>(0);

    const decisionKey = currentSlide?.interactive_data_key;

    console.log('🎯 useTeamDecisionSubmission initialized:', {
        sessionId,
        teamId,
        decisionKey,
        slideType: currentSlide?.type,
        resetTrigger: decisionResetTrigger
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
    // ⚠️  CRITICAL: STABLE RESET TRIGGER HANDLING - DO NOT CHANGE DEPENDENCIES
    // ========================================================================
    /**
     * 🚨 WARNING: ENDLESS LOOP PREVENTION 🚨
     *
     * This useEffect has been carefully crafted to prevent endless loops.
     *
     * ❌ DO NOT ADD THESE TO THE DEPENDENCY ARRAY:
     * - checkForExistingDecision (changes on every render)
     * - refreshImmediatePurchases (changes on every render)
     * - Any other function from useSupabaseQuery
     *
     * 💥 WHAT HAPPENS IF YOU ADD THEM:
     * 1. useEffect runs → calls refresh functions
     * 2. Functions change reference → useEffect runs again
     * 3. Infinite loop of database calls and re-renders
     * 4. App becomes unusable, console fills with logs
     * 5. Performance degrades severely
     *
     * ✅ ONLY SAFE DEPENDENCIES:
     * - decisionResetTrigger (primitive number, stable)
     * - Primitive values that don't change frequently
     *
     * 🔧 HOW THIS WORKS:
     * - Only processes NEW reset triggers (not repeated ones)
     * - Uses setTimeout to break synchronous call chains
     * - Prevents cascade effects from refresh functions
     */
    useEffect(() => {
        // Only process if this is a new reset trigger
        if (decisionResetTrigger > 0 && decisionResetTrigger !== lastProcessedResetTrigger.current) {
            console.log('🔄 Decision reset trigger detected, refreshing decision data');

            // Mark this trigger as processed to prevent duplicate processing
            lastProcessedResetTrigger.current = decisionResetTrigger;

            // Clear any existing submission success/error states
            setSubmissionSuccess(false);
            setSubmissionError(null);

            // ✅ CRITICAL: Use setTimeout to break the synchronous call chain
            // This prevents the refresh functions from immediately triggering more renders
            setTimeout(() => {
                checkForExistingDecision();
                refreshImmediatePurchases();
                console.log('🔄 Decision data refresh complete after reset');
            }, 50); // Very short delay to break the loop
        }
    }, [decisionResetTrigger]); // ⚠️  CRITICAL: ONLY this dependency - DO NOT ADD MORE!

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
                    ? decisionState.selectedInvestmentIds
                    : null,
                selected_challenge_option_id: decisionState.selectedChallengeOptionId || null,
                double_down_sacrifice_id: decisionState.sacrificeInvestmentId || null,
                double_down_on_id: decisionState.doubleDownOnInvestmentId || null,
                total_spent_budget: totalCost,
                submitted_at: new Date().toISOString(),
                is_immediate_purchase: false,
                immediate_purchase_type: null,
                immediate_purchase_data: null,
                report_given: false,
                report_given_at: null
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

                // ✅ FIXED: Use setTimeout to prevent immediate cascade
                setTimeout(() => {
                    checkForExistingDecision();
                    refreshImmediatePurchases();
                }, 100);
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

                const selectedChallenge = challengeOptions.find(ch => ch.id === existingDecision.selected_challenge_option_id);
                if (selectedChallenge) {
                    parts.push(`Challenge: ${selectedChallenge.id}`);
                }
            }

            // Add total cost
            if (existingDecision.total_spent_budget) {
                parts.push(`Total: ${formatCurrency(existingDecision.total_spent_budget)}`);
            }

            return parts.length > 0 ? parts.join(' • ') : 'Submitted';

        } catch (error) {
            console.error('🎯 Error formatting submission summary:', error);
            return 'Submitted';
        }
    }, [currentSlide, gameStructure, existingDecision]);

    // ========================================================================
    // STABLE SUBMIT HANDLER
    // ========================================================================
    const onSubmit = useCallback(async () => {
        if (isSubmitDisabled) return;

        try {
            await submitDecision({});
        } catch (error) {
            console.error('🎯 Submit handler error:', error);
        }
    }, [isSubmitDisabled, submitDecision]);

    return {
        isSubmitting,
        isSubmitDisabled,
        submissionError,
        submissionSuccess,
        hasExistingSubmission,
        existingSubmissionSummary,
        onSubmit,
    };
};
