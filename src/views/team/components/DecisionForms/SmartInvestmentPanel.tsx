// src/views/team/components/DecisionForms/SmartInvestmentPanel.tsx
// Smart wrapper that chooses between regular and enhanced investment panels

import React from 'react';
import {InvestmentOption} from '@shared/types';
import {useInvestmentPricing} from '@views/team/hooks/useInvestmentPricing';
import EnhancedInvestmentPanel from './EnhancedInvestmentPanel';
import InvestmentPanel from './InvestmentPanel'; // Original panel

interface SmartInvestmentPanelProps {
    sessionId: string;
    teamId: string;
    currentRound: 1 | 2 | 3;
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggle: (optionIndex: number) => void;
    onImmediatePurchase: (optionIndex: number) => Promise<void>;
    isSubmitting: boolean;
    immediatePurchases: string[];
}

const SmartInvestmentPanel: React.FC<SmartInvestmentPanelProps> = ({
                                                                       sessionId,
                                                                       teamId,
                                                                       currentRound,
                                                                       investmentOptions,
                                                                       selectedInvestmentIds,
                                                                       spentBudget,
                                                                       investUpToBudget,
                                                                       onInvestmentToggle,
                                                                       onImmediatePurchase,
                                                                       isSubmitting,
                                                                       immediatePurchases
                                                                   }) => {
    // Load pricing data for rounds 2 and 3
    const {isLoading, error} = useInvestmentPricing({
        sessionId,
        teamId,
        currentRound,
        enabled: currentRound > 1
    });

    // For Round 1, always use the regular panel (no continuation pricing)
    if (currentRound === 1) {
        return (
            <InvestmentPanel
                investmentOptions={investmentOptions}
                selectedInvestmentIds={selectedInvestmentIds}
                spentBudget={spentBudget}
                investUpToBudget={investUpToBudget}
                onInvestmentToggle={onInvestmentToggle}
                onImmediatePurchase={onImmediatePurchase}
                isSubmitting={isSubmitting}
                immediatePurchases={immediatePurchases}
            />
        );
    }

    // For Rounds 2 and 3, use the enhanced panel with continuation pricing
    // Fall back to regular panel if there's an error loading pricing data
    if (error) {
        console.warn(`[SmartInvestmentPanel] Falling back to regular panel due to error:`, error);
        return (
            <InvestmentPanel
                investmentOptions={investmentOptions}
                selectedInvestmentIds={selectedInvestmentIds}
                spentBudget={spentBudget}
                investUpToBudget={investUpToBudget}
                onInvestmentToggle={onInvestmentToggle}
                onImmediatePurchase={onImmediatePurchase}
                isSubmitting={isSubmitting}
                immediatePurchases={immediatePurchases}
            />
        );
    }

    return (
        <EnhancedInvestmentPanel
            sessionId={sessionId}
            teamId={teamId}
            currentRound={currentRound}
            investmentOptions={investmentOptions}
            selectedInvestmentIds={selectedInvestmentIds}
            spentBudget={spentBudget}
            investUpToBudget={investUpToBudget}
            onInvestmentToggle={onInvestmentToggle}
            onImmediatePurchase={onImmediatePurchase}
            isSubmitting={isSubmitting}
            immediatePurchases={immediatePurchases}
        />
    );
};

export default SmartInvestmentPanel;
