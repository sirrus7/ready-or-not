// src/components/Host/CreateGame/Step1/components/GameDetailsForm.tsx - Fixed players input
import React from 'react';
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

    // Handle players input change with direct field update
    const handlePlayersInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Update the field directly first to maintain input responsiveness
        const numericValue = value === '' ? 0 : parseInt(value, 10);
        if (!isNaN(numericValue) && numericValue >= 0) {
            onFieldChange('num_players', numericValue);
        } else if (value === '') {
            onFieldChange('num_players', 0);
        }

        // Then trigger the recommendation logic
        onPlayersChange(value);
    };

    // Handle teams input change with direct field update
    const handleTeamsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Update the field directly first
        const numericValue = value === '' ? 0 : parseInt(value, 10);
        if (!isNaN(numericValue) && numericValue >= 0) {
            onFieldChange('num_teams', numericValue);
        } else if (value === '') {
            onFieldChange('num_teams', 0);
        }

        // Then trigger the teams logic
        onTeamsChange(value);
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
                        name="num_players_str"
                        value={gameData.num_players > 0 ? gameData.num_players.toString() : ''}
                        onChange={handlePlayersInputChange}
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
                        name="num_teams_str"
                        value={gameData.num_teams > 0 ? gameData.num_teams.toString() : ''}
                        onChange={handleTeamsInputChange}
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
