// src/pages/DashboardPage/components/GameLists.tsx - Game lists component
import React from 'react';
import { Activity, CheckCircle } from 'lucide-react';
import { GameSession } from '../../../types';
import GameList from './GameList';

interface GameListsProps {
    currentGames: GameSession[];
    completedGames: GameSession[];
    isLoading: boolean;
    onGameSelect: (sessionId: string) => void;
    onGameDelete: (sessionId: string, gameName: string) => void;
}

const GameLists: React.FC<GameListsProps> = ({
                                                 currentGames,
                                                 completedGames,
                                                 isLoading,
                                                 onGameSelect,
                                                 onGameDelete
                                             }) => {
    return (
        <div className="md:col-span-2 space-y-6">
            <GameList
                title="Active Games"
                games={currentGames}
                isLoading={isLoading}
                onGameSelect={onGameSelect}
                onGameDelete={onGameDelete}
                icon={<Activity size={20} className="text-orange-500"/>}
                listType="current"
            />
            <GameList
                title="Completed Games"
                games={completedGames}
                isLoading={isLoading}
                onGameSelect={onGameSelect}
                icon={<CheckCircle size={20} className="text-green-500"/>}
                listType="completed"
            />
        </div>
    );
};

export default GameLists;
