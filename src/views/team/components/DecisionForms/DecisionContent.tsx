// src/views/team/components/DecisionForms/DecisionContent.tsx
// FIXED: Updated prop names and function signatures to match new investment system

import React from 'react';
import {Slide, InvestmentOption, ChallengeOption} from '@shared/types';
import {DecisionState, DecisionActions} from '@views/team/hooks/useDecisionMaking';
import InvestmentPanel from './InvestmentPanel';
import ChoicePanel from './ChoicePanel';
import DoubleDownPromptPanel from './DoubleDownPrompt';
import DoubleDownSelectPanel from './DoubleDownSelect';
import DoubleDownFlowWrapper from "@views/team/components/DecisionForms/DoubleDownFlowWrapper.tsx";

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
                    selectedInvestmentIds={decisionState.selectedInvestmentOptions}  // CORRECT: this contains letters ['A', 'B', 'C']
                    spentBudget={decisionState.spentBudget}
                    investUpToBudget={investUpToBudget}
                    onInvestmentToggle={decisionActions.handleInvestmentToggle}
                    onImmediatePurchase={decisionActions.handleImmediatePurchase}
                    isSubmitting={isSubmitting}
                    immediatePurchases={decisionState.immediatePurchases}  // This also contains letters ['A', 'B']
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
        case 'interactive_double_down_select':
            // Check if we're in the prompt phase or select phase
            const showSelectPhase = decisionState.selectedChallengeOptionId === 'yes_dd';

            if (!showSelectPhase) {
                // Show the prompt with Yes/No options
                return (
                    <DoubleDownPromptPanel
                        challengeOptions={challengeOptions}
                        selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                        onChallengeSelect={decisionActions.handleChallengeSelect}
                    />
                );
            } else {
                // User selected "yes_dd", show the investment selection
                // Get team's actual RD3 investments from decisionState
                const teamRd3Letters = decisionState.immediatePurchases || [];

                // Filter to only show investments this team owns
                const teamOwnedInvestments = availableRd3Investments.filter(inv => {
                    // Extract letter from investment name (e.g., "A. Production..." -> "A")
                    const invLetter = inv.name.match(/^([A-Z])\./)?.[1];
                    return invLetter && teamRd3Letters.includes(invLetter);
                });

                return (
                    <DoubleDownSelectPanel
                        availableRd3Investments={teamOwnedInvestments}
                        sacrificeInvestmentId={decisionState.sacrificeInvestmentId}
                        doubleDownOnInvestmentId={decisionState.doubleDownOnInvestmentId}
                        onSacrificeChange={decisionActions.handleSacrificeSelect}
                        onDoubleDownChange={decisionActions.handleDoubleDownSelect}
                        isSubmitting={isSubmitting}
                    />
                );
            }
        default:
            return (
                <div className="text-center text-gray-400">
                    <p>No content available for this slide type.</p>
                </div>
            );
    }
};

export default DecisionContent;
