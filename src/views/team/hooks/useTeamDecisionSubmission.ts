// src/views/team/hooks/useTeamDecisionSubmission.ts
// PRODUCTION-GRADE FIXED VERSION - Removed BroadcastChannel usage, implements proper Supabase real-time only

/**
 * COMMUNICATION ARCHITECTURE RULE:
 * - Host ↔ Presentation Display: Use BroadcastChannel (same device)
 * - Host ↔ Team Apps: Use Supabase Real-time ONLY (different devices)
 * - Team Apps: NEVER use BroadcastChannel - it won't work cross-device
 */

import {useState, useCallback, useMemo, useEffect} from 'react';
import {useSupabaseMutation, useSupabaseQuery} from '@shared/hooks/supabase';
import {useRealtimeSubscription} from '@shared/services/supabase';
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

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

// Helper function to parse selected_investment_ids (which can be JSON string or array)
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
                                              gameStructure
                                          }: UseTeamDecisionSubmissionProps): UseTeamDecisionSubmissionReturn => {
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const decisionKey = currentSlide?.interactive_data_key;

    // Query for regular decisions
    const {
        data: existingDecision,
        isLoading: isCheckingExisting,
        refresh: checkForExistingDecision
    } = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId || !decisionKey) return null;
            return db.decisions.getForPhase(sessionId, teamId, decisionKey);
        },
        [sessionId, teamId, decisionKey],
        {cacheKey: `decision-${sessionId}-${teamId}-${decisionKey}`, cacheTimeout: 5000, retryOnError: false}
    );

    // Query for immediate purchases
    const {
        data: immediatePurchases,
        isLoading: isCheckingImmediate,
        refresh: refreshImmediatePurchases
    } = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId || !decisionKey) return [];

            const immediatePhaseId = `${decisionKey}_immediate`;

            const {data, error} = await supabase
                .from('team_decisions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', immediatePhaseId)
                .eq('is_immediate_purchase', true);

            if (error) throw error;
            return data || [];
        },
        [sessionId, teamId, decisionKey],
        {cacheKey: `immediate-${sessionId}-${teamId}-${decisionKey}`, cacheTimeout: 5000, retryOnError: false}
    );

    // SUPABASE REAL-TIME: Listen for decision resets (REPLACES BroadcastChannel)
    useRealtimeSubscription(
        `decision-resets-${sessionId}-${teamId}`,
        {
            table: 'team_decisions',
            filter: `session_id=eq.${sessionId}.and.team_id=eq.${teamId}`,
            event: 'DELETE',
            onchange: (payload) => {
                console.log('🔄 [TEAM] Decision reset detected via Supabase real-time:', payload);

                // Check if the reset affects our current decision phase
                const deletedPhaseId = payload.old?.phase_id;
                if (deletedPhaseId && (deletedPhaseId === decisionKey || deletedPhaseId === `${decisionKey}_immediate`)) {
                    console.log('🔄 [TEAM] Our decision was reset by host - refreshing UI');

                    // Refresh queries to get fresh state
                    checkForExistingDecision();
                    refreshImmediatePurchases();

                    // Clear submission success state
                    setSubmissionSuccess(false);
                    setSubmissionError(null);
                }
            }
        },
        !!sessionId && !!teamId
    );

    // SUPABASE REAL-TIME: Listen for new decision submissions (for immediate feedback)
    useRealtimeSubscription(
        `decision-updates-${sessionId}-${teamId}`,
        {
            table: 'team_decisions',
            filter: `session_id=eq.${sessionId}.and.team_id=eq.${teamId}`,
            event: 'INSERT',
            onchange: (payload) => {
                console.log('✅ [TEAM] New decision submission detected via Supabase real-time:', payload);

                // Refresh our decision data to show the new submission
                checkForExistingDecision();
                refreshImmediatePurchases();
            }
        },
        !!sessionId && !!teamId
    );

    const hasExistingSubmission = !!(existingDecision?.submitted_at);

    // Combines both regular and immediate purchases
    const existingSubmissionSummary = useMemo(() => {
        if (!currentSlide || !gameStructure) return null;
        const key = currentSlide.interactive_data_key;
        if (!key || !existingDecision) return null;

        const gameStructureWithData = gameStructure as GameStructure & {
            interactive_data?: Record<string, {
                investment_options?: Array<{ id: string; name: string; cost: number }>;
                challenge_options?: Array<{ id: string; name: string }>;
            }>;
        };

        const interactiveData = gameStructureWithData.interactive_data?.[key];
        if (!interactiveData) return null;

        let summary = '';

        // Handle investment decisions
        if (existingDecision.selected_investment_ids) {
            const selectedIds = parseInvestmentIds(existingDecision.selected_investment_ids);
            if (selectedIds.length > 0 && interactiveData.investment_options) {
                const selectedInvestments = interactiveData.investment_options.filter(inv =>
                    selectedIds.includes(inv.id)
                );
                const totalCost = selectedInvestments.reduce((sum, inv) => sum + inv.cost, 0);
                summary += `Investments: ${formatCurrency(totalCost)}`;

                if (selectedInvestments.length <= 3) {
                    summary += ` (${selectedInvestments.map(inv => inv.name).join(', ')})`;
                } else {
                    summary += ` (${selectedInvestments.length} investments)`;
                }
            }
        }

        // Handle challenge decisions
        if (existingDecision.selected_challenge_option_id && interactiveData.challenge_options) {
            const selectedChallenge = interactiveData.challenge_options.find(ch =>
                ch.id === existingDecision.selected_challenge_option_id
            );
            if (selectedChallenge) {
                if (summary) summary += ' | ';
                summary += `Challenge: ${selectedChallenge.name}`;
            }
        }

        // Add immediate purchases
        if (immediatePurchases && immediatePurchases.length > 0) {
            const immediateCost = immediatePurchases.reduce((sum, purchase) => {
                const ids = parseInvestmentIds(purchase.selected_investment_ids);
                const cost = ids.reduce((invSum, id) => {
                    const investment = interactiveData.investment_options?.find(inv => inv.id === id);
                    return invSum + (investment?.cost || 0);
                }, 0);
                return sum + cost;
            }, 0);

            if (immediateCost > 0) {
                if (summary) summary += ' | ';
                summary += `Immediate: ${formatCurrency(immediateCost)}`;
            }
        }

        return summary || null;
    }, [currentSlide, gameStructure, existingDecision, immediatePurchases]);

    // Submission mutation - CORRECTED to use proper database method
    const {
        execute: submitDecisionMutation,
        isLoading: isSubmitting,
        error: mutationError
    } = useSupabaseMutation(
        async (payload: Record<string, unknown>) => {
            console.log('[useTeamDecisionSubmission] Submitting decision with payload:', payload);

            // Use upsert to handle potential duplicates
            await db.decisions.upsert(payload);
            console.log('[useTeamDecisionSubmission] Decision submitted successfully');

            // Refresh to show updated state
            checkForExistingDecision();
            refreshImmediatePurchases();
            setSubmissionSuccess(true);
            setSubmissionError(null);
        }
    );

    const onSubmit = useCallback(async () => {
        if (!isValidSubmission || !sessionId || !teamId || !decisionKey || !currentSlide) return;

        try {
            console.log('[useTeamDecisionSubmission] Submitting decision for phase:', decisionKey);

            // Build submission payload based on decision state
            const payload: Record<string, unknown> = {
                session_id: sessionId,
                team_id: teamId,
                phase_id: decisionKey,
                round_number: currentSlide.round_number,
                submitted_at: new Date().toISOString()
            };

            // Add decision-specific data
            switch (currentSlide.type) {
                case 'interactive_invest':
                    payload.selected_investment_ids = decisionState.selectedInvestmentIds;
                    payload.total_spent_budget = decisionState.spentBudget;
                    break;
                case 'interactive_choice':
                case 'interactive_double_down_prompt':
                    payload.selected_challenge_option_id = decisionState.selectedChallengeOptionId;
                    break;
                default:
                    throw new Error("Cannot submit for this slide type.");
            }

            await submitDecisionMutation(payload);
        } catch (error) {
            console.error('[useTeamDecisionSubmission] Submission failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Submission failed';
            setSubmissionError(errorMessage);
            setSubmissionSuccess(false);
        }
    }, [isValidSubmission, sessionId, teamId, decisionKey, currentSlide, decisionState, submitDecisionMutation]);

    // Update submission error from mutation
    useEffect(() => {
        if (mutationError) {
            const errorMessage = mutationError instanceof Error ? mutationError.message : 'Submission failed';
            setSubmissionError(errorMessage);
        }
    }, [mutationError]);

    const isSubmitDisabled = !isValidSubmission || isSubmitting || isCheckingExisting || hasExistingSubmission;

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
