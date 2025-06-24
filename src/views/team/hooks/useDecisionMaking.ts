// src/views/team/hooks/useDecisionMaking.ts
// FIXED VERSION: Updated to use investment option letters instead of full IDs

import {useState, useEffect, useMemo, useCallback} from 'react';
import {Slide, InvestmentOption, ChallengeOption} from '@shared/types';
import {supabase} from '@shared/services/supabase';
import {StrategyInvestmentTracker, StrategyInvestmentType} from "@core/game/StrategyInvestmentTracker.ts";

export interface DecisionState {
    selectedInvestmentOptions: string[];  // CHANGED: now stores ['A', 'B', 'C']
    spentBudget: number;
    selectedChallengeOptionId: string | null;
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;
    error: string | null;
    immediatePurchases: string[];  // Still stores letters for immediate purchases
}

export interface DecisionActions {
    handleInvestmentToggle: (optionIndex: number, cost: number) => void;  // CHANGED: now takes index
    handleImmediatePurchase: (optionIndex: number, cost: number) => Promise<void>;  // CHANGED: now takes index
    handleChallengeSelect: (optionId: string) => void;
    handleSacrificeSelect: (optionId: string) => void;
    handleDoubleDownSelect: (optionId: string) => void;
    clearError: () => void;
}

interface UseDecisionMakingProps {
    currentSlide: Slide | null;
    investmentOptions: InvestmentOption[];
    challengeOptions: ChallengeOption[];
    investUpToBudget: number;
    sessionId?: string | null;
    teamId?: string | null;
    onInvestmentSelectionChange?: (selectedOptions: string[], spentBudget: number) => void;  // CHANGED: parameter name
}

interface UseDecisionMakingReturn {
    state: DecisionState;
    actions: DecisionActions;
    remainingBudget: number;
    submissionSummary: string;
    isValidSubmission: boolean;
}

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

