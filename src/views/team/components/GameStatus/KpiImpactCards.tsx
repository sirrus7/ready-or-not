// src/views/team/components/GameStatus/KpiImpactCards.tsx
// Updated to remove rounds display since impact cards always affect all rounds

import React, {useMemo} from 'react';
import {PermanentKpiAdjustment} from '@shared/types';
import {Building, ShoppingCart, DollarSign, TrendingUp, AlertCircle} from 'lucide-react';
import {getChallengeById} from '@core/content/ChallengeRegistry';

interface KpiImpactCardsProps {
    teamId: string;
    currentRound: number;
    permanentAdjustments: PermanentKpiAdjustment[];
    isLoadingAdjustments?: boolean;
}

interface ImpactCard {
    id: string;
    title: string;
    description: string;
    kpiEffects: {
        kpi: string;
        value: number;
        applies_to_rounds: number[];
    }[];
    source: string;
}

const KpiImpactCards: React.FC<KpiImpactCardsProps> = ({
                                                           teamId,
                                                           currentRound,
                                                           permanentAdjustments,
                                                           isLoadingAdjustments = false
                                                       }) => {

    // ========================================================================
    // EXISTING LOGIC - UNCHANGED
    // ========================================================================
    const impactCards: ImpactCard[] = useMemo(() => {
        if (!permanentAdjustments.length) return [];

        const cardMap: Record<string, ImpactCard> = {};

        permanentAdjustments.forEach(adjustment => {
            if (adjustment.team_id !== teamId) return;

            // Use challenge_id if available, otherwise extract from description
            let challengeId = adjustment.challenge_id;
            if (!challengeId) {
                challengeId = extractChallengeFromDescription(adjustment.description);
            }

            const challenge = getChallengeById(challengeId);
            if (!challenge) {
                console.warn(`[KpiImpactCards] Could not find challenge for ID: ${challengeId}`);
                return;
            }

            // Create or update impact card
            if (!cardMap[challengeId]) {
                cardMap[challengeId] = {
                    id: challengeId,
                    title: challenge.impact_card_title || `${challengeId.toUpperCase()} Impact`,
                    description: challenge.impact_card_description || 'Impact from your decision',
                    kpiEffects: [],
                    source: challengeId
                };
            }

            // Add or update KPI effect - EXISTING LOGIC
            const existingEffect = cardMap[challengeId].kpiEffects.find(e => e.kpi === adjustment.kpi_key);
            if (existingEffect) {
                if (!existingEffect.applies_to_rounds.includes(adjustment.applies_to_round_start)) {
                    existingEffect.applies_to_rounds.push(adjustment.applies_to_round_start);
                }
            } else {
                cardMap[challengeId].kpiEffects.push({
                    kpi: adjustment.kpi_key,
                    value: adjustment.change_value,
                    applies_to_rounds: [adjustment.applies_to_round_start]
                });
            }
        });

        return Object.values(cardMap);
    }, [permanentAdjustments, teamId]);

    // ✅ ADD THIS: Don't render anything if no impact cards
    if (!impactCards.length && !isLoadingAdjustments) {
        return null;
    }

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    const extractChallengeFromDescription = (description: string): string => {
        // Try to extract challenge ID from description
        const match = description.match(/^([A-Z0-9_]+)/);
        return match ? match[1].toLowerCase() : 'unknown';
    };

    const getKpiIcon = (kpi: string) => {
        switch (kpi) {
            case 'capacity':
                return <Building className="w-4 h-4 text-blue-400"/>;
            case 'orders':
                return <ShoppingCart className="w-4 h-4 text-yellow-400"/>;
            case 'cost':
                return <DollarSign className="w-4 h-4 text-green-400"/>;
            case 'asp':
                return <TrendingUp className="w-4 h-4 text-red-400"/>;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-400"/>;
        }
    };

    const formatKpiValue = (kpi: string, value: number): string => {
        if (kpi === 'cost' || kpi === 'asp') {
            return value >= 0 ? `+$${value.toLocaleString()}` : `-$${Math.abs(value).toLocaleString()}`;
        }
        return value >= 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
    };

    const getKpiLabel = (kpi: string): string => {
        switch (kpi) {
            case 'capacity':
                return 'Capacity';
            case 'orders':
                return 'Orders';
            case 'cost':
                return 'Cost';
            case 'asp':
                return 'ASP';
            default:
                return kpi.toUpperCase();
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    // Show loading state
    if (isLoadingAdjustments) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400"/>
                    <h3 className="text-sm font-semibold text-slate-200">Impact Cards</h3>
                </div>
                <div
                    className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700 animate-pulse">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-400 mr-3"></div>
                        <span className="text-slate-300 text-sm">Loading impact cards...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show empty state
    if (!impactCards.length) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400"/>
                    <h3 className="text-sm font-semibold text-slate-300">Impact Cards</h3>
                </div>
                <div
                    className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-4 border border-slate-700/50 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2"/>
                    <p className="text-sm text-slate-400 font-medium">No impact cards yet</p>
                    <p className="text-xs text-slate-500 mt-1">Make decisions to see future effects</p>
                </div>
            </div>
        );
    }

    // Show impact cards
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400"/>
                <h3 className="text-sm font-semibold text-slate-200">Impact Cards</h3>
            </div>
            <div className="space-y-3">
                {impactCards.map(card => (
                    <div key={card.id}
                         className="bg-gradient-to-br from-slate-700/30 to-slate-600/40 rounded-lg p-3 border border-slate-500/50 shadow-lg">

                        {/* Card Header */}
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-500/30">
                            <div className="w-6 h-6 bg-slate-500 rounded-lg flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-slate-200"/>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-100">
                                    {card.title}
                                </h4>
                                <div className="text-xs text-slate-300">
                                    Impact Card
                                </div>
                            </div>
                        </div>

                        {/* Card Description */}
                        <p className="text-xs text-slate-300 mb-3">
                            {card.description}
                        </p>

                        {/* KPI Effects - UPDATED: Removed rounds display */}
                        <div className="space-y-2">
                            {card.kpiEffects.map((effect, index) => {
                                // Match KPI colors based on effect type
                                const getKpiColorClasses = (kpi: string) => {
                                    switch (kpi) {
                                        case 'capacity':
                                            return {
                                                bg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20',
                                                border: 'border-blue-500/30'
                                            };
                                        case 'orders':
                                            return {
                                                bg: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20',  // Changed from green to yellow
                                                border: 'border-yellow-500/30'
                                            };
                                        case 'cost':
                                            return {
                                                bg: 'bg-gradient-to-r from-green-500/20 to-green-600/20',    // Changed from red to green
                                                border: 'border-green-500/30'
                                            };
                                        case 'asp':
                                            return {
                                                bg: 'bg-gradient-to-r from-red-500/20 to-red-600/20',       // Changed from purple to red
                                                border: 'border-red-500/30'
                                            };
                                        default:
                                            return {
                                                bg: 'bg-gradient-to-r from-slate-700/30 to-slate-800/30',
                                                border: 'border-slate-600/30'
                                            };
                                    }
                                };

                                const colorClasses = getKpiColorClasses(effect.kpi);

                                return (
                                    <div key={`${effect.kpi}-${index}`}
                                         className={`${colorClasses.bg} backdrop-blur-sm rounded-lg p-3 border ${colorClasses.border}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {getKpiIcon(effect.kpi)}
                                                <span className="text-sm font-semibold text-slate-200">
                                                    {getKpiLabel(effect.kpi)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    effect.value >= 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {formatKpiValue(effect.kpi, effect.value)}
                                                </div>
                                                {/* REMOVED: Rounds display since impact cards affect all rounds */}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Active Status Indicator */}
                        {card.kpiEffects.some(effect =>
                            effect.applies_to_rounds.includes(currentRound)
                        ) && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="font-medium text-green-400">Active this round</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KpiImpactCards;
