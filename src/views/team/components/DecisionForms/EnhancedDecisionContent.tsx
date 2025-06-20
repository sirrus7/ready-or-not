// src/views/team/components/DecisionForms/EnhancedDecisionContent.tsx
// Enhanced DecisionContent that supports continuation pricing

import React from 'react';
import {Slide, InvestmentOption, ChallengeOption} from '@shared/types';
import {DecisionState, DecisionActions} from '@views/team/hooks/useDecisionMaking';
import SmartInvestmentPanel from './SmartInvestmentPanel';
import ChoicePanel from './ChoicePanel';
import DoubleDownPromptPanel from './DoubleDownPrompt';
import DoubleDownSelectPanel from './DoubleDownSelect';

interface EnhancedDecisionContentProps {
    sessionId: string;
    teamId: string;
    currentSlide: Slide;
    decisionState: DecisionState;
    decisionActions: DecisionActions;
    investmentOptions: InvestmentOption[];
    challengeOptions: ChallengeOption[];
    availableRd3Investments: InvestmentOption[];
    investUpToBudget: number;
    isSubmitting: boolean;
}

const EnhancedDecisionContent: React.FC<EnhancedDecisionContentProps> = ({
                                                                             sessionId,
                                                                             teamId,
                                                                             currentSlide,
                                                                             decisionState,
                                                                             decisionActions,
                                                                             investmentOptions,
                                                                             challengeOptions,
                                                                             availableRd3Investments,
                                                                             investUpToBudget,
                                                                             isSubmitting
                                                                         }) => {
    // Determine current round based on slide
    const getCurrentRound = (): 1 | 2 | 3 => {
        const roundNumber = currentSlide.round_number;
        if (roundNumber === 0 || roundNumber === 1) return 1;
        if (roundNumber === 2) return 2;
        return 3;
    };

    const currentRound = getCurrentRound();

    switch (currentSlide.type) {
        case 'interactive_invest':
            return (
                <SmartInvestmentPanel
                    sessionId={sessionId}
                    teamId={teamId}
                    currentRound={currentRound}
                    investmentOptions={investmentOptions}
                    selectedInvestmentIds={decisionState.selectedInvestmentOptions}
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
                    selectedInvestmentIds={decisionState.selectedInvestmentOptions}
                    investmentOptions={investmentOptions}
                    onDoubleDownPromptSelect={decisionActions.handleDoubleDownPromptSelect}
                    currentSlide={currentSlide}
                    isSubmitting={isSubmitting}
                />
            );

        case 'interactive_double_down_select':
            return (
                <DoubleDownSelectPanel
                    availableRd3Investments={availableRd3Investments}
                    selectedSacrificeId={decisionState.sacrificeInvestmentId}
                    selectedDoubleDownId={decisionState.doubleDownOnInvestmentId}
                    onSacrificeSelect={decisionActions.handleSacrificeSelect}
                    onDoubleDownSelect={decisionActions.handleDoubleDownSelect}
                    currentSlide={currentSlide}
                    isSubmitting={isSubmitting}
                />
            );

        default:
            return (
                <div className="text-center py-8">
                    <p className="text-gray-400">
                        Unsupported slide type: {currentSlide.type}
                    </p>
                </div>
            );
    }
};

export default EnhancedDecisionContent;
