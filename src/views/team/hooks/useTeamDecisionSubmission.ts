// src/views/team/hooks/useTeamDecisionSubmission.ts - Consolidated Decision submission logic and UI management
import {useState, useCallback, useMemo} from 'react';
import {useSupabaseMutation} from '@shared/hooks/supabase'; // Correct import
import {db} from '@shared/services/supabase'; // Correct import
import {GamePhaseNode} from '@shared/types'; // Correct import
import {DecisionState} from '@views/team/hooks/useDecisionMaking'; // Correct import (from useDecisionLogic)

interface UseTeamDecisionSubmissionProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null;
    decisionState: DecisionState; // Now directly accepts DecisionState
}

export interface UseTeamDecisionSubmissionReturn {
    isSubmitting: boolean;
    isSubmitDisabled: boolean;
    handleSubmit: () => void; // This will now trigger the modal or direct submission
    showConfirmationModal: boolean;
    setShowConfirmationModal: (show: boolean) => void;
    confirmSubmit: () => Promise<void>; // This will perform the actual DB call
    submissionError: string | null;
    submissionMessage: string | null;
    clearSubmissionMessage: () => void;
}

export const useTeamDecisionSubmission = ({
                                              sessionId,
                                              teamId,
                                              currentPhase,
                                              decisionState // Added decisionState here
                                          }: UseTeamDecisionSubmissionProps): UseTeamDecisionSubmissionReturn => {
    // UI state for submission process
    const [isSubmittingInternal, setIsSubmittingInternal] = useState(false); // Renamed to avoid collision
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [submissionErrorInternal, setSubmissionErrorInternal] = useState<string | null>(null); // To store local error

    // Supabase mutation for decision persistence
    const {
        execute: submitDecisionExecute,
        isLoading: isSupabaseMutating, // Renamed to avoid collision
        error: supabaseMutationError // Renamed to avoid collision
    } = useSupabaseMutation(
        async (decisionPayload: any) => { // This now takes the full payload
            if (!sessionId || !teamId || !currentPhase) {
                throw new Error('Missing required data for Supabase submission');
            }
            // The payload is already constructed by confirmSubmit, just ensure core IDs
            const finalPayload = {
                ...decisionPayload,
                session_id: sessionId,
                team_id: teamId,
                phase_id: currentPhase.id,
                round_number: currentPhase.round_number as 0 | 1 | 2 | 3,
                submitted_at: new Date().toISOString(),
            };

            return db.decisions.create(finalPayload);
        },
        {
            onSuccess: () => {
                console.log('[useTeamDecisionSubmission] Supabase mutation successful');
                setSubmissionErrorInternal(null); // Clear any previous error
            },
            onError: (error) => {
                console.error('[useTeamDecisionSubmission] Supabase mutation failed:', error);
                setSubmissionErrorInternal(error);
            }
        }
    );

    // Calculate if submit should be disabled (from old useDecisionSubmission)
    const isSubmitDisabled = useMemo(() => {
        if (isSubmittingInternal || isSupabaseMutating) return true; // Disable if any part is submitting

        switch (currentPhase?.phase_type) {
            case 'invest':
                // Allow submitting zero investments if budget is zero, so always false here unless actively submitting
                return false;
            case 'choice':
                return !decisionState.selectedChallengeOptionId;
            case 'double-down-prompt':
                // For double-down-prompt, we handle direct submission, so this button is always active if an option is selected.
                return !decisionState.selectedChallengeOptionId;
            case 'double-down-select':
                return !decisionState.sacrificeInvestmentId || !decisionState.doubleDownOnInvestmentId;
            default:
                return true; // Default to disabled if no specific rules
        }
    }, [isSubmittingInternal, isSupabaseMutating, currentPhase?.phase_type, decisionState]);

    // Handles initial click on submit button (from old useDecisionSubmission)
    const handleSubmit = useCallback(async () => {
        setSubmissionErrorInternal(null); // Clear previous errors on new attempt

        if (!currentPhase || !sessionId || !teamId) {
            setSubmissionErrorInternal("Missing session or team ID, or no active phase for submission.");
            return;
        }

        // Special handling for 'double-down-prompt' phase: no confirmation modal needed, submit directly
        if (currentPhase.phase_type === 'double-down-prompt') {
            if (!decisionState.selectedChallengeOptionId) {
                setSubmissionErrorInternal("Please select an option for the Double Down prompt.");
                return;
            }
            setIsSubmittingInternal(true);
            try {
                await submitDecisionExecute({
                    wantsToDoubleDown: decisionState.selectedChallengeOptionId === 'yes_dd'
                });
                console.log('[useTeamDecisionSubmission] Double-down prompt submitted directly.');
            } catch (error) {
                console.error('[useTeamDecisionSubmission] Double-down prompt submission failed:', error);
            } finally {
                setIsSubmittingInternal(false);
            }
            return; // Exit after direct submission
        }

        // For other phases, show confirmation modal
        setShowConfirmationModal(true);
    }, [sessionId, teamId, currentPhase, decisionState, submitDecisionExecute]);


    // Confirms submission after modal (from old useDecisionSubmission)
    const confirmSubmit = useCallback(async () => {
        setShowConfirmationModal(false); // Close the modal first
        setSubmissionErrorInternal(null); // Clear previous errors

        if (!currentPhase || !sessionId || !teamId) {
            setSubmissionErrorInternal("Missing session or team ID, or no active phase.");
            return;
        }

        setIsSubmittingInternal(true); // Indicate submission is in progress

        try {
            const decisionPayload: any = {};

            switch (currentPhase.phase_type) {
                case 'invest':
                    decisionPayload.selected_investment_ids = decisionState.selectedInvestmentIds;
                    decisionPayload.total_spent_budget = decisionState.spentBudget;
                    break;

                case 'choice':
                    if (!decisionState.selectedChallengeOptionId) {
                        throw new Error("Please make a selection for the challenge.");
                    }
                    decisionPayload.selected_challenge_option_id = decisionState.selectedChallengeOptionId;
                    break;

                case 'double-down-select':
                    if (!decisionState.sacrificeInvestmentId || !decisionState.doubleDownOnInvestmentId) {
                        throw new Error("Both sacrifice and double-down selections are required.");
                    }
                    decisionPayload.double_down_decision = {
                        investmentToSacrificeId: decisionState.sacrificeInvestmentId,
                        investmentToDoubleDownId: decisionState.doubleDownOnInvestmentId,
                    };
                    break;

                default:
                    throw new Error("Unknown decision type for submission.");
            }

            console.log('[useTeamDecisionSubmission] Attempting to submit decision payload:', decisionPayload);
            await submitDecisionExecute(decisionPayload); // Pass the constructed payload
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[useTeamDecisionSubmission] Submission failed inside confirmSubmit:', errorMessage);
            setSubmissionErrorInternal(`Submission failed: ${errorMessage}`);
        } finally {
            setIsSubmittingInternal(false);
        }
    }, [sessionId, teamId, currentPhase, decisionState, submitDecisionExecute]);

    const clearSubmissionMessage = useCallback(() => {
        setSubmissionErrorInternal(null);
    }, []);

    return {
        isSubmitting: isSubmittingInternal || isSupabaseMutating, // Combined loading state
        isSubmitDisabled,
        handleSubmit,
        showConfirmationModal,
        setShowConfirmationModal,
        confirmSubmit,
        submissionError: submissionErrorInternal || supabaseMutationError, // Combined error
        submissionMessage: (submissionErrorInternal || supabaseMutationError) ? `Failed to submit: ${submissionErrorInternal || supabaseMutationError}` : null,
        clearSubmissionMessage
    };
};