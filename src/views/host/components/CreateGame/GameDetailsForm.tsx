// src/views/host/components/CreateGame/GameDetailsForm.tsx - Fixed input handling with improved styling
import React, {useState, useEffect} from 'react';
import {NewGameData} from '@shared/types/ui';
import {
    ACADEMIC_OPTIONS,
    AcademicFormOptions,
    BUSINESS_OPTIONS,
    BusinessFormOptions,
    UserType
} from '@shared/constants/formOptions';

interface GameDetailsFormProps {
    gameData: NewGameData;
    onFieldChange: (field: keyof NewGameData, value: any) => void;
    onPlayersChange: (playersStr: string) => void;
    onTeamsChange: (teamsStr: string) => void;
    userType?: UserType;
}

const GameDetailsForm: React.FC<GameDetailsFormProps> = React.memo(({
                                                                        gameData,
                                                                        onFieldChange,
                                                                        onPlayersChange,
                                                                        onTeamsChange,
                                                                        userType = 'academic'
                                                                    }) => {
    // Instead of creating a union type, just get what we need directly
    const formLabels: BusinessFormOptions | AcademicFormOptions = userType === 'business' ? BUSINESS_OPTIONS : ACADEMIC_OPTIONS;
    const levelOptions = userType === 'business' ? BUSINESS_OPTIONS.playerTypes : ACADEMIC_OPTIONS.gradeLevels;

    // Use local state for the input values to prevent external interference
    const [playersInput, setPlayersInput] = useState(gameData.num_players > 0 ? gameData.num_players.toString() : '');
    const [teamsInput, setTeamsInput] = useState(gameData.num_teams > 0 ? gameData.num_teams.toString() : '');
    const [userEditedTeams, setUserEditedTeams] = useState(false);

    // Sync input values with gameData when it changes externally
    useEffect(() => {
        const newPlayersValue = gameData.num_players > 0 ? gameData.num_players.toString() : '';
        if (newPlayersValue !== playersInput) {
            setPlayersInput(newPlayersValue);
        }
    }, [gameData.num_players]);

    useEffect(() => {
        if (!userEditedTeams) {
            const newTeamsValue = gameData.num_teams > 0 ? gameData.num_teams.toString() : '';
            if (newTeamsValue !== teamsInput) {
                setTeamsInput(newTeamsValue);
            }
        }
    }, [gameData.num_teams, userEditedTeams]);

    const handlePlayersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Update local state immediately
        setPlayersInput(value);

        // Reset the user edited teams flag when players change
        setUserEditedTeams(false);

        // Parse and update parent state immediately
        const numValue = value === '' ? 0 : parseInt(value, 10);

        // Always update the parent state with the parsed number
        if (!isNaN(numValue) && numValue >= 0) {
            onFieldChange('num_players', numValue);
            // Call recommendation logic
            onPlayersChange(value);
        } else if (value === '') {
            onFieldChange('num_players', 0);
            onPlayersChange(value);
        }
    };

    const handleTeamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Mark that user has manually edited teams
        setUserEditedTeams(true);

        // Update local state immediately
        setTeamsInput(value);

        // Parse and update parent state immediately
        const numValue = value === '' ? 0 : parseInt(value, 10);

        // Always update the parent state with the parsed number
        if (!isNaN(numValue) && numValue >= 0) {
            onFieldChange('num_teams', numValue);
            onTeamsChange(value);
        } else if (value === '') {
            onFieldChange('num_teams', 0);
            onTeamsChange(value);
        }
    };

    return (
        <div className="space-y-6">
            {/* Game Version */}
            <div>
                <label htmlFor="game_version" className="block text-sm font-medium text-gray-700 mb-2">
                    Game Version
                </label>
                <select
                    id="game_version"
                    name="game_version"
                    value={gameData.game_version}
                    onChange={(e) => onFieldChange('game_version', e.target.value as NewGameData['game_version'])}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-game-orange-500 bg-white text-base"
                >
                    <option value="2.0_dd">2.0 with Double Down</option>
                    <option value="2.0_no_dd">2.0 without Double Down</option>
                </select>
            </div>

            {/* Game Name */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name Your New Game <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={gameData.name}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    placeholder="e.g., Spring Semester Economics Challenge"
                    maxLength={40}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-game-orange-500 text-base"
                />
            </div>

            {/* Class Name and Grade Level Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="class_name" className="block text-sm font-medium text-gray-700 mb-2">
                        {formLabels.classLabel}
                    </label>
                    {userType === 'business' ? (
                        <select
                            id="class_name"
                            name="class_name"
                            value={gameData.class_name}
                            onChange={(e) => onFieldChange('class_name', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-game-orange-500 bg-white text-base"
                        >
                            <option value="">Select an event type...</option>
                            {BUSINESS_OPTIONS.eventTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            id="class_name"
                            name="class_name"
                            value={gameData.class_name}
                            onChange={(e) => onFieldChange('class_name', e.target.value)}
                            placeholder={formLabels.classPlaceholder}
                            maxLength={30}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-game-orange-500 text-base"
                        />
                    )}
                </div>
                <div>
                    <label htmlFor="grade_level" className="block text-sm font-medium text-gray-700 mb-2">
                        {formLabels.gradeLabel}
                    </label>
                    <select
                        id="grade_level"
                        name="grade_level"
                        value={gameData.grade_level}
                        onChange={(e) => onFieldChange('grade_level', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-game-orange-500 bg-white text-base"
                    >
                        {levelOptions.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Players and Teams Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="num_players_input" className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Players <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="num_players_input"
                        name="num_players_input"
                        value={playersInput}
                        onChange={handlePlayersChange}
                        min="0"
                        max={300}
                        placeholder="e.g., 15"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-game-orange-500 text-base"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Total number of students participating
                    </p>
                </div>
                <div>
                    <label htmlFor="num_teams_input" className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:border-game-orange-500 text-base"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Teams will compete against each other
                    </p>
                </div>
            </div>
        </div>
    );
});

export default GameDetailsForm;
