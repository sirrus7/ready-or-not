// src/views/team/components/GameStatus/KpiImpactCards.tsx
// PRODUCTION VERSION: Uses explicit challenge IDs with backward compatibility

import React from 'react';
import {PermanentKpiAdjustment} from '@shared/types';
import {Building, ShoppingCart, DollarSign, TrendingUp, Plus, Minus} from 'lucide-react';
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

    /**
     * PRODUCTION: Creates impact cards using explicit challenge IDs
     */
    const createImpactCards = (): ImpactCard[] => {
        const cardMap: Record<string, ImpactCard> = {};

        permanentAdjustments.forEach(adjustment => {
            if (adjustment.team_id !== teamId) return;

            // PRODUCTION: Use explicit challenge_id (preferred)
            let challengeId = adjustment.challenge_id;

            // BACKWARD COMPATIBILITY: Fallback parsing for old data
            if (!challengeId) {
                challengeId = extractChallengeFromDescription(adjustment.description);
                console.warn(`[KpiImpactCards] Using fallback parsing for adjustment: ${adjustment.description} → ${challengeId}`);
            }

            const challenge = getChallengeById(challengeId);
            if (!challenge) {
                console.warn(`[KpiImpactCards] Unknown challenge ID: ${challengeId}`);
                return;
            }

            if (!cardMap[challengeId]) {
                cardMap[challengeId] = {
                    id: challengeId,
                    title: challenge.impact_card_title,
                    description: challenge.impact_card_description,
                    kpiEffects: [],
                    source: challengeId
                };
            }

            // Add KPI effect to card
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

    /**
     * BACKWARD COMPATIBILITY: Extract challenge ID from description text
     */
    const extractChallengeFromDescription = (description: string): string => {
        const desc = description?.toLowerCase() || '';

        // Known patterns from existing data
        if (desc.includes('cnc machine')) return 'ch1';
        if (desc.includes('layoff')) return 'ch3';
        if (desc.includes('tax')) return 'ch2';
        if (desc.includes('supply chain')) return 'ch4';
        if (desc.includes('capacity')) return 'ch5';
        if (desc.includes('quality')) return 'ch6';
        if (desc.includes('competition')) return 'ch7';
        if (desc.includes('cyber') || desc.includes('ransomware')) return 'ch8';
        if (desc.includes('erp')) return 'ch9';

        // Fallback pattern matching
        const chMatch = desc.match(/ch(\d+)/i);
        if (chMatch) return `ch${chMatch[1]}`;

        return 'unknown';
    };

    const getKpiIcon = (kpi: string) => {
        switch (kpi) {
            case 'capacity':
                return <Building size={16}/>;
            case 'orders':
                return <ShoppingCart size={16}/>;
            case 'cost':
                return <DollarSign size={16}/>;
            case 'asp':
                return <TrendingUp size={16}/>;
            default:
                return <TrendingUp size={16}/>;
        }
    };

    const getKpiColor = (kpi: string): string => {
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

    const impactCards = createImpactCards();

    // Filter cards that apply to current or future rounds
    const relevantCards = impactCards.filter(card =>
        card.kpiEffects.some(effect =>
            effect.applies_to_rounds.some(round => round >= currentRound)
        )
    );

    if (relevantCards.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <TrendingUp size={16}/>
                KPI Impact Cards
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
                {relevantCards.map(card => (
                    <div
                        key={card.id}
                        className="bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-lg p-3"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="text-sm font-medium text-white">{card.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">{card.description}</p>
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                                {card.source.toUpperCase()}
                            </div>
                        </div>

                        <div className="space-y-1">
                            {card.kpiEffects.map((effect, index) => {
                                // Filter to only show effects that apply to current or future rounds
                                const applicableRounds = effect.applies_to_rounds.filter(round => round >= currentRound);
                                if (applicableRounds.length === 0) return null;

                                return (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={getKpiColor(effect.kpi)}>
                                                {getKpiIcon(effect.kpi)}
                                            </span>
                                            <span className="text-gray-300 capitalize">{effect.kpi}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={effect.value > 0 ? 'text-green-400' : 'text-red-400'}>
                                                {effect.value > 0 ? <Plus size={12}/> : <Minus size={12}/>}
                                                {formatKpiValue(effect.kpi, effect.value)}
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                                R{applicableRounds.join(',R')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-600">
                            <p className="text-xs text-gray-500">
                                Active in:
                                Round {card.kpiEffects.flatMap(e => e.applies_to_rounds).filter(r => r >= currentRound).sort().join(', ')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KpiImpactCards;
