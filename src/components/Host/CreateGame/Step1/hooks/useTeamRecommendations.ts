// src/components/Host/CreateGame/Step1/hooks/useTeamRecommendations.ts - Recommendation logic
import { useState, useCallback, useRef } from 'react';
import { calculateTeamRecommendation } from '../utils/teamCalculations';

interface UseTeamRecommendationsProps {
    numPlayers: number;
    onTeamCountChange: (newTeamCount: number) => void;
}

interface UseTeamRecommendationsReturn {
    recommendation: string;
    shouldShowRecommendation: boolean;
    handlePlayersChange: (playersStr: string) => void;
    handleTeamsChange: (teamsStr: string) => void;
}

export const useTeamRecommendations = ({
                                           numPlayers,
                                           onTeamCountChange
                                       }: UseTeamRecommendationsProps): UseTeamRecommendationsReturn => {
    const [recommendation, setRecommendation] = useState<string>('');
    const [shouldShowRecommendation, setShouldShowRecommendation] = useState<boolean>(false);
    const userManuallySetTeams = useRef(false);
    const isInitializing = useRef(false);

    const handlePlayersChange = useCallback((playersStr: string) => {
        const players = parseInt(playersStr, 10);

        // Reset manual flag when players change
        userManuallySetTeams.current = false;

        if (!isNaN(players) && players >= 0) {
            const result = calculateTeamRecommendation(players);
            setRecommendation(result.recommendationText);
            setShouldShowRecommendation(true);

            // Auto-update team count if user hasn't manually set it
            if (!userManuallySetTeams.current && result.teams > 0) {
                onTeamCountChange(result.teams);
            }
        } else if (playersStr === '') {
            setRecommendation("Enter number of players.");
            setShouldShowRecommendation(true);
            if (!userManuallySetTeams.current) {
                onTeamCountChange(0);
            }
        } else {
            setRecommendation("Please enter a valid number for players.");
            setShouldShowRecommendation(true);
        }
    }, [onTeamCountChange]);

    const handleTeamsChange = useCallback((teamsStr: string) => {
        userManuallySetTeams.current = true;
        const teams = parseInt(teamsStr, 10);
        const newTeamNum = isNaN(teams) || teams < 0 ? 0 : teams;
        onTeamCountChange(newTeamNum);
    }, [onTeamCountChange]);

    // Initialize recommendation based on current players
    React.useEffect(() => {
        if (!isInitializing.current && numPlayers > 0) {
            isInitializing.current = true;
            const result = calculateTeamRecommendation(numPlayers);
            setRecommendation(result.recommendationText);
            setShouldShowRecommendation(true);
            setTimeout(() => {
                isInitializing.current = false;
            }, 100);
        }
    }, [numPlayers]);

    return {
        recommendation,
        shouldShowRecommendation,
        handlePlayersChange,
        handleTeamsChange
    };
};
