// src/views/team/components/GameStatus/KpiImpactCards.tsx
// Component to display permanent KPI impact cards for teams

import React from 'react';
import {PermanentKpiAdjustment} from '@shared/types';
import {Building, ShoppingCart, DollarSign, TrendingUp, Plus, Minus} from 'lucide-react';

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
    // Group adjustments by their source/description to create impact cards
    const createImpactCards = (): ImpactCard[] => {
        const cardMap: Record<string, ImpactCard> = {};

        permanentAdjustments.forEach(adjustment => {
            if (adjustment.team_id !== teamId) return;

            // Extract the source from the description (e.g., "ch1 - A")
            const source = adjustment.description?.split(' - ')[0] || 'Unknown';
            const cardId = source;

            if (!cardMap[cardId]) {
                cardMap[cardId] = {
                    id: cardId,
                    title: getCardTitle(source),
                    description: getCardDescription(source),
                    kpiEffects: [],
                    source: source
                };
            }

            // Add this KPI effect to the card
            const existingEffect = cardMap[cardId].kpiEffects.find(e => e.kpi === adjustment.kpi_key);
            if (existingEffect) {
                if (!existingEffect.applies_to_rounds.includes(adjustment.applies_to_round_start)) {
                    existingEffect.applies_to_rounds.push(adjustment.applies_to_round_start);
                }
            } else {
                cardMap[cardId].kpiEffects.push({
                    kpi: adjustment.kpi_key,
                    value: adjustment.change_value,
                    applies_to_rounds: [adjustment.applies_to_round_start]
                });
            }
        });

        return Object.values(cardMap);
    };

    const getCardTitle = (source: string): string => {
        switch (source) {
            case 'ch1':
                return 'CNC Machine';
            case 'ch3':
                return 'Layoff Penalty';
            default:
                return `Impact Card (${source})`;
        }
    };

    const getCardDescription = (source: string): string => {
        switch (source) {
            case 'ch1':
                return 'Advanced CNC machine provides enhanced production capabilities for future rounds.';
            case 'ch3':
                return 'Workforce reduction has permanent impact on production capacity.';
            default:
                return `Permanent KPI adjustments from ${source} decision.`;
        }
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
