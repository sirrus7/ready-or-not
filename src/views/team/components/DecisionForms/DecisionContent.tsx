// src/views/team/components/DecisionForms/DecisionContent.tsx
import React from 'react';
import {Slide, InvestmentOption, ChallengeOption} from '@shared/types';
import {DecisionState, DecisionActions} from '@views/team/hooks/useDecisionMaking';
import InvestmentPanel from './InvestmentPanel';
import ChoicePanel from './ChoicePanel';
import DoubleDownPromptPanel from './DoubleDownPrompt';
import DoubleDownSelectPanel from './DoubleDownSelect';

interface DecisionContentProps {
    currentSlide: Slide;
    decisionState: DecisionState;
    decisionActions: DecisionActions;
    investmentOptions: InvestmentOption[];
    challengeOptions: ChallengeOption[];
    availableRd3Investments: InvestmentOption[];
    investUpToBudget: number;
    isSubmitting: boolean;
}

const DecisionContent: React.FC<DecisionContentProps> = ({
                                                             currentSlide,
                                                             decisionState,
                                                             decisionActions,
                                                             investmentOptions,
                                                             challengeOptions,
                                                             availableRd3Investments,
                                                             investUpToBudget,
                                                             isSubmitting
                                                         }) => {
    switch (currentSlide.type) {
        case 'interactive_invest':
            return <InvestmentPanel investmentOptions={investmentOptions}
                                    selectedInvestmentIds={decisionState.selectedInvestmentIds}
                                    spentBudget={decisionState.spentBudget} investUpToBudget={investUpToBudget}
                                    onInvestmentToggle={decisionActions.handleInvestmentToggle}
                                    isSubmitting={isSubmitting}/>;
        case 'interactive_choice':
            return <ChoicePanel challengeOptions={challengeOptions}
                                selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                                onChallengeSelect={decisionActions.handleChallengeSelect} currentPhase={currentSlide}
                                isSubmitting={isSubmitting}/>;
        case 'interactive_double_down_prompt':
            return <DoubleDownPromptPanel challengeOptions={challengeOptions}
                                          selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                                          onChallengeSelect={decisionActions.handleChallengeSelect}/>;
        case 'interactive_double_down_select':
            return <DoubleDownSelectPanel availableRd3Investments={availableRd3Investments}
                                          sacrificeInvestmentId={decisionState.sacrificeInvestmentId}
                                          doubleDownOnInvestmentId={decisionState.doubleDownOnInvestmentId}
                                          onSacrificeChange={decisionActions.setSacrificeInvestmentId}
                                          onDoubleDownChange={decisionActions.setDoubleDownOnInvestmentId}
                                          isSubmitting={isSubmitting}/>;
        default:
            return <p className="text-gray-400 text-center py-8">Waiting for interactive instructions...</p>;
    }
};

export default DecisionContent;
