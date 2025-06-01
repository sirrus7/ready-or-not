// src/components/Game/DecisionPanel/hooks/useDecisionLogic.ts - Decision state management
import { useState, useEffect, useMemo } from 'react';
import { GamePhaseNode, InvestmentOption, ChallengeOption } from '@shared/types/common';

export interface DecisionState {
    // Investment state
    selectedInvestmentIds: string[];
    spentBudget: number;

    // Challenge state
    selectedChallengeOptionId: string | null;

    // Double down state
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;

    // Error state
    error: string | null;
}

export interface DecisionActions {
    handleInvestmentToggle: (optionId: string, cost: number) => void;
    handleChallengeSelect: (optionId: string) => void;
    setSacrificeInvestmentId: (id: string | null) => void;
    setDoubleDownOnInvestmentId: (id: string | null) => void;
    clearError: () => void;
}

interface UseDecisionLogicProps {
    currentPhase: GamePhaseNode | null;
    investmentOptions: InvestmentOption[];
    challengeOptions: ChallengeOption[];
    investUpToBudget: number;
    onInvestmentSelectionChange?: (selectedIds: string[], totalCost: number) => void;
}

interface UseDecisionLogicReturn {
    state: DecisionState;
    actions: DecisionActions;
    remainingBudget: number;
}

export const useDecisionMaking = ({
                                     currentPhase,
                                     challengeOptions,
                                     investUpToBudget,
                                     onInvestmentSelectionChange
                                 }: UseDecisionLogicProps): UseDecisionLogicReturn => {
    const [state, setState] = useState<DecisionState>({
        selectedInvestmentIds: [],
        spentBudget: 0,
        selectedChallengeOptionId: null,
        sacrificeInvestmentId: null,
        doubleDownOnInvestmentId: null,
        error: null
    });

    const remainingBudget = useMemo(() =>
            investUpToBudget - state.spentBudget,
        [investUpToBudget, state.spentBudget]
    );

    // Reset state when phase changes
    useEffect(() => {
        console.log(`[useDecisionLogic] Phase changed to: ${currentPhase?.id}, type: ${currentPhase?.phase_type}`);

        const newState: DecisionState = {
            selectedInvestmentIds: [],
            spentBudget: 0,
            selectedChallengeOptionId: null,
            sacrificeInvestmentId: null,
            doubleDownOnInvestmentId: null,
            error: null
        };

        // Set default challenge option
        if (currentPhase?.phase_type === 'choice' && challengeOptions.length > 0) {
            const defaultChoice = challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultChoice?.id || challengeOptions[challengeOptions.length - 1].id;
        } else if (currentPhase?.phase_type === 'double-down-prompt' && challengeOptions.length > 0) {
            const defaultOptOut = challengeOptions.find(opt => opt.id === 'no_dd') ||
                challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultOptOut?.id || null;
        }

        setState(newState);
    }, [currentPhase, challengeOptions, investUpToBudget]);

    // Notify parent of investment selection changes
    useEffect(() => {
        if (currentPhase?.phase_type === 'invest' && onInvestmentSelectionChange) {
            onInvestmentSelectionChange(state.selectedInvestmentIds, state.spentBudget);
        }
    }, [state.selectedInvestmentIds, state.spentBudget, currentPhase, onInvestmentSelectionChange]);

    // Actions
    const handleInvestmentToggle = (optionId: string, cost: number) => {
        const currentIndex = state.selectedInvestmentIds.indexOf(optionId);
        const newSelectedIds = [...state.selectedInvestmentIds];
        let newSpentBudget = state.spentBudget;

        if (currentIndex === -1) {
            // Adding investment
            if (newSpentBudget + cost <= investUpToBudget) {
                newSelectedIds.push(optionId);
                newSpentBudget += cost;
            } else {
                setState(prev => ({
                    ...prev,
                    error: "Cannot exceed budget! Deselect an item or choose a cheaper one."
                }));
                setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
                return;
            }
        } else {
            // Removing investment
            newSelectedIds.splice(currentIndex, 1);
            newSpentBudget -= cost;
        }

        setState(prev => ({
            ...prev,
            selectedInvestmentIds: newSelectedIds,
            spentBudget: newSpentBudget,
            error: null
        }));
    };

    const handleChallengeSelect = (optionId: string) => {
        setState(prev => ({
            ...prev,
            selectedChallengeOptionId: optionId
        }));
    };

    const setSacrificeInvestmentId = (id: string | null) => {
        setState(prev => ({
            ...prev,
            sacrificeInvestmentId: id
        }));
    };

    const setDoubleDownOnInvestmentId = (id: string | null) => {
        setState(prev => ({
            ...prev,
            doubleDownOnInvestmentId: id
        }));
    };

    const clearError = () => {
        setState(prev => ({
            ...prev,
            error: null
        }));
    };

    const actions: DecisionActions = {
        handleInvestmentToggle,
        handleChallengeSelect,
        setSacrificeInvestmentId,
        setDoubleDownOnInvestmentId,
        clearError
    };

    return {
        state,
        actions,
        remainingBudget
    };
};
