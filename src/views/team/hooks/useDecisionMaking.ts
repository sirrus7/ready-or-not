// src/views/team/hooks/useDecisionMaking.ts
import {useState, useEffect, useMemo} from 'react';
import {Slide, InvestmentOption, ChallengeOption} from '@shared/types';

export interface DecisionState {
    selectedInvestmentIds: string[];
    spentBudget: number;
    selectedChallengeOptionId: string | null;
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;
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
    currentSlide: Slide | null;
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
                                      currentSlide,
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

    const remainingBudget = useMemo(() => investUpToBudget - state.spentBudget, [investUpToBudget, state.spentBudget]);

    const isValidSubmission = useMemo(() => {
        if (!currentSlide) return false;
        switch (currentSlide.type) {
            case 'interactive_invest':
                return remainingBudget >= 0;
            case 'interactive_choice':
            case 'interactive_double_down_prompt':
                return !!state.selectedChallengeOptionId;
            case 'interactive_double_down_select':
                return !!(state.sacrificeInvestmentId && state.doubleDownOnInvestmentId);
            default:
                return false;
        }
    }, [currentSlide, state, remainingBudget]);

    const submissionSummary = useMemo(() => {
        if (!currentSlide) return '';
        switch (currentSlide.type) {
            case 'interactive_invest':
                if (state.selectedInvestmentIds.length === 0) return `No investments selected (${formatCurrency(remainingBudget)} unspent)`;
                const selectedNames = state.selectedInvestmentIds.map(id => investmentOptions.find(opt => opt.id === id)?.name.split('.')[0] || `#${id.slice(-4)}`).join(', ');
                return `${state.selectedInvestmentIds.length} investments: ${selectedNames} (${formatCurrency(state.spentBudget)} spent)`;
            case 'interactive_choice':
                const option = challengeOptions.find(opt => opt.id === state.selectedChallengeOptionId);
                return option ? `Selected: ${option.id} - ${option.text.substring(0, 50)}...` : 'No selection made';
            case 'interactive_double_down_prompt':
                const ddOption = challengeOptions.find(opt => opt.id === state.selectedChallengeOptionId);
                return ddOption ? `Double Down: ${ddOption.text}` : 'No selection made';
            case 'interactive_double_down_select':
                if (!state.sacrificeInvestmentId || !state.doubleDownOnInvestmentId) return 'Incomplete selection';
                const sacrificeOpt = investmentOptions.find(opt => opt.id === state.sacrificeInvestmentId);
                const ddOnOpt = investmentOptions.find(opt => opt.id === state.doubleDownOnInvestmentId);
                return `Sacrifice: ${sacrificeOpt?.name || 'Unknown'}, Double: ${ddOnOpt?.name || 'Unknown'}`;
            default:
                return 'Ready to submit';
        }
    }, [currentSlide, state, investmentOptions, challengeOptions, remainingBudget]);

    useEffect(() => {
        console.log(`[useDecisionMaking] Slide changed to: ${currentSlide?.id}, type: ${currentSlide?.type}`);
        const newState: DecisionState = {
            selectedInvestmentIds: [], spentBudget: 0, selectedChallengeOptionId: null,
            sacrificeInvestmentId: null, doubleDownOnInvestmentId: null, error: null
        };
        if (currentSlide?.type === 'interactive_choice' && challengeOptions.length > 0) {
            const defaultChoice = challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultChoice?.id || challengeOptions[challengeOptions.length - 1].id;
        } else if (currentSlide?.type === 'interactive_double_down_prompt' && challengeOptions.length > 0) {
            const defaultOptOut = challengeOptions.find(opt => opt.id === 'no_dd') || challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultOptOut?.id || null;
        }
        setState(newState);
    }, [currentSlide?.id, challengeOptions]);

    useEffect(() => {
        if (currentSlide?.type === 'interactive_invest' && onInvestmentSelectionChange) {
            onInvestmentSelectionChange(state.selectedInvestmentIds, state.spentBudget);
        }
    }, [state.selectedInvestmentIds, state.spentBudget, currentSlide, onInvestmentSelectionChange]);

    const handleInvestmentToggle = (optionId: string, cost: number) => {
        const currentIndex = state.selectedInvestmentIds.indexOf(optionId);
        let newSelectedIds = [...state.selectedInvestmentIds];
        let newSpentBudget = state.spentBudget;

        if (currentIndex === -1) {
            if (newSpentBudget + cost <= investUpToBudget) {
                newSelectedIds.push(optionId);
                newSpentBudget += cost;
            } else {
                setState(prev => ({
                    ...prev,
                    error: `Cannot exceed budget! Need ${formatCurrency(cost)} but only ${formatCurrency(investUpToBudget - newSpentBudget)} remaining.`
                }));
                setTimeout(() => setState(prev => ({...prev, error: null})), 3000);
                return;
            }
        } else {
            newSelectedIds.splice(currentIndex, 1);
            newSpentBudget -= cost;
        }
        setState(prev => ({...prev, selectedInvestmentIds: newSelectedIds, spentBudget: newSpentBudget, error: null}));
    };

    const actions: DecisionActions = {
        handleInvestmentToggle,
        handleChallengeSelect: (optionId: string) => setState(prev => ({...prev, selectedChallengeOptionId: optionId})),
        setSacrificeInvestmentId: (id: string | null) => setState(prev => ({...prev, sacrificeInvestmentId: id})),
        setDoubleDownOnInvestmentId: (id: string | null) => setState(prev => ({...prev, doubleDownOnInvestmentId: id})),
        clearError: () => setState(prev => ({...prev, error: null})),
        resetDecisions: () => setState({
            selectedInvestmentIds: [],
            spentBudget: 0,
            selectedChallengeOptionId: null,
            sacrificeInvestmentId: null,
            doubleDownOnInvestmentId: null,
            error: null
        })
    };

    return {state, actions, remainingBudget, isValidSubmission, submissionSummary};
};

function formatCurrency(value: number): string {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
}
