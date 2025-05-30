// src/pages/DashboardPage/components/GameList.tsx - Individual game list
import React from 'react';
import { Trash2 } from 'lucide-react';
import { GameSession } from '../../../types';

interface GameListProps {
    title: string;
    games: GameSession[];
    isLoading: boolean;
    onGameSelect: (sessionId: string) => void;
    onGameDelete?: (sessionId: string, gameName: string) => void;
    icon: React.ReactNode;
    listType: 'current' | 'completed';
}

const GameList: React.FC<GameListProps> = ({
                                               title,
                                               games,
                                               isLoading,
                                               onGameSelect,
                                               onGameDelete,
                                               icon,
                                               listType
                                           }) => {
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-500">Loading {listType} games...</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-700 mb-4 flex items-center">
                {icon}
                <span className="ml-2">{title}</span>
                <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {games.length}
                </span>
            </h2>

            {games.length === 0 ? (
                <p className="text-gray-500 italic text-sm px-1 py-4 text-center">
                    No {listType} games found.
                </p>
            ) : (
                <ul className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
                    {games.map((game) => (
                        <li key={game.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow hover:border-blue-300 flex items-center pr-2">
                            <button
                                onClick={() => onGameSelect(game.id)}
                                className="flex-grow flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 text-left hover:bg-gray-50/80 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                            >
                                <div className="flex-grow mb-1 sm:mb-0">
                                    <span className="font-medium text-blue-600 block text-base leading-tight">
                                        {game.name || `Session ${game.id.substring(0, 8)}`}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Created: {new Date(game.created_at).toLocaleDateString()}
                                        {game.class_name && ` | Class: ${game.class_name}`}
                                        {game.game_version && ` | v${game.game_version.startsWith('2') ? '2.0' : '1.5'}`}
                                    </span>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                                    game.is_complete
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                }`}>
                                    {game.is_complete ? 'Completed' : 'In Progress'}
                                </span>
                            </button>

                            {listType === 'current' && onGameDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGameDelete(game.id, game.name || `Session ${game.id.substring(0, 8)}`);
                                    }}
                                    className="ml-2 p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                                    title="Delete Game Session"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GameList;
