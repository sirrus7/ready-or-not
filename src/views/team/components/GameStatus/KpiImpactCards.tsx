// src/views/team/components/GameStatus/KpiImpactCards.tsx
// OPTIMIZED VERSION - Designed for vertical sidebar layout

/**
 * ============================================================================
 * KPI IMPACT CARDS COMPONENT - SIDEBAR OPTIMIZED
 * ============================================================================
 *
 * DESIGN REQUIREMENTS:
 * - Compact layout for narrow sidebar (320px width)
 * - Vertical stacking that complements the new KPI display
 * - Readable typography at smaller sizes
 * - Consistent visual hierarchy with sidebar design
 * - Touch-friendly for mobile devices
 * - Professional appearance matching overall theme
 *
 * LAYOUT STRATEGY:
 * - Smaller padding and margins for compact display
 * - Simplified card design with essential information
 * - Consistent color scheme with sidebar theme
 * - Proper spacing between multiple cards
 * - Clear visual separation from KPI display above
 * ============================================================================
 */

import React from 'react';
import {PermanentKpiAdjustment} from '@shared/types';
import {Building, ShoppingCart, DollarSign, TrendingUp} from 'lucide-react';
import {getChallengeById} from '@core/content/ChallengeRegistry';

interface KpiImpactCardsProps {
    teamId: string;
    currentRound: number;
    permanentAdjustments: PermanentKpiAdjustment[];
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
                                                           permanentAdjustments
                                                       }) => {

    // ========================================================================
    // DATA PROCESSING - Create impact cards from permanent adjustments
    // ========================================================================
    const createImpactCards = (): ImpactCard[] => {
        const cardMap: Record<string, ImpactCard> = {};

        permanentAdjustments.forEach(adjustment => {
            if (adjustment.team_id !== teamId) return;

            let challengeId = adjustment.challenge_id;
            if (!challengeId) {
                challengeId = extractChallengeFromDescription(adjustment.description);
            }

            const challenge = getChallengeById(challengeId);
            if (!challenge) return;

            if (!cardMap[challengeId]) {
                cardMap[challengeId] = {
                    id: challengeId,
                    title: challenge.impact_card_title,
                    description: challenge.impact_card_description,
                    kpiEffects: [],
                    source: challengeId
                };
            }

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
    };

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    const extractChallengeFromDescription = (description: string): string => {
        const desc = description?.toLowerCase() || '';
        if (desc.includes('ch1') || desc.includes('cnc') || desc.includes('machine')) return 'ch1';
        if (desc.includes('ch2') || desc.includes('tax')) return 'ch2';
        if (desc.includes('ch3') || desc.includes('layoff')) return 'ch3';
        if (desc.includes('ch4') || desc.includes('supply')) return 'ch4';
        if (desc.includes('ch5') || desc.includes('capacity')) return 'ch5';
        if (desc.includes('ch6') || desc.includes('quality')) return 'ch6';
        if (desc.includes('ch7') || desc.includes('competition')) return 'ch7';
        if (desc.includes('ch8') || desc.includes('cyber')) return 'ch8';
        if (desc.includes('ch9') || desc.includes('erp')) return 'ch9';
        return 'unknown';
    };

    const getKpiIcon = (kpi: string) => {
        switch (kpi) {
            case 'capacity':
                return <Building size={14}/>;
            case 'orders':
                return <ShoppingCart size={14}/>;
            case 'cost':
            case 'asp':
                return <DollarSign size={14}/>;
            default:
                return <TrendingUp size={14}/>;
        }
    };

    const getKpiColor = (kpi: string) => {
        switch (kpi) {
            case 'capacity':
                return 'text-blue-400';
            case 'orders':
                return 'text-yellow-400';
            case 'cost':
                return 'text-red-400';
            case 'asp':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    const formatKpiValue = (kpi: string, value: number): string => {
        const sign = value > 0 ? '+' : '';
        if (kpi === 'cost' || kpi === 'asp') {
            return `${sign}$${Math.abs(value).toLocaleString()}`;
        }
        return `${sign}${Math.abs(value).toLocaleString()}`;
    };

    // ========================================================================
    // RENDER LOGIC
    // ========================================================================
    const impactCards = createImpactCards();

    const relevantCards = impactCards.filter(card =>
        card.kpiEffects.some(effect =>
            effect.applies_to_rounds.some(round => round >= currentRound)
        )
    );

    if (relevantCards.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Section Header - Compact for sidebar */}
            <div className="flex items-center gap-2 px-2">
                <TrendingUp size={16} className="text-purple-400"/>
                <h3 className="text-sm font-semibold text-purple-400">Impact Cards</h3>
            </div>

            {/* Cards Container */}
            <div className="space-y-3">
                {relevantCards.map(card => (
                    <div
                        key={card.id}
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50 relative overflow-hidden"
                    >
                        {/* Challenge Badge */}
                        <div className="absolute top-2 right-2">
                            <div className="bg-purple-600/20 border border-purple-500/30 rounded px-2 py-0.5">
                                <span className="text-purple-300 text-xs font-semibold">
                                    {card.source.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Card Header - Compact */}
                        <div className="mb-2 pr-12">
                            <h4 className="text-sm font-bold text-white leading-tight">
                                {card.title}
                            </h4>
                        </div>

                        {/* Description - Condensed */}
                        <div className="mb-3">
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {card.description}
                            </p>
                        </div>

                        {/* KPI Effects - Sidebar Optimized */}
                        <div className="bg-gray-800/30 rounded p-2 space-y-1">
                            <p className="text-xs text-center text-gray-400 mb-2">
                                RD-{card.kpiEffects[0]?.applies_to_rounds.join(' & RD-')} Effects:
                            </p>

                            {card.kpiEffects.map((effect, index) => {
                                const applicableRounds = effect.applies_to_rounds.filter(round => round >= currentRound);
                                if (applicableRounds.length === 0) return null;

                                return (
                                    <div key={index} className="flex items-center justify-between">
                                        {/* KPI Label with Icon */}
                                        <div className="flex items-center gap-1.5">
                                            <span className={getKpiColor(effect.kpi)}>
                                                {getKpiIcon(effect.kpi)}
                                            </span>
                                            <span className="text-xs font-medium text-gray-200">
                                                {effect.kpi.toUpperCase()}
                                            </span>
                                        </div>

                                        {/* KPI Value */}
                                        <span className={`text-sm font-bold ${getKpiColor(effect.kpi)}`}>
                                            {formatKpiValue(effect.kpi, effect.value)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KpiImpactCards;
