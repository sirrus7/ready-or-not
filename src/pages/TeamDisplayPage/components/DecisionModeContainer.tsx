// src/pages/TeamDisplayPage/components/DecisionModeContainer.tsx - Active decision UI
import React from 'react';
import DecisionPanel from '../../../components/Game/DecisionPanel';
import { GamePhaseNode, GameStructure } from '../../../types';
import { UseDecisionSubmissionReturn } from '../hooks/useDecisionSubmission';

interface DecisionModeContainerProps {
    sessionId: string;
    teamId: string;
    currentPhase: GamePhaseNode | null;
    timeRemainingSeconds: number | undefined;
    submissionState: UseDecisionSubmissionReturn;
    gameStructure: GameStructure;
    decisionOptionsKey: string | undefined;
}

const DecisionModeContainer: React.FC<DecisionModeContainerProps> = ({
                                                                         sessionId,
                                                                         teamId,
                                                                         currentPhase,
                                                                         timeRemainingSeconds,
                                                                         submissionState,
                                                                         gameStructure,
                                                                         decisionOptionsKey
                                                                     }) => {
    if (!currentPhase) return null;

    // Compute options for current phase
    const investmentOptions = currentPhase.phase_type === 'invest' && decisionOptionsKey ?
        gameStructure.all_investment_options[decisionOptionsKey] || [] : [];

    const challengeOptions = (currentPhase.phase_type === 'choice' || currentPhase.phase_type === 'double-down-prompt') && decisionOptionsKey ?
        gameStructure.all_challenge_options[decisionOptionsKey] || [] : [];

    const rd3Investments = currentPhase.phase_type === 'double-down-select' ?
        gameStructure.all_investment_options['rd3-invest'] || [] : [];

    const budgetForPhase = currentPhase.phase_type === 'invest' && decisionOptionsKey ?
        gameStructure.investment_phase_budgets[decisionOptionsKey] || 0 : 0;

    return (
        <div className="flex-1 p-3 md:p-4">
            <DecisionPanel
                sessionId={sessionId}
                teamId={teamId}
                currentPhase={currentPhase}
                investmentOptions={investmentOptions}
                investUpToBudget={budgetForPhase}
                challengeOptions={challengeOptions}
                availableRd3Investments={rd3Investments}
                onDecisionSubmit={submissionState.submitDecision}
                isDecisionTime={true}
                timeRemainingSeconds={timeRemainingSeconds}
            />
        </div>
    );
};

export default DecisionModeContainer;
