// src/views/team/components/GameStatus/KpiImpactCards.tsx
// Updated to remove rounds display since impact cards always affect all rounds

import React, {useMemo, useState} from 'react';
import {PermanentKpiAdjustment} from '@shared/types';
import {Building, ShoppingCart, DollarSign, TrendingUp, AlertCircle, ChevronDown, ChevronRight} from 'lucide-react';
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

    const [isExpanded, setIsExpanded] = useState(false);

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
            <div className="space-y-4" style={{perspective: '1200px', perspectiveOrigin: 'center top'}}>
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400"/>
                    <h3 className="text-sm font-semibold text-slate-200">Impact Cards</h3>
                </div>
                <div
                    className="bg-gradient-to-br from-slate-800/60 to-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-700/60 shadow-2xl animate-pulse"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: 'rotateX(2deg) rotateY(-1deg)',
                    }}>
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
            <div className="space-y-4" style={{perspective: '1200px', perspectiveOrigin: 'center top'}}>
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400"/>
                    <h3 className="text-sm font-semibold text-slate-300">Impact Cards</h3>
                </div>
                <div
                    className="bg-gradient-to-br from-slate-800/60 to-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-700/60 shadow-2xl text-center transform transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: 'rotateX(2deg) rotateY(-1deg)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'rotateX(-3deg) rotateY(2deg) scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'rotateX(2deg) rotateY(-1deg) scale(1)';
                    }}>
                    <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3"/>
                    <p className="text-sm text-slate-400 font-medium">No impact cards yet</p>
                    <p className="text-xs text-slate-500 mt-1">Make decisions to see future effects</p>
                </div>
            </div>
        );
    }

    // Show impact cards
    return (
        <div className="flex-shrink-0">
            {/* Collapsible Header */}
            <div
                className="bg-slate-700/50 rounded-lg p-3 mb-2 cursor-pointer hover:bg-slate-700/70 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white">
                            Permanent KPI Impact ({impactCards.length})
                        </div>
                        {!isExpanded && (
                            <div className="flex gap-1 ml-2">
                                {impactCards.slice(0, 3).map((card, index) => (
                                    <div key={card.id}
                                         className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-slate-300">{card.title.charAt(0)}</span>
                                    </div>
                                ))}
                                {impactCards.length > 3 && (
                                    <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                                        <span
                                            className="text-xs font-bold text-slate-300">+{impactCards.length - 3}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </div>
            </div>

            {/* Expanded Content - Always show card details when expanded */}
            {isExpanded && (
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    {impactCards.map((card) => (
                        <div key={card.id} className="bg-slate-800/50 rounded-lg border border-slate-600/30 p-3">
                            {/* Card Header - No click handler, always visible */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-slate-300">{card.title.charAt(0)}</span>
                                </div>
                                <span className="font-medium text-white text-sm">{card.title}</span>
                                <span className="text-xs text-slate-400">
                                {card.kpiEffects.length} effect{card.kpiEffects.length !== 1 ? 's' : ''}
                            </span>
                            </div>

                            {/* Card Effects - Always visible */}
                            <div className="space-y-2">
                                {card.kpiEffects.map((effect, index) => (
                                    <div key={`${effect.kpi}-${index}`}
                                         className="bg-slate-700/50 rounded-lg p-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getKpiIcon(effect.kpi)}
                                            <span className="font-medium text-white capitalize text-sm">
                                            {effect.kpi}
                                        </span>
                                        </div>
                                        <div className={`font-bold text-sm ${
                                            effect.value >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {formatKpiValue(effect.kpi, effect.value)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Active Status Indicator */}
                            {card.kpiEffects.some(effect =>
                                effect.applies_to_rounds.includes(currentRound)
                            ) && (
                                <div className="mt-2 pt-2 border-t border-slate-600/40">
                                    <div
                                        className="flex items-center gap-2 text-xs bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="font-bold text-green-300 uppercase tracking-wider">Active this round</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KpiImpactCards;
