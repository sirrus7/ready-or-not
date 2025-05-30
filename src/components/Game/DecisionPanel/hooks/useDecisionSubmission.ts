// src/components/Game/DecisionPanel/hooks/useDecisionSubmission.ts - Submission logic
import { useState, useMemo } from 'react';
import { GamePhaseNode } from '../../../../types';
import { DecisionState } from './useDecisionLogic';

interface UseDecisionSubmissionProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null;
    decisionState: DecisionState;
    onDecisionSubmit: (decisionData: any) => void;
}

interface UseDecisionSubmissionReturn {
    isSubmitting: boolean;
    isSubmitDisabled: boolean;
    handleSubmit: () => void;
    showConfirmationModal: boolean;
    setShowConfirmationModal: (show: boolean) => void;
    confirmSubmit: () => Promise<void>;
}

export const useDecisionSubmission = ({
                                          sessionId,
                                          teamId,
                                          currentPhase,
                                          decisionState,
                                          onDecisionSubmit
                                      }: UseDecisionSubmissionProps): UseDecisionSubmissionReturn => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);

    // Calculate if submit should be disabled
    const isSubmitDisabled = useMemo(() => {
        if (isSubmitting) return true;

        switch (currentPhase?.phase_type) {
            case 'invest':
                // Allow submitting zero investments if budget is zero
                return false;
            case 'choice':
                return !decisionState.selectedChallengeOptionId;
            case 'double-down-prompt':
                return !decisionState.selectedChallengeOptionId;
            case 'double-down-select':
                return !decisionState.sacrificeInvestmentId || !decisionState.doubleDownOnInvestmentId;
            default:
                return true;
        }
    }, [isSubmitting, currentPhase?.phase_type, decisionState]);

    const handleSubmitClick = () => {
        // Handle double-down-prompt directly
        if (currentPhase?.phase_type === 'double-down-prompt') {
            onDecisionSubmit({
                wantsToDoubleDown: decisionState.selectedChallengeOptionId === 'yes_dd'
            });
            return;
        }

        // Validate double-down-select
        if (currentPhase?.phase_type === 'double-down-select') {
            if (!decisionState.sacrificeInvestmentId || !decisionState.doubleDownOnInvestmentId) {
                return; // Disabled state should prevent this
            }
        }

        setShowConfirmationModal(true);
    };

    const confirmSubmit = async () => {
        setShowConfirmationModal(false);

        if (!currentPhase || !sessionId || !teamId) {
            console.error("Missing session or team ID, or no active phase.");
            return;
        }

        setIsSubmitting(true);

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

            onDecisionSubmit(decisionPayload);
        } catch (error) {
            console.error('Submission error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmationModal = (
        <Modal
            isOpen={showConfirmationModal}
    onClose={() => setShowConfirmationModal(false)}
    title="Confirm Submission"
    size="sm"
    >
    <div className="p-2">
    <p className="text-sm text-gray-600 mb-4">
        Are you sure you want to submit these decisions for {currentPhase?.label || "this phase"}?
        This action cannot be undone.
    </p>
    <div className="flex justify-end space-x-3">
    <button
        onClick={() => setShowConfirmationModal(false)}
    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300"
        >
        Cancel
        </button>
        <button
    onClick={confirmSubmit}
    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
        Yes, Submit
    </button>
    </div>
    </div>
    </Modal>
);

    return {
        isSubmitting,
        isSubmitDisabled,
        handleSubmit: handleSubmitClick,
        confirmationModal
    };
};