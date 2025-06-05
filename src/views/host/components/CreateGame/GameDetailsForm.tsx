// src/views/host/components/CreateGame/GameDetailsForm.tsx - Final working version
import React, {useState} from 'react';
import {NewGameData} from '@shared/types/ui';

interface GameDetailsFormProps {
    gameData: NewGameData;
    onFieldChange: (field: keyof NewGameData, value: any) => void;
    onPlayersChange: (playersStr: string) => void;
    onTeamsChange: (teamsStr: string) => void;
}

const GameDetailsForm: React.FC<GameDetailsFormProps> = ({
                                                             gameData,
                                                             onFieldChange,
                                                             onPlayersChange,
                                                             onTeamsChange
                                                         }) => {
    const gradeLevels = [
        "Freshman", "Sophomore", "Junior", "Senior",
        "College Freshman", "College Sophomore", "College Junior", "College Senior",
        "Professional Development", "Other"
    ];

    // Use local state for the input values to prevent external interference
    const [playersInput, setPlayersInput] = useState(gameData.num_players > 0 ? gameData.num_players.toString() : '');
    const [teamsInput, setTeamsInput] = useState(gameData.num_teams > 0 ? gameData.num_teams.toString() : '');
    const [userEditedTeams, setUserEditedTeams] = useState(false);

    // Sync teams input with gameData changes (from recommendation system)
    // But only if user hasn't manually edited the teams field
    React.useEffect(() => {
        if (!userEditedTeams) {
            const newTeamsValue = gameData.num_teams > 0 ? gameData.num_teams.toString() : '';
            if (newTeamsValue !== teamsInput) {
                setTeamsInput(newTeamsValue);
            }
        }
    }, [gameData.num_teams, userEditedTeams, teamsInput]);

    const handlePlayersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        console.log('Players input changed to:', value);

        // Update local state immediately
        setPlayersInput(value);

        // Reset the user edited teams flag when players change
        setUserEditedTeams(false);

        // Parse and update parent state
        const numValue = value === '' ? 0 : parseInt(value, 10);
        console.log('Parsed players value:', numValue, 'from input:', value);

        if (!isNaN(numValue) && numValue >= 0) {
            onFieldChange('num_players', numValue);

            // Call recommendation logic with delay to prevent interference
            setTimeout(() => {
                onPlayersChange(value);
            }, 50);
        } else if (value === '') {
            onFieldChange('num_players', 0);
            setTimeout(() => {
                onPlayersChange(value);
            }, 50);
        }
    };

    const handleTeamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        console.log('Teams input changed to:', value);

        // Mark that user has manually edited teams
        setUserEditedTeams(true);

        // Update local state immediately
        setTeamsInput(value);

        // Parse and update parent state
        const numValue = value === '' ? 0 : parseInt(value, 10);
        console.log('Parsed teams value:', numValue, 'from input:', value);

        if (!isNaN(numValue) && numValue >= 0) {
            onFieldChange('num_teams', numValue);

            // Call teams logic with delay
            setTimeout(() => {
                onTeamsChange(value);
            }, 50);
        } else if (value === '') {
            onFieldChange('num_teams', 0);
            setTimeout(() => {
                onTeamsChange(value);
            }, 50);
        }
    };

    return (
        <>
            <div>
                <label htmlFor="game_version" className="block text-sm font-medium text-gray-700 mb-1">
                    Game Version
                </label>
                <select
                    id="game_version"
                    name="game_version"
                    value={gameData.game_version}
                    onChange={(e) => onFieldChange('game_version', e.target.value as NewGameData['game_version'])}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                    <option value="2.0_dd">2.0 with Double Down</option>
                    <option value="1.5_dd">1.5 with Double Down</option>
                </select>
            </div>

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name Your New Game <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={gameData.name}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    placeholder="e.g., Spring Semester Economics Challenge"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="class_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Class / Group Name
                    </label>
                    <input
                        type="text"
                        id="class_name"
                        name="class_name"
                        value={gameData.class_name}
                        onChange={(e) => onFieldChange('class_name', e.target.value)}
                        placeholder="e.g., Business 101, Math Club"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="grade_level" className="block text-sm font-medium text-gray-700 mb-1">
                        Grade Level / Audience
                    </label>
                    <select
                        id="grade_level"
                        name="grade_level"
                        value={gameData.grade_level}
                        onChange={(e) => onFieldChange('grade_level', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {gradeLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                    <label htmlFor="num_players_input" className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Players <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="num_players_input"
                        name="num_players_input"
                        value={playersInput}
                        onChange={handlePlayersChange}
                        min="0"
                        placeholder="e.g., 15"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="num_teams_input" className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Teams <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="num_teams_input"
                        name="num_teams_input"
                        value={teamsInput}
                        onChange={handleTeamsChange}
                        min="0"
                        placeholder="e.g., 3"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </>
    );
};

export default GameDetailsForm;
