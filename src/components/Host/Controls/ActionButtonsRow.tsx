// src/components/Host/Controls/ActionButtonsRow.tsx
import React from 'react';
import { Users, QrCode, Trophy, FileText, LogOut } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';

interface ActionButtonsRowProps {
    onOpenJoinInfo: () => void;
    onOpenTeamCodes: () => void;
    onToggleNotes: () => void;
    onExitGame: () => void;
    showNotes: boolean;
}

const ActionButtonsRow: React.FC<ActionButtonsRowProps> = ({
                                                               onOpenJoinInfo,
                                                               onOpenTeamCodes,
                                                               onToggleNotes,
                                                               onExitGame,
                                                               showNotes
                                                           }) => {
    const { currentPhaseNode, selectPhase, allPhasesInOrder } = useAppContext();

    const showCurrentRoundLeaderboard = () => {
        if (currentPhaseNode && currentPhaseNode.round_number > 0) {
            const leaderboardPhaseId = `rd${currentPhaseNode.round_number}-leaderboard`;
            if (allPhasesInOrder.find(p => p.id === leaderboardPhaseId)) {
                selectPhase(leaderboardPhaseId);
            } else {
                alert("Leaderboard for the current round is not yet available or configured.");
            }
        } else if (currentPhaseNode?.phase_type === 'game-end') {
            const finalLeaderboardPhase = allPhasesInOrder.find(p => p.id === 'final-leaderboard');
            if (finalLeaderboardPhase) selectPhase(finalLeaderboardPhase.id);
        } else {
            alert("Not in an active round to show leaderboard, or game has not started.");
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 border-t border-gray-200 pt-3">
            <button
                onClick={onOpenJoinInfo}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                aria-label="Show Student Join Info"
            >
                <QrCode size={16}/> Join Info
            </button>

            <button
                onClick={onOpenTeamCodes}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                aria-label="Team Codes"
            >
                <Users size={16}/> Team Codes
            </button>

            <button
                onClick={showCurrentRoundLeaderboard}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                aria-label="Show Leaderboard"
            >
                <Trophy size={16}/> Leaderboard
            </button>

            <button
                onClick={onToggleNotes}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors border
                    ${showNotes
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'hover:bg-gray-100 text-gray-600 border-gray-300'
                }`}
            >
                <FileText size={16}/> Notes
            </button>

            <button
                onClick={onExitGame}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors border border-red-300"
                aria-label="Exit Game"
            >
                <LogOut size={16}/> Exit Game
            </button>
        </div>
    );
};

export default ActionButtonsRow;
