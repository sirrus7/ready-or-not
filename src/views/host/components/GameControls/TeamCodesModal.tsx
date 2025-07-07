// src/components/Host/Controls/TeamCodesModal.tsx
import React from 'react';
import Modal from '@shared/components/UI/Modal';
import {Team} from '@shared/types/common';

interface TeamCodesModalProps {
    isOpen: boolean;
    onClose: () => void;
    teams: Team[];
}

const TeamCodesModal: React.FC<TeamCodesModalProps> = ({isOpen, onClose, teams}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Team Access Codes" size="sm">
            <div className="p-2">
                {teams.length > 0 ? (
                    <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {teams.map(team => (
                            <li
                                key={team.id}
                                className="p-2.5 bg-gray-100 rounded-md text-sm flex justify-between items-center"
                            >
                                <span className="font-semibold text-gray-800">{team.name}:</span>
                                <span className="ml-2 text-game-orange-600 font-mono bg-game-orange-100 px-2 py-0.5 rounded">
                                    {team.passcode}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-600 text-sm py-4 text-center">
                        No teams found for this session. Ensure teams are set up.
                    </p>
                )}
                <div className="mt-4 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-game-orange-500 text-white rounded-md hover:bg-game-orange-600 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TeamCodesModal;
