// src/views/team/components/GameStatus/KpiImpactCards.tsx
// CRITICAL FIX: Enhanced impact card rendering with proper real-time updates

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
    // CRITICAL FIX: Memoized data processing to prevent excessive re-renders
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

            // Add or update KPI effect
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
                return <Building className="w-4 h-4"/>;
            case 'orders':
                return <ShoppingCart className="w-4 h-4"/>;
            case 'cost':
                return <DollarSign className="w-4 h-4"/>;
            case 'asp':
                return <TrendingUp className="w-4 h-4"/>;
            default:
                return <AlertCircle className="w-4 h-4"/>;
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
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Impact Cards</h3>
                <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-full"></div>
                </div>
            </div>
        );
    }

    // Show empty state
    if (!impactCards.length) {
        return (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Impact Cards</h3>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-1"/>
                    <p className="text-xs text-gray-500">No impact cards yet</p>
                    <p className="text-xs text-gray-400">Make decisions to see future effects</p>
                </div>
            </div>
        );
    }

    // Show impact cards
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Impact Cards</h3>
            <div className="space-y-2">
                {impactCards.map(card => (
                    <div key={card.id}
                         className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                        {/* Card Header */}
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-800 leading-tight">
                                {card.title}
                            </h4>
                            <div className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-100 rounded">
                                {card.source.toUpperCase()}
                            </div>
                        </div>

                        {/* Card Description */}
                        <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                            {card.description}
                        </p>

                        {/* KPI Effects */}
                        <div className="space-y-1.5">
                            {card.kpiEffects.map((effect, index) => (
                                <div key={`${effect.kpi}-${index}`}
                                     className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        {getKpiIcon(effect.kpi)}
                                        <span className="font-medium text-gray-700">
                                            {getKpiLabel(effect.kpi)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold ${
                                            effect.value >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {formatKpiValue(effect.kpi, effect.value)}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                            R{effect.applies_to_rounds.sort().join(', ')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Active Status Indicator */}
                        {card.kpiEffects.some(effect =>
                            effect.applies_to_rounds.includes(currentRound)
                        ) && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                                <div className="flex items-center gap-1.5 text-xs text-blue-700">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium">Active this round</span>
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
