// src/views/host/components/DecisionHistory.tsx
// FIXED VERSION - Properly determines completion based on team submissions

import React, {useState, useEffect, useMemo, useRef} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import DecisionHistoryButton from './DecisionHistoryButton';
import {Slide} from '@shared/types';
import {ChevronDown, ChevronUp, Repeat, DollarSign, Swords} from 'lucide-react';
import TeamMonitor from "@views/host/components/TeamMonitor";

interface DecisionHistoryProps {
    currentInteractiveSlide?: any;
}

// Helper function moved outside the component body
const getRoundLabel = (key: string) => {
    const num = key.split('_')[1];
    if (num === '0') return "Setup Decisions";
    return `RD-${num}`;
};

const DecisionHistory: React.FC<DecisionHistoryProps> = ({currentInteractiveSlide}) => {
    const {state} = useGameContext();
    const {gameStructure, current_slide_index, teams, teamDecisions} = state;

    const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});
    const [expandedDecisions, setExpandedDecisions] = useState<Record<string, boolean>>({});

    const currentSlide = gameStructure?.slides[current_slide_index ?? -1];
    const currentRoundKey = currentSlide ? `round_${currentSlide.round_number}` : null;

    const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(false);
    const currentDecisionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (shouldAutoScroll && currentDecisionRef.current !== null){
            currentDecisionRef.current.scrollIntoView({behavior: "smooth"});
            setShouldAutoScroll(false);
        }
    }, [expandedDecisions])

    // Auto-expand current interactive decision and its round
    useEffect(() => {
        if (currentInteractiveSlide && currentInteractiveSlide.interactive_data_key) {
            // Autoscroll to current decision
            setShouldAutoScroll(true);
            // Expand the decision and close all other decision
            setExpandedDecisions(prev => {
                const newState = {
                    ...prev,
                };
                Object.keys(newState).forEach(key => {newState[key] = false;});
                newState[currentInteractiveSlide.interactive_data_key] = true;
                return newState;
            });
            
            // Also expand the round that contains this decision
            const roundKey = `round_${currentInteractiveSlide.round_number}`;
            setExpandedRounds(prev => ({
                ...prev,
                [roundKey]: true
            }));
        }
    }, [currentInteractiveSlide]);

    const groupedSlides = useMemo(() => {
        if (!gameStructure) return {};
        return gameStructure.interactive_slides.reduce((acc, slide) => {
            const roundKey = `round_${slide.round_number}`;
            if (!acc[roundKey]) acc[roundKey] = [];
            acc[roundKey].push(slide);
            return acc;
        }, {} as Record<string, Slide[]>);
    }, [gameStructure]);

    // ENHANCED: Helper function to check if any team has submitted for a decision
    const hasTeamSubmissions = useMemo(() => {
        return (decisionKey: string): boolean => {
            if (!decisionKey || teams.length === 0) return false;

            // Check if any team has submitted for this decision key
            return teams.some(team => {
                const decision = teamDecisions[team.id]?.[decisionKey];
                return decision?.submitted_at; // Has a submission timestamp
            });
        };
    }, [teams, teamDecisions]);

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

    const toggleDecisionExpansion = (decisionKey: string) => {
        setExpandedDecisions(prev => ({...prev, [decisionKey]: !prev[decisionKey]}));
    };
    
    return (
        <div>
            <div className="space-y-2">
                {Object.keys(groupedSlides).map(roundKey => {
                    const slidesInRound = groupedSlides[roundKey];
                    const isExpanded = expandedRounds[roundKey] ?? false;

                    return (
                        <div key={roundKey} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <button
                                onClick={() => toggleRoundExpansion(roundKey)}
                                className="w-full p-3 text-left font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <span>{getRoundLabel(roundKey)}</span>
                                    {isExpanded ? <ChevronUp size={18} className="text-gray-500"/> :
                                        <ChevronDown size={18} className="text-gray-500"/>}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="p-2 border-t border-gray-200 space-y-2">
                                    {slidesInRound.map((slide: Slide) => {
                                        const isCurrentSlide = slide.id === currentSlide?.id;
                                        const slideIndexInMainList = gameStructure.slides.findIndex(s => s.id === slide.id);

                                        // FIXED: Proper completion logic based on team submissions
                                        const decisionKey = slide.interactive_data_key;
                                        const hasSubmissions = decisionKey ? hasTeamSubmissions(decisionKey) : false;

                                        // A slide is completed if:
                                        // 1. Host has moved past it (original logic), OR
                                        // 2. At least one team has submitted (allows review even if host hasn't moved on)
                                        const hostMovedPast = current_slide_index !== null && slideIndexInMainList < current_slide_index;
                                        const isCompleted = hostMovedPast || hasSubmissions;

                                        let icon = Swords;
                                        if (slide.type === 'interactive_invest') icon = DollarSign;
                                        if (slide.type === 'interactive_double_down_select') icon = Repeat;

                                        // Enhanced label to show submission status
                                        // Keep the base label clean since we have visual indicators
                                        const enhancedLabel = slide.title || `Decision Point`;
                                        const isDecisionExpanded = expandedDecisions[slide.interactive_data_key || ''] ?? false;
                                        return (
                                            <div 
                                                key={slide.interactive_data_key || slide.id} 
                                                className="mb-3"
                                                ref={isCurrentSlide ? currentDecisionRef : null}
                                            >
                                                <DecisionHistoryButton
                                                    label={enhancedLabel}
                                                    isCurrent={isCurrentSlide}
                                                    isCompleted={isCompleted}
                                                    icon={icon}
                                                    isExpanded={isDecisionExpanded}
                                                    onClick={() => {
                                                        if (slide.interactive_data_key) {
                                                            toggleDecisionExpansion(slide.interactive_data_key);
                                                        }
                                                    }}
                                                />
                                                {isDecisionExpanded && slide.interactive_data_key && (
                                                    <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 shadow-sm">
                                                        <TeamMonitor
                                                            key={slide.interactive_data_key}
                                                            slide={slide}
                                                        />
                                                    </div>
                                                )}
                                            </div>
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
