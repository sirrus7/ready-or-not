// src/app/providers/GameProvider.tsx
// FINAL FIX: Remove the problematic data refresh useEffect that causes infinite loops

import React, {createContext, useContext, useCallback, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {useGameController} from '@core/game/useGameController';
import {useGameProcessing} from '@core/game/useGameProcessing';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {useSessionManager} from '@shared/hooks/useSessionManager';
import {useAuth} from './AuthProvider';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';
import {
    AppState,
    GameStructure,
    Slide,
} from '@shared/types';

/**
 * GameContextType Interface
 *
 * FIXES APPLIED:
 * - Issue #1: Added missing clearHostAlert method to interface
 * - This method is returned by useGameController but was not exposed in the context
 * - clearHostAlert handles advancing slides for "All Teams Have Submitted" alerts
 */
interface GameContextType {
    state: AppState;
    currentSlideData: Slide | null;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    selectSlideByIndex: (index: number) => Promise<void>;
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => void;
    processConsequenceSlide: (consequenceSlide: Slide) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => void;
    resetGameProgress: () => void;
    resetTeamDecision: (teamId: string, interactiveDataKey: string) => Promise<void>;
    updateHostNotesForCurrentSlide: (notes: string) => void;
    setAllTeamsSubmittedCurrentInteractivePhase: (submitted: boolean) => void;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;
    clearHostAlert: () => Promise<void>;
    setAllTeamsAlertDismissed: (dismissed: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGameContext = (): GameContextType => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const {user, loading: authLoading} = useAuth();
    const gameStructure: GameStructure = readyOrNotGame_2_0_DD;

    const {session, updateSessionInDb} = useSessionManager(sessionId, user, authLoading, gameStructure);

    // Initialize team data management
    const teamDataManager = useTeamDataManager(session?.id || null);
    const {teams, teamDecisions, teamRoundData} = teamDataManager;

    const gameProcessing = useGameProcessing({
        currentDbSession: session,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        updateSessionInDb,
        fetchTeamRoundDataFromHook: teamDataManager.fetchTeamRoundDataForSession,
        fetchTeamDecisionsFromHook: teamDataManager.fetchTeamDecisionsForSession,
        setTeamRoundDataDirectly: teamDataManager.setTeamRoundDataDirectly,
    });

    // Initialize game controller with both processing functions
    const gameController = useGameController(
        session,
        gameStructure,
        gameProcessing.processInteractiveSlide,
        gameProcessing.processConsequenceSlide
    );

    const resetTeamDecision = useCallback(async (teamId: string, interactiveDataKey: string) => {
        if (!session?.id) {
            console.error('[GameProvider] Cannot reset decision: No active session');
            return;
        }

        try {
            console.log(`[GameProvider] Resetting decision for team ${teamId}, phase ${interactiveDataKey}`);
            await teamDataManager.resetTeamDecisionInDb(session.id, teamId, interactiveDataKey);
            console.log(`[GameProvider] Reset decision complete for team ${teamId}, phase ${interactiveDataKey}`);
        } catch (error) {
            console.error('[GameProvider] Failed to reset team decision:', error);
            throw error;
        }
    }, [session?.id, teamDataManager]);

    // Initialize broadcast manager when session changes
    useEffect(() => {
        if (session?.id && session.id !== 'new') {
            const broadcastManager = SimpleBroadcastManager.getInstance(session.id, 'host');
            console.log('[GameProvider] Initialized broadcast manager for session:', session.id);
            return () => broadcastManager.destroy();
        }
    }, [session?.id]);

    // CRITICAL FIX: REMOVED the problematic auto-refresh useEffect
    // The old code was:
    // useEffect(() => {
    //     if (gameController.currentSlideData?.type === 'consequence_reveal' && session?.id) {
    //         console.log('[GameProvider] Consequence slide detected, scheduling data refresh');
    //         setTimeout(async () => {
    //             await teamDataManager.fetchTeamsForSession(session.id);
    //         }, 1500);
    //     }
    // }, [gameController.currentSlideData?.type, gameController.currentSlideData?.id, session?.id, teamDataManager]);
    //
    // This was causing infinite loops because:
    // 1. teamDataManager changes on every render
    // 2. This triggers the useEffect repeatedly
    // 3. Each trigger causes a data fetch
    // 4. Data fetch triggers re-renders
    // 5. INFINITE LOOP
    //
    // The ConsequenceProcessor already handles its own data refreshes properly,
    // so this additional refresh is unnecessary and harmful.

    // Build AppState with proper property names
    const state: AppState = {
        gameStructure,
        currentSessionId: session?.id || null,
        current_slide_index: session?.current_slide_index ?? null,
        hostNotes: gameController.hostNotes,
        isPlaying: session?.is_playing ?? false,
        teams,
        teamDecisions,
        teamRoundData,
        isPlayerWindowOpen: false,
        isLoading: !session && !!sessionId,
        error: null,
        currentHostAlert: gameController.currentHostAlert,
    };

    /**
     * FIXED: Context value now includes clearHostAlert method
     * This resolves Issue #1 where the "Next" button wasn't working
     * because clearHostAlert wasn't exposed in the context
     */
    const contextValue: GameContextType = {
        state,
        currentSlideData: gameController.currentSlideData,
        nextSlide: gameController.nextSlide,
        previousSlide: gameController.previousSlide,
        selectSlideByIndex: gameController.selectSlideByIndex,
        processInvestmentPayoffs: gameProcessing.processInvestmentPayoffs,
        processConsequenceSlide: gameProcessing.processConsequenceSlide,
        calculateAndFinalizeRoundKPIs: gameProcessing.calculateAndFinalizeRoundKPIs,
        resetGameProgress: gameProcessing.resetGameProgress,
        resetTeamDecision,
        updateHostNotesForCurrentSlide: gameController.updateHostNotesForCurrentSlide,
        setAllTeamsSubmittedCurrentInteractivePhase: gameController.setAllTeamsSubmittedCurrentInteractivePhase,
        setCurrentHostAlertState: gameController.setCurrentHostAlertState,
        clearHostAlert: gameController.clearHostAlert,
        setAllTeamsAlertDismissed: gameController.setAllTeamsAlertDismissed,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};
