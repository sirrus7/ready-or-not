// src/views/host/components/CreateGame/GameDetailsStep.tsx - Final fix with direct form validation
import React, {useState, useRef} from 'react';
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

const GameDetailsStep: React.FC<Step1Props> = ({gameData, onDataChange, onNext}) => {
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Team recommendation logic
    const teamRecommendations = useTeamRecommendations({
        numPlayers: gameData.num_players,
        onTeamCountChange: (newTeamCount: number) => {
            console.log(`GameDetailsStep: Team recommendation suggests ${newTeamCount} teams`);
            onDataChange('num_teams', newTeamCount);
        }
    });

    // Handle form field changes
    const handleFieldChange = (field: keyof NewGameData, value: any) => {
        console.log(`GameDetailsStep: handleFieldChange - ${field} = ${value}`);
        onDataChange(field, value);

        // Clear error when user makes changes
        if (error) setError(null);
    };

    // Get current form values directly from DOM
    const getCurrentFormData = (): NewGameData => {
        const nameInput = document.getElementById('name') as HTMLInputElement;
        const playersInput = document.getElementById('num_players_input') as HTMLInputElement;
        const teamsInput = document.getElementById('num_teams_input') as HTMLInputElement;
        const classInput = document.getElementById('class_name') as HTMLInputElement;
        const gradeSelect = document.getElementById('grade_level') as HTMLSelectElement;
        const versionSelect = document.getElementById('game_version') as HTMLSelectElement;

        return {
            name: nameInput?.value || gameData.name || '',
            num_players: playersInput?.value ? parseInt(playersInput.value, 10) || 0 : gameData.num_players,
            num_teams: teamsInput?.value ? parseInt(teamsInput.value, 10) || 0 : gameData.num_teams,
            class_name: classInput?.value || gameData.class_name || '',
            grade_level: gradeSelect?.value || gameData.grade_level || 'Freshman',
            game_version: (versionSelect?.value as '2.0_dd' | '1.5_dd') || gameData.game_version || '2.0_dd',
            teams_config: gameData.teams_config || []
        };
    };

    // Simple validation function
    const validateFormData = (data: NewGameData): { isValid: boolean; error: string | null } => {
        console.log('Validating form data:', data);

        if (!data.name || data.name.trim().length === 0) {
            return {isValid: false, error: 'Game name is required.'};
        }

        if (!data.num_players || data.num_players < 2) {
            return {isValid: false, error: 'Number of players must be at least 2.'};
        }

        if (!data.num_teams || data.num_teams < 1) {
            return {isValid: false, error: 'Number of teams must be at least 1.'};
        }

        return {isValid: true, error: null};
    };

    // Handle form submission
    const handleNext = () => {
        setError(null);

        // Get the current form data directly from DOM
        const currentFormData = getCurrentFormData();
        console.log('Current form data:', currentFormData);

        const validation = validateFormData(currentFormData);
        if (!validation.isValid) {
            console.log('Validation failed:', validation.error);
            setError(validation.error);
            return;
        }

        console.log('Validation passed, proceeding with data:', currentFormData);
        onNext(currentFormData);
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm flex items-center">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0"/> {error}
                </div>
            )}

            <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
                <GameDetailsForm
                    gameData={gameData}
                    onFieldChange={handleFieldChange}
                    onPlayersChange={teamRecommendations.handlePlayersChange}
                    onTeamsChange={teamRecommendations.handleTeamsChange}
                />
            </form>

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


        </div>
    );
};

export default GameDetailsStep;
