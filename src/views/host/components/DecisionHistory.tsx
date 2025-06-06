// src/views/host/components/DecisionHistory.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import DecisionHistoryButton from './DecisionHistoryButton';
import {Slide} from '@shared/types';
import {ChevronDown, ChevronUp, ListChecks, DollarSign, Repeat} from 'lucide-react';

interface DecisionHistoryProps {
    onReviewDecision: (decisionKey: string) => void;
}

// REFACTOR: Moved helper function outside the component body.
const getRoundLabel = (key: string) => {
    const num = key.split('_')[1];
    if (num === '0') return "Setup Decisions";
    return `Round ${num} Decisions`;
};

const DecisionHistory: React.FC<DecisionHistoryProps> = ({onReviewDecision}) => {
    const {state} = useGameContext();
    const {gameStructure, current_slide_index} = state;

    const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

    const currentSlide = gameStructure?.slides[current_slide_index ?? -1];
    const currentRoundKey = currentSlide ? `round_${currentSlide.round_number}` : null;

    const groupedSlides = useMemo(() => {
        if (!gameStructure) return {};
        return gameStructure.interactive_slides.reduce((acc, slide) => {
            const roundKey = `round_${slide.round_number}`;
            if (!acc[roundKey]) acc[roundKey] = [];
            acc[roundKey].push(slide);
            return acc;
        }, {} as Record<string, Slide[]>);
    }, [gameStructure]);

    useEffect(() => {
        if (currentRoundKey) {
            setExpandedRounds(prev => ({...prev, [currentRoundKey]: true}));
        }
    }, [currentRoundKey]);

    if (!gameStructure) {
        return <div className="text-center p-4 text-gray-500">Loading decision history...</div>;
    }

    const toggleRoundExpansion = (roundKey: string) => {
        setExpandedRounds(prev => ({...prev, [roundKey]: !prev[roundKey]}));
    };

    return (
        <div
            className="bg-gray-50 p-3 rounded-lg shadow-inner h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-semibold text-gray-700">Decision History</h2>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {gameStructure.interactive_slides.length} points
                </span>
            </div>
            <div className="space-y-2">
                {Object.keys(groupedSlides).map(roundKey => {
                    const slidesInRound = groupedSlides[roundKey];
                    const isExpanded = !!expandedRounds[roundKey];
                    const isCurrentRound = roundKey === currentRoundKey;

                    return (
                        <div key={roundKey} className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <button
                                onClick={() => toggleRoundExpansion(roundKey)}
                                className={`w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-gray-100 ${isCurrentRound ? 'bg-blue-50' : ''}`}
                            >
                                <div className="flex items-center">
                                    <h3 className={`text-sm font-semibold uppercase tracking-wide ${isCurrentRound ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {getRoundLabel(roundKey)}
                                    </h3>
                                    {isCurrentRound && (
                                        <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    )}
                                </div>
                                <div className="flex items-center">
                                    <span
                                        className="text-xs text-gray-500 mr-2">{slidesInRound.length} decision{slidesInRound.length !== 1 ? 's' : ''}</span>
                                    {isExpanded ? <ChevronUp size={18} className="text-gray-500"/> :
                                        <ChevronDown size={18} className="text-gray-500"/>}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="p-2 border-t border-gray-200 space-y-2">
                                    {slidesInRound.map((slide) => {
                                        const isCurrentSlide = slide.id === currentSlide?.id;
                                        const slideIndexInMainList = gameStructure.slides.findIndex(s => s.id === slide.id);
                                        const isCompleted = current_slide_index !== null && slideIndexInMainList < current_slide_index;

                                        let icon = ListChecks;
                                        if (slide.type === 'interactive_invest') icon = DollarSign;
                                        if (slide.type.includes('double-down')) icon = Repeat;

                                        return (
                                            <DecisionHistoryButton
                                                key={slide.interactive_data_key || slide.id}
                                                label={slide.title || `Decision Point`}
                                                round={slide.round_number}
                                                isCurrent={isCurrentSlide}
                                                isCompleted={isCompleted}
                                                icon={icon}
                                                onClick={() => onReviewDecision(slide.interactive_data_key!)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DecisionHistory;
