// src/views/team/components/GameStatus/TeamInvestmentDisplay.tsx
// FIXED: Shows actual continuation prices instead of original prices

import React, {useEffect, useState} from 'react';
import {ChevronDown, ChevronRight, Package} from 'lucide-react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {db} from '@shared/services/supabase';
import {ContinuationPricingEngine} from '@core/game/ContinuationPricingEngine';
import {formatCurrency} from '@shared/utils/formatUtils';

interface InvestmentDisplayProps {
    sessionId: string;
    teamId: string;
    currentRound: number;
    gameStructure: any;
    refreshTrigger?: number;
}

interface PurchasedInvestment {
    id: string;
    name: string;
    originalCost: number;
    actualCost: number; // ✅ The price actually paid (with continuation discount)
    isImmediate: boolean;
    isContinuation: boolean; // ✅ Whether this was a continuation purchase
}

interface DoubleDownState {
    sacrificeId: string | null;
    doubleDownId: string | null;
}

const TeamInvestmentDisplay: React.FC<InvestmentDisplayProps> = ({
                                                                     sessionId,
                                                                     teamId,
                                                                     currentRound,
                                                                     gameStructure,
                                                                     refreshTrigger = 0
                                                                 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [investments, setInvestments] = useState<PurchasedInvestment[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);
    const [doubleDownState, setDoubleDownState] = useState<DoubleDownState>({
        sacrificeId: null,
        doubleDownId: null
    });

    // Get current round's investment phase key
    const currentInvestmentPhase = `rd${currentRound}-invest`;

    // Fetch regular investment decisions
    const {data: regularDecisions, refresh: refreshRegular} = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId) return [];
            const decision = await db.decisions.getForPhase(sessionId, teamId, currentInvestmentPhase);
            return decision ? [decision] : [];
        },
        [sessionId, teamId, currentInvestmentPhase],
        {
            cacheKey: `team-regular-investments-${sessionId}-${teamId}-${currentRound}`,
            cacheTimeout: 1000
        }
    );

    // Fetch immediate purchase decisions
    const {data: immediateDecisions, refresh: refreshImmediate} = useSupabaseQuery(
        async () => {
            if (!sessionId || !teamId) return [];
            return await db.decisions.getImmediatePurchases(sessionId, teamId, currentInvestmentPhase);
        },
        [sessionId, teamId, currentInvestmentPhase],
        {
            cacheKey: `team-immediate-investments-${sessionId}-${teamId}-${currentRound}`,
            cacheTimeout: 1000
        }
    );

    // ✅ CENTRALIZED REFRESH: Listen to trigger from useTeamGameState
    useEffect(() => {
        if (refreshTrigger > 0) {
            setTimeout(() => {
                refreshRegular();
                refreshImmediate();
            }, 100);
        }
    }, [refreshTrigger]);

    // ✅ Process and combine investment data WITH CONTINUATION PRICING
    useEffect(() => {
        const processInvestments = async () => {
            console.log('🔍 processInvestments called:', { regularDecisions, immediateDecisions });
            if (!gameStructure || (!regularDecisions && !immediateDecisions)) {
                console.log('🔍 Early return - no data');
                setInvestments([]);
                setTotalSpent(0);
                return;
            }

            const processedInvestments: PurchasedInvestment[] = [];
            let totalCost = 0;

            // Get investment options for this round
            const investmentOptions = gameStructure.all_investment_options?.[currentInvestmentPhase] || [];

            // ✅ Get continuation pricing for this team and round (for rounds 2+)
            let continuationPricing: any = null;
            if (currentRound > 1) {
                try {
                    continuationPricing = await ContinuationPricingEngine.calculateContinuationPricing(
                        sessionId,
                        teamId,
                        currentRound as 2 | 3
                    );
                } catch (error) {
                    console.error('[TeamInvestmentDisplay] Error getting continuation pricing:', error);
                }
            }

            // Helper function to get actual cost for an investment
            const getActualCost = (investmentId: string, originalCost: number) => {
                if (!continuationPricing) return originalCost;

                const pricing = continuationPricing.investmentPricing.find((p: any) => p.investmentId === investmentId);
                return pricing?.finalPrice ?? originalCost;
            };

            // Helper function to check if investment is continuation
            const isContinuation = (investmentId: string) => {
                if (!continuationPricing) return false;

                const pricing = continuationPricing.investmentPricing.find((p: any) => p.investmentId === investmentId);
                return pricing?.availability === 'continue';
            };

            // Process regular decisions
            (regularDecisions || []).forEach(decision => {
                const selectedOptions = decision.selected_investment_options || [];
                const budget = decision.total_spent_budget || 0;
                totalCost += budget;

                selectedOptions.forEach((optionId: string) => {
                    const option = investmentOptions.find((opt: any) => opt.id === optionId);
                    if (option) {
                        const originalCost = option.cost || 0;
                        const actualCost = getActualCost(optionId, originalCost);

                        processedInvestments.push({
                            id: optionId,
                            name: option.name.split('.')[1]?.trim() || option.name.trim(),
                            originalCost,
                            actualCost,
                            isImmediate: false,
                            isContinuation: isContinuation(optionId)
                        });
                    }
                });
            });

            // Process immediate decisions
            (immediateDecisions || []).forEach(decision => {
                const selectedOptions = decision.selected_investment_options || [];
                const budget = decision.total_spent_budget || 0;
                totalCost += budget;

                selectedOptions.forEach((optionId: string) => {
                    const option = investmentOptions.find((opt: any) => opt.id === optionId);
                    if (option) {
                        const originalCost = option.cost || 0;
                        const actualCost = getActualCost(optionId, originalCost);

                        processedInvestments.push({
                            id: optionId,
                            name: option.name.split('.')[1]?.trim() || option.name.trim(),
                            originalCost,
                            actualCost,
                            isImmediate: true,
                            isContinuation: isContinuation(optionId)
                        });
                    }
                });
            });

            // Apply double down visual indicators if we're in round 3 and have double down decisions
            let finalInvestments = processedInvestments;

            if (currentRound === 3 && doubleDownState.sacrificeId) {
                finalInvestments = processedInvestments.map(inv => {
                    if (inv.id === doubleDownState.sacrificeId) {
                        // Mark the sacrificed investment
                        return {...inv, name: `${inv.name} (SACRIFICED)`};
                    } else if (inv.id === doubleDownState.doubleDownId) {
                        // Mark the doubled down investment
                        return {...inv, name: `${inv.name} (DOUBLED DOWN)`};
                    }
                    return inv;
                });
            }

            // Sort alphabetically by ID
            finalInvestments.sort((a, b) => a.id.localeCompare(b.id));

            setInvestments(finalInvestments);
            console.log('🔍 Final totalCost:', totalCost);
            setTotalSpent(totalCost);
        };

        processInvestments();
    }, [regularDecisions, immediateDecisions, gameStructure, currentInvestmentPhase, teamId, sessionId, currentRound]);

    // Load double down decision
    useEffect(() => {
        const loadDoubleDownState = async () => {
            if (!sessionId || !teamId || currentRound !== 3) {
                return;
            }

            try {
                const data = await db.decisions.getForPhase(sessionId, teamId, 'ch-dd-prompt');
                if (data && (data.double_down_sacrifice_id || data.double_down_on_id)) {
                    setDoubleDownState({
                        sacrificeId: data.double_down_sacrifice_id,
                        doubleDownId: data.double_down_on_id
                    });
                } else {
                    // Clear double down state if no valid data found
                    setDoubleDownState({
                        sacrificeId: null,
                        doubleDownId: null
                    });
                }
            } catch (error) {
                console.warn('No double down decision found:', error);
                // Clear double down state when decision is not found (reset)
                setDoubleDownState({
                    sacrificeId: null,
                    doubleDownId: null
                });
            }
        };

        loadDoubleDownState();
    }, [sessionId, teamId, currentRound, refreshTrigger]);

    // Don't render if no investments
    if (investments.length === 0) {
        return null;
    }

    return (
        <div className="flex-shrink-0">
            {/* Collapsible Header */}
            <div
                className="bg-slate-700/50 rounded-lg p-3 mb-2 cursor-pointer hover:bg-slate-700/70 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package size={16} className="text-blue-400"/>
                        <div className="text-sm font-medium text-white">
                            Round {currentRound} Investments ({investments.length})
                        </div>
                        <div className="text-xs text-slate-400">
                            {formatCurrency(totalSpent)} spent
                        </div>
                    </div>
                    {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="space-y-2">
                        {investments.map((investment, index) => (
                            <div key={`${investment.id}-${index}`}
                                 className={`rounded-lg p-3 border ${
                                     investment.name.includes('(SACRIFICED)')
                                         ? 'bg-red-900/30 border-red-600/50'
                                         : investment.name.includes('(DOUBLED DOWN)')
                                             ? 'bg-green-900/30 border-green-600/50'
                                             : 'bg-slate-800/50 border-slate-600/30'
                                 }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium text-sm ${
                                                investment.name.includes('(SACRIFICED)')
                                                    ? 'text-red-300'
                                                    : investment.name.includes('(DOUBLED DOWN)')
                                                        ? 'text-green-300'
                                                        : 'text-white'
                                            }`}>
                                                {investment.name}
                                            </span>
                                            {investment.isImmediate && (
                                                <span
                                                    className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full font-medium border border-yellow-500/30">
                                                Immediate
                                            </span>
                                            )}
                                            {investment.isContinuation && (
                                                <span
                                                    className="px-2 py-1 bg-game-orange-500/20 text-blue-300 text-xs rounded-full font-medium border border-game-orange-500/30">
                                                Continue
                                            </span>
                                            )}
                                        </div>
                                        {/* REMOVED: Investment descriptions */}
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className={`font-bold text-sm ${
                                            investment.name.includes('(SACRIFICED)')
                                                ? 'text-red-400'
                                                : investment.name.includes('(DOUBLED DOWN)')
                                                    ? 'text-green-400'
                                                    : 'text-green-400'
                                        }`}>
                                            {formatCurrency(investment.actualCost)}
                                        </div>
                                        {investment.actualCost !== investment.originalCost && (
                                            <div className="text-xs text-slate-400 line-through">
                                                {formatCurrency(investment.originalCost)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-600/40">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-300">Total Investment</span>
                            <span className="font-bold text-green-400 text-lg">
                            {formatCurrency(totalSpent)}
                        </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamInvestmentDisplay;
