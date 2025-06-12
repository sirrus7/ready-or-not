// src/views/team/hooks/useTeamDecisionSubmission.ts
import {useState, useCallback, useMemo, useEffect} from 'react';
import {useSupabaseMutation, useSupabaseQuery} from '@shared/hooks/supabase';
import {db} from '@shared/services/supabase';
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

export const useTeamDecisionSubmission = ({
                                              sessionId,
                                              teamId,
                                              currentSlide,
                                              decisionState,
                                              isValidSubmission,
                                              investmentOptions = [],
                                              challengeOptions = [],
                                              gameStructure
                                          }: UseTeamDecisionSubmissionProps): UseTeamDecisionSubmissionReturn => {
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const decisionKey = currentSlide?.interactive_data_key;

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

    const hasExistingSubmission = !!(existingDecision?.submitted_at);

    const existingSubmissionSummary = useMemo(() => {
        if (!existingDecision || !currentSlide || !gameStructure) return null;
        const key = currentSlide.interactive_data_key!;

        switch (currentSlide.type) {
            case 'interactive_invest':
                const investmentOptions = gameStructure.all_investment_options[key] || [];
                const selectedIds = existingDecision.selected_investment_ids || [];
                if (selectedIds.length === 0) return "No investments selected";
                const selectedNames = selectedIds.map(id => investmentOptions.find(o => o.id === id)?.name.split('.')[0] || 'Unknown').join(', ');
                return `${selectedNames} (${formatCurrency(existingDecision.total_spent_budget || 0)} spent)`;

            case 'interactive_choice':
            case 'interactive_double_down_prompt':
                const choiceOptions = gameStructure.all_challenge_options[key] || [];
                const choice = choiceOptions.find(o => o.id === existingDecision.selected_challenge_option_id);
                return choice ? `Selected: ${choice.text}` : `Option ID: ${existingDecision.selected_challenge_option_id}`;
            default:
                return 'Decision submitted';
        }
    }, [existingDecision, currentSlide, gameStructure]);

    useEffect(() => {
        if (currentSlide) {
            setSubmissionSuccess(false);
            setSubmissionError(null);
            checkForExistingDecision();
        }
    }, [currentSlide?.id, checkForExistingDecision]);

    const {execute: submitDecisionMutation, isLoading: isMutationLoading, error: mutationError} = useSupabaseMutation(
        (payload: any) => {
            if (!sessionId || !teamId || !currentSlide || !decisionKey) throw new Error('Missing submission data');
            if (hasExistingSubmission) throw new Error('A decision has already been submitted.');

            const submissionPayload = {
                session_id: sessionId,
                team_id: teamId,
                phase_id: decisionKey,
                round_number: currentSlide.round_number, ...payload
            };
            return db.decisions.upsert(submissionPayload); // Use upsert for safety
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

    const isSubmitDisabled = isMutationLoading || isCheckingExisting || !isValidSubmission || hasExistingSubmission;

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
                // Add other cases as needed
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
