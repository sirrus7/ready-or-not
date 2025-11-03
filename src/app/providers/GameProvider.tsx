// src/app/providers/GameProvider.tsx
// UPDATED: Now provides permanent adjustments globally from centralized system

import React, {createContext, useContext, useCallback, useMemo, useRef} from 'react';
import {useParams} from 'react-router-dom';
import {useGameController} from '@core/game/useGameController';
import {useGameProcessing} from '@core/game/useGameProcessing';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {useSessionManager} from '@shared/hooks/useSessionManager';
import {useAuth} from './AuthProvider';
import {
    AppState,
    GameStructure,
    Slide,
    PermanentKpiAdjustment, // ADDED: For centralized adjustments
    GameVersion
} from '@shared/types';
import {SimpleRealtimeManager} from "@core/sync";
import {GameVersionManager} from "@core/game/GameVersionManager.ts";

/**
 * GameContextType Interface
 *
 * FIXES APPLIED:
 * - Issue #1: Added missing clearHostAlert method to interface
 * - This method is returned by useGameController but was not exposed in the context
 * - clearHostAlert handles advancing slides for "All Teams Have Submitted" alerts
 *
 * UNIFIED SYSTEM ADDED:
 * - Added permanentAdjustments and isLoadingAdjustments to context
 * - These are now available globally, same as teamRoundData
 */
export interface GameContextType {
    state: AppState;
    currentSlideData: Slide | null;
    gameVersion: GameVersion; // ADDED: Game version for version-dependent features
    nextSlide: (source?: 'manual' | 'video' | 'auto') => Promise<void>;
    previousSlide: () => Promise<void>;
    selectSlideByIndex: (index: number) => Promise<void>;
    processPayoffSlide: (payoffSlide: Slide) => Promise<void>;
    processConsequenceSlide: (consequenceSlide: Slide) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => void;
    resetGameProgress: () => void;
    resetTeamDecision: (teamId: string, interactiveDataKey: string) => Promise<void>;
    updateHostNotesForCurrentSlide: (notes: string) => void;
    setAllTeamsSubmittedCurrentInteractivePhase: (submitted: boolean) => void;
    allTeamsSubmittedCurrentInteractivePhase: boolean;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;
    clearHostAlert: () => Promise<void>; // ADDED: Missing method from interface
    permanentAdjustments: PermanentKpiAdjustment[]; // Now available globally
    isLoadingAdjustments: boolean; // Loading state for adjustments
}

