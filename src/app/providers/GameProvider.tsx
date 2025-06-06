// src/app/providers/GameProvider.tsx - Fixed with missing export
import React, {createContext, useContext, ReactNode, useEffect} from 'react';
import {useAuth} from './AuthProvider';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {useSessionManager} from '@shared/hooks/useSessionManager';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {useGameController} from '@core/game/useGameController';
import {useGameProcessing} from '@core/game/useGameProcessing';
import {AppState} from '@shared/types/state';
import {GameSession, GameStructure, GamePhaseNode, Slide} from '@shared/types';

interface GameContextType {
    state: AppState;
    currentSlideData: Slide | null;
    currentPhaseNode: GamePhaseNode | null;
    // Navigation
    selectPhase: (phaseId: string) => Promise<void>;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    // Team management
    fetchTeamsForSession: () => Promise<void>;
    resetTeamDecisionForPhase: (teamId: string, phaseId: string) => Promise<void>;
    // Host UI
    updateHostNotesForCurrentSlide: (notes: string) => void;
    clearHostAlert: () => Promise<void>;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;
    // Processing
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3, currentPhaseId: string | null) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => Promise<void>;
    // Team submission monitoring - FIXED: Added missing export
    allTeamsSubmittedCurrentInteractivePhase: boolean;
    setAllTeamsSubmittedCurrentInteractivePhase: (submitted: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
    children: ReactNode;
    passedSessionId?: string | null;
}

export const GameProvider: React.FC<GameProviderProps> = ({children, passedSessionId}) => {
    const {user, loading: authLoading} = useAuth();
    const gameStructure = readyOrNotGame_2_0_DD;

    // Session management
    const {session, isLoading: sessionLoading, error: sessionError, updateSessionInDb} = useSessionManager(
        passedSessionId,
        user,
        authLoading,
        gameStructure
    );

    // Team data management
    const teamDataManager = useTeamDataManager(session?.id || null);

    // Game controller with decision processing integration
    const gameController = useGameController(
        session,
        gameStructure,
        // Pass the processChoicePhaseDecisions function from useGameProcessing
        async (phaseId: string, associatedSlide: Slide | null) => {
            await gameProcessing.processChoicePhaseDecisions(phaseId, associatedSlide);
        }
    );

    // Game processing
    const gameProcessing = useGameProcessing({
        currentDbSession: session,
        gameStructure,
        teams: teamDataManager.teams,
        teamDecisions: teamDataManager.teamDecisions,
        teamRoundData: teamDataManager.teamRoundData,
        allPhasesInOrder: gameController.allPhasesInOrder,
        updateSessionInDb,
        fetchTeamRoundDataFromHook: teamDataManager.fetchTeamRoundDataForSession,
        setTeamRoundDataDirectly: teamDataManager.setTeamRoundDataDirectly
    });

    // Fetch teams data helper
    const fetchTeamsForSession = async () => {
        if (session?.id && session.id !== 'new') {
            await Promise.all([
                teamDataManager.fetchTeamsForSession(session.id),
                teamDataManager.fetchTeamDecisionsForSession(session.id),
                teamDataManager.fetchTeamRoundDataForSession(session.id)
            ]);
        }
    };

    // Auto-fetch teams when session changes
    useEffect(() => {
        fetchTeamsForSession();
    }, [session?.id]);

    // Construct the app state
    const state: AppState = {
        currentSessionId: session?.id || null,
        gameStructure,
        currentPhaseId: gameController.currentPhaseId,
        currentSlideIdInPhase: gameController.currentSlideIdInPhase,
        hostNotes: gameController.teacherNotes,
        isPlaying: session?.is_playing || false,
        teams: teamDataManager.teams,
        teamDecisions: teamDataManager.teamDecisions,
        teamRoundData: teamDataManager.teamRoundData,
        isPlayerWindowOpen: false, // Legacy field
        isLoading: sessionLoading || teamDataManager.isLoadingTeams,
        error: sessionError || teamDataManager.error,
        currentHostAlert: gameController.currentHostAlert
    };

    const contextValue: GameContextType = {
        state,
        currentSlideData: gameController.currentSlideData,
        currentPhaseNode: gameController.currentPhaseNode,
        // Navigation
        selectPhase: gameController.selectPhase,
        nextSlide: gameController.nextSlide,
        previousSlide: gameController.previousSlide,
        // Team management
        fetchTeamsForSession,
        resetTeamDecisionForPhase: teamDataManager.resetTeamDecisionInDb,
        // Host UI
        updateHostNotesForCurrentSlide: gameController.updateHostNotesForCurrentSlide,
        clearHostAlert: gameController.clearHostAlert,
        setCurrentHostAlertState: gameController.setCurrentHostAlertState,
        // Processing
        processInvestmentPayoffs: gameProcessing.processInvestmentPayoffs,
        calculateAndFinalizeRoundKPIs: gameProcessing.calculateAndFinalizeRoundKPIs,
        resetGameProgress: gameProcessing.resetGameProgress,
        // Team submission monitoring - FIXED: Now properly exported
        allTeamsSubmittedCurrentInteractivePhase: gameController.allTeamsSubmittedCurrentInteractivePhase,
        setAllTeamsSubmittedCurrentInteractivePhase: gameController.setAllTeamsSubmittedCurrentInteractivePhase
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

export const useGameContext = (): GameContextType => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};
