// src/views/team/components/GameStatus/KpiImpactCards.tsx
// Updated to match the physical card layout shown in the game

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
                return <Building size={16}/>;
            case 'orders':
                return <ShoppingCart size={16}/>;
            case 'cost':
                return <DollarSign size={16}/>;
            case 'asp':
                return <DollarSign size={16}/>;
            default:
                return <TrendingUp size={16}/>;
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

    const relevantCards = impactCards.filter(card =>
        card.kpiEffects.some(effect =>
            effect.applies_to_rounds.some(round => round >= currentRound)
        )
    );

    if (relevantCards.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp size={20}/>
                KPI Impact Cards
            </h3>

            <div className="space-y-4">
                {relevantCards.map(card => (
                    <div
                        key={card.id}
                        className="bg-gray-800 rounded-lg p-6 text-white shadow-lg border border-gray-600 relative overflow-hidden"
                    >
                        {/* Header Section - matches physical card */}
                        <div className="text-center mb-4">
                            <div className="bg-gray-700 rounded px-3 py-1 inline-block mb-2">
                                <span className="text-sm font-semibold tracking-wide">
                                    PERMANENT KPI IMPACT
                                </span>
                            </div>
                            <h4 className="text-xl font-bold tracking-wide">
                                {card.title.toUpperCase()}
                            </h4>
                        </div>

                        {/* Description Section */}
                        <div className="mb-4">
                            <p className="text-sm leading-relaxed text-center">
                                {card.description}
                            </p>
                        </div>

                        {/* KPI Effects Section - styled like physical card */}
                        <div className="bg-black/20 rounded-lg p-4 mb-4">
                            <p className="text-sm mb-3 text-center font-medium">
                                Add the following to your<br/>
                                RD-{card.kpiEffects[0]?.applies_to_rounds.join(' and RD-')} starting KPIs:
                            </p>

                            {card.kpiEffects.map((effect, index) => {
                                const applicableRounds = effect.applies_to_rounds.filter(round => round >= currentRound);
                                if (applicableRounds.length === 0) return null;

                                return (
                                    <div key={index} className="text-center">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <span className="text-cyan-300">
                                                {getKpiIcon(effect.kpi)}
                                            </span>
                                            <span className="text-cyan-300 font-bold text-lg">
                                                {effect.kpi.toUpperCase()}: {formatKpiValue(effect.kpi, effect.value)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Challenge identifier in corner */}
                        <div className="absolute top-3 right-3">
                            <div className="bg-black/50 rounded px-2 py-1">
                                <span className="text-white text-xs font-semibold">
                                    {card.source.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KpiImpactCards;
