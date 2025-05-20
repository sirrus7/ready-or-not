// src/components/TeacherHost/CreateGameWizard/Step1_GameDetails.tsx
import React, {useState, useEffect, useCallback} from 'react';
import {NewGameData} from '../../../pages/CreateGamePage'; // Import the type
import {ArrowRight, AlertCircle} from 'lucide-react';

interface Step1Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: any) => void;
    onNext: (dataFromStep: Partial<NewGameData>) => void;
    onPrevious: () => void; // Although Step 1 might not use "onPrevious" to go further back
}

const Step1GameDetails: React.FC<Step1Props> = ({gameData, onDataChange, onNext}) => {
    const [localGameData, setLocalGameData] = useState<NewGameData>(gameData);
    const [numPlayersStr, setNumPlayersStr] = useState<string>(gameData.num_players > 0 ? gameData.num_players.toString() : '');
    const [numTeamsStr, setNumTeamsStr] = useState<string>(gameData.num_teams > 0 ? gameData.num_teams.toString() : ''); // Allow teacher to override
    const [recommendation, setRecommendation] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Update local state if gameData prop changes (e.g., navigating back and forth)
    useEffect(() => {
        setLocalGameData(gameData);
        setNumPlayersStr(gameData.num_players > 0 ? gameData.num_players.toString() : '');
        setNumTeamsStr(gameData.num_teams > 0 ? gameData.num_teams.toString() : '');
    }, [gameData]);

    const calculateTeamRecommendation = useCallback((players: number): {
        teams: number;
        recommendationText: string
    } => {
        if (players <= 0) return {teams: 0, recommendationText: "Enter number of players."};
        if (players < 2) return {teams: 0, recommendationText: "Minimum 2 players required."};

        // Logic from demo: Teams of 2-5 are ideal.
        // Calculate a reasonable number of teams.
        // This is a simplified logic based on observation. The actual game might have more precise rules.
        let recommendedTeams = Math.ceil(players / 4); // Aim for teams of ~4
        if (players / recommendedTeams > 5 && players > 5) { // If average team size is > 5, increase teams
            recommendedTeams = Math.ceil(players / 3);
        }
        if (players / recommendedTeams < 2 && recommendedTeams > 1) { // If average team size < 2, decrease teams
            recommendedTeams = Math.floor(players / 2);
        }
        recommendedTeams = Math.max(1, recommendedTeams); // At least one team


        const minPlayersPerTeam = 2;
        const maxPlayersPerTeam = 5; // Ideal max for this game it seems

        if (recommendedTeams * maxPlayersPerTeam < players) {
            return {
                teams: recommendedTeams,
                recommendationText: `With ${players} players, consider increasing teams for optimal size (2-5 players/team).`
            };
        }
        if (recommendedTeams * minPlayersPerTeam > players && recommendedTeams > 1) {
            return {
                teams: recommendedTeams,
                recommendationText: `With ${players} players, consider decreasing teams for optimal size (2-5 players/team).`
            };
        }

        // Example recommendations based on demo
        if (players >= 2 && players <= 5) return {
            teams: 1,
            recommendationText: `Recommended: 1 team of ${players} players.`
        };
        if (players >= 6 && players <= 8) return {
            teams: 2,
            recommendationText: `Recommended: 2 teams (e.g., ${Math.floor(players / 2)} & ${Math.ceil(players / 2)} players).`
        };
        if (players >= 9 && players <= 12) return {
            teams: 3,
            recommendationText: `Recommended: 3 teams (e.g., average ${(players / 3).toFixed(1)} players/team).`
        };

        // General recommendation
        return {
            teams: recommendedTeams,
            recommendationText: `Recommended: ${recommendedTeams} teams (avg ${(players / recommendedTeams).toFixed(1)} players/team). Adjust #Teams if needed.`
        };

    }, []);


    useEffect(() => {
        const players = parseInt(numPlayersStr, 10);
        if (!isNaN(players) && players > 0) {
            const {teams, recommendationText} = calculateTeamRecommendation(players);
            setRecommendation(recommendationText);
            if (numTeamsStr === '' || parseInt(numTeamsStr, 10) === 0 || parseInt(numTeamsStr, 10) !== teams) { // Auto-update teams if not manually set or if recommendation changes
                // Only auto-update if the teams field hasn't been manually changed by the user to something different than the current recommendation for that player count.
                // This needs a bit more sophisticated logic to detect if user *manually* changed numTeamsStr.
                // For now, simple auto-update if it's 0 or different from new recommendation.
                // A better way might be to only auto-update if the numTeams field was never touched by the user for the current player count.
                const currentManualTeams = parseInt(numTeamsStr, 10);
                const currentRecommendedForOldPlayers = calculateTeamRecommendation(localGameData.num_players).teams;

                if (isNaN(currentManualTeams) || currentManualTeams === 0 || currentManualTeams === currentRecommendedForOldPlayers) {
                    setNumTeamsStr(teams > 0 ? teams.toString() : '');
                    onDataChange('num_teams', teams > 0 ? teams : 0);
                }
            }
            onDataChange('num_players', players);
        } else {
            setRecommendation("Enter a valid number of players.");
            if (numPlayersStr === '') { // If cleared, reset teams too
                setNumTeamsStr('');
                onDataChange('num_players', 0);
                onDataChange('num_teams', 0);
            }
        }
    }, [numPlayersStr, calculateTeamRecommendation, onDataChange, localGameData.num_players]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setLocalGameData(prev => ({...prev, [name]: value}));
        onDataChange(name as keyof NewGameData, value);
    };

    const handleNumPlayersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNumPlayersStr(val); // Update string representation for input control
        // Actual conversion and onDataChange call is in useEffect
    };

    const handleNumTeamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNumTeamsStr(val);
        const teams = parseInt(val, 10);
        onDataChange('num_teams', isNaN(teams) ? 0 : teams);
    };


    const validateAndProceed = () => {
        setError('');
        if (!localGameData.name.trim()) {
            setError("Game Name is required.");
            return;
        }
        const players = parseInt(numPlayersStr, 10);
        if (isNaN(players) || players < 2) { // Assuming minimum 2 players for at least 1 team
            setError("Number of players must be at least 2.");
            return;
        }
        const teams = parseInt(numTeamsStr, 10);
        if (isNaN(teams) || teams < 1) {
            setError("Number of teams must be at least 1.");
            return;
        }
        if (players / teams < 1) { // Basic check
            setError("Number of players cannot be less than the number of teams.")
            return;
        }

        onNext({...localGameData, num_players: players, num_teams: teams});
    };

    const gradeLevels = [
        "Freshman", "Sophomore", "Junior", "Senior",
        "College Freshman", "College Sophomore", "College Junior", "College Senior",
        "Professional Development", "Other"
    ];

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm flex items-center">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0"/> {error}
                </div>
            )}

            <div>
                <label htmlFor="game_version" className="block text-sm font-medium text-gray-700 mb-1">
                    Game Version
                </label>
                <select
                    id="game_version"
                    name="game_version"
                    value={localGameData.game_version}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    value={localGameData.name}
                    onChange={handleInputChange}
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
                        value={localGameData.class_name}
                        onChange={handleInputChange}
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
                        value={localGameData.grade_level}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {gradeLevels.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label htmlFor="num_players" className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Players <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="num_players"
                        name="num_players"
                        value={numPlayersStr}
                        onChange={handleNumPlayersChange}
                        min="2" // Minimum players
                        placeholder="e.g., 15"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="num_teams" className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Teams <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="num_teams"
                        name="num_teams"
                        value={numTeamsStr}
                        onChange={handleNumTeamsChange}
                        min="1"
                        placeholder="e.g., 3"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
            {recommendation && (
                <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm">
                    {recommendation}
                </div>
            )}

            <div className="mt-8 flex justify-end">
                <button
                    type="button"
                    onClick={validateAndProceed}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Next: Print Handouts <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step1GameDetails;