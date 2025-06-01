// src/components/Game/DecisionPanel/components/DecisionContent.tsx
import React from 'react';
import {GamePhaseNode, InvestmentOption, ChallengeOption} from '@shared/types/common';
import {DecisionState, DecisionActions} from '@views/team/hooks/useDecisionMaking';
import InvestmentPanel from './InvestmentPanel';
import ChoicePanel from './ChoicePanel';
import DoubleDownPromptPanel from './DoubleDownPrompt';
import DoubleDownSelectPanel from './DoubleDownSelect';

interface DecisionContentProps {
    currentPhase: GamePhaseNode;
    decisionState: DecisionState;
    decisionActions: DecisionActions;
    investmentOptions: InvestmentOption[];
    challengeOptions: ChallengeOption[];
    availableRd3Investments: InvestmentOption[];
    investUpToBudget: number;
    isSubmitting: boolean;
}

const DecisionContent: React.FC<DecisionContentProps> = ({
                                                             currentPhase,
                                                             decisionState,
                                                             decisionActions,
                                                             investmentOptions,
                                                             challengeOptions,
                                                             availableRd3Investments,
                                                             investUpToBudget,
                                                             isSubmitting
                                                         }) => {
    switch (currentPhase.phase_type) {
        case 'invest':
            return (
                <InvestmentPanel
                    investmentOptions={investmentOptions}
                    selectedInvestmentIds={decisionState.selectedInvestmentIds}
                    spentBudget={decisionState.spentBudget}
                    investUpToBudget={investUpToBudget}
                    onInvestmentToggle={decisionActions.handleInvestmentToggle}
                    isSubmitting={isSubmitting}
                />
            );

        case 'choice':
            return (
                <ChoicePanel
                    challengeOptions={challengeOptions}
                    selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                    onChallengeSelect={decisionActions.handleChallengeSelect}
                    currentPhase={currentPhase}
                    isSubmitting={isSubmitting}
                />
            );

        case 'double-down-prompt':
            return (
                <DoubleDownPromptPanel
                    challengeOptions={challengeOptions}
                    selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                    onChallengeSelect={decisionActions.handleChallengeSelect}
                />
            );

        case 'double-down-select':
            return (
                <DoubleDownSelectPanel
                    availableRd3Investments={availableRd3Investments}
                    sacrificeInvestmentId={decisionState.sacrificeInvestmentId}
                    doubleDownOnInvestmentId={decisionState.doubleDownOnInvestmentId}
                    onSacrificeChange={decisionActions.setSacrificeInvestmentId}
                    onDoubleDownChange={decisionActions.setDoubleDownOnInvestmentId}
                    isSubmitting={isSubmitting}
                />
            );

        default:
            return (
                <p className="text-gray-400 text-center py-8">
                    Waiting for interactive phase instructions...
                </p>
            );
    }
};

export default DecisionContent;