const GameContext = createContext<GameContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useGameContext = (): GameContextType => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = React.memo(({children}) => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const {user, loading: authLoading} = useAuth();
    const {session, updateSessionInDb} = useSessionManager(sessionId, user, authLoading);

    // Select gameStructure based on the loaded session's game_version from database
    const gameStructure: GameStructure = useMemo(() => {
        return GameVersionManager.getGameStructure(session?.game_version);
    }, [session?.game_version]);
    const teamDataManager = useTeamDataManager(session?.id || null);
    const {
        teams,
        teamDecisions,
        teamRoundData,
        permanentAdjustments, // ADDED: Now available from centralized system
        isLoadingAdjustments  // ADDED: Loading state
    } = teamDataManager;

    const gameProcessing = useGameProcessing({
        currentDbSession: session,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        updateSessionInDb,
        fetchTeamRoundDataFromHook: teamDataManager.fetchTeamRoundDataForSession, // Now updates both KPIs and adjustments
        fetchTeamDecisionsFromHook: teamDataManager.fetchTeamDecisionsForSession,
        setTeamRoundDataDirectly: teamDataManager.setTeamRoundDataDirectly,
    });

    // Initialize game controller with both processing functions
    const gameController = useGameController(
        session,
        gameStructure,
        session?.game_version as GameVersion,
        gameProcessing.processInteractiveSlide,
        gameProcessing.processConsequenceSlide,
        gameProcessing.processPayoffSlide,
        gameProcessing.processKpiResetSlide,
    );

    const resetTeamDecision = useCallback(async (teamId: string, interactiveDataKey: string) => {
        if (!session?.id) {
            console.error('GameProvider: Cannot reset team decision - no session ID');
            return;
        }

        try {
            // 1. Reset in database (existing logic)
            await teamDataManager.resetTeamDecisionInDb(session.id, teamId, interactiveDataKey);

            // 2. NEW: Broadcast team-specific reset event
            const realtimeManager = SimpleRealtimeManager.getInstance(session.id, 'host');
            realtimeManager.sendDecisionReset(
                `Your ${interactiveDataKey} decision has been reset by the host`,
                teamId,
                interactiveDataKey
            );

        } catch (error) {
            console.error('GameProvider: Error resetting team decision:', error);
            throw error;
        }
    }, [session?.id, teamDataManager]);

    const gameControllerRef = useRef(gameController);
    const gameProcessingRef = useRef(gameProcessing);
    const resetTeamDecisionRef = useRef(resetTeamDecision);

    gameControllerRef.current = gameController;
    gameProcessingRef.current = gameProcessing;
    resetTeamDecisionRef.current = resetTeamDecision;

    const currentSessionId = session?.id || null;
    const sessionIsPlaying = session?.is_playing ?? false;

    const appState: AppState = useMemo(() => {
        return {
            currentSessionId: currentSessionId,
            gameStructure,
            current_slide_index: gameController.currentSlideIndex,
            hostNotes: {[gameController.currentSlideIndex || 0]: gameController.hostNotes},
            isPlaying: sessionIsPlaying,
            teams: teamDataManager.teams,
            teamDecisions: teamDataManager.teamDecisions,
            teamRoundData: teamDataManager.teamRoundData,
            isLoading: teamDataManager.isLoadingTeams ||
                teamDataManager.isLoadingDecisions ||
                teamDataManager.isLoadingRoundData ||
                teamDataManager.isLoadingAdjustments,
            error: teamDataManager.error,
            currentHostAlert: gameController.currentHostAlert,
        };
    }, [
        currentSessionId,
        sessionIsPlaying,
        gameController.currentSlideIndex,
        gameController.hostNotes,
        gameController.currentHostAlert,
        teamDataManager.teams,
        teamDataManager.teamDecisions,
        teamDataManager.teamRoundData,
        teamDataManager.isLoadingTeams,
        teamDataManager.isLoadingDecisions,
        teamDataManager.isLoadingRoundData,
        teamDataManager.isLoadingAdjustments,
        teamDataManager.error,
        gameStructure,
    ]);

    const contextValue: GameContextType = useMemo(() => {
        return {
            state: appState,
            currentSlideData: gameControllerRef.current.currentSlideData,
            gameVersion: GameVersionManager.parseGameVersion(session?.game_version ?? ""),
            nextSlide: gameControllerRef.current.nextSlide,
            previousSlide: gameControllerRef.current.previousSlide,
            selectSlideByIndex: gameControllerRef.current.selectSlideByIndex,
            processPayoffSlide: gameProcessingRef.current.processPayoffSlide,
            processConsequenceSlide: gameProcessingRef.current.processConsequenceSlide,
            calculateAndFinalizeRoundKPIs: gameProcessingRef.current.calculateAndFinalizeRoundKPIs,
            resetGameProgress: gameProcessingRef.current.resetGameProgress,
            resetTeamDecision: resetTeamDecisionRef.current,
            updateHostNotesForCurrentSlide: gameControllerRef.current.updateHostNotesForCurrentSlide,
            setAllTeamsSubmittedCurrentInteractivePhase: gameControllerRef.current.setAllTeamsSubmittedCurrentInteractivePhase,
            allTeamsSubmittedCurrentInteractivePhase: gameControllerRef.current.allTeamsSubmitted,
            setCurrentHostAlertState: gameControllerRef.current.setCurrentHostAlertState,
            clearHostAlert: gameControllerRef.current.clearHostAlert,
            permanentAdjustments,
            isLoadingAdjustments
        };
    }, [
        appState,
        session?.game_version,
        permanentAdjustments,
        isLoadingAdjustments
        // Removed all function dependencies since we're using refs
    ]);

    // Use the memoized contextValue instead of creating inline
    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
}, () => {
    return true; // Always consider props equal = never re-render
});
