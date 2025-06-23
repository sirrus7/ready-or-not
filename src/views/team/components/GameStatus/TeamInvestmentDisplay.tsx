// src/views/team/components/GameStatus/TeamInvestmentDisplay.tsx
// Shows purchased investments for the current round on team app

import React, {useEffect, useState} from 'react';
import {ShoppingBag, DollarSign, CheckCircle} from 'lucide-react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {supabase} from '@shared/services/supabase';

interface InvestmentDisplayProps {
    sessionId: string;
    teamId: string;
    currentRound: number;
    gameStructure: any;
}

interface PurchasedInvestment {
    id: string;
    name: string;
    cost: number;
    isImmediate: boolean;
}

const TeamInvestmentDisplay: React.FC<InvestmentDisplayProps> = ({
                                                                     sessionId,
                                                                     teamId,
                                                                     currentRound,
                                                                     gameStructure
                                                                 }) => {
    const [investments, setInvestments] = useState<PurchasedInvestment[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);

    // Get current round's investment phase key
    const currentInvestmentPhase = `rd${currentRound}-invest`;

    // Fetch regular investment decisions
    const {data: regularDecisions} = useSupabaseQuery(
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
            cacheTimeout: 3000
        }
    );

    // Fetch immediate purchase decisions
    const {data: immediateDecisions} = useSupabaseQuery(
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
            cacheTimeout: 3000
        }
    );

    // Process and combine investment data
    useEffect(() => {
        if (!gameStructure || (!regularDecisions && !immediateDecisions)) {
            setInvestments([]);
            setTotalSpent(0);
            return;
        }

        const processedInvestments: PurchasedInvestment[] = [];
        let totalCost = 0;

        // Get investment options for this round
        const investmentOptions = gameStructure.all_investment_options?.[currentInvestmentPhase] || [];

        // Process regular decisions
        (regularDecisions || []).forEach(decision => {
            const selectedOptions = decision.selected_investment_options || [];
            const budget = decision.total_spent_budget || 0;
            totalCost += budget;

            selectedOptions.forEach((optionId: string) => {
                const option = investmentOptions.find((opt: any) => opt.id === optionId);
                if (option) {
                    processedInvestments.push({
                        id: optionId,
                        name: option.name.split('.')[0].trim(),
                        cost: option.cost || 0,
                        isImmediate: false
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
                    processedInvestments.push({
                        id: optionId,
                        name: option.name.split('.')[0].trim(),
                        cost: option.cost || 0,
                        isImmediate: true
                    });
                }
            });
        });

        // Sort alphabetically by ID
        processedInvestments.sort((a, b) => a.id.localeCompare(b.id));

        setInvestments(processedInvestments);
        setTotalSpent(totalCost);
    }, [regularDecisions, immediateDecisions, gameStructure, currentInvestmentPhase]);

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
                                {investment.id}
                            </span>
                            <span className="text-gray-200 text-sm">
                                {investment.name}
                            </span>
                            {investment.isImmediate && (
                                <span className="bg-orange-600 text-orange-100 px-1 py-0.5 rounded text-xs">
                                    Immediate
                                </span>
                            )}
                        </div>
                        <span className="text-green-400 font-semibold text-sm">
                            ${investment.cost.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Total Spent */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-600/50">
                <div className="flex items-center gap-2">
                    <DollarSign className="text-green-400" size={16}/>
                    <span className="text-gray-300 font-semibold">Total Spent:</span>
                </div>
                <span className="text-green-400 font-bold text-lg">
                    ${totalSpent.toLocaleString()}
                </span>
            </div>

            {/* Budget Remaining (assumes $250k budget for R1, can be made dynamic) */}
            {currentRound === 1 && (
                <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400">Unspent Budget:</span>
                    <span className="text-gray-300">
                        ${(250000 - totalSpent).toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
};

export default TeamInvestmentDisplay;
