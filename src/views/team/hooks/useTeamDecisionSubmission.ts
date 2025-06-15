// src/views/team/hooks/useTeamDecisionSubmission.ts
// FIXED VERSION - Uses broadcast commands instead of database realtime

import {useState, useCallback, useMemo, useEffect} from 'react';
import {useSupabaseMutation, useSupabaseQuery} from '@shared/hooks/supabase';
import {db, supabase} from '@shared/services/supabase';
import {Slide, InvestmentOption, ChallengeOption, GameStructure} from '@shared/types';
import {DecisionState} from './useDecisionMaking';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';

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
const parseInvestmentIds = (ids: any): string[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids;
    if (typeof ids === 'string') {
        try {
            const parsed = JSON.parse(ids);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
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

    // ✅ NEW: Listen for broadcast commands from host (REPLACES database realtime subscription)
    useEffect(() => {
        if (!sessionId || !teamId) return;

        const broadcastManager = SimpleBroadcastManager.getInstance(sessionId, 'team');

        const unsubscribeReset = broadcastManager.onHostCommand((command) => {
            console.log('🔄 [TEAM] Received host command:', command);

            if (command.action === 'decision_reset' && command.data?.teamId === teamId) {
                console.log('🔄 [TEAM] Decision was reset by host - refreshing UI');

                // Refresh queries to get fresh state
                checkForExistingDecision();
                refreshImmediatePurchases();

                // Clear submission success state
                setSubmissionSuccess(false);
                setSubmissionError(null);
            }
        });

        return unsubscribeReset;
    }, [sessionId, teamId, checkForExistingDecision, refreshImmediatePurchases]);

    const hasExistingSubmission = !!(existingDecision?.submitted_at);

    // Combines both regular and immediate purchases
    const existingSubmissionSummary = useMemo(() => {
        if (!currentSlide || !gameStructure) return null;
        const key = currentSlide.interactive_data_key!;

        switch (currentSlide.type) {
            case 'interactive_invest': {
                const investmentOptions = gameStructure.all_investment_options[key] || [];

                // Get regular selections - parse JSON string
                const regularSelectedIds = parseInvestmentIds(existingDecision?.selected_investment_ids);

                // Get immediate purchase selections - parse JSON string
                const immediateSelectedIds = (immediatePurchases || []).flatMap(
                    purchase => parseInvestmentIds(purchase.selected_investment_ids)
                );

                // Combine all selections
                const allSelectedIds = [...immediateSelectedIds, ...regularSelectedIds];

                if (allSelectedIds.length === 0) return "No investments selected";

                const selectedNames = allSelectedIds.map(id =>
                    investmentOptions.find(o => o.id === id)?.name.split('.')[0] || 'Unknown'
                ).join(', ');

                // Calculate total budget from both sources
                const regularBudget = existingDecision?.total_spent_budget || 0;
                const immediateBudget = (immediatePurchases || []).reduce(
                    (sum, purchase) => sum + (purchase.total_spent_budget || 0), 0
                );
                const totalBudget = regularBudget + immediateBudget;

                return `${selectedNames} (${formatCurrency(totalBudget)} spent)`;
            }

            case 'interactive_choice':
            case 'interactive_double_down_prompt': {
                const choiceOptions = gameStructure.all_challenge_options[key] || [];
                const choice = choiceOptions.find(o => o.id === existingDecision?.selected_challenge_option_id);
                return choice ? `Selected: ${choice.text}` : `Option ID: ${existingDecision?.selected_challenge_option_id}`;
            }
            default:
                return 'Decision submitted';
        }
    }, [existingDecision, immediatePurchases, currentSlide, gameStructure]);

    useEffect(() => {
        if (currentSlide?.id) {
            setSubmissionSuccess(false);
            setSubmissionError(null);
        }
    }, [currentSlide?.id]);

    const {execute: submitDecisionMutation, isLoading: isMutationLoading, error: mutationError} = useSupabaseMutation(
        (payload: any) => {
            if (!sessionId || !teamId || !currentSlide || !decisionKey) throw new Error('Missing submission data');
            if (hasExistingSubmission) throw new Error('A decision has already been submitted.');

            const submissionPayload = {
                session_id: sessionId,
                team_id: teamId,
                phase_id: decisionKey,
                round_number: currentSlide.round_number,
                ...payload
            };
            return db.decisions.upsert(submissionPayload);
        },
        {
            onSuccess: () => {
                setSubmissionError(null);
                setSubmissionSuccess(true);
                setTimeout(() => checkForExistingDecision(), 500);
            },
            onError: (error) => setSubmissionError(error instanceof Error ? error.message : 'Submission failed'),
        }
    );

    const isSubmitDisabled = isMutationLoading || isCheckingExisting || isCheckingImmediate || !isValidSubmission || hasExistingSubmission;

    const onSubmit = useCallback(async () => {
        if (isSubmitDisabled) return;

        setSubmissionError(null);
        try {
            const payload: any = {};
            switch (currentSlide?.type) {
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
            setSubmissionError(error instanceof Error ? error.message : 'Failed to prepare submission.');
        }
    }, [isSubmitDisabled, currentSlide, decisionState, submitDecisionMutation]);

    return {
        isSubmitting: isMutationLoading,
        isSubmitDisabled,
        submissionError: submissionError || mutationError,
        submissionSuccess,
        hasExistingSubmission,
        existingSubmissionSummary,
        onSubmit
    };
};
