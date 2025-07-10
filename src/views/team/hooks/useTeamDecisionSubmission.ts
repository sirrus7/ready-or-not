// src/views/team/hooks/useTeamDecisionSubmission.ts
// FIXED VERSION - No endless loops, stable reset handling

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSupabaseMutation, useSupabaseQuery} from '@shared/hooks/supabase';
import {db} from '@shared/services/supabase';
import {ChallengeOption, GameStructure, InvestmentOption, Slide, TeamDecision} from '@shared/types';
import {DecisionState} from './useDecisionMaking';
import {ContinuationPricingEngine, ContinuationPricingResult} from '@core/game/ContinuationPricingEngine';
import {MultiSelectChallengeTracker} from "@core/game/MultiSelectChallengeTracker.ts";
import {formatCurrency} from '@shared/utils/formatUtils';

interface UseTeamDecisionSubmissionProps {
    sessionId: string | null;
    teamId: string | null;
    currentSlide: Slide | null;
    decisionState: DecisionState;
    isValidSubmission: boolean;
    investmentOptions?: InvestmentOption[];
    challengeOptions?: ChallengeOption[];
    gameStructure?: GameStructure;
    decisionResetTrigger?: number;
    onDecisionSubmitted?: () => void;
}

export interface UseTeamDecisionSubmissionReturn {
    isSubmitting: boolean;
    isSubmitDisabled: boolean;
    submissionError: string | null;
    submissionSuccess: boolean;
    hasExistingSubmission: boolean;
    existingSubmissionSummary: string | null;
    onSubmit: () => Promise<void>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const parseInvestmentIds = (ids: string | string[] | null | undefined): string[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids;
    try {
        const parsed = JSON.parse(ids);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (import.meta.env.DEV) console.warn(error);
        return [];
    }
};

export const useTeamDecisionSubmission = ({
                                              sessionId,
                                              teamId,
                                              currentSlide,
                                              decisionState,
                                              isValidSubmission,
                                              gameStructure,
                                              decisionResetTrigger = 0,
                                              onDecisionSubmitted
                                          }: UseTeamDecisionSubmissionProps): UseTeamDecisionSubmissionReturn => {

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    // ✅ CIRCUIT BREAKER STATE - ONLY NEW ADDITION
    const [isCircuitOpen, setIsCircuitOpen] = useState(false);
    const failureCountRef = useRef(0);

    // ✅ FIXED: Use ref to track last processed reset trigger
    const lastProcessedResetTrigger = useRef<number>(0);

    const decisionKey = currentSlide?.interactive_data_key;

    // ========================================================================
    // DATA FETCHING - REGULAR DECISIONS
    // ========================================================================
    const {
        data: existingDecision,
        refresh: checkForExistingDecision
    } = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId || !decisionKey) return null;
            return await db.decisions.getForPhase(sessionId, teamId, decisionKey);
        },
        [sessionId, teamId, decisionKey],
        {
            cacheKey: `decision-${sessionId}-${teamId}-${decisionKey}`,
            cacheTimeout: 5000,
            retryOnError: false
        }
    );

    // ========================================================================
    // DATA FETCHING - IMMEDIATE PURCHASES
    // ========================================================================
    const {
        refresh: refreshImmediatePurchases
    } = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId || !decisionKey) return [];
            return await db.decisions.getImmediatePurchases(sessionId, teamId, `${decisionKey}_immediate`);
        },
        [sessionId, teamId, decisionKey],
        {
            cacheKey: `immediate-${sessionId}-${teamId}-${decisionKey}`,
            cacheTimeout: 5000,
            retryOnError: false
        }
    );

    // ========================================================================
    // ✅ CIRCUIT BREAKER WRAPPER - ONLY NEW ADDITION
    // ========================================================================
    const withCircuitBreaker = useCallback(async (fn: () => Promise<any>, context: string) => {
        if (isCircuitOpen) return;

        try {
            await Promise.race([
                fn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                )
            ]);

            // Success - reset failure count
            failureCountRef.current = 0;
        } catch (error) {
            console.error(`🚨 ${context} failed:`, error);
            failureCountRef.current += 1;

            if (failureCountRef.current >= 3) {
                setIsCircuitOpen(true);
                setTimeout(() => {
                    setIsCircuitOpen(false);
                    failureCountRef.current = 0;
                }, 30000);
            }
        }
    }, [isCircuitOpen]);

    // ========================================================================
    // ⚠️  CRITICAL: STABLE RESET TRIGGER HANDLING - DO NOT CHANGE DEPENDENCIES
    // ========================================================================
    /**
     * 🚨 WARNING: ENDLESS LOOP PREVENTION 🚨
     *
     * This useEffect has been carefully crafted to prevent endless loops.
     *
     * ❌ DO NOT ADD THESE TO THE DEPENDENCY ARRAY:
     * - checkForExistingDecision (changes on every render)
     * - refreshImmediatePurchases (changes on every render)
     * - Any other function from useSupabaseQuery
     *
     * 💥 WHAT HAPPENS IF YOU ADD THEM:
     * 1. useEffect runs → calls refresh functions
     * 2. Functions change reference → useEffect runs again
     * 3. Infinite loop of database calls and re-renders
     * 4. App becomes unusable, console fills with logs
     * 5. Performance degrades severely
     *
     * ✅ ONLY SAFE DEPENDENCIES:
     * - decisionResetTrigger (primitive number, stable)
     * - Primitive values that don't change frequently
     *
     * 🔧 HOW THIS WORKS:
     * - Only processes NEW reset triggers (not repeated ones)
     * - Uses setTimeout to break synchronous call chains
     * - Prevents cascade effects from refresh functions
     */
    useEffect(() => {
        // Only process if this is a new reset trigger
        if (decisionResetTrigger > 0 && decisionResetTrigger !== lastProcessedResetTrigger.current) {
            // Mark this trigger as processed to prevent duplicate processing
            lastProcessedResetTrigger.current = decisionResetTrigger;

            // Clear any existing submission success/error states
            setSubmissionSuccess(false);
            setSubmissionError(null);

            // ✅ CRITICAL: Use setTimeout to break the synchronous call chain
            // This prevents the refresh functions from immediately triggering more renders
            setTimeout(() => {
                withCircuitBreaker(checkForExistingDecision, 'reset decision check');
                withCircuitBreaker(refreshImmediatePurchases, 'reset immediate purchases');
            }, 50); // Very short delay to break the loop
        }
    }, [decisionResetTrigger]); // ⚠️  CRITICAL: ONLY this dependency - DO NOT ADD MORE!

    // ========================================================================
    // DECISION SUBMISSION MUTATION
    // ========================================================================
    const {mutate: submitDecision, isLoading: isSubmitting} = useSupabaseMutation(
        async (): Promise<TeamDecision> => {
            if (!sessionId || !teamId || !decisionKey) {
                throw new Error('Missing required data for submission');
            }
            // ✅ FIXED: Calculate total cost using CONTINUATION PRICING
            let totalCost = 0;

            if (decisionState.selectedInvestmentOptions.length > 0) {
                const currentRound: 1 | 2 | 3 = currentSlide?.round_number || 1;

                // Helper function for original price calculation
                const calculateOriginalTotalCost = () => {
                    return decisionState.selectedInvestmentOptions.reduce((sum, optionLetter) => {
                        const gameStructureWithData = gameStructure as GameStructure & {
                            all_investment_options?: Record<string, Array<{ id: string; name: string; cost: number }>>;
                        };
                        const investmentOptions = gameStructureWithData?.all_investment_options?.[decisionKey] || [];
                        const option = investmentOptions.find(opt => opt.id === optionLetter);
                        return sum + (option?.cost || 0);
                    }, 0);
                };

                if (currentRound === 1) {
                    // Round 1: Use original pricing only
                    totalCost = calculateOriginalTotalCost();
                } else {
                    // Round 2+: Use continuation pricing
                    try {
                        const continuationPricing: ContinuationPricingResult = await ContinuationPricingEngine.calculateContinuationPricing(
                            sessionId,
                            teamId,
                            currentRound as 2 | 3
                        );

                        // Calculate total using continuation prices
                        totalCost = decisionState.selectedInvestmentOptions.reduce((sum, optionLetter) => {
                            const pricing = continuationPricing.investmentPricing.find(
                                (p: any) => p.investmentId === optionLetter
                            );
                            const actualCost = pricing?.finalPrice || 0;
                            return sum + actualCost;
                        }, 0);
                    } catch (error) {
                        console.error('🎯 Continuation pricing failed, using original costs:', error);
                        totalCost = calculateOriginalTotalCost();
                    }
                }
            }

            // Add challenge cost if selected
            if (decisionState.selectedChallengeOptionId) {
                // Challenge options don't have costs in current implementation
                // but structure is ready if needed
            }

            const submissionData: Omit<TeamDecision, 'id' | 'created_at'> = {
                session_id: sessionId,
                team_id: teamId,
                phase_id: decisionKey,
                round_number: currentSlide?.round_number || 1,
                selected_investment_options: decisionState.selectedInvestmentOptions?.length > 0
                    ? decisionState.selectedInvestmentOptions
                    : null,  // CHANGED: stores ['A', 'B', 'C'] directly
                selected_challenge_option_id: decisionState.selectedChallengeOptionId || null,
                double_down_sacrifice_id: decisionState.sacrificeInvestmentId || null,
                double_down_on_id: decisionState.doubleDownOnInvestmentId || null,
                total_spent_budget: totalCost,
                submitted_at: new Date().toISOString(),
                is_immediate_purchase: false,
                immediate_purchase_type: null,
                immediate_purchase_data: null,
                report_given: false,
                report_given_at: null
            };

            return await db.decisions.create(submissionData);
        },
        {
            onSuccess: () => {
                setSubmissionSuccess(true);
                setSubmissionError(null);

                // NEW: Trigger investment display refresh
                onDecisionSubmitted?.();

                checkForExistingDecision();

                // ✅ YOUR ORIGINAL LOGIC - Only wrapped with circuit breaker
                setTimeout(() => {
                    withCircuitBreaker(checkForExistingDecision, 'success decision check');
                    withCircuitBreaker(refreshImmediatePurchases, 'success immediate purchases');
                }, 100);
            },
            onError: (error: unknown) => {
                console.error('🎯 Decision submission failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Submission failed';
                setSubmissionError(errorMessage);
                setSubmissionSuccess(false);
            }
        }
    );

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    const hasExistingSubmission: boolean = !!(existingDecision?.submitted_at);
    const isSubmitDisabled: boolean = !isValidSubmission || isSubmitting || hasExistingSubmission;

    // ========================================================================
    // SUBMISSION SUMMARY FORMATTING
    // ========================================================================
    const existingSubmissionSummary = useMemo(() => {
        if (!currentSlide || !gameStructure || !existingDecision) return null;

        const key: string | undefined = currentSlide.interactive_data_key;
        if (!key) return null;
        try {
            const gameStructureWithData = gameStructure as GameStructure & {
                all_investment_options?: Record<string, Array<{ id: string; name: string; cost: number }>>;
                all_challenge_options?: Record<string, Array<{ id: string; name: string }>>;
            };

            const parts: string[] = [];

            const investmentOptions: string[] | null = existingDecision.selected_investment_options;
            if (investmentOptions && investmentOptions.length > 0) {
                const decisionKey = currentSlide.interactive_data_key;
                const investmentOptions = decisionKey ?
                    gameStructureWithData.all_investment_options?.[decisionKey] || [] : [];

                const selectedInvestments = parseInvestmentIds(existingDecision.selected_investment_options)
                    .map(id => investmentOptions.find(inv => inv.id === id))
                    .filter(Boolean);

                if (selectedInvestments.length > 0) {
                    parts.push(`Investments: ${selectedInvestments.map(inv => inv!.name).join(', ')}`);
                }
            }

            // Add challenge selection
            if (existingDecision.selected_challenge_option_id) {
                const decisionKey = currentSlide.interactive_data_key;
                const challengeOptions = decisionKey ?
                    gameStructureWithData.all_challenge_options?.[decisionKey] || [] : [];

                const selectedOptionId = existingDecision.selected_challenge_option_id;

                // SPECIAL CASE: Handle double down decisions
                if (currentSlide.type === 'interactive_double_down_select') {
                    if (selectedOptionId === 'no_dd') {
                        parts.push('No Double Down - Keeping all RD-3 investments');
                    } else if (selectedOptionId === 'yes_dd') {
                        // Get the sacrifice and double down investment names
                        const rd3Investments = gameStructureWithData.all_investment_options?.['rd3-invest'] || [];
                        const sacrificeInv = existingDecision.double_down_sacrifice_id ?
                            rd3Investments.find(inv => inv.id === existingDecision.double_down_sacrifice_id) : null;
                        const doubleDownInv = existingDecision.double_down_on_id ?
                            rd3Investments.find(inv => inv.id === existingDecision.double_down_on_id) : null;

                        if (sacrificeInv && doubleDownInv) {
                            parts.push(`Double Down: Sacrifice "${sacrificeInv.name}" → Double "${doubleDownInv.name}"`);
                        } else {
                            parts.push('Double Down (incomplete selection)');
                        }
                    }
                } else if (selectedOptionId && selectedOptionId.includes(',')) {
                    // Multi-select combination
                    const selectedOptions = MultiSelectChallengeTracker.parseSelection(selectedOptionId);
                    const displayText = MultiSelectChallengeTracker.getCombinationDisplayText(selectedOptions);
                    parts.push(`Challenge: ${displayText}`);
                } else {
                    // Single selection (existing logic)
                    const selectedChallenge = challengeOptions.find(ch => ch.id === selectedOptionId);
                    if (selectedChallenge) {
                        parts.push(`Challenge: ${selectedChallenge.id}`);
                    }
                }
            }

            // Add total cost
            const totalCost = decisionState.spentBudget || existingDecision.total_spent_budget || 0;
            if (totalCost > 0) {
                parts.push(`Total: ${formatCurrency(totalCost)}`);
            }

            return parts.length > 0 ? parts.join(' • ') : 'Submitted';

        } catch (error) {
            console.error('🎯 Error formatting submission summary:', error);
            return 'Submitted';
        }
    }, [currentSlide, gameStructure, existingDecision]);

    // ========================================================================
    // STABLE SUBMIT HANDLER
    // ========================================================================
    const onSubmit = useCallback(async () => {
        if (isSubmitDisabled) return;

        try {
            await submitDecision({});
        } catch (error) {
            console.error('🎯 Submit handler error:', error);
        }
    }, [isSubmitDisabled, submitDecision]);

    return {
        isSubmitting,
        isSubmitDisabled,
        submissionError,
        submissionSuccess,
        hasExistingSubmission,
        existingSubmissionSummary,
        onSubmit,
    };
};
