// src/views/host/components/GameControls/TeamManagementModal.tsx
import React, {useState, useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import {Plus, Trash2, Users, AlertCircle, RefreshCw} from 'lucide-react';
import {Team} from '@shared/types';
import Modal from '@shared/components/UI/Modal';
import {getNextAvailableTeamName} from '@shared/constants/teamNames';

const generatePasscode = (): string => {
    return Math.floor(100 + Math.random() * 900).toString();
};

interface TeamManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({isOpen, onClose}) => {
    const {state, addTeam, removeTeam} = useGameContext();
    const {teams} = state;

    // Get the next available team name
    const getNextAvailableName = useMemo((): string => {
        return getNextAvailableTeamName(teams.map((t: Team) => t.name));
    }, [teams]);

    const [newTeamName, setNewTeamName] = useState<string>(getNextAvailableName);
    const [newTeamPasscode, setNewTeamPasscode] = useState<string>(generatePasscode());
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Update suggested name when teams change
    React.useEffect(() => {
        if (!newTeamName || teams.some((t: Team) => t.name.toUpperCase() === newTeamName.toUpperCase())) {
            setNewTeamName(getNextAvailableName);
        }
    }, [teams, getNextAvailableName, newTeamName]);

    const handleAddTeam = async (): Promise<void> => {
        if (!newTeamName.trim()) {
            setError('Team name is required');
            return;
        }

        // Check for duplicate names
        if (teams.some((t: Team) => t.name.toUpperCase() === newTeamName.trim().toUpperCase())) {
            setError('A team with this name already exists');
            return;
        }

        setIsAdding(true);
        setError(null);

        try {
            await addTeam(newTeamName.trim(), newTeamPasscode);
            setNewTeamName(getNextAvailableName);
            setNewTeamPasscode(generatePasscode());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add team');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveTeam = async (teamId: string): Promise<void> => {
        setIsRemoving(teamId);
        setError(null);

        try {
            await removeTeam(teamId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove team');
        } finally {
            setIsRemoving(null);
        }
    };

    const regeneratePasscode = (): void => {
        setNewTeamPasscode(generatePasscode());
    };

    const handleClose = (): void => {
        setError(null);
        onClose();
    };

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setNewTeamName(getNextAvailableName);
            setNewTeamPasscode(generatePasscode());
            setError(null);
        }
    }, [isOpen, getNextAvailableName]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Team Management"
        >
            <div className="p-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <Users size={20} className="text-blue-600"/>
                    <span className="text-sm text-gray-600">
                        Add or remove teams before the first investment decision
                    </span>
                </div>

                {error && (
                    <div
                        className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <AlertCircle size={16}/>
                        {error}
                    </div>
                )}

                {/* Add New Team Form */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Team</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Team name"
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            maxLength={15}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTeamName.trim()) {
                                    handleAddTeam();
                                }
                            }}
                        />
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={newTeamPasscode}
                                    onChange={(e) => setNewTeamPasscode(e.target.value)}
                                    placeholder="Code"
                                    className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm text-center"
                                    maxLength={4}
                                />
                                <button
                                    onClick={regeneratePasscode}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded"
                                    title="Generate new passcode"
                                    type="button"
                                >
                                    <RefreshCw size={16}/>
                                </button>
                            </div>
                            <button
                                onClick={handleAddTeam}
                                disabled={isAdding || !newTeamName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm whitespace-nowrap"
                                type="button"
                            >
                                {isAdding ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <Plus size={16}/>
                                )}
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Current Teams List */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Current Teams ({teams.length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {teams.map((team: Team) => (
                            <div
                                key={team.id}
                                className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-gray-800">{team.name}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                                        {team.passcode}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemoveTeam(team.id)}
                                    disabled={isRemoving === team.id || teams.length <= 1}
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title={teams.length <= 1 ? 'Cannot remove last team' : 'Remove team'}
                                    type="button"
                                >
                                    {isRemoving === team.id ? (
                                        <span className="animate-spin text-xs">⏳</span>
                                    ) : (
                                        <Trash2 size={16}/>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        type="button"
                    >
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TeamManagementModal;
