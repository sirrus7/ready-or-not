// src/views/team/components/DecisionForms/DecisionPanel.tsx - FIXED INTEGRATION
import React from 'react';
import {InvestmentOption, ChallengeOption, GamePhaseNode} from '@shared/types';
import {Hourglass, CheckCircle2} from 'lucide-react';
import {useDecisionMaking} from '@views/team/hooks/useDecisionMaking';
import {useTeamDecisionSubmission} from '@views/team/hooks/useTeamDecisionSubmission';
import DecisionHeader from './DecisionHeader';
import DecisionContent from './DecisionContent';
import DecisionFooter from './DecisionFooter';
import ErrorDisplay from './ErrorDisplay';
import ConfirmationModal from './ConfirmationModal';

interface DecisionPanelProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null;
    investmentOptions?: InvestmentOption[];
    investUpToBudget?: number;
    challengeOptions?: ChallengeOption[];
    availableRd3Investments?: InvestmentOption[];
    isDecisionTime: boolean;
    timeRemainingSeconds?: number;
    currentSpentBudgetForInvestments?: number;
    onInvestmentSelectionChange?: (selectedIds: string[], totalCost: number) => void;
}

const DecisionPanel: React.FC<DecisionPanelProps> = ({
                                                         sessionId,
                                                         teamId,
                                                         currentPhase,
                                                         investmentOptions = [],
                                                         investUpToBudget = 0,
                                                         challengeOptions = [],
                                                         availableRd3Investments = [],
                                                         isDecisionTime,
                                                         timeRemainingSeconds,
                                                         onInvestmentSelectionChange,
                                                     }) => {
    // Decision state logic
    const decisionLogic = useDecisionMaking({
        currentPhase,
        investmentOptions,
        challengeOptions,
        investUpToBudget,
        onInvestmentSelectionChange
    });

    // Submission logic - FIXED to pass decisionState and isValidSubmission
    const submission = useTeamDecisionSubmission({
        sessionId,
        teamId,
        currentPhase,
        decisionState: decisionLogic.state,
        isValidSubmission: decisionLogic.isValidSubmission
    });

    // Show waiting state if not decision time
    if (!isDecisionTime || !currentPhase) {
        return (
            <div
                className="p-6 bg-gray-800 text-gray-400 text-center rounded-xl min-h-[200px] flex flex-col items-center justify-center">
                <Hourglass size={32} className="mr-2 animate-pulse mb-3"/>
                <p className="text-lg">Waiting for Decision Period</p>
                {currentPhase && <p className="text-xs mt-1">Current Phase: {currentPhase.label}</p>}
            </div>
        );
    }

    // Show success state if already submitted
    if (submission.submissionSuccess) {
        return (
            <div
                className="p-6 bg-green-800/50 backdrop-blur-sm text-green-100 text-center rounded-xl min-h-[200px] flex flex-col items-center justify-center border border-green-600">
                <CheckCircle2 size={48} className="mb-4 text-green-400"/>
                <h3 className="text-xl font-semibold mb-2">Decision Submitted Successfully!</h3>
                <p className="text-green-200 mb-4">Your {currentPhase.label} decisions have been recorded.</p>
                <div className="bg-green-900/50 rounded-lg p-4 max-w-md">
                    <p className="text-sm font-medium text-green-200">Summary:</p>
                    <p className="text-sm text-green-100 mt-1">{decisionLogic.submissionSummary}</p>
                </div>
                <p className="text-xs text-green-300 mt-4">
                    Wait for your facilitator to continue to the next phase.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-gray-700">
            <div className="p-4 md:p-6">
                {/* Header with phase info and budget */}
                <DecisionHeader
                    currentPhase={currentPhase}
                    decisionState={decisionLogic.state}
                    investUpToBudget={investUpToBudget}
                    remainingBudget={decisionLogic.remainingBudget}
                    submissionSummary={decisionLogic.submissionSummary}
                />

                {/* Main decision content */}
                <DecisionContent
                    currentPhase={currentPhase}
                    decisionState={decisionLogic.state}
                    decisionActions={decisionLogic.actions}
                    investmentOptions={investmentOptions}
                    challengeOptions={challengeOptions}
                    availableRd3Investments={availableRd3Investments}
                    investUpToBudget={investUpToBudget}
                    isSubmitting={submission.isSubmitting}
                />

                {/* Error display */}
                <ErrorDisplay
                    error={decisionLogic.state.error || submission.submissionError}
                />

                {/* Submission success indicator */}
                {submission.submissionSuccess && (
                    <div
                        className="mt-4 p-3 bg-green-600/30 text-green-200 border border-green-500/50 rounded-md text-sm flex items-center">
                        <CheckCircle2 size={16} className="mr-2 flex-shrink-0"/>
                        Decision submitted successfully! Wait for the facilitator to continue.
                    </div>
                )}
            </div>

            {/* Footer with timer and submit */}
            <DecisionFooter
                timeRemainingSeconds={timeRemainingSeconds}
                isSubmitDisabled={submission.isSubmitDisabled}
                isSubmitting={submission.isSubmitting}
                onSubmit={submission.handleSubmit}
                isValidSubmission={decisionLogic.isValidSubmission}
                submissionSummary={decisionLogic.submissionSummary}
                retrySubmission={submission.retrySubmission}
                hasError={!!(decisionLogic.state.error || submission.submissionError)}
            />

            {/* Confirmation modal */}
            <ConfirmationModal
                isOpen={submission.showConfirmationModal}
                onClose={() => submission.setShowConfirmationModal(false)}
                onConfirm={submission.confirmSubmit}
                currentPhase={currentPhase}
                submissionSummary={decisionLogic.submissionSummary}
            />
        </div>
    );
};

export default DecisionPanel;
