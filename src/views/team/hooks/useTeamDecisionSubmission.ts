// src/views/team/hooks/useTeamDecisionSubmission.ts - FIXED Integration
import {useState, useCallback, useMemo, useEffect} from 'react';
import {useSupabaseMutation} from '@shared/hooks/supabase';
import {db} from '@shared/services/supabase';
import {GamePhaseNode} from '@shared/types';

// Define DecisionState locally to match useDecisionMaking
interface DecisionState {
    selectedInvestmentIds: string[];
    spentBudget: number;
    selectedChallengeOptionId: string | null;
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;
    error: string | null;
}

interface UseTeamDecisionSubmissionProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null;
    decisionState: DecisionState;
    isValidSubmission: boolean;
}

export interface UseTeamDecisionSubmissionReturn {
    // Submission state
    isSubmitting: boolean;
    isSubmitDisabled: boolean;
    submissionError: string | null;
    submissionSuccess: boolean;

    // UI control
    showConfirmationModal: boolean;
    setShowConfirmationModal: (show: boolean) => void;

    // Actions
    handleSubmit: () => void;
    confirmSubmit: () => Promise<void>;
    clearSubmissionMessage: () => void;
    retrySubmission: () => void;
}

export const useTeamDecisionSubmission = ({
                                              sessionId,
                                              teamId,
                                              currentPhase,
                                              decisionState,
                                              isValidSubmission
                                          }: UseTeamDecisionSubmissionProps): UseTeamDecisionSubmissionReturn => {

    // Local UI state
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    // Reset success state when phase changes
    useEffect(() => {
        if (currentPhase) {
            setSubmissionSuccess(false);
            setSubmissionError(null);
        }
    }, [currentPhase?.id]);

    // Supabase mutation for decision submission
    const {
        execute: submitDecisionMutation,
        isLoading: isMutationLoading,
        error: mutationError
    } = useSupabaseMutation(
        async (payload: any) => {
            if (!sessionId || !teamId || !currentPhase) {
                throw new Error('Missing required submission data');
            }

            console.log('[useTeamDecisionSubmission] Submitting decision:', payload);

            const submissionPayload = {
                session_id: sessionId,
                team_id: teamId,
                phase_id: currentPhase.id,
                round_number: currentPhase.round_number as 0 | 1 | 2 | 3,
                submitted_at: new Date().toISOString(),
                ...payload
            };

            // Create or update the decision
            const result = await db.decisions.create(submissionPayload);
            console.log('[useTeamDecisionSubmission] Submission successful:', result);
            return result;
        },
        {
            onSuccess: () => {
                console.log('[useTeamDecisionSubmission] Decision submitted successfully');
                setSubmissionError(null);
                setSubmissionSuccess(true);

                // Auto-clear success message after 3 seconds
                setTimeout(() => {
                    setSubmissionSuccess(false);
                }, 3000);
            },
            onError: (error) => {
                console.error('[useTeamDecisionSubmission] Submission failed:', error);
                setSubmissionError(error instanceof Error ? error.message : 'Submission failed');
                setSubmissionSuccess(false);
            }
        }
    );

    // Calculate if submit should be disabled
    const isSubmitDisabled = useMemo(() => {
        return isMutationLoading ||
            !isValidSubmission ||
            !sessionId ||
            !teamId ||
            !currentPhase ||
            submissionSuccess;
    }, [isMutationLoading, isValidSubmission, sessionId, teamId, currentPhase, submissionSuccess]);

    // Build decision payload based on phase type
    const buildDecisionPayload = useCallback(() => {
        if (!currentPhase) throw new Error('No active phase');

        const payload: any = {};

        switch (currentPhase.phase_type) {
            case 'invest':
                payload.selected_investment_ids = decisionState.selectedInvestmentIds;
                payload.total_spent_budget = decisionState.spentBudget;
                break;

            case 'choice':
                if (!decisionState.selectedChallengeOptionId) {
                    throw new Error('Please make a selection for the challenge');
                }
                payload.selected_challenge_option_id = decisionState.selectedChallengeOptionId;
                break;

            case 'double-down-prompt':
                if (!decisionState.selectedChallengeOptionId) {
                    throw new Error('Please select an option for the Double Down prompt');
                }
                payload.selected_challenge_option_id = decisionState.selectedChallengeOptionId;
                payload.wants_to_double_down = decisionState.selectedChallengeOptionId === 'yes_dd';
                break;

            case 'double-down-select':
                if (!decisionState.sacrificeInvestmentId || !decisionState.doubleDownOnInvestmentId) {
                    throw new Error('Both sacrifice and double-down selections are required');
                }
                payload.double_down_decision = {
                    investmentToSacrificeId: decisionState.sacrificeInvestmentId,
                    investmentToDoubleDownId: decisionState.doubleDownOnInvestmentId
                };
                break;

            default:
                throw new Error(`Unknown phase type: ${currentPhase.phase_type}`);
        }

        return payload;
    }, [currentPhase, decisionState]);

    // Handle initial submit button click
    const handleSubmit = useCallback(() => {
        setSubmissionError(null);

        if (!currentPhase || !sessionId || !teamId) {
            setSubmissionError('Missing session or team information');
            return;
        }

        if (!isValidSubmission) {
            setSubmissionError('Please complete your selections before submitting');
            return;
        }

        // For double-down-prompt, submit directly without confirmation
        if (currentPhase.phase_type === 'double-down-prompt') {
            confirmSubmit();
            return;
        }

        // For other phases, show confirmation modal
        setShowConfirmationModal(true);
    }, [sessionId, teamId, currentPhase, isValidSubmission]);

    // Handle confirmed submission
    const confirmSubmit = useCallback(async () => {
        setShowConfirmationModal(false);
        setSubmissionError(null);

        try {
            const payload = buildDecisionPayload();
            await submitDecisionMutation(payload);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Submission failed';
            console.error('[useTeamDecisionSubmission] Error in confirmSubmit:', errorMessage);
            setSubmissionError(errorMessage);
        }
    }, [buildDecisionPayload, submitDecisionMutation]);

    // Clear error messages
    const clearSubmissionMessage = useCallback(() => {
        setSubmissionError(null);
        setSubmissionSuccess(false);
    }, []);

    // Retry failed submission
    const retrySubmission = useCallback(() => {
        setSubmissionError(null);
        handleSubmit();
    }, [handleSubmit]);

    return {
        // State
        isSubmitting: isMutationLoading,
        isSubmitDisabled,
        submissionError: submissionError || mutationError,
        submissionSuccess,

        // UI control
        showConfirmationModal,
        setShowConfirmationModal,

        // Actions
        handleSubmit,
        confirmSubmit,
        clearSubmissionMessage,
        retrySubmission
    };
};
