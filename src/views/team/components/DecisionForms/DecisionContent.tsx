// src/views/team/components/DecisionForms/DecisionContent.tsx
// Update your existing DecisionContent to pass the new props

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
            return (
                <InvestmentPanel
                    investmentOptions={investmentOptions}
                    selectedInvestmentIds={decisionState.selectedInvestmentIds}
                    spentBudget={decisionState.spentBudget}
                    investUpToBudget={investUpToBudget}
                    onInvestmentToggle={decisionActions.handleInvestmentToggle}
                    onImmediatePurchase={decisionActions.handleImmediatePurchase}
                    isSubmitting={isSubmitting}
                    immediatePurchases={decisionState.immediatePurchases}
                />
            );
        case 'interactive_choice':
            return (
                <ChoicePanel
                    challengeOptions={challengeOptions}
                    selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                    onChallengeSelect={decisionActions.handleChallengeSelect}
                    currentSlide={currentSlide}
                    isSubmitting={isSubmitting}
                />
            );
        case 'interactive_double_down_prompt':
            return (
                <DoubleDownPromptPanel
                    challengeOptions={challengeOptions}
                    selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                    onChallengeSelect={decisionActions.handleChallengeSelect}
                    currentSlide={currentSlide}
                    isSubmitting={isSubmitting}
                />
            );
        case 'interactive_double_down_select':
            return (
                <DoubleDownSelectPanel
                    availableRd3Investments={availableRd3Investments}
                    sacrificeInvestmentId={decisionState.sacrificeInvestmentId}
                    doubleDownOnInvestmentId={decisionState.doubleDownOnInvestmentId}
                    onSacrificeSelect={decisionActions.handleSacrificeSelect}
                    onDoubleDownSelect={decisionActions.handleDoubleDownSelect}
                    isSubmitting={isSubmitting}
                />
            );
        default:
            return (
                <div className="p-4 text-center text-gray-400">
                    <p>Unknown slide type: {currentSlide.type}</p>
                </div>
            );
    }
};

export default DecisionContent;
