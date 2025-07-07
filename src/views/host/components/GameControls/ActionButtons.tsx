// src/views/host/components/GameControls/ActionButtons.tsx
import React from 'react';
import {Users, QrCode, FileText, LogOut} from 'lucide-react';

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
    return (
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button onClick={onOpenJoinInfo}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                    aria-label="Show Team Join Info">
                <QrCode size={16}/> Team Join Info
            </button>
            <button onClick={onOpenTeamCodes}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                    aria-label="Team Codes">
                <Users size={16}/> Team Codes
            </button>
            <button onClick={onToggleNotes}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors border ${showNotes ? 'bg-game-orange-50 text-game-orange-700 border-blue-300' : 'hover:bg-gray-100 text-gray-600 border-gray-300'}`}>
                <FileText size={16}/> Notes
            </button>
            <button onClick={onExitGame}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors border border-red-300"
                    aria-label="Save & Exit">
                <LogOut size={16}/> Save & Exit
            </button>
        </div>
    );
};

export default ActionButtons;
