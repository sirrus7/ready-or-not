// src/components/Game/DecisionPanel/index.tsx - Fixed main orchestration component
import React from 'react';
import { InvestmentOption, ChallengeOption, GamePhaseNode } from '../../../types';
import { Hourglass } from 'lucide-react';
import { useDecisionLogic } from './hooks/useDecisionLogic';
import { useDecisionSubmission } from './hooks/useDecisionSubmission';
import DecisionHeader from './components/DecisionHeader';
import DecisionContent from './components/DecisionContent';
import DecisionFooter from './components/DecisionFooter';
import ErrorDisplay from './components/ErrorDisplay';
import ConfirmationModal from './components/ConfirmationModal';

interface DecisionPanelProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null;
    investmentOptions?: InvestmentOption[];
    investUpToBudget?: number;
    challengeOptions?: ChallengeOption[];
    availableRd3Investments?: InvestmentOption[];
    onDecisionSubmit: (decisionData: any) => void;
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
                                                         onDecisionSubmit,
                                                         isDecisionTime,
                                                         timeRemainingSeconds,
                                                         onInvestmentSelectionChange,
                                                     }) => {
    // Decision state logic
    const decisionLogic = useDecisionLogic({
        currentPhase,
        investmentOptions,
        challengeOptions,
        investUpToBudget,
        onInvestmentSelectionChange
    });

    // Submission logic
    const submission = useDecisionSubmission({
        sessionId,
        teamId,
        currentPhase,
        decisionState: decisionLogic.state,
        onDecisionSubmit
    });

    // Show waiting state if not decision time
    if (!isDecisionTime || !currentPhase) {
        return (
            <div className="p-6 bg-gray-800 text-gray-400 text-center rounded-xl min-h-[200px] flex flex-col items-center justify-center">
                <Hourglass size={32} className="mr-2 animate-pulse mb-3"/>
                <p className="text-lg">Waiting for Decision Period</p>
                {currentPhase && <p className="text-xs mt-1">Current Phase: {currentPhase.label}</p>}
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
                <ErrorDisplay error={decisionLogic.state.error} />
            </div>

            {/* Footer with timer and submit */}
            <DecisionFooter
                timeRemainingSeconds={timeRemainingSeconds}
                isSubmitDisabled={submission.isSubmitDisabled}
                isSubmitting={submission.isSubmitting}
                onSubmit={submission.handleSubmit}
            />

            {/* Confirmation modal */}
            <ConfirmationModal
                isOpen={submission.showConfirmationModal}
                onClose={() => submission.setShowConfirmationModal(false)}
                onConfirm={submission.confirmSubmit}
                currentPhase={currentPhase}
            />
        </div>
    );
};

export default DecisionPanel;
