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
    // Determine current round from slide data
    const currentRound = (currentSlide.round_number || 1) as 1 | 2 | 3;

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
                    onInvestmentToggleById={decisionActions.handleInvestmentToggleById}
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
                    forcedSelection={decisionState.forcedSelection}
                    forcedSelectionReason={decisionState.forcedSelectionReason}
                    isCheckingForcedSelection={decisionState.isCheckingForcedSelection}
                />
            );

        case 'interactive_double_down_select': {
            // Check if we're in the prompt phase or select phase
            const showSelectPhase = decisionState.selectedChallengeOptionId === 'yes_dd';

            if (!showSelectPhase) {
                // Show the prompt with Yes/No options
                return (
                    <DoubleDownPromptPanel
                        challengeOptions={challengeOptions}
                        selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                        onChallengeSelect={decisionActions.handleChallengeSelect}  // ✅ FIXED: Was handleDoubleDownPromptSelect
                    />
                );
            } else {
                // Filter RD3 investments to only what team owns
                const teamRd3Letters = decisionState.immediatePurchases || [];
                const teamOwnedInvestments = availableRd3Investments.filter(inv => {
                    const invLetter = inv.name.match(/^([A-Z])\./)?.[1];
                    return invLetter && teamRd3Letters.includes(invLetter);
                });

                // User selected "yes_dd", show the investment selection
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
        }

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
