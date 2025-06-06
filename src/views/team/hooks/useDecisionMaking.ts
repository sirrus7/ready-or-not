// src/views/team/hooks/useDecisionMaking.ts - COMPLETED Investment Decision Logic
import {useState, useEffect, useMemo} from 'react';
import {GamePhaseNode, InvestmentOption, ChallengeOption} from '@shared/types';

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
    resetDecisions: () => void;
}

interface UseDecisionMakingProps {
    currentPhase: GamePhaseNode | null;
    investmentOptions: InvestmentOption[];
    challengeOptions: ChallengeOption[];
    investUpToBudget: number;
    onInvestmentSelectionChange?: (selectedIds: string[], totalCost: number) => void;
}

interface UseDecisionMakingReturn {
    state: DecisionState;
    actions: DecisionActions;
    remainingBudget: number;
    isValidSubmission: boolean;
    submissionSummary: string;
}

export const useDecisionMaking = ({
                                      currentPhase,
                                      investmentOptions,
                                      challengeOptions,
                                      investUpToBudget,
                                      onInvestmentSelectionChange
                                  }: UseDecisionMakingProps): UseDecisionMakingReturn => {
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

    // Validate if current decisions can be submitted
    const isValidSubmission = useMemo(() => {
        if (!currentPhase) return false;

        switch (currentPhase.phase_type) {
            case 'invest':
                // Investment decisions are always valid (can invest $0)
                return remainingBudget >= 0;
            case 'choice':
                return !!state.selectedChallengeOptionId;
            case 'double-down-prompt':
                return !!state.selectedChallengeOptionId;
            case 'double-down-select':
                return !!(state.sacrificeInvestmentId && state.doubleDownOnInvestmentId);
            default:
                return false;
        }
    }, [currentPhase, state, remainingBudget]);

    // Generate submission summary
    const submissionSummary = useMemo(() => {
        if (!currentPhase) return '';

        switch (currentPhase.phase_type) {
            case 'invest':
                if (state.selectedInvestmentIds.length === 0) {
                    return `No investments selected (${formatCurrency(remainingBudget)} unspent)`;
                }
                const selectedNames = state.selectedInvestmentIds.map(id => {
                    const option = investmentOptions.find(opt => opt.id === id);
                    return option?.name.split('.')[0] || `#${id.slice(-4)}`;
                }).join(', ');
                return `${state.selectedInvestmentIds.length} investments: ${selectedNames} (${formatCurrency(state.spentBudget)} spent)`;

            case 'choice':
                const option = challengeOptions.find(opt => opt.id === state.selectedChallengeOptionId);
                return option ? `Selected: ${option.id} - ${option.text.substring(0, 50)}...` : 'No selection made';

            case 'double-down-prompt':
                const ddOption = challengeOptions.find(opt => opt.id === state.selectedChallengeOptionId);
                return ddOption ? `Double Down: ${ddOption.text}` : 'No selection made';

            case 'double-down-select':
                if (!state.sacrificeInvestmentId || !state.doubleDownOnInvestmentId) {
                    return 'Incomplete double down selection';
                }
                const sacrificeOpt = investmentOptions.find(opt => opt.id === state.sacrificeInvestmentId);
                const ddOnOpt = investmentOptions.find(opt => opt.id === state.doubleDownOnInvestmentId);
                return `Sacrifice: ${sacrificeOpt?.name || 'Unknown'}, Double: ${ddOnOpt?.name || 'Unknown'}`;

            default:
                return 'Ready to submit';
        }
    }, [currentPhase, state, investmentOptions, challengeOptions, remainingBudget]);

    // Reset state when phase changes
    useEffect(() => {
        console.log(`[useDecisionMaking] Phase changed to: ${currentPhase?.id}, type: ${currentPhase?.phase_type}`);

        const newState: DecisionState = {
            selectedInvestmentIds: [],
            spentBudget: 0,
            selectedChallengeOptionId: null,
            sacrificeInvestmentId: null,
            doubleDownOnInvestmentId: null,
            error: null
        };

        // Set default challenge option for choice phases
        if (currentPhase?.phase_type === 'choice' && challengeOptions.length > 0) {
            const defaultChoice = challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultChoice?.id || challengeOptions[challengeOptions.length - 1].id;
        } else if (currentPhase?.phase_type === 'double-down-prompt' && challengeOptions.length > 0) {
            const defaultOptOut = challengeOptions.find(opt => opt.id === 'no_dd') ||
                challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultOptOut?.id || null;
        }

        setState(newState);
    }, [currentPhase?.id, challengeOptions]);

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
                console.log(`[useDecisionMaking] Added investment ${optionId} for ${formatCurrency(cost)}`);
            } else {
                setState(prev => ({
                    ...prev,
                    error: `Cannot exceed budget! Need ${formatCurrency(cost)} but only ${formatCurrency(investUpToBudget - newSpentBudget)} remaining.`
                }));
                setTimeout(() => setState(prev => ({...prev, error: null})), 3000);
                return;
            }
        } else {
            // Removing investment
            newSelectedIds.splice(currentIndex, 1);
            newSpentBudget -= cost;
            console.log(`[useDecisionMaking] Removed investment ${optionId}, refunded ${formatCurrency(cost)}`);
        }

        setState(prev => ({
            ...prev,
            selectedInvestmentIds: newSelectedIds,
            spentBudget: newSpentBudget,
            error: null
        }));
    };

    const handleChallengeSelect = (optionId: string) => {
        console.log(`[useDecisionMaking] Selected challenge option: ${optionId}`);
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

    const resetDecisions = () => {
        setState({
            selectedInvestmentIds: [],
            spentBudget: 0,
            selectedChallengeOptionId: null,
            sacrificeInvestmentId: null,
            doubleDownOnInvestmentId: null,
            error: null
        });
    };

    const actions: DecisionActions = {
        handleInvestmentToggle,
        handleChallengeSelect,
        setSacrificeInvestmentId,
        setDoubleDownOnInvestmentId,
        clearError,
        resetDecisions
    };

    return {
        state,
        actions,
        remainingBudget,
        isValidSubmission,
        submissionSummary
    };
};

// Helper function
function formatCurrency(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
}
