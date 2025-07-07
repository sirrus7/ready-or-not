// src/views/host/components/Dashboard/DraftGamesList.tsx - Draft games management
import React from 'react';
import {Edit, Trash2, Clock, AlertCircle} from 'lucide-react';
import {GameSession} from '@shared/types';

interface DraftGamesListProps {
    games: GameSession[];
    isLoading: boolean;
    onResume: (sessionId: string, sessionName: string) => void;
    onDelete: (sessionId: string, sessionName: string) => void;
}

const DraftGamesList: React.FC<DraftGamesListProps> = ({
                                                           games,
                                                           isLoading,
                                                           onResume,
                                                           onDelete
                                                       }) => {
    if (isLoading) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-yellow-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-16 bg-white rounded-lg"></div>
                        <div className="h-16 bg-white rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6 mb-6 shadow-lg">
            <h2 className="text-lg md:text-xl font-semibold text-yellow-800 mb-4 flex items-center">
                <Edit size={20} className="mr-2 flex-shrink-0"/>
                Draft Games
                <span className="ml-auto text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    {games.length}
                </span>
            </h2>

            {games.length === 0 ? (
                <div className="text-center py-8">
                    <Clock size={32} className="mx-auto text-yellow-600 mb-3 opacity-60"/>
                    <p className="text-yellow-700 font-medium mb-1">No draft games found</p>
                    <p className="text-yellow-600 text-sm">
                        Start creating a game to see draft sessions here
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4 flex items-start">
                        <AlertCircle size={16} className="text-yellow-700 mr-2 mt-0.5 flex-shrink-0"/>
                        <div className="text-sm text-yellow-700">
                            <p className="font-medium mb-1">About Draft Games</p>
                            <p>
                                These games are being set up but haven't been finalized yet.
                                You can resume setup or delete them if no longer needed.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {games.map(game => (
                            <div
                                key={game.id}
                                className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow"
                            >
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center mb-1">
                                        <span className="font-medium text-gray-800 truncate">
                                            {game.name}
                                        </span>
                                        <span
                                            className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">
                                            Draft
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-0.5">
                                        <div>Created: {new Date(game.created_at).toLocaleDateString()}</div>
                                        {game.wizard_state && (
                                            <div className="flex items-center gap-2">
                                                {(game.wizard_state as any).class_name && (
                                                    <span>Class: {(game.wizard_state as any).class_name}</span>
                                                )}
                                                {(game.wizard_state as any).num_teams > 0 && (
                                                    <span>Teams: {(game.wizard_state as any).num_teams}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 ml-3 flex-shrink-0">
                                    <button
                                        onClick={() => onResume(game.id, game.name)}
                                        className="bg-game-orange-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-game-orange-700 transition-colors flex items-center gap-1"
                                        title="Resume game creation"
                                    >
                                        <Edit size={14}/>
                                        Resume
                                    </button>
                                    <button
                                        onClick={() => onDelete(game.id, game.name)}
                                        className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                                        title="Delete draft game"
                                    >
                                        <Trash2 size={14}/>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default DraftGamesList;
