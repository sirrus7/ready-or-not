// src/app/providers/GameProvider.tsx
// FIXED VERSION - Based on actual codebase structure

import React, {createContext, useContext, ReactNode, useEffect, useCallback} from 'react';
import {useAuth} from './AuthProvider';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {useSessionManager} from '@shared/hooks/useSessionManager';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {useGameController} from '@core/game/useGameController';
import {useGameProcessing} from '@core/game/useGameProcessing';
import {AppState} from '@shared/types/state';
import {Slide} from '@shared/types';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';

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

    // FIXED: Updated to include consequence slide processing
    const gameController = useGameController(
        session,
        gameStructure,
        gameProcessing.processInteractiveSlide,
        gameProcessing.processConsequenceSlide
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
        if (!session?.id) {
            console.error('Cannot reset decision - no active session');
            return;
        }

        try {
            // Delete the team's decision from the database
            await teamDataManager.resetTeamDecision(teamId, interactiveDataKey);

            // Send broadcast command to team to refresh their UI
            const broadcastManager = SimpleBroadcastManager.getInstance(session.id, 'host');
            broadcastManager.sendHostCommand({
                action: 'decision_reset',
                data: {teamId, interactiveDataKey},
                timestamp: Date.now()
            });

            console.log(`[GameProvider] Reset decision for team ${teamId}, phase ${interactiveDataKey}`);
        } catch (error) {
            console.error('[GameProvider] Failed to reset team decision:', error);
            throw error;
        }
    }, [session?.id, teamDataManager]);

    // Initialize broadcast manager when session changes
    useEffect(() => {
        if (session?.id && session.id !== 'new') {
            const broadcastManager = SimpleBroadcastManager.getInstance(session.id, 'host');
            // No need to call initialize() - it's done automatically in the constructor
            return () => broadcastManager.destroy();
        }
    }, [session?.id]);

    const state: AppState = {
        gameStructure,
        currentSessionId: session?.id || null,
        current_slide_index: session?.current_slide_index ?? null,
        teams: teamDataManager.teams,
        teamDecisions: teamDataManager.teamDecisions,
        teamRoundData: teamDataManager.teamRoundData,
        isModalOpen: false,
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
