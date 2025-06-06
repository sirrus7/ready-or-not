// src/app/providers/GameProvider.tsx
import React, {createContext, useContext, ReactNode, useEffect, useCallback} from 'react';
import {useAuth} from './AuthProvider';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {useSessionManager} from '@shared/hooks/useSessionManager';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {useGameController} from '@core/game/useGameController';
import {useGameProcessing} from '@core/game/useGameProcessing';
import {AppState} from '@shared/types/state';
import {Slide} from '@shared/types';

interface GameContextType {
    state: AppState;
    currentSlideData: Slide | null;
    selectSlideByIndex: (index: number) => Promise<void>;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    fetchTeamsForSession: () => Promise<void>;
    resetTeamDecision: (teamId: string, interactiveDataKey: string) => Promise<void>;
    updateHostNotesForCurrentSlide: (notes: string) => void;
    clearHostAlert: () => Promise<void>;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => Promise<void>;
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

    const {
        session,
        isLoading: sessionLoading,
        error: sessionError,
        updateSessionInDb
    } = useSessionManager(passedSessionId, user, authLoading, gameStructure);
    const teamDataManager = useTeamDataManager(session?.id || null);

    const gameProcessing = useGameProcessing({
        currentDbSession: session,
        gameStructure,
        teams: teamDataManager.teams,
        teamDecisions: teamDataManager.teamDecisions,
        teamRoundData: teamDataManager.teamRoundData,
        updateSessionInDb,
        fetchTeamRoundDataFromHook: teamDataManager.fetchTeamRoundDataForSession,
        setTeamRoundDataDirectly: teamDataManager.setTeamRoundDataDirectly
    });

    const gameController = useGameController(
        session,
        gameStructure,
        (completedSlide: Slide) => gameProcessing.processInteractiveSlide(completedSlide)
    );

    const fetchTeamsForSession = async () => {
        if (session?.id && session.id !== 'new') {
            await Promise.all([
                teamDataManager.fetchTeamsForSession(session.id),
                teamDataManager.fetchTeamDecisionsForSession(session.id),
                teamDataManager.fetchTeamRoundDataForSession(session.id)
            ]);
        }
    };

    const resetTeamDecision = useCallback(async (teamId: string, interactiveDataKey: string) => {
        if (!session?.id || session.id === 'new') throw new Error("No active session");
        try {
            await teamDataManager.resetTeamDecisionInDb(session.id, teamId, interactiveDataKey);
            await fetchTeamsForSession();
        } catch (error) {
            console.error(`[GameProvider] Failed to reset team decision:`, error);
            throw error;
        }
    }, [session?.id, teamDataManager.resetTeamDecisionInDb, fetchTeamsForSession]);

    useEffect(() => {
        fetchTeamsForSession();
    }, [session?.id]);

    const state: AppState = {
        currentSessionId: session?.id || null,
        gameStructure,
        current_slide_index: gameController.currentSlideIndex,
        hostNotes: gameController.teacherNotes,
        isPlaying: session?.is_playing || false,
        teams: teamDataManager.teams,
        teamDecisions: teamDataManager.teamDecisions,
        teamRoundData: teamDataManager.teamRoundData,
        isPlayerWindowOpen: false,
        isLoading: sessionLoading || teamDataManager.isLoadingTeams,
        error: sessionError || teamDataManager.error,
        currentHostAlert: gameController.currentHostAlert
    };

    const contextValue: GameContextType = {
        state,
        currentSlideData: gameController.currentSlideData,
        selectSlideByIndex: gameController.selectSlideByIndex,
        nextSlide: gameController.nextSlide,
        previousSlide: gameController.previousSlide,
        fetchTeamsForSession,
        resetTeamDecision,
        updateHostNotesForCurrentSlide: gameController.updateHostNotesForCurrentSlide,
        clearHostAlert: gameController.clearHostAlert,
        setCurrentHostAlertState: gameController.setCurrentHostAlertState,
        processInvestmentPayoffs: gameProcessing.processInvestmentPayoffs,
        calculateAndFinalizeRoundKPIs: gameProcessing.calculateAndFinalizeRoundKPIs,
        resetGameProgress: gameProcessing.resetGameProgress,
        allTeamsSubmittedCurrentInteractivePhase: gameController.allTeamsSubmittedCurrentInteractivePhase,
        setAllTeamsSubmittedCurrentInteractivePhase: gameController.setAllTeamsSubmittedCurrentInteractivePhase
    };

    return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};

export const useGameContext = (): GameContextType => {
    const context = useContext(GameContext);
    if (context === undefined) throw new Error('useGameContext must be used within a GameProvider');
    return context;
};