export const useDecisionMaking = ({
                                      currentSlide,
                                      investmentOptions,
                                      challengeOptions,
                                      investUpToBudget,
                                      sessionId,
                                      teamId,
                                      onInvestmentSelectionChange
                                  }: UseDecisionMakingProps): UseDecisionMakingReturn => {
    const [state, setState] = useState<DecisionState>({
        selectedInvestmentOptions: [],  // CHANGED
        spentBudget: 0,
        selectedChallengeOptionId: null,
        sacrificeInvestmentId: null,
        doubleDownOnInvestmentId: null,
        error: null,
        immediatePurchases: []
    });

    const remainingBudget = useMemo(() => {
        return investUpToBudget - state.spentBudget;
    }, [investUpToBudget, state.spentBudget]);

    const isValidSubmission = useMemo(() => {
        if (!currentSlide) return false;
        switch (currentSlide.type) {
            case 'interactive_invest':
                return state.selectedInvestmentOptions.length > 0 || state.immediatePurchases.length > 0;  // CHANGED
            case 'interactive_choice':
            case 'interactive_double_down_select':
                return !!(state.sacrificeInvestmentId && state.doubleDownOnInvestmentId);
            default:
                return false;
        }
    }, [currentSlide, state]);

    const submissionSummary = useMemo(() => {
        if (!currentSlide) return '';
        switch (currentSlide.type) {
            case 'interactive_invest': {
                const totalSelections = state.selectedInvestmentOptions.length + state.immediatePurchases.length;  // CHANGED
                if (totalSelections === 0) {
                    return `No investments selected (${formatCurrency(remainingBudget)} unspent)`;
                }

                // CHANGED: Convert letters back to names for display
                const regularSelections = state.selectedInvestmentOptions.map(letter => {
                    const index = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, etc.
                    const option = investmentOptions[index];
                    return option ? option.name.split('.')[0] : letter;
                });

                const immediateSelections = state.immediatePurchases.map(letter => {
                    const index = letter.charCodeAt(0) - 65;
                    const option = investmentOptions[index];
                    return option ? option.name.split('.')[0] : letter;
                });

                const allSelections = [...immediateSelections, ...regularSelections];
                return `${totalSelections} investments: ${allSelections.join(', ')} (${formatCurrency(state.spentBudget)} spent)`;
            }
            case 'interactive_choice': {
                const option = challengeOptions.find(opt => opt.id === state.selectedChallengeOptionId);
                return option ? `Selected: ${option.id} - ${option.text.substring(0, 50)}...` : 'No selection made';
            }
            case 'interactive_double_down_select': {
                if (!state.sacrificeInvestmentId || !state.doubleDownOnInvestmentId) return 'Incomplete selection';
                const sacrificeOpt = investmentOptions.find(opt => opt.id === state.sacrificeInvestmentId);
                const ddOnOpt = investmentOptions.find(opt => opt.id === state.doubleDownOnInvestmentId);
                return `Sacrifice: ${sacrificeOpt?.name || 'Unknown'}, Double: ${ddOnOpt?.name || 'Unknown'}`;
            }
            default:
                return 'Ready to submit';
        }
    }, [currentSlide, state, investmentOptions, challengeOptions, remainingBudget]);

    // Load existing immediate purchases when slide changes
    useEffect(() => {
        const loadExistingDecisions = async () => {
            if (!sessionId || !teamId || !currentSlide?.interactive_data_key) {
                return;
            }

            // Add this inside the loadExistingDecisions function
            if (currentSlide?.type === 'interactive_double_down_select') {
                try {
                    // Load team's RD3 investment decisions to filter available options
                    const { data: rd3Decision } = await supabase
                        .from('team_decisions')
                        .select('selected_investment_options')
                        .eq('session_id', sessionId)
                        .eq('team_id', teamId)
                        .eq('phase_id', 'rd3-invest')
                        .single();

                    if (rd3Decision?.selected_investment_options) {
                        // Store these so DecisionContent can filter investments
                        setState(prev => ({
                            ...prev,
                            immediatePurchases: rd3Decision.selected_investment_options
                        }));
                    }
                } catch (error) {
                    console.log('Error loading RD3 investments:', error);
                }
            }

            try {
                // Create the immediate purchase phase_id
                const immediatePhaseId = `${currentSlide.interactive_data_key}_immediate`;

                const {data, error} = await supabase
                    .from('team_decisions')
                    .select('*')
                    .eq('session_id', sessionId)
                    .eq('team_id', teamId)
                    .eq('phase_id', immediatePhaseId)
                    .eq('is_immediate_purchase', true);

                if (data && !error && data.length > 0) {
                    // CHANGED: Extract immediate purchase options (now letters)
                    const immediatePurchaseOptions: string[] = [];
                    let immediateSpending = 0;

                    data.forEach(decision => {
                        if (decision.selected_investment_options) {  // CHANGED: column name
                            immediatePurchaseOptions.push(...decision.selected_investment_options);
                        }
                        immediateSpending += decision.total_spent_budget || 0;
                    });

                    setState(prev => ({
                        ...prev,
                        immediatePurchases: immediatePurchaseOptions,  // CHANGED
                        spentBudget: immediateSpending
                    }));
                }
            } catch (error) {
                console.log('No existing immediate purchases found:', error);
            }
        };

        // Reset state when slide changes
        console.log(`[useDecisionMaking] Slide changed to: ${currentSlide?.id}, type: ${currentSlide?.type}`);
        const newState: DecisionState = {
            selectedInvestmentOptions: [],  // CHANGED
            spentBudget: 0,
            selectedChallengeOptionId: null,
            sacrificeInvestmentId: null,
            doubleDownOnInvestmentId: null,
            error: null,
            immediatePurchases: []
        };

        // Set default challenge option if applicable
        if (currentSlide?.type === 'interactive_choice' && challengeOptions.length > 0) {
            const defaultChoice = challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultChoice?.id || challengeOptions[challengeOptions.length - 1].id;
        } else if (currentSlide?.type === 'interactive_double_down_select' && challengeOptions.length > 0) {
            const defaultOptOut = challengeOptions.find(opt => opt.id === 'no_dd') || challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultOptOut?.id || null;
        }

        setState(newState);
        loadExistingDecisions();
    }, [currentSlide?.id, challengeOptions, sessionId, teamId]);

    // Notify parent of investment changes
    useEffect(() => {
        if (currentSlide?.type === 'interactive_invest' && onInvestmentSelectionChange) {
            onInvestmentSelectionChange(state.selectedInvestmentOptions, state.spentBudget);  // CHANGED
        }
    }, [state.selectedInvestmentOptions, state.spentBudget, currentSlide, onInvestmentSelectionChange]);  // CHANGED

    // Regular investment toggle - CHANGED to use index instead of optionId
    const handleInvestmentToggle = useCallback((optionIndex: number, cost: number) => {
        const optionLetter = String.fromCharCode(65 + optionIndex); // A=0, B=1, C=2, etc.
        const currentIndex = state.selectedInvestmentOptions.indexOf(optionLetter);
        const newSelectedOptions = [...state.selectedInvestmentOptions];
        let newSpentBudget = state.spentBudget;

        if (currentIndex === -1) {
            if (newSpentBudget + cost <= investUpToBudget) {
                newSelectedOptions.push(optionLetter);
                newSpentBudget += cost;
            } else {
                setState(prev => ({
                    ...prev,
                    error: `Cannot exceed budget! You have ${formatCurrency(investUpToBudget - newSpentBudget)} remaining.`
                }));
                return;
            }
        } else {
            newSelectedOptions.splice(currentIndex, 1);
            newSpentBudget -= cost;
        }

        setState(prev => ({
            ...prev,
            selectedInvestmentOptions: newSelectedOptions.sort(), // Keep sorted: ['A', 'B', 'F']
            spentBudget: newSpentBudget,
            error: null
        }));
    }, [state.selectedInvestmentOptions, state.spentBudget, investUpToBudget]);

    // Immediate purchase handler - CHANGED to use index instead of optionId
    const handleImmediatePurchase = useCallback(async (optionIndex: number, cost: number) => {
        if (!sessionId || !teamId || !currentSlide?.interactive_data_key) {
            throw new Error("Missing session or team information");
        }

        if (state.spentBudget + cost > investUpToBudget) {
            throw new Error(`This purchase would exceed your budget. 
        Cost: ${formatCurrency(cost)}, 
        Current spent: ${formatCurrency(state.spentBudget)}, 
        You have ${formatCurrency(investUpToBudget - (state.spentBudget + cost))} remaining.`);
        }

        const option = investmentOptions[optionIndex];
        if (!option) {
            throw new Error("Invalid investment option");
        }

        try {
            const optionLetter = String.fromCharCode(65 + optionIndex); // A=0, B=1, C=2, etc.
            const immediatePhaseId = `${currentSlide.interactive_data_key}_immediate`;

            // DATA-DRIVEN: Use the option's immediate_purchase_type or default to the option ID
            const immediateType = option.immediate_purchase_type || option.id;

            const {data, error} = await supabase
                .from('team_decisions')
                .insert({
                    session_id: sessionId,
                    team_id: teamId,
                    phase_id: immediatePhaseId,
                    round_number: currentSlide.round_number || 1,
                    selected_investment_options: [optionLetter],  // Store letter for new system
                    selected_challenge_option_id: null,
                    total_spent_budget: cost,
                    submitted_at: new Date().toISOString(),
                    is_immediate_purchase: true,
                    // DATA-DRIVEN: Use the option's immediate_purchase_type
                    immediate_purchase_type: immediateType,
                    immediate_purchase_data: {
                        option_letter: optionLetter,  // New letter system
                        option_index: optionIndex,
                        option_name: option.name,
                        immediate_purchase_type: immediateType,
                        host_notification_message: option.host_notification_message,
                        report_name: option.report_name,
                        cost: cost
                    },
                    report_given: false
                })
                .select()
                .single();

            if (error) throw error;

            // NEW: Process strategy investment if this is a strategy purchase
            if (immediateType === 'business_growth_strategy' || immediateType === 'strategic_plan') {
                try {
                    const purchaseRound = currentSlide.round_number || 1;
                    await StrategyInvestmentTracker.processStrategyInvestment(
                        sessionId,
                        teamId,
                        immediateType as StrategyInvestmentType,
                        purchaseRound as 1 | 2
                    );
                    console.log(`[useDecisionMaking] Strategy investment processed for team ${teamId}`);
                } catch (strategyError) {
                    console.error('Strategy investment processing failed:', strategyError);
                    // Don't throw - the purchase was successful, strategy processing is bonus
                }
            }

            // Update local state with letter
            setState(prev => ({
                ...prev,
                immediatePurchases: [...prev.immediatePurchases, optionLetter].sort(),
                spentBudget: prev.spentBudget + cost,
                error: null
            }));

        } catch (error) {
            console.error('Immediate purchase failed:', error);
            throw error;
        }
    }, [sessionId, teamId, currentSlide, state.spentBudget, investUpToBudget, investmentOptions]);

    const handleChallengeSelect = useCallback((optionId: string) => {
        setState(prev => ({
            ...prev,
            selectedChallengeOptionId: optionId,
            error: null
        }));
    }, []);

    const handleSacrificeSelect = useCallback((investmentId: string | null) => {
        // Extract the letter from the investment name if needed
        let letterToStore = investmentId;
        if (investmentId && investmentOptions.length > 0) {
            const investment = investmentOptions.find(inv => inv.id === investmentId);
            if (investment) {
                const letter = investment.name.match(/^([A-Z])\./)?.[1];
                letterToStore = letter || investmentId;
            }
        }

        setState(prev => ({
            ...prev,
            sacrificeInvestmentId: letterToStore,
            error: null
        }));
    }, [investmentOptions]);

    const handleDoubleDownSelect = useCallback((investmentId: string | null) => {
        // Extract the letter from the investment name if needed
        let letterToStore = investmentId;
        if (investmentId && investmentOptions.length > 0) {
            const investment = investmentOptions.find(inv => inv.id === investmentId);
            if (investment) {
                const letter = investment.name.match(/^([A-Z])\./)?.[1];
                letterToStore = letter || investmentId;
            }
        }

        setState(prev => ({
            ...prev,
            doubleDownOnInvestmentId: letterToStore,
            error: null
        }));
    }, [investmentOptions]);

    const clearError = useCallback(() => {
        setState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    return {
        state,
        actions: {
            handleInvestmentToggle,
            handleImmediatePurchase,
            handleChallengeSelect,
            handleSacrificeSelect,
            handleDoubleDownSelect,
            clearError
        },
        remainingBudget,
        submissionSummary,
        isValidSubmission
    };
};
