// src/components/TeacherHost/GameJourneyMap.tsx
import React, {useState, useEffect, useMemo} from 'react';
import { useAppContext } from '../../context/AppContext';
import GamePhaseNodeButton from './GamePhaseNodeButton';
import { GamePhaseNode, GameRound } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ArcherContainer, ArcherElement, Relation } from 'react-archer';

const GameJourneyMap: React.FC = () => {
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

    const renderPhaseNodesSnaking = (phases: GamePhaseNode[], sectionId: string) => {
        if (!expandedRounds[sectionId]) {
            return null;
        }

        const rows: GamePhaseNode[][] = [];
        for (let i = 0; i < phases.length; i += 3) {
            rows.push(phases.slice(i, i + 3));
        }

        return (
            <div className="mt-3 space-y-2 px-1 sm:px-2">
                {rows.map((row, rowIndex) => (
                    <div key={`row-${sectionId}-${rowIndex}`} className={`flex w-full items-center ${rowIndex % 2 === 1 ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}`}>
                        {row.map((phase, phaseIndexInRow) => {
                            const overallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === phase.id);
                            const isCurrent = phase.id === currentPhaseId;
                            const isCompleted = currentGlobalPhaseIndex > -1 && overallPhaseIndex < currentGlobalPhaseIndex;
                            const canClick = isCurrent ||
                                (currentGlobalPhaseIndex > -1 && overallPhaseIndex === currentGlobalPhaseIndex + 1) ||
                                (currentGlobalPhaseIndex === -1 && overallPhaseIndex === 0);

                            const relations: Relation[] = [];
                            const nextPhaseOverallIndex = overallPhaseIndex + 1;
                            const nextPhaseOverall = nextPhaseOverallIndex < allPhasesInOrder.length ? allPhasesInOrder[nextPhaseOverallIndex] : null;

                            const connectorIsActive = isCompleted || isCurrent || (nextPhaseOverall && nextPhaseOverall.id === currentPhaseId);
                            const strokeColor = connectorIsActive ? '#3b82f6' : '#9ca3af'; // blue-500 or gray-400
                            const arrowStrokeWidth = 2;

                            // Horizontal arrow to next node in the same row
                            if (phaseIndexInRow < row.length - 1 && nextPhaseOverall) {
                                const nextNodeInRowId = row[phaseIndexInRow + 1].id;
                                relations.push({
                                    targetId: `phase-node-${nextNodeInRowId}`,
                                    sourceAnchor: rowIndex % 2 === 1 ? 'left' : 'right',
                                    targetAnchor: rowIndex % 2 === 1 ? 'right' : 'left',
                                    style: { strokeColor, strokeWidth: arrowStrokeWidth },
                                });
                            }
                            // Arrow to the first node of the next row (wrapping arrow)
                            else if (phaseIndexInRow === row.length - 1 && rowIndex < rows.length - 1 && nextPhaseOverall) {
                                const firstNodeNextRowId = rows[rowIndex + 1][0].id;
                                relations.push({
                                    targetId: `phase-node-${firstNodeNextRowId}`,
                                    sourceAnchor: 'bottom',
                                    targetAnchor: rowIndex % 2 === 0 ? 'left' : 'right',
                                    style: { strokeColor, strokeWidth: arrowStrokeWidth },
                                });
                            }

                            return (
                                <React.Fragment key={phase.id}>
                                    <ArcherElement
                                        id={`phase-node-${phase.id}`}
                                        relations={relations}
                                    >
                                        <div className="w-28 h-24 flex-shrink-0 m-1">
                                            <GamePhaseNodeButton
                                                phase={phase}
                                                isCurrent={isCurrent}
                                                isCompleted={isCompleted}
                                                onClick={() => canClick ? selectPhase(phase.id) : {}}
                                            />
                                        </div>
                                    </ArcherElement>
                                    {phaseIndexInRow < row.length - 1 && ( // Check against actual row length
                                        <div className="w-6 md:w-8 flex-shrink-0"></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {row.length < 3 && (
                            Array(3 - row.length).fill(null).map((_, i) => (
                                <React.Fragment key={`filler-archer-${sectionId}-${rowIndex}-${i}`}>
                                    <ArcherElement id={`filler-node-${sectionId}-${rowIndex}-${row.length + i}`}>
                                        <div className="w-28 h-24 flex-shrink-0 m-1 opacity-0 pointer-events-none"></div>
                                    </ArcherElement>
                                    {(row.length + i < 2) && <div className="w-6 md:w-8 flex-shrink-0 opacity-0 pointer-events-none"></div>}
                                </React.Fragment>
                            ))
                        )}
                    </div>
                ))}
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
            <div key={id} className={`mb-3 rounded-md ${isExpanded ? 'bg-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200'} transition-shadow duration-300`}>
                <button
                    onClick={() => toggleRoundExpansion(id)}
                    className={`w-full flex items-center justify-between p-3 text-left rounded-t-md 
                                ${isExpanded ? 'bg-gray-200' : ''}
                                ${sectionContainsCurrent && isExpanded ? 'ring-2 ring-blue-500 ring-inset' : ''}
                                ${sectionIsCompleted && !sectionContainsCurrent ? 'opacity-70' : ''}
                              `}
                >
                    <h3 className={`text-sm font-semibold uppercase tracking-wider 
                                   ${isExpanded ? 'text-gray-700' : 'text-gray-500'}
                                   ${sectionContainsCurrent ? 'text-blue-600' : ''}
                                   ${sectionIsCompleted && !sectionContainsCurrent ? 'text-gray-400' : ''}
                                `}>
                        {name}
                    </h3>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-600"/> : <ChevronDown size={20} className="text-gray-500"/>}
                </button>
                {isExpanded && phases.length > 0 && (
                    <div className="p-2 border-t border-gray-200">
                        {renderPhaseNodesSnaking(phases, id)}
                    </div>
                )}
                {isExpanded && phases.length === 0 && (
                    <div className="p-3 text-xs text-gray-400 italic text-center">No phases defined for this section yet.</div>
                )}
            </div>
        );
    };

    const welcomePhases = gameStructure.welcome_phases;

    return (
        <ArcherContainer
            strokeColor="#9ca3af"
            arrowLength={8}      // Default length of the arrowhead lines
            arrowThickness={1}   // Default thickness of the arrowhead lines (base width)
            strokeWidth={2}      // Default thickness of the arrow shaft
            endShape={{
                triangle: {
                    arrowLength: 6,    // Custom length for the arrowhead lines
                    arrowThickness: 4, // Custom thickness (base width) for the arrowhead
                },
            }} // Added closing curly brace
            lineStyle="curve"
            offset={2}
        >
            <div className="bg-gray-50 p-3 rounded-lg shadow-inner h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <h2 className="text-lg font-semibold text-gray-700 mb-3 px-1">Game Journey</h2>

                <div className="mb-3 p-3 bg-white shadow-md rounded-md">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Setup & Introduction
                    </h3>
                    <div className="flex flex-wrap justify-start items-center">
                        {welcomePhases.map((phase, index) => {
                            const overallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === phase.id);
                            const isCurrent = phase.id === currentPhaseId;
                            const isCompleted = currentGlobalPhaseIndex > -1 && overallPhaseIndex < currentGlobalPhaseIndex;
                            const canClick = isCurrent ||
                                (currentGlobalPhaseIndex > -1 && overallPhaseIndex === currentGlobalPhaseIndex + 1) ||
                                (currentGlobalPhaseIndex === -1 && overallPhaseIndex === 0);

                            const relations: Relation[] = [];
                            if (index < welcomePhases.length - 1) {
                                const nextPhase = welcomePhases[index+1];
                                const connectorIsActive = isCompleted || isCurrent || (nextPhase && nextPhase.id === currentPhaseId);
                                relations.push({
                                    targetId: `phase-node-${nextPhase.id}`,
                                    sourceAnchor: 'right',
                                    targetAnchor: 'left',
                                    style: { strokeColor: connectorIsActive ? '#3b82f6' : '#9ca3af', strokeWidth: 2 },
                                });
                            }

                            return (
                                <React.Fragment key={phase.id}>
                                    <ArcherElement
                                        id={`phase-node-${phase.id}`}
                                        relations={relations}
                                    >
                                        <div className="w-28 h-24 flex-shrink-0 m-1">
                                            <GamePhaseNodeButton
                                                phase={phase}
                                                isCurrent={isCurrent}
                                                isCompleted={isCompleted}
                                                onClick={() => canClick ? selectPhase(phase.id) : {}}
                                            />
                                        </div>
                                    </ArcherElement>
                                    {index < welcomePhases.length - 1 && (
                                        <div className="w-6 md:w-8 flex-shrink-0"></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {gameStructure.rounds.map(round => renderSection(round.id, round.name, round.phases))}
                {renderSection('game-end', 'Game Conclusion', gameStructure.game_end_phases)}
            </div>
        </ArcherContainer>
    );
};

export default GameJourneyMap;