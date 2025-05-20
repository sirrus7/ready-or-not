// src/components/TeacherHost/GameJourneyMap.tsx
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import GamePhaseNodeButton from './GamePhaseNodeButton';
import { GamePhaseNode, GameRound } from '../../types';
import { ArrowRight } from 'lucide-react';

const GameJourneyMap: React.FC = () => {
    const { state, selectPhase } = useAppContext();
    const { gameStructure, currentPhaseId } = state;

    if (!gameStructure) {
        return <div className="text-center p-4">Loading game structure...</div>;
    }

    const allPhasesInOrder: GamePhaseNode[] = [
        ...gameStructure.welcome_phases,
        ...gameStructure.rounds.flatMap(round => round.phases),
        ...gameStructure.game_end_phases,
    ];

    const currentPhaseIndex = allPhasesInOrder.findIndex(phase => phase.id === currentPhaseId);

    const renderPhaseNodes = (phases: GamePhaseNode[]) => {
        return phases.map((phase, index, arr) => {
            const overallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === phase.id);
            const isCurrent = phase.id === currentPhaseId;
            const isCompleted = currentPhaseIndex > -1 && overallPhaseIndex < currentPhaseIndex;

            // Allow clicking current phase or the very next upcoming phase
            const canClick = isCurrent || (currentPhaseIndex > -1 && overallPhaseIndex === currentPhaseIndex + 1) || (currentPhaseIndex === -1 && overallPhaseIndex === 0);

            return (
                <React.Fragment key={phase.id}>
                    <div className="w-28 h-24 flex-shrink-0"> {/* Fixed width for buttons */}
                        <GamePhaseNodeButton
                            phase={phase}
                            isCurrent={isCurrent}
                            isCompleted={isCompleted}
                            onClick={() => canClick ? selectPhase(phase.id) : {}}
                        />
                    </div>
                    {index < arr.length - 1 && (
                        <div className="flex items-center justify-center px-1">
                            <ArrowRight size={20} className={isCompleted || isCurrent ? "text-blue-500" : "text-gray-300"} />
                        </div>
                    )}
                </React.Fragment>
            );
        });
    };

    const renderRoundSection = (round: GameRound | { id: string; name: string; phases: GamePhaseNode[] }, isFirst: boolean = false) => (
        <div key={round.id} className={`mb-6 ${!isFirst ? 'pt-4 border-t-2 border-gray-200 mt-4' : ''}`}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                {round.name}
            </h3>
            <div className="flex flex-row items-center overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {renderPhaseNodes(round.phases)}
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Game Journey</h2>
            {renderRoundSection({ id: 'welcome', name: 'Setup & Introduction', phases: gameStructure.welcome_phases }, true)}
            {gameStructure.rounds.map(round => renderRoundSection(round))}
            {renderRoundSection({ id: 'game-end', name: 'Game Conclusion', phases: gameStructure.game_end_phases })}
        </div>
    );
};

export default GameJourneyMap;