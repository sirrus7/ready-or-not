// src/components/Host/CreateGame/Step1/index.tsx - Main orchestration component (100 lines)
import React, {useState, useEffect} from 'react';
import {NewGameData} from '@shared/types/ui';
import {ArrowRight, AlertCircle} from 'lucide-react';
import GameDetailsForm from './GameDetailsForm';
import TeamRecommendationDisplay from './TeamRecommendation';
import {useTeamRecommendations} from '@views/host/hooks/useTeamRecommendations';
import {validateGameDetails} from '@shared/utils/gameValidation.ts';

interface Step1Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: any) => void;
    onNext: (dataFromStep: Partial<NewGameData>) => void;
}

const GameDetailsStep: React.FC<Step1Props> = ({gameData, onDataChange, onNext}) => {
    const [localGameData, setLocalGameData] = useState<NewGameData>(gameData);
    const [error, setError] = useState<string | null>(null);

    // Team recommendation logic
    const teamRecommendations = useTeamRecommendations({
        numPlayers: localGameData.num_players,
        onTeamCountChange: (newTeamCount: number) => {
            setLocalGameData(prev => ({...prev, num_teams: newTeamCount}));
            onDataChange('num_teams', newTeamCount);
        }
    });

    // Sync with parent data changes
    useEffect(() => {
        setLocalGameData(gameData);
    }, [gameData]);

    // Handle form field changes
    const handleFieldChange = (field: keyof NewGameData, value: any) => {
        setLocalGameData(prev => ({...prev, [field]: value}));
        onDataChange(field, value);

        // Clear error when user makes changes
        if (error) setError(null);
    };

    // Handle form submission
    const handleNext = () => {
        setError(null);

        const validation = validateGameDetails(localGameData);
        if (!validation.isValid) {
            setError(validation.error);
            return;
        }

        onNext(localGameData);
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
        </div>
    );
};

export default GameDetailsStep;
