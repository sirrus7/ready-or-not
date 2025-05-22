// src/components/TeacherHost/CreateGameWizard/Step1_GameDetails.tsx
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {NewGameData} from '../../../types'; // Corrected path assuming types is at src/types
import {ArrowRight, AlertCircle} from 'lucide-react';

interface Step1Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: any) => void;
    onNext: (dataFromStep: Partial<NewGameData>) => void;
    // onPrevious is not used in this step's UI, so it can be omitted from props if not needed by CreateGamePage for this step
}

const Step1GameDetails: React.FC<Step1Props> = ({gameData, onDataChange, onNext}) => {
    const [name, setName] = useState(gameData.name);
    const [className, setClassName] = useState(gameData.class_name);
    const [gameVersion, setGameVersion] = useState(gameData.game_version);
    const [gradeLevel, setGradeLevel] = useState(gameData.grade_level);

    const [numPlayersStr, setNumPlayersStr] = useState<string>(
        gameData.num_players > 0 ? gameData.num_players.toString() : ''
    );
    const [numTeamsStr, setNumTeamsStr] = useState<string>(
        gameData.num_teams > 0 ? gameData.num_teams.toString() : ''
    );

    const [recommendation, setRecommendation] = useState<string>('');
    const [error, setError] = useState<string>('');
    const userManuallySetTeams = useRef(false);
    const isInitializingFromProps = useRef(true);
    const previousPlayersRef = useRef<number>(gameData.num_players);

    useEffect(() => {
        console.log("Step1: gameData prop changed, syncing local state.", gameData);
        isInitializingFromProps.current = true;
        setName(gameData.name);
        setClassName(gameData.class_name);
        setGameVersion(gameData.game_version);
        setGradeLevel(gameData.grade_level);

        const newPlayersStr = gameData.num_players > 0 ? gameData.num_players.toString() : '';
        if (newPlayersStr !== numPlayersStr) {
            setNumPlayersStr(newPlayersStr);
        }

        const newTeamsStr = gameData.num_teams > 0 ? gameData.num_teams.toString() : '';
        if (newTeamsStr !== numTeamsStr) {
            setNumTeamsStr(newTeamsStr);
        }
        // If props provide num_teams > 0, consider it as if user has set it, unless num_players also changed warranting new recommendation
        if (gameData.num_teams > 0 && gameData.num_players === previousPlayersRef.current) {
            userManuallySetTeams.current = true;
        } else {
            userManuallySetTeams.current = false; // Allow recommendation if players changed or teams from prop is 0
        }
        previousPlayersRef.current = gameData.num_players;


        const timer = setTimeout(() => {
            isInitializingFromProps.current = false;
            console.log("Step1: Finished initializing from props.");
        }, 0);
        return () => clearTimeout(timer);
    }, [gameData]); // Only run when gameData prop changes


    const calculateTeamRecommendation = useCallback((players: number): {
        teams: number;
        recommendationText: string
    } => {
        if (players <= 0) return {teams: 0, recommendationText: "Enter number of players."};
        if (players < 2) return {teams: 0, recommendationText: "Minimum 2 players required for at least one team."};
        let recommendedTeams = Math.ceil(players / 4);
        if (recommendedTeams === 0 && players > 0) recommendedTeams = 1;
        if (players / recommendedTeams > 5 && players > 5 && recommendedTeams > 0) {
            recommendedTeams = Math.ceil(players / 3);
        }
        if (players / recommendedTeams < 2 && recommendedTeams > 1) {
            recommendedTeams = Math.floor(players / 2);
        }
        recommendedTeams = Math.max(1, recommendedTeams);
        const avgPlayersPerTeam = players / recommendedTeams;
        let recText = `Recommended: ${recommendedTeams} team${recommendedTeams > 1 ? 's' : ''}`;
        if (recommendedTeams === 1) recText += ` of ${players} players.`;
        else recText += ` (avg ${avgPlayersPerTeam.toFixed(1)} players/team). Adjust if needed.`;
        if (recommendedTeams * 5 < players) recText = `With ${players} players, consider increasing teams for optimal size (2-5 players/team). Current recommendation: ${recommendedTeams} teams.`;
        if (recommendedTeams * 2 > players && recommendedTeams > 1) recText = `With ${players} players, consider decreasing teams for optimal size (2-5 players/team). Current recommendation: ${recommendedTeams} teams.`;
        return {teams: recommendedTeams, recommendationText: recText};
    }, []);

    // Effect for num_players logic (reacts to numPlayersStr changes)
    useEffect(() => {
        if (isInitializingFromProps.current) {
            console.log("Step1 PlayersEffect: Skipping during prop initialization.");
            return;
        }

        const players = parseInt(numPlayersStr, 10);
        console.log(`Step1 PlayersEffect: numPlayersStr="${numPlayersStr}", parsedPlayers=${players}, userManuallySetTeams=${userManuallySetTeams.current}`);

        if (!isNaN(players) && players >= 0) {
            if (gameData.num_players !== players) {
                console.log(`Step1 PlayersEffect: Propagating num_players: ${players} to parent.`);
                onDataChange('num_players', players);
            }
            if (players > 0) {
                const {teams: recommendedNumTeams, recommendationText} = calculateTeamRecommendation(players);
                setRecommendation(recommendationText);
                if (!userManuallySetTeams.current && recommendedNumTeams > 0) {
                    if (gameData.num_teams !== recommendedNumTeams || numTeamsStr !== recommendedNumTeams.toString()) {
                        console.log(`Step1 PlayersEffect: Recommending teams: ${recommendedNumTeams}. Updating numTeamsStr and parent.`);
                        setNumTeamsStr(recommendedNumTeams.toString()); // Update local state for input
                        onDataChange('num_teams', recommendedNumTeams); // Update parent state
                    }
                }
            } else { // players is 0
                setRecommendation("Enter number of players.");
                if (!userManuallySetTeams.current) {
                    if (gameData.num_teams !== 0 || numTeamsStr !== '') {
                        console.log(`Step1 PlayersEffect: Players is 0, resetting teams.`);
                        setNumTeamsStr('');
                        onDataChange('num_teams', 0);
                    }
                }
            }
        } else if (numPlayersStr === '') {
            if (gameData.num_players !== 0) {
                console.log(`Step1 PlayersEffect: numPlayersStr is empty. Resetting num_players in parent.`);
                onDataChange('num_players', 0);
            }
            setRecommendation("Enter number of players.");
            if (!userManuallySetTeams.current) {
                if (gameData.num_teams !== 0 || numTeamsStr !== '') {
                    console.log(`Step1 PlayersEffect: numPlayersStr is empty, resetting teams.`);
                    setNumTeamsStr('');
                    onDataChange('num_teams', 0);
                }
            }
        } else {
            setRecommendation("Please enter a valid number for players.");
        }
    }, [numPlayersStr, calculateTeamRecommendation, onDataChange, gameData.num_players, gameData.num_teams]);


    const handleLocalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        let processedValue: string | NewGameData['game_version'] = value;

        if (name === 'name') setName(value);
        else if (name === 'class_name') setClassName(value);
        else if (name === 'game_version') {
            setGameVersion(value as NewGameData['game_version']);
            processedValue = value as NewGameData['game_version'];
        } else if (name === 'grade_level') setGradeLevel(value);

        if (gameData[name as keyof NewGameData] !== processedValue) {
            console.log(`Step1: LocalInputChange for ${name} ("${value}"). Calling onDataChange.`);
            onDataChange(name as keyof NewGameData, processedValue);
        }
    };

    const handleNumPlayersStrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPlayerStr = e.target.value;
        console.log(`Step1: handleNumPlayersStrChange - new value: "${newPlayerStr}"`);
        setNumPlayersStr(newPlayerStr);
        const currentPlayersNumeric = parseInt(newPlayerStr, 10);
        if (isNaN(currentPlayersNumeric) || currentPlayersNumeric !== previousPlayersRef.current) {
            // Only reset userManuallySetTeams if the actual numeric value has changed, or input becomes invalid
            userManuallySetTeams.current = false;
        }
    };

    const handleNumTeamsStrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        console.log(`Step1: handleNumTeamsStrChange - new value: "${val}"`);
        setNumTeamsStr(val);
        userManuallySetTeams.current = true;
        const teams = parseInt(val, 10);
        const newTeamNum = isNaN(teams) || teams < 0 ? 0 : teams;
        if (gameData.num_teams !== newTeamNum) {
            console.log(`Step1: Manual team change. Calling onDataChange for num_teams: ${newTeamNum}.`);
            onDataChange('num_teams', newTeamNum);
        }
    };

    const validateAndProceed = () => {
        setError('');
        const currentPlayers = parseInt(numPlayersStr, 10);
        const currentTeams = parseInt(numTeamsStr, 10);

        const finalGameData: NewGameData = {
            name: name.trim(),
            class_name: className.trim(),
            game_version: gameVersion,
            grade_level: gradeLevel,
            num_players: isNaN(currentPlayers) || currentPlayers < 0 ? 0 : currentPlayers,
            num_teams: isNaN(currentTeams) || currentTeams < 0 ? 0 : currentTeams,
            teams_config: gameData.teams_config
        };

        if (!finalGameData.name) {
            setError("Game Name is required.");
            return;
        }
        if (finalGameData.num_players < 2) {
            setError("Number of players must be at least 2.");
            return;
        }
        if (finalGameData.num_teams < 1) {
            setError("Number of teams must be at least 1.");
            return;
        }
        if (finalGameData.num_players < finalGameData.num_teams) {
            setError("Number of players cannot be less than the number of teams.");
            return;
        }

        onNext(finalGameData);
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
                    value={gameVersion}
                    onChange={handleLocalInputChange}
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
                    value={name}
                    onChange={handleLocalInputChange}
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
                        value={className}
                        onChange={handleLocalInputChange}
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
                        value={gradeLevel}
                        onChange={handleLocalInputChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {gradeLevels.map(level => <option key={level} value={level}>{level}</option>)}
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
                        value={numPlayersStr}
                        onChange={handleNumPlayersStrChange}
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
                        value={numTeamsStr}
                        onChange={handleNumTeamsStrChange}
                        min="0"
                        placeholder="e.g., 3"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
            {recommendation && (
                <div
                    className={`p-3 rounded-md text-sm mt-2 ${error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
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