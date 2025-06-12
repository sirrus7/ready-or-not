// src/views/team/components/DecisionForms/DecisionPanel.tsx
import React from 'react';
import {InvestmentOption, ChallengeOption, Slide, GameStructure} from '@shared/types';
import {Hourglass, CheckCircle2} from 'lucide-react';
import {useDecisionMaking} from '@views/team/hooks/useDecisionMaking';
import {useTeamDecisionSubmission} from '@views/team/hooks/useTeamDecisionSubmission';
import DecisionHeader from './DecisionHeader';
import DecisionContent from './DecisionContent';
import DecisionFooter from './DecisionFooter';
import ErrorDisplay from './ErrorDisplay';

interface DecisionPanelProps {
    sessionId: string | null;
    teamId: string | null;
    currentSlide: Slide | null;
    investmentOptions?: InvestmentOption[];
    investUpToBudget?: number;
    challengeOptions?: ChallengeOption[];
    availableRd3Investments?: InvestmentOption[];
    isDecisionTime: boolean;
    gameStructure?: GameStructure;
}

const DecisionPanel: React.FC<DecisionPanelProps> = ({
                                                         sessionId,
                                                         teamId,
                                                         currentSlide,
                                                         investmentOptions = [],
                                                         investUpToBudget = 0,
                                                         challengeOptions = [],
                                                         availableRd3Investments = [],
                                                         isDecisionTime,
                                                         gameStructure,
                                                     }) => {
    const decisionLogic = useDecisionMaking({
        currentSlide, investmentOptions, challengeOptions, investUpToBudget,
    });

    const submission = useTeamDecisionSubmission({
        sessionId, teamId, currentSlide,
        decisionState: decisionLogic.state,
        isValidSubmission: decisionLogic.isValidSubmission,
        investmentOptions, challengeOptions, gameStructure
    });

    if (!isDecisionTime || !currentSlide) {
        return (
            <div
                className="p-6 bg-gray-800 text-gray-400 text-center rounded-xl min-h-[200px] flex flex-col items-center justify-center">
                <Hourglass size={32} className="mr-2 animate-pulse mb-3"/>
                <p className="text-lg">Waiting for Decision Period</p>
                {currentSlide && <p className="text-xs mt-1">Current Activity: {currentSlide.title}</p>}
            </div>
        );
    }

    if (submission.hasExistingSubmission) {
        return (
            <div
                className="p-6 bg-green-800/50 backdrop-blur-sm text-green-100 text-center rounded-xl min-h-[200px] flex flex-col items-center justify-center border border-green-600">
                <CheckCircle2 size={48} className="mb-4 text-green-400"/>
                <h3 className="text-xl font-semibold mb-2">Decision Submitted!</h3>
                <div className="bg-green-900/50 rounded-lg p-4 max-w-md w-full">
                    <p className="text-sm font-medium text-green-200">Your Submission:</p>
                    <p className="text-sm text-green-100 mt-1">{submission.existingSubmissionSummary}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-gray-700">
            <div className="p-4 md:p-6">
                <DecisionHeader
                    currentSlide={currentSlide}
                    state={decisionLogic.state}
                    remainingBudget={decisionLogic.remainingBudget}
                    submissionSummary={decisionLogic.submissionSummary}
                    isValidSubmission={decisionLogic.isValidSubmission}
                    investUpToBudget={investUpToBudget}
                />
                <DecisionContent
                    currentSlide={currentSlide}
                    decisionState={decisionLogic.state}
                    decisionActions={decisionLogic.actions}
                    investmentOptions={investmentOptions}
                    challengeOptions={challengeOptions}
                    availableRd3Investments={availableRd3Investments}
                    investUpToBudget={investUpToBudget}
                    isSubmitting={submission.isSubmitting}
                />
                <ErrorDisplay error={decisionLogic.state.error || submission.submissionError}/>
            </div>
            <DecisionFooter
                isSubmitDisabled={submission.isSubmitDisabled}
                isSubmitting={submission.isSubmitting}
                onSubmit={submission.onSubmit}
                isValidSubmission={decisionLogic.isValidSubmission}
                submissionSummary={decisionLogic.submissionSummary}
                hasError={!!(decisionLogic.state.error || submission.submissionError)}
            />
        </div>
    );
};

export default DecisionPanel;
