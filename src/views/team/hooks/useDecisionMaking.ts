// src/views/team/hooks/useDecisionMaking.ts
// FIXED VERSION: Updated to use investment option letters instead of full IDs

import {useCallback, useEffect, useMemo, useState} from 'react';
import {ChallengeOption, InvestmentOption, Slide, TeamDecision} from '@shared/types';
import {db} from '@shared/services/supabase';
import {MultiSelectChallengeTracker} from "@core/game/MultiSelectChallengeTracker.ts";
import {ForcedSelectionTracker} from "@core/game/ForcedSelectionTracker.ts";
import {formatCurrency} from '@shared/utils/formatUtils';

export interface DecisionState {
    selectedInvestmentOptions: string[];  // CHANGED: now stores ['A', 'B', 'C']
    spentBudget: number;
    selectedChallengeOptionId: string | null;
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;
    error: string | null;
    immediatePurchases: string[];  // Still stores letters for immediate purchases
    forcedSelection: string | null;
    forcedSelectionReason: string | null;
    isCheckingForcedSelection: boolean;
}

export interface DecisionActions {
    handleImmediatePurchase: (optionIndex: number, cost: number) => Promise<void>;  // CHANGED: now takes index
    handleChallengeSelect: (optionId: string) => void;
    handleSacrificeSelect: (optionId: string) => void;
    handleDoubleDownSelect: (optionId: string) => void;
    clearError: () => void;
    handleInvestmentToggleById: (investmentId: string, cost: number) => void;
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
        immediatePurchases: [],
        forcedSelection: null,
        forcedSelectionReason: null,
        isCheckingForcedSelection: false
    });

    const remainingBudget = useMemo(() => {
        return investUpToBudget - state.spentBudget;
    }, [investUpToBudget, state.spentBudget]);

    const isValidSubmission = useMemo(() => {
        if (!currentSlide) return false;
        switch (currentSlide.type) {
            case 'interactive_invest':
                return state.selectedInvestmentOptions.length > 0 || state.immediatePurchases.length > 0;
            case 'interactive_choice':
                // Special case for ch5 - allow empty selection (will use existing fallback logic)
                if (currentSlide?.interactive_data_key === 'ch5') {
                    return true;
                }
                return !!state.selectedChallengeOptionId || !!state.forcedSelection;
            case 'interactive_double_down_select':
                // FIXED: Different validation based on the choice
                if (state.selectedChallengeOptionId === 'no_dd') {
                    // If they chose "No", that's a complete submission
                    return true;
                } else if (state.selectedChallengeOptionId === 'yes_dd') {
                    // If they chose "Yes", need both sacrifice and double-down selections
                    return !!(state.sacrificeInvestmentId && state.doubleDownOnInvestmentId);
                } else {
                    // No choice made yet
                    return false;
                }
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
                    const option = investmentOptions.find(opt => opt.id === letter);  // ✅ FIND BY ID
                    return option ? option.name.split('.')[0] : letter;
                });

                const immediateSelections = state.immediatePurchases.map(letter => {
                    const option = investmentOptions.find(opt => opt.id === letter);  // ✅ FIND BY ID
                    return option ? option.name.split('.')[0] : letter;
                });

                const allSelections = [...immediateSelections, ...regularSelections];
                return `${totalSelections} investments: ${allSelections.join(', ')} (${formatCurrency(state.spentBudget)} spent)`;
            }
            case 'interactive_choice': {
                const selectedOptionId = state.selectedChallengeOptionId;

                // UPDATED: Handle multi-select combinations
                if (selectedOptionId && selectedOptionId.includes(',')) {
                    // Multi-select combination
                    const selectedOptions = MultiSelectChallengeTracker.parseSelection(selectedOptionId);
                    const displayText = MultiSelectChallengeTracker.getCombinationDisplayText(selectedOptions);

                    return `Selected: ${displayText}`;
                } else {
                    // Single selection (existing logic)
                    const option = challengeOptions.find(opt => opt.id === selectedOptionId);
                    return option ? `Selected: ${option.id} - ${option.text.substring(0, 50)}...` : 'No selection made';
                }
            }
            case 'interactive_double_down_select': {
                if (state.selectedChallengeOptionId === 'no_dd') {
                    return 'Selected: No, stick with current RD-3 investments';
                } else if (state.selectedChallengeOptionId === 'yes_dd') {
                    if (!state.sacrificeInvestmentId || !state.doubleDownOnInvestmentId) {
                        return 'Incomplete selection - choose investments to sacrifice and double down on';
                    }
                    const sacrificeOpt = investmentOptions.find(opt => opt.id === state.sacrificeInvestmentId);
                    const ddOnOpt = investmentOptions.find(opt => opt.id === state.doubleDownOnInvestmentId);
                    return `Sacrifice "${sacrificeOpt?.name || 'Unknown'}" → Double Down on "${ddOnOpt?.name || 'Unknown'}"`;
                } else {
                    return 'No selection made';
                }
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
                    const rd3Decision = await db.decisions.getForPhase(sessionId, teamId, 'rd3-invest')
                    const investmentOptions = rd3Decision?.selected_investment_options;
                    if (investmentOptions) {
                        setState(prev => ({
                            ...prev,
                            immediatePurchases: investmentOptions
                        }));
                    }
                } catch (error) {
                    console.warn('Error loading RD3 investments:', error);
                }
            }

            try {
                // Create the immediate purchase phase_id
                const immediatePhaseId = `${currentSlide.interactive_data_key}_immediate`;
                const decisions: TeamDecision[] = await db.decisions.getImmediatePurchases(sessionId, teamId, immediatePhaseId)

                if (decisions && decisions.length > 0) {
                    // CHANGED: Extract immediate purchase options (now letters)
                    const immediatePurchaseOptions: string[] = [];
                    let immediateSpending = 0;

                    decisions.forEach(decision => {
                        if (decision.selected_investment_options) {
                            immediatePurchaseOptions.push(...decision.selected_investment_options);
                        }
                        immediateSpending += decision.total_spent_budget || 0;
                    });

                    setState(prev => ({
                        ...prev,
                        immediatePurchases: immediatePurchaseOptions,
                        spentBudget: immediateSpending
                    }));
                }
            } catch (error) {
                console.warn('No existing immediate purchases found:', error);
            }
        };

        // Reset state when slide changes
        const newState: DecisionState = {
            selectedInvestmentOptions: [],
            spentBudget: 0,
            selectedChallengeOptionId: null,
            sacrificeInvestmentId: null,
            doubleDownOnInvestmentId: null,
            error: null,
            immediatePurchases: [],
            forcedSelection: null,
            forcedSelectionReason: null,
            isCheckingForcedSelection: false
        };

        // Set default challenge option if applicable
        // Set default challenge option if applicable
        if (currentSlide?.type === 'interactive_choice' && challengeOptions.length > 0) {
            const defaultChoice: ChallengeOption | undefined = challengeOptions.find(opt => opt.is_default_choice);

            // Special handling for ch5 - no initial selection
            if (currentSlide.interactive_data_key === 'ch5') {
                newState.selectedChallengeOptionId = defaultChoice?.id || null;
            } else {
                newState.selectedChallengeOptionId = defaultChoice?.id || challengeOptions[challengeOptions.length - 1].id;
            }
        } else if (currentSlide?.type === 'interactive_double_down_select' && challengeOptions.length > 0) {
            const defaultOptOut: ChallengeOption | undefined = challengeOptions.find(opt => opt.id === 'no_dd') || challengeOptions.find(opt => opt.is_default_choice);
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

    // 4. ADD this useEffect (after the existing useEffects, around line 90):
    useEffect(() => {
        const checkForcedSelection = async () => {
            if (!currentSlide || currentSlide.type !== 'interactive_choice' || !sessionId || !teamId || !currentSlide.interactive_data_key) {
                setState(prev => ({
                    ...prev,
                    forcedSelection: null,
                    forcedSelectionReason: null,
                    isCheckingForcedSelection: false
                }));
                return;
            }
            setState(prev => ({...prev, isCheckingForcedSelection: true}));
            try {
                const forced = await ForcedSelectionTracker.getForcedSelection(sessionId, teamId, currentSlide.interactive_data_key);
                const reason = forced ? ForcedSelectionTracker.getForcedSelectionReason(currentSlide.interactive_data_key) : null;
                setState(prev => ({
                    ...prev,
                    forcedSelection: forced,
                    forcedSelectionReason: reason,
                    isCheckingForcedSelection: false,
                    selectedChallengeOptionId: forced || prev.selectedChallengeOptionId
                }));
            } catch (error) {
                setState(prev => ({
                    ...prev,
                    forcedSelection: null,
                    forcedSelectionReason: null,
                    isCheckingForcedSelection: false
                }));
            }
        };
        checkForcedSelection();
    }, [currentSlide?.id, sessionId, teamId]);

    // Regular investment toggle - CHANGED to use index instead of optionId
    const handleInvestmentToggleById = useCallback((investmentId: string, cost: number) => {
        const optionLetter = investmentId; // Investment ID should be the letter (A, B, C, etc.)
        const currentIndex = state.selectedInvestmentOptions.indexOf(optionLetter);
        const newSelectedOptions = [...state.selectedInvestmentOptions];
        let newSpentBudget = state.spentBudget;

        if (currentIndex === -1) {
            // Adding investment
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
            // Removing investment
            newSelectedOptions.splice(currentIndex, 1);
            newSpentBudget -= cost;
        }

        setState(prev => ({
            ...prev,
            selectedInvestmentOptions: newSelectedOptions.sort(),
            spentBudget: newSpentBudget,
            error: null
        }));

        // Call the callback if provided
        if (onInvestmentSelectionChange) {
            onInvestmentSelectionChange(newSelectedOptions.sort(), newSpentBudget);
        }
    }, [state.selectedInvestmentOptions, state.spentBudget, investUpToBudget, onInvestmentSelectionChange]);

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

            await db.decisions.create({
                session_id: sessionId,
                team_id: teamId,
                phase_id: immediatePhaseId,
                round_number: currentSlide.round_number || 1,
                selected_investment_options: [optionLetter],
                selected_challenge_option_id: null,
                total_spent_budget: cost,
                is_immediate_purchase: true,
                immediate_purchase_type: immediateType,
                immediate_purchase_data: {
                    option_letter: optionLetter,
                    option_index: optionIndex,
                    option_name: option.name,
                    immediate_purchase_type: immediateType,
                    host_notification_message: option.host_notification_message,
                    report_name: option.report_name,
                    cost: cost
                },
                report_given: false,
                double_down_sacrifice_id: null,
                double_down_on_id: null,
                report_given_at: null,
            });

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
        if (state.forcedSelection) return;
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
            handleImmediatePurchase,
            handleChallengeSelect,
            handleSacrificeSelect,
            handleDoubleDownSelect,
            clearError,
            handleInvestmentToggleById
        },
        remainingBudget,
        submissionSummary,
        isValidSubmission
    };
};
