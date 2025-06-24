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
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400"/>
                <h3 className="text-sm font-semibold text-slate-200">Impact Cards</h3>
            </div>
            <div className="space-y-4" style={{perspective: '1000px'}}>
                {impactCards.map(card => (
                    <div key={card.id}
                         className="bg-gradient-to-br from-slate-800/70 to-slate-900/80 backdrop-blur-sm rounded-2xl p-5 border-2 border-slate-600/50 shadow-2xl transform transition-all duration-500 hover:shadow-3xl hover:scale-[1.02] hover:border-slate-500/70 hover:from-slate-700/70 hover:to-slate-800/80"
                         style={{
                             transformStyle: 'preserve-3d',
                             transform: 'rotateX(2deg) rotateY(-1deg)',
                         }}
                         onMouseEnter={(e) => {
                             e.currentTarget.style.transform = 'rotateX(-5deg) rotateY(3deg) scale(1.02)';
                         }}
                         onMouseLeave={(e) => {
                             e.currentTarget.style.transform = 'rotateX(2deg) rotateY(-1deg) scale(1)';
                         }}>

                        {/* Card Header */}
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-600/40">
                            <div
                                className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg border border-slate-500/30 transform transition-all duration-200"
                                style={{
                                    transformStyle: 'preserve-3d',
                                    transform: 'rotateX(5deg) rotateY(-2deg)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'rotateX(-3deg) rotateY(3deg)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'rotateX(5deg) rotateY(-2deg)';
                                }}>
                                <AlertCircle className="w-5 h-5 text-slate-200"/>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-base font-bold text-slate-100 tracking-wide">
                                    {card.title}
                                </h4>
                                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                                    Impact Card
                                </div>
                            </div>
                        </div>

                        {/* Card Description */}
                        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                            {card.description}
                        </p>

                        {/* KPI Effects - UPDATED: Removed rounds display */}
                        <div className="space-y-3">
                            {card.kpiEffects.map((effect, index) => {
                                // Match KPI colors based on effect type
                                const getKpiColorClasses = (kpi: string) => {
                                    switch (kpi) {
                                        case 'capacity':
                                            return {
                                                bg: 'bg-gradient-to-br from-blue-500/25 to-blue-600/35',
                                                border: 'border-blue-400/40',
                                                glow: 'shadow-blue-500/20'
                                            };
                                        case 'orders':
                                            return {
                                                bg: 'bg-gradient-to-br from-yellow-500/25 to-yellow-600/35',
                                                border: 'border-yellow-400/40',
                                                glow: 'shadow-yellow-500/20'
                                            };
                                        case 'cost':
                                            return {
                                                bg: 'bg-gradient-to-br from-green-500/25 to-green-600/35',
                                                border: 'border-green-400/40',
                                                glow: 'shadow-green-500/20'
                                            };
                                        case 'asp':
                                            return {
                                                bg: 'bg-gradient-to-br from-red-500/25 to-red-600/35',
                                                border: 'border-red-400/40',
                                                glow: 'shadow-red-500/20'
                                            };
                                        default:
                                            return {
                                                bg: 'bg-gradient-to-br from-slate-700/40 to-slate-800/50',
                                                border: 'border-slate-600/40',
                                                glow: 'shadow-slate-500/20'
                                            };
                                    }
                                };

                                const colorClasses = getKpiColorClasses(effect.kpi);

                                return (
                                    <div key={`${effect.kpi}-${index}`}
                                         className={`${colorClasses.bg} backdrop-blur-sm rounded-xl p-4 border-2 ${colorClasses.border} shadow-lg ${colorClasses.glow} transform transition-all duration-300 hover:shadow-xl`}
                                         style={{
                                             transformStyle: 'preserve-3d',
                                             transform: 'rotateX(1deg)',
                                         }}
                                         onMouseEnter={(e) => {
                                             e.currentTarget.style.transform = 'rotateX(-2deg) rotateY(1deg) scale(1.02)';
                                         }}
                                         onMouseLeave={(e) => {
                                             e.currentTarget.style.transform = 'rotateX(1deg) rotateY(0deg) scale(1)';
                                         }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="p-2 bg-slate-900/30 rounded-lg border border-slate-600/30 transform transition-all duration-200"
                                                    style={{
                                                        transformStyle: 'preserve-3d',
                                                        transform: 'rotateY(-2deg)',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'rotateY(2deg) rotateX(-1deg)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'rotateY(-2deg) rotateX(0deg)';
                                                    }}>
                                                    {getKpiIcon(effect.kpi)}
                                                </div>
                                                <span className="text-sm font-bold text-slate-100 tracking-wide">
                                                    {getKpiLabel(effect.kpi)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-black tracking-tight ${
                                                    effect.value >= 0 ? 'text-green-400' : 'text-red-400'
                                                } drop-shadow-lg`}>
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
                            <div className="mt-4 pt-4 border-t border-slate-600/40">
                                <div
                                    className="flex items-center gap-2 text-xs bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                                    <div
                                        className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                                    <span className="font-bold text-green-300 uppercase tracking-wider">Active this round</span>
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
