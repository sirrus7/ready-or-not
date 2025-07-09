// src/views/team/components/DecisionForms/EnhancedDecisionContent.tsx
// UPDATED: Use unified DoubleDown component

import React from 'react';
import {Slide, InvestmentOption, ChallengeOption} from '@shared/types';
import {DecisionState, DecisionActions} from '@views/team/hooks/useDecisionMaking';
import ChoicePanel from './ChoicePanel';
import DoubleDownPanel from './DoubleDownPanel';
import SmartInvestmentPanel from './SmartInvestmentPanel';

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
                                                                             isSubmitting,
                                                                         }) => {
    switch (currentSlide.type) {
        case 'interactive_invest':
            return (
                <SmartInvestmentPanel
                    sessionId={sessionId}
                    teamId={teamId}
                    currentRound={currentSlide.round_number === 2 ? 2 : currentSlide.round_number === 3 ? 3 : 1}
                    investmentOptions={investmentOptions}
                    selectedInvestmentIds={decisionState.selectedInvestmentOptions}
                    spentBudget={decisionState.spentBudget}
                    investUpToBudget={investUpToBudget}
                    onInvestmentToggleById={decisionActions.handleInvestmentToggleById}
                    onImmediatePurchase={async (optionIndex: number) => {
                        // Get the investment option
                        const option = investmentOptions[optionIndex];
                        if (!option) {
                            throw new Error("Invalid investment option");
                        }

                        // For immediate purchases, use the original cost from the investment option
                        // Immediate purchases typically don't use continuation pricing - they use the base cost
                        const cost = option.cost;

                        // Call the actual handler with both parameters
                        await decisionActions.handleImmediatePurchase(optionIndex, cost);
                    }}
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
            // Filter RD3 investments to only what team owns
            const teamRd3Letters = decisionState.immediatePurchases || [];
            const teamOwnedInvestments = availableRd3Investments.filter(inv => {
                return teamRd3Letters.includes(inv.id);
            });

            // NEW: Single unified component handles entire double down flow
            return (
                <DoubleDownPanel
                    challengeOptions={challengeOptions}
                    availableRd3Investments={teamOwnedInvestments}
                    selectedChallengeOptionId={decisionState.selectedChallengeOptionId}
                    sacrificeInvestmentId={decisionState.sacrificeInvestmentId}
                    doubleDownOnInvestmentId={decisionState.doubleDownOnInvestmentId}
                    onChallengeSelect={decisionActions.handleChallengeSelect}
                    onSacrificeChange={(id: string | null) => id && decisionActions.handleSacrificeSelect(id)}
                    onDoubleDownChange={(id: string | null) => id && decisionActions.handleDoubleDownSelect(id)}
                    isSubmitting={isSubmitting}
                />
            );
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
