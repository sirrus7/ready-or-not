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
    showConfirmationModal: boolean;
    setShowConfirmationModal: (show: boolean) => void;
    handleSubmit: () => void;
    confirmSubmit: () => Promise<void>;
    clearSubmissionMessage: () => void;
    retrySubmission: () => void;
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

    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
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

        switch (currentSlide.type) {
            case 'interactive_invest':
                const selectedIds = existingDecision.selected_investment_ids || [];
                const totalSpent = existingDecision.total_spent_budget || 0;
                const budget = gameStructure.investment_phase_budgets[currentSlide.interactive_data_key!] || 0;
                const unspent = budget - totalSpent;

                if (selectedIds.length === 0) return `No investments selected (${formatCurrency(unspent)} unspent)`;

                const selectedNames = selectedIds.map(id => investmentOptions.find(opt => opt.id === id)?.name.split('.')[0] || `#${id.slice(-4)}`).join(', ');
                return `${selectedIds.length} investments: ${selectedNames} (${formatCurrency(totalSpent)} spent, ${formatCurrency(unspent)} unspent)`;

            case 'interactive_choice':
                const option = challengeOptions.find(opt => opt.id === existingDecision.selected_challenge_option_id);
                return option ? `Selected: ${option.id} - ${option.text.substring(0, 50)}...` : `Selected: ${existingDecision.selected_challenge_option_id}`;

            case 'interactive_double_down_prompt':
                const ddOption = challengeOptions.find(opt => opt.id === existingDecision.selected_challenge_option_id);
                return ddOption ? `Double Down: ${ddOption.text}` : `Choice: ${existingDecision.selected_challenge_option_id}`;

            case 'interactive_double_down_select':
                const ddDecision = existingDecision.double_down_decision;
                if (!ddDecision?.investmentToSacrificeId || !ddDecision?.investmentToDoubleDownId) return 'Incomplete double down selection';

                const rd3Options = gameStructure.all_investment_options['rd3-invest'] || [];
                const sacrificeOpt = rd3Options.find(opt => opt.id === ddDecision.investmentToSacrificeId);
                const ddOnOpt = rd3Options.find(opt => opt.id === ddDecision.investmentToDoubleDownId);
                return `Sacrifice: ${sacrificeOpt?.name || 'Unknown'}, Double: ${ddOnOpt?.name || 'Unknown'}`;

            default:
                return 'Decision submitted';
        }
    }, [existingDecision, currentSlide, investmentOptions, challengeOptions, gameStructure]);

    useEffect(() => {
        if (currentSlide) {
            setSubmissionSuccess(false);
            setSubmissionError(null);
            checkForExistingDecision();
        }
    }, [currentSlide?.id, checkForExistingDecision]);

    const {
        execute: submitDecisionMutation,
        isLoading: isMutationLoading,
        error: mutationError
    } = useSupabaseMutation(
        async (payload: any) => {
            if (!sessionId || !teamId || !currentSlide || !decisionKey) throw new Error('Missing submission data');
            if (hasExistingSubmission) throw new Error('A decision has already been submitted.');

            const submissionPayload = {
                session_id: sessionId, team_id: teamId, phase_id: decisionKey,
                round_number: currentSlide.round_number, submitted_at: new Date().toISOString(), ...payload
            };
            return db.decisions.create(submissionPayload);
        },
        {
            onSuccess: () => {
                setSubmissionError(null);
                setSubmissionSuccess(true);
                setTimeout(() => checkForExistingDecision(), 500);
                setTimeout(() => setSubmissionSuccess(false), 3000);
            },
            onError: (error) => setSubmissionError(error instanceof Error ? error.message : 'Submission failed'),
        }
    );

    const isSubmitDisabled = useMemo(() => isMutationLoading || isCheckingExisting || !isValidSubmission || !sessionId || !teamId || !currentSlide || hasExistingSubmission || submissionSuccess,
        [isMutationLoading, isCheckingExisting, isValidSubmission, sessionId, teamId, currentSlide, hasExistingSubmission, submissionSuccess]);

    const buildDecisionPayload = useCallback(() => {
        if (!currentSlide) throw new Error('No active slide');
        const payload: any = {};
        switch (currentSlide.type) {
            case 'interactive_invest':
                payload.selected_investment_ids = decisionState.selectedInvestmentIds;
                payload.total_spent_budget = decisionState.spentBudget;
                break;
            case 'interactive_choice':
            case 'interactive_double_down_prompt':
                if (!decisionState.selectedChallengeOptionId) throw new Error('Please make a selection');
                payload.selected_challenge_option_id = decisionState.selectedChallengeOptionId;
                if (currentSlide.type === 'interactive_double_down_prompt') payload.wants_to_double_down = decisionState.selectedChallengeOptionId === 'yes_dd';
                break;
            case 'interactive_double_down_select':
                if (!decisionState.sacrificeInvestmentId || !decisionState.doubleDownOnInvestmentId) throw new Error('Both selections are required');
                payload.double_down_decision = {
                    investmentToSacrificeId: decisionState.sacrificeInvestmentId,
                    investmentToDoubleDownId: decisionState.doubleDownOnInvestmentId
                };
                break;
            default:
                throw new Error(`Unknown interactive slide type: ${currentSlide.type}`);
        }
        return payload;
    }, [currentSlide, decisionState]);

    const confirmSubmit = useCallback(async () => {
        setShowConfirmationModal(false);
        setSubmissionError(null);
        if (hasExistingSubmission) return setSubmissionError('You have already submitted.');
        try {
            const payload = buildDecisionPayload();
            await submitDecisionMutation(payload);
        } catch (error) {
            setSubmissionError(error instanceof Error ? error.message : 'Submission failed');
        }
    }, [buildDecisionPayload, submitDecisionMutation, hasExistingSubmission]);

    const handleSubmit = useCallback(() => {
        setSubmissionError(null);
        if (!currentSlide || !sessionId || !teamId) return setSubmissionError('Missing session or team information');
        if (hasExistingSubmission) return setSubmissionError('You have already submitted a decision.');
        if (!isValidSubmission) return setSubmissionError('Please complete your selections.');

        if (currentSlide.type === 'interactive_double_down_prompt') {
            confirmSubmit();
        } else {
            setShowConfirmationModal(true);
        }
    }, [currentSlide, sessionId, teamId, isValidSubmission, hasExistingSubmission, confirmSubmit]);

    return {
        isSubmitting: isMutationLoading,
        isSubmitDisabled,
        submissionError: submissionError || mutationError,
        submissionSuccess,
        hasExistingSubmission,
        existingSubmissionSummary,
        showConfirmationModal,
        setShowConfirmationModal,
        handleSubmit,
        confirmSubmit,
        clearSubmissionMessage: () => {
            setSubmissionError(null);
            setSubmissionSuccess(false);
        },
        retrySubmission: () => {
            setSubmissionError(null);
            checkForExistingDecision();
            handleSubmit();
        }
    };
};
