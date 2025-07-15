// src/app/providers/GameProvider.tsx
// UPDATED: Now provides permanent adjustments globally from centralized system

import React, {createContext, useContext, useCallback, useMemo, useRef, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {useGameController} from '@core/game/useGameController';
import {useGameProcessing} from '@core/game/useGameProcessing';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {useSessionManager} from '@shared/hooks/useSessionManager';
import {useAuth} from './AuthProvider';
import {
    AppState,
    GameStructure,
    Slide,
    PermanentKpiAdjustment // ADDED: For centralized adjustments
} from '@shared/types';
import {SimpleRealtimeManager} from "@core/sync";

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
interface GameContextType {
    state: AppState;
    currentSlideData: Slide | null;
    gameVersion: string; // ADDED: Game version for version-dependent features
    nextSlide: () => Promise<void>;
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
    console.log('🚨 [GAMEPROVIDER] Component re-rendering (WITH MEMO)');
    console.log('🚨 [GAMEPROVIDER] Children ref:', children);

    // Debug mounting vs re-rendering
    useEffect(() => {
        console.log('🏗️ [GAMEPROVIDER] COMPONENT MOUNTED');
        return () => {
            console.log('💀 [GAMEPROVIDER] COMPONENT UNMOUNTED');
        };
    }, []);

    const {sessionId} = useParams<{ sessionId: string }>();
    console.log('🔍 [DEBUG] useParams result:', sessionId);

    const {user, loading: authLoading} = useAuth();
    console.log('🔍 [DEBUG] useAuth result:', {user_id: user?.id, authLoading});

    const gameStructure: GameStructure = readyOrNotGame_2_0_DD;

    const {session, updateSessionInDb} = useSessionManager(sessionId, user, authLoading, gameStructure);
    console.log('🔍 [DEBUG] useSessionManager result:', {sessionId: session?.id});
    console.log('🔍 [DEBUG] useSessionManager refs:', {session, updateSessionInDb});

    const teamDataManager = useTeamDataManager(session?.id || null);
    console.log('🔍 [DEBUG] useTeamDataManager result:', {teamsLength: teamDataManager.teams.length});
    console.log('🔍 [DEBUG] useTeamDataManager ref:', teamDataManager);
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
    console.log('🔍 [DEBUG] gameProcessing ref:', gameProcessing);

    // Initialize game controller with both processing functions
    const gameController = useGameController(
        session,
        gameStructure,
        gameProcessing.processInteractiveSlide,
        gameProcessing.processConsequenceSlide,
        gameProcessing.processPayoffSlide,
        gameProcessing.processKpiResetSlide,
    );
    console.log('🔍 [DEBUG] gameController ref:', gameController);

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

            console.log(`[GameProvider] ✅ Reset decision for team ${teamId}: ${interactiveDataKey}`);
        } catch (error) {
            console.error('GameProvider: Error resetting team decision:', error);
            throw error;
        }
    }, [session?.id, teamDataManager]);




    const prevValues = useRef({
        currentSessionId: null as string | null,
        sessionIsPlaying: null as boolean | null,
        gameControllerSlideIndex: null as number | null,
        teamDataManagerTeamsLength: null as number | null,
    });

    // Log what changed
    useEffect(() => {
        const prev = prevValues.current;
        const current = {
            currentSessionId,
            sessionIsPlaying,
            gameControllerSlideIndex: gameController.currentSlideIndex,
            teamDataManagerTeamsLength: teamDataManager.teams.length,
        };

        Object.entries(current).forEach(([key, value]) => {
            if (prev[key as keyof typeof prev] !== value) {
                console.log(`🔍 [CHANGE] ${key} changed:`, prev[key as keyof typeof prev], '->', value);
            }
        });

        prevValues.current = current;
    });




    const gameControllerRef = useRef(gameController);
    const gameProcessingRef = useRef(gameProcessing);
    const resetTeamDecisionRef = useRef(resetTeamDecision);

    gameControllerRef.current = gameController;
    gameProcessingRef.current = gameProcessing;
    resetTeamDecisionRef.current = resetTeamDecision;

    const currentSessionId = session?.id || null;
    const sessionIsPlaying = session?.is_playing ?? false;

    const appState: AppState = useMemo(() => {
        console.log('🔍 [APPSTATE] AppState being recreated - PRIMITIVE VALUES');
        return {
            currentSessionId: currentSessionId,
            gameStructure,
            current_slide_index: gameController.currentSlideIndex,
            hostNotes: {[gameController.currentSlideIndex || 0]: gameController.hostNotes},
            isPlaying: sessionIsPlaying,
            teams: teamDataManager.teams,
            teamDecisions: teamDataManager.teamDecisions,
            teamRoundData: teamDataManager.teamRoundData,
            isPlayerWindowOpen: false,
            isLoading: teamDataManager.isLoadingTeams ||
                teamDataManager.isLoadingDecisions ||
                teamDataManager.isLoadingRoundData ||
                teamDataManager.isLoadingAdjustments,
            error: teamDataManager.error,
            currentHostAlert: gameController.currentHostAlert,
        };
    }, [
        // FIXED: Use primitive values with different variable names
        currentSessionId,
        sessionIsPlaying
    ]);

    const contextValue: GameContextType = useMemo(() => {
        console.log('🔍 [CONTEXT] Context value being recreated');
        return {
            state: appState,
            currentSlideData: gameControllerRef.current.currentSlideData,
            gameVersion: session?.game_version || '2.0',
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
    console.log('🔍 [MEMO] Custom comparison - forcing no re-renders');
    return true; // Always consider props equal = never re-render
});
