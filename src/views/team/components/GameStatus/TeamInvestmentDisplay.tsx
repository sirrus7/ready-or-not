// src/views/team/components/GameStatus/TeamInvestmentDisplay.tsx
// FIXED: Shows actual continuation prices instead of original prices

import React, {useEffect, useState} from 'react';
import {ShoppingBag, DollarSign, CheckCircle} from 'lucide-react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {supabase} from '@shared/services/supabase';
import {ContinuationPricingEngine} from '@core/game/ContinuationPricingEngine';
import {InvestmentDisplayUtils} from "@shared/utils/InvestmentDisplayUtils.ts";

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

const TeamInvestmentDisplay: React.FC<InvestmentDisplayProps> = ({
                                                                     sessionId,
                                                                     teamId,
                                                                     currentRound,
                                                                     gameStructure,
                                                                     refreshTrigger = 0
                                                                 }) => {
    const [investments, setInvestments] = useState<PurchasedInvestment[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);

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
                {investments.map((investment) => (
                    <div
                        key={investment.id}
                        className="flex items-center justify-between bg-slate-800/40 rounded p-2 border border-gray-600/30"
                    >
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded text-sm font-mono">
                                {InvestmentDisplayUtils.getDisplayId(investment.id, true)}
                            </span>
                            <span className="text-gray-200 text-sm">
                                {investment.name}
                            </span>
                            {investment.isImmediate && (
                                <span className="bg-orange-600 text-orange-100 px-1 py-0.5 rounded text-xs">
                                    Immediate
                                </span>
                            )}
                            {investment.isContinuation && (
                                <span className="bg-green-600 text-green-100 px-1 py-0.5 rounded text-xs">
                                    Continued
                                </span>
                            )}
                        </div>

                        <div className="text-right">
                            {/* ✅ Show actual cost (with continuation discount if applicable) */}
                            <span className="text-green-400 font-semibold text-sm">
                                ${investment.actualCost.toLocaleString()}
                            </span>

                            {/* ✅ Show savings if continuation */}
                            {investment.isContinuation && investment.actualCost < investment.originalCost && (
                                <div className="text-xs text-gray-400 line-through">
                                    ${investment.originalCost.toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
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
