// src/views/team/hooks/useDecisionMaking.ts
// Updated version with separate phase_id for immediate purchases

import {useState, useEffect, useMemo, useCallback} from 'react';
import {Slide, InvestmentOption, ChallengeOption} from '@shared/types';
import {db} from '@shared/services/supabase';
import {supabase} from '@shared/services/supabase';

export interface DecisionState {
    selectedInvestmentIds: string[];
    spentBudget: number;
    selectedChallengeOptionId: string | null;
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;
    error: string | null;
    immediatePurchases: string[];
}

export interface DecisionActions {
    handleInvestmentToggle: (optionId: string, cost: number) => void;
    handleImmediatePurchase: (optionId: string, cost: number) => Promise<void>;
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
    onInvestmentSelectionChange?: (selectedIds: string[], spentBudget: number) => void;
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
        selectedInvestmentIds: [],
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
                return state.selectedInvestmentIds.length > 0 || state.immediatePurchases.length > 0;
            case 'interactive_choice':
            case 'interactive_double_down_prompt':
                return !!state.selectedChallengeOptionId;
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
                const totalSelections = state.selectedInvestmentIds.length + state.immediatePurchases.length;
                if (totalSelections === 0) {
                    return `No investments selected (${formatCurrency(remainingBudget)} unspent)`;
                }

                const regularSelections = state.selectedInvestmentIds.map(id =>
                    investmentOptions.find(opt => opt.id === id)?.name.split('.')[0] || `#${id.slice(-4)}`
                );
                const immediateSelections = state.immediatePurchases.map(id =>
                    investmentOptions.find(opt => opt.id === id)?.name.split('.')[0] || `#${id.slice(-4)}`
                );

                const allSelections = [...immediateSelections, ...regularSelections];
                return `${totalSelections} investments: ${allSelections.join(', ')} (${formatCurrency(state.spentBudget)} spent)`;
            }
            case 'interactive_choice': {
                const option = challengeOptions.find(opt => opt.id === state.selectedChallengeOptionId);
                return option ? `Selected: ${option.id} - ${option.text.substring(0, 50)}...` : 'No selection made';
            }
            case 'interactive_double_down_prompt': {
                const ddOption = challengeOptions.find(opt => opt.id === state.selectedChallengeOptionId);
                return ddOption ? `Double Down: ${ddOption.text}` : 'No selection made';
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
                    // Calculate total spending from immediate purchases
                    const immediatePurchaseIds: string[] = [];
                    let immediateSpending = 0;

                    data.forEach(decision => {
                        if (decision.selected_investment_ids) {
                            immediatePurchaseIds.push(...decision.selected_investment_ids);
                        }
                        immediateSpending += decision.total_spent_budget || 0;
                    });

                    setState(prev => ({
                        ...prev,
                        immediatePurchases: immediatePurchaseIds,
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
            selectedInvestmentIds: [],
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
        } else if (currentSlide?.type === 'interactive_double_down_prompt' && challengeOptions.length > 0) {
            const defaultOptOut = challengeOptions.find(opt => opt.id === 'no_dd') || challengeOptions.find(opt => opt.is_default_choice);
            newState.selectedChallengeOptionId = defaultOptOut?.id || null;
        }

        setState(newState);
        loadExistingDecisions();
    }, [currentSlide?.id, challengeOptions, sessionId, teamId]);

    // Notify parent of investment changes
    useEffect(() => {
        if (currentSlide?.type === 'interactive_invest' && onInvestmentSelectionChange) {
            onInvestmentSelectionChange(state.selectedInvestmentIds, state.spentBudget);
        }
    }, [state.selectedInvestmentIds, state.spentBudget, currentSlide, onInvestmentSelectionChange]);

    // Regular investment toggle
    const handleInvestmentToggle = useCallback((optionId: string, cost: number) => {
        const currentIndex = state.selectedInvestmentIds.indexOf(optionId);
        const newSelectedIds = [...state.selectedInvestmentIds];
        let newSpentBudget = state.spentBudget;

        if (currentIndex === -1) {
            if (newSpentBudget + cost <= investUpToBudget) {
                newSelectedIds.push(optionId);
                newSpentBudget += cost;
            } else {
                setState(prev => ({
                    ...prev,
                    error: `Cannot exceed budget! You have ${formatCurrency(investUpToBudget - newSpentBudget)} remaining.`
                }));
                return;
            }
        } else {
            newSelectedIds.splice(currentIndex, 1);
            newSpentBudget -= cost;
        }

        setState(prev => ({
            ...prev,
            selectedInvestmentIds: newSelectedIds,
            spentBudget: newSpentBudget,
            error: null
        }));
    }, [state.selectedInvestmentIds, state.spentBudget, investUpToBudget]);

    // Immediate purchase handler
    const handleImmediatePurchase = useCallback(async (optionId: string, cost: number) => {
        if (!sessionId || !teamId || !currentSlide) {
            throw new Error('Missing session information for immediate purchase');
        }

        // Check if we can afford it
        if (state.spentBudget + cost > investUpToBudget) {
            throw new Error(`Cannot exceed budget! You have ${formatCurrency(investUpToBudget - state.spentBudget)} remaining.`);
        }

        try {
            // Get team name for notification
            const {data: teamData} = await supabase
                .from('teams')
                .select('name')
                .eq('id', teamId)
                .single();

            // Create immediate purchase phase_id (separate from regular investments)
            const immediatePhaseId = `${currentSlide.interactive_data_key}_immediate`;

            // Submit the immediate purchase to the database
            const payload = {
                session_id: sessionId,
                team_id: teamId,
                phase_id: immediatePhaseId, // CHANGED: Use separate phase_id
                round_number: currentSlide.round_number,
                selected_investment_ids: [optionId],
                total_spent_budget: cost,
                is_immediate_purchase: true,
                immediate_purchase_type: 'business_growth_strategy',
                immediate_purchase_data: {
                    investment_id: optionId,
                    cost: cost,
                    purchase_type: 'business_growth_strategy',
                    team_name: teamData?.name || 'Unknown Team'
                },
                report_given: false,
                submitted_at: new Date().toISOString()
            };

            await db.decisions.upsert(payload);

            // Send realtime notification to host using your existing channel system
            const realtimeNotification = {
                type: 'immediate_purchase_notification',
                session_id: sessionId,
                team_id: teamId,
                team_name: teamData?.name || 'Unknown Team',
                investment_id: optionId,
                investment_name: investmentOptions.find(opt => opt.id === optionId)?.name || 'Business Growth Strategy',
                cost: cost,
                message: `${teamData?.name || 'A team'} needs their Business Growth Strategy Report (${formatCurrency(cost)} purchase)`,
                timestamp: new Date().toISOString()
            };

            // Send via your existing realtime channel
            const channel = supabase.channel('host-notifications');
            channel.send({
                type: 'broadcast',
                event: 'immediate_purchase',
                payload: realtimeNotification
            });

            // Update local state
            setState(prev => ({
                ...prev,
                immediatePurchases: [...prev.immediatePurchases, optionId],
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

    const handleSacrificeSelect = useCallback((optionId: string) => {
        setState(prev => ({
            ...prev,
            sacrificeInvestmentId: optionId,
            error: null
        }));
    }, []);

    const handleDoubleDownSelect = useCallback((optionId: string) => {
        setState(prev => ({
            ...prev,
            doubleDownOnInvestmentId: optionId,
            error: null
        }));
    }, []);

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
