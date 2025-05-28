// src/components/TeacherHost/GameMap.tsx
import React, {useState, useEffect, useMemo} from 'react';
import { useAppContext } from '../../context/AppContext';
import GamePhaseButton from './GamePhaseButton.tsx';
import { GamePhaseNode } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

const GameMap: React.FC = () => {
    const { state, selectPhase } = useAppContext();
    const { gameStructure, currentPhaseId, currentSessionId } = state;

    const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

    const allPhasesInOrder = useMemo(() => {
        if (!gameStructure) return [];
        return [
            ...gameStructure.welcome_phases,
            ...gameStructure.rounds.flatMap(round => round.phases),
            ...gameStructure.game_end_phases,
        ];
    }, [gameStructure]);

    const currentRoundId = useMemo(() => {
        if (!currentPhaseId || !gameStructure) return 'welcome';
        const currentPhase = allPhasesInOrder.find(p => p.id === currentPhaseId);
        if (!currentPhase) return 'welcome';
        if (gameStructure.welcome_phases.some(p => p.id === currentPhaseId)) return 'welcome';
        for (const round of gameStructure.rounds) {
            if (round.phases.some(p => p.id === currentPhaseId)) return round.id;
        }
        if (gameStructure.game_end_phases.some(p => p.id === currentPhaseId)) return 'game-end';
        return 'welcome';
    }, [currentPhaseId, gameStructure, allPhasesInOrder]);

    useEffect(() => {
        if (gameStructure) {
            const initialExpandedState: Record<string, boolean> = {};
            initialExpandedState['welcome'] = currentRoundId === 'welcome';
            gameStructure.rounds.forEach(round => {
                initialExpandedState[round.id] = round.id === currentRoundId;
            });
            initialExpandedState['game-end'] = currentRoundId === 'game-end';
            setExpandedRounds(initialExpandedState);
        }
    }, [currentRoundId, gameStructure, currentSessionId]);

    const toggleRoundExpansion = (roundId: string) => {
        setExpandedRounds(prev => ({ ...prev, [roundId]: !prev[roundId] }));
    };

    if (!gameStructure) {
        return <div className="text-center p-4 text-gray-500">Loading game structure...</div>;
    }

    const currentGlobalPhaseIndex = allPhasesInOrder.findIndex(phase => phase.id === currentPhaseId);

    const renderPhaseGrid = (phases: GamePhaseNode[]) => {
        if (phases.length === 0) return null;

        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
                {phases.map((phase) => {
                    const overallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === phase.id);
                    const isCurrent = phase.id === currentPhaseId;
                    const isCompleted = currentGlobalPhaseIndex > -1 && overallPhaseIndex < currentGlobalPhaseIndex;
                    const canClick = isCurrent ||
                        (currentGlobalPhaseIndex > -1 && overallPhaseIndex === currentGlobalPhaseIndex + 1) ||
                        (currentGlobalPhaseIndex === -1 && overallPhaseIndex === 0);

                    return (
                        <div key={phase.id} className="w-full h-20">
                            <GamePhaseButton
                                phase={phase}
                                isCurrent={isCurrent}
                                isCompleted={isCompleted}
                                onClick={() => canClick ? selectPhase(phase.id) : {}}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSection = (id: string, name: string, phases: GamePhaseNode[]) => {
        const isExpanded = expandedRounds[id];
        const sectionContainsCurrent = phases.some(p => p.id === currentPhaseId);
        let sectionIsCompleted = false;
        if (phases.length > 0 && currentGlobalPhaseIndex > -1) {
            const lastPhaseOfSectionIndex = allPhasesInOrder.findIndex(p => p.id === phases[phases.length - 1].id);
            if (currentGlobalPhaseIndex > lastPhaseOfSectionIndex) {
                sectionIsCompleted = true;
            }
        }

        return (
            <div key={id} className={`mb-3 rounded-lg overflow-hidden ${
                isExpanded ? 'bg-white shadow-md' : 'bg-gray-50 hover:bg-gray-100'
            } transition-all duration-200`}>
                <button
                    onClick={() => toggleRoundExpansion(id)}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors
                                ${sectionContainsCurrent && isExpanded ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                                ${sectionIsCompleted && !sectionContainsCurrent ? 'opacity-60' : ''}
                                hover:bg-gray-50`}
                >
                    <div className="flex items-center">
                        <h3 className={`text-sm font-semibold uppercase tracking-wide
                                       ${sectionContainsCurrent ? 'text-blue-700' :
                            sectionIsCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
                            {name}
                        </h3>
                        {sectionContainsCurrent && (
                            <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                    </div>
                    <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">
                            {phases.length} phase{phases.length !== 1 ? 's' : ''}
                        </span>
                        {isExpanded ?
                            <ChevronUp size={18} className="text-gray-500"/> :
                            <ChevronDown size={18} className="text-gray-500"/>
                        }
                    </div>
                </button>

                {isExpanded && phases.length > 0 && renderPhaseGrid(phases)}

                {isExpanded && phases.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 italic">
                        No phases defined for this section yet.
                    </div>
                )}
            </div>
        );
    };

    const welcomePhases = gameStructure.welcome_phases;

    return (
        <div className="bg-gray-50 p-3 rounded-lg shadow-inner h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 px-1">Game Journey</h2>

            {/* Welcome/Setup Section - Always visible */}
            <div className="mb-3 p-3 bg-white shadow-sm rounded-lg">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Setup & Introduction
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {welcomePhases.map((phase) => {
                        const overallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === phase.id);
                        const isCurrent = phase.id === currentPhaseId;
                        const isCompleted = currentGlobalPhaseIndex > -1 && overallPhaseIndex < currentGlobalPhaseIndex;
                        const canClick = isCurrent ||
                            (currentGlobalPhaseIndex > -1 && overallPhaseIndex === currentGlobalPhaseIndex + 1) ||
                            (currentGlobalPhaseIndex === -1 && overallPhaseIndex === 0);

                        return (
                            <div key={phase.id} className="w-full h-20">
                                <GamePhaseButton
                                    phase={phase}
                                    isCurrent={isCurrent}
                                    isCompleted={isCompleted}
                                    onClick={() => canClick ? selectPhase(phase.id) : {}}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Game Rounds */}
            {gameStructure.rounds.map(round => renderSection(round.id, round.name, round.phases))}

            {/* Game End */}
            {renderSection('game-end', 'Game Conclusion', gameStructure.game_end_phases)}
        </div>
    );
};

export default GameMap;