// src/views/host/components/CreateGame/GameDetailsStep.tsx - Fixed validation timing
import React, {useState, useEffect} from 'react';
import {NewGameData} from '@shared/types/ui';
import {ArrowRight, AlertCircle} from 'lucide-react';
import GameDetailsForm from './GameDetailsForm';
import TeamRecommendationDisplay from './TeamRecommendation';
import {useTeamRecommendations} from '@views/host/hooks/useTeamRecommendations';

interface Step1Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: any) => void;
    onNext: (dataFromStep: Partial<NewGameData>) => void;
}

// Simple validation function
const validateGameDetails = (gameData: NewGameData): { isValid: boolean; error: string | null } => {
    console.log('Validating game data:', gameData);

    if (!gameData.name || gameData.name.trim().length === 0) {
        return {isValid: false, error: 'Game name is required.'};
    }

    if (!gameData.num_players || gameData.num_players < 2) {
        return {isValid: false, error: 'Number of players must be at least 2.'};
    }

    if (!gameData.num_teams || gameData.num_teams < 1) {
        return {isValid: false, error: 'Number of teams must be at least 1.'};
    }

    return {isValid: true, error: null};
};

const GameDetailsStep: React.FC<Step1Props> = ({gameData, onDataChange, onNext}) => {
    const [localGameData, setLocalGameData] = useState<NewGameData>(gameData);
    const [error, setError] = useState<string | null>(null);

    // Team recommendation logic
    const teamRecommendations = useTeamRecommendations({
        numPlayers: localGameData.num_players,
        onTeamCountChange: (newTeamCount: number) => {
            console.log(`GameDetailsStep: Team recommendation suggests ${newTeamCount} teams`);

            // Only update teams, not players
            const updatedData = {...localGameData, num_teams: newTeamCount};
            setLocalGameData(updatedData);
            onDataChange('num_teams', newTeamCount);
        }
    });

    // Initialize local state from parent, but don't sync after that
    useEffect(() => {
        // Only sync on initial load
        if (localGameData.num_players === 0 && localGameData.num_teams === 0) {
            setLocalGameData(gameData);
        }
    }, [gameData.name]); // Only sync when the game name changes (new session)

    // Handle form field changes
    const handleFieldChange = (field: keyof NewGameData, value: any) => {
        console.log(`GameDetailsStep: handleFieldChange - ${field} = ${value}`);

        const updatedData = {...localGameData, [field]: value};
        setLocalGameData(updatedData);
        onDataChange(field, value);

        // Clear error when user makes changes
        if (error) setError(null);
    };

    // Handle form submission with up-to-date data
    const handleNext = () => {
        setError(null);

        // Use the most current local data for validation
        const currentData = localGameData;
        console.log('About to validate current data:', currentData);

        const validation = validateGameDetails(currentData);
        if (!validation.isValid) {
            setError(validation.error);
            return;
        }

        // Pass the current data to the parent
        onNext(currentData);
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm flex items-center">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0"/> {error}
                </div>
            )}

            <GameDetailsForm
                gameData={localGameData}
                onFieldChange={handleFieldChange}
                onPlayersChange={teamRecommendations.handlePlayersChange}
                onTeamsChange={teamRecommendations.handleTeamsChange}
            />

            <TeamRecommendationDisplay
                recommendation={teamRecommendations.recommendation}
                isVisible={teamRecommendations.shouldShowRecommendation}
            />

            <div className="mt-8 flex justify-end">
                <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Next: Team Setup <ArrowRight size={18}/>
                </button>
            </div>

            {/* Debug info */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <p><strong>Debug:</strong></p>
                <p>Local Players: {localGameData.num_players}</p>
                <p>Local Teams: {localGameData.num_teams}</p>
                <p>Parent Players: {gameData.num_players}</p>
                <p>Parent Teams: {gameData.num_teams}</p>
            </div>
        </div>
    );
};

export default GameDetailsStep;
