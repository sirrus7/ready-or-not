// src/views/host/components/GameControls/ActionButtons.tsx
import React from 'react';
import {Users, QrCode, Trophy, FileText, LogOut} from 'lucide-react';
import {useGameContext} from '@app/providers/GameProvider';

interface ActionButtonsRowProps {
    onOpenJoinInfo: () => void;
    onOpenTeamCodes: () => void;
    onToggleNotes: () => void;
    onExitGame: () => void;
    showNotes: boolean;
}

const ActionButtons: React.FC<ActionButtonsRowProps> = ({
                                                            onOpenJoinInfo,
                                                            onOpenTeamCodes,
                                                            onToggleNotes,
                                                            onExitGame,
                                                            showNotes
                                                        }) => {
    // REFACTOR: Use currentSlideData from context
    const {state, currentSlideData, selectSlideByIndex} = useGameContext();
    const {gameStructure} = state;

    const showCurrentRoundLeaderboard = () => {
        if (!currentSlideData || !gameStructure) {
            alert("Game data is not fully loaded.");
            return;
        }

        const round = currentSlideData.round_number;
        if (round > 0) {
            const leaderboardSlide = gameStructure.slides.find(
                s => s.type === 'leaderboard_chart' && s.round_number === round
            );
            if (leaderboardSlide) {
                const leaderboardIndex = gameStructure.slides.findIndex(s => s.id === leaderboardSlide.id);
                if (leaderboardIndex !== -1) {
                    selectSlideByIndex(leaderboardIndex);
                } else {
                    alert("Leaderboard for the current round could not be found.");
                }
            } else {
                alert("No leaderboard is configured for this round.");
            }
        } else {
            alert("Leaderboards are available in Rounds 1, 2, and 3.");
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button onClick={onOpenJoinInfo}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                    aria-label="Show Student Join Info">
                <QrCode size={16}/> Join Info
            </button>
            <button onClick={onOpenTeamCodes}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                    aria-label="Team Codes">
                <Users size={16}/> Team Codes
            </button>
            <button onClick={showCurrentRoundLeaderboard}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                    aria-label="Show Leaderboard">
                <Trophy size={16}/> Leaderboard
            </button>
            <button onClick={onToggleNotes}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors border ${showNotes ? 'bg-blue-50 text-blue-700 border-blue-300' : 'hover:bg-gray-100 text-gray-600 border-gray-300'}`}>
                <FileText size={16}/> Notes
            </button>
            <button onClick={onExitGame}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors border border-red-300"
                    aria-label="Exit Game">
                <LogOut size={16}/> Exit Game
            </button>
        </div>
    );
};

export default ActionButtons;
