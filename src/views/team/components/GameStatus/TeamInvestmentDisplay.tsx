// src/views/team/components/GameStatus/TeamInvestmentDisplay.tsx
// FIXED: Shows actual continuation prices instead of original prices

import React, {useEffect, useState} from 'react';
import {ShoppingBag, DollarSign, CheckCircle} from 'lucide-react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {supabase} from '@shared/services/supabase';
import {ContinuationPricingEngine} from '@core/game/ContinuationPricingEngine';

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

            const {data, error} = await supabase
                .from('team_decisions')
                .select('selected_investment_options, total_spent_budget, phase_id')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('phase_id', currentInvestmentPhase)
                .eq('is_immediate_purchase', false);

            if (error) throw error;
            return data || [];
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

            const {data, error} = await supabase
                .from('team_decisions')
                .select('selected_investment_options, total_spent_budget, phase_id')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('is_immediate_purchase', true)
                .eq('immediate_purchase_type', 'business_growth_strategy')
                .like('phase_id', `${currentInvestmentPhase}%`);

            if (error) throw error;
            return data || [];
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
            if (!gameStructure || (!regularDecisions && !immediateDecisions)) {
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

            // Sort alphabetically by ID
            processedInvestments.sort((a, b) => a.id.localeCompare(b.id));

            setInvestments(processedInvestments);
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
                const { data } = await supabase
                    .from('team_decisions')
                    .select('double_down_sacrifice_id, double_down_on_id')
                    .eq('session_id', sessionId)
                    .eq('team_id', teamId)
                    .eq('phase_id', 'ch-dd-prompt')
                    .single();

                if (data) {
                    setDoubleDownState({
                        sacrificeId: data.double_down_sacrifice_id,
                        doubleDownId: data.double_down_on_id
                    });
                }
            } catch (error) {
                console.warn('No double down decision found:', error);
            }
        };

        loadDoubleDownState();
    }, [sessionId, teamId, currentRound, refreshTrigger]);

    // Don't render if no investments
    if (investments.length === 0) {
        return null;
    }

    return (
        <div
            className="bg-gradient-to-r from-gray-800/40 to-slate-700/40 border border-gray-600/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="text-blue-400" size={20}/>
                <h3 className="text-gray-200 font-semibold text-lg">
                    Round {currentRound} Investments
                </h3>
                <CheckCircle className="text-green-400 ml-auto" size={16}/>
            </div>

            {/* Investment List */}
            <div className="space-y-2 mb-3">
                {investments.map((investment) => {
                    const isDoubleDown = doubleDownState.doubleDownId === investment.id;
                    const isSacrificed = doubleDownState.sacrificeId === investment.id;

                    return (
                        <div
                            key={investment.id}
                            className={`flex items-center justify-between p-3 rounded-lg border 
                    ${isDoubleDown ? 'bg-green-900/30 border-green-500/50' :
                                isSacrificed ? 'bg-red-900/30 border-red-500/50 opacity-60' :
                                    'bg-gray-700/50 border-gray-600/50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${isDoubleDown ? 'bg-green-600 text-white' :
                                        isSacrificed ? 'bg-red-600 text-white' :
                                            investment.isImmediate ? 'bg-purple-600 text-white' :
                                                investment.isContinuation ? 'bg-orange-600 text-white' :
                                                    'bg-blue-600 text-white'}`}
                                >
                                    {investment.id}
                                </div>
                                <div className="flex-1">
                                    <div className={`font-medium text-sm text-gray-200`}>
                            <span className={isSacrificed ? 'line-through text-gray-500' : ''}>
                                {investment.name}
                            </span>
                                        {isDoubleDown && <span className="text-green-400 text-xs ml-2">DOUBLED</span>}
                                        {isSacrificed && <span className="text-red-400 text-xs ml-2">SACRIFICED</span>}
                                    </div>
                                    {investment.originalCost !== investment.actualCost && (
                                        <div className="text-xs text-gray-400">
                                            Original: ${investment.originalCost.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-gray-200">
                                    ${investment.actualCost.toLocaleString()}
                                </div>
                                {investment.isImmediate && (
                                    <div className="text-xs text-purple-400">Immediate</div>
                                )}
                                {investment.isContinuation && (
                                    <div className="text-xs text-orange-400">Continued</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total Spent */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-600/30">
                <div className="flex items-center gap-2">
                    <DollarSign className="text-green-400" size={16}/>
                    <span className="text-gray-300 font-medium">Total Spent:</span>
                </div>
                <span className="text-green-400 font-bold">
                    ${totalSpent.toLocaleString()}
                </span>
            </div>
        </div>
    );
};

export default TeamInvestmentDisplay;
