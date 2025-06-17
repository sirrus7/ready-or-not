// src/app/providers/GameProvider.tsx
// CORRECTED VERSION - Fixed all imports and property names

import React, {createContext, useContext, useCallback, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {useGameController} from '@core/game/useGameController';
import {useGameProcessing} from '@core/game/useGameProcessing';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {useSessionManager} from '@shared/hooks/useSessionManager'; // CORRECTED: Use useSessionManager instead
import {useAuth} from './AuthProvider'; // ADDED: Need auth for useSessionManager
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';
import {
    AppState,
    GameStructure,
    Slide,
} from '@shared/types';

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
    const {user, loading: authLoading} = useAuth(); // CORRECTED: Get auth data
    const gameStructure: GameStructure = readyOrNotGame_2_0_DD;

    // CORRECTED: Use useSessionManager with proper parameters
    const {session, updateSessionInDb} = useSessionManager(sessionId, user, authLoading, gameStructure);

    // Initialize team data management
    const teamDataManager = useTeamDataManager(session?.id || null);
    const {teams, teamDecisions, teamRoundData} = teamDataManager;

    // CORRECTED: Ensure decision history refresh is passed to game processing
    const gameProcessing = useGameProcessing({
        currentDbSession: session,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        updateSessionInDb,
        fetchTeamRoundDataFromHook: teamDataManager.fetchTeamRoundDataForSession,
        fetchTeamDecisionsFromHook: teamDataManager.fetchTeamDecisionsForSession, // CRITICAL: This was missing
        setTeamRoundDataDirectly: teamDataManager.setTeamRoundDataDirectly, // CORRECTED: Use proper property name
    });

    // Initialize game controller with both processing functions
    const gameController = useGameController(
        session,
        gameStructure,
        gameProcessing.processInteractiveSlide,
        gameProcessing.processConsequenceSlide
    );

    // ENHANCED: Fetch teams data with decision refresh
    const fetchTeamsForSession = async () => {
        if (session?.id && session.id !== 'new') {
            console.log('[GameProvider] Refreshing all team data...');
            await Promise.all([
                teamDataManager.fetchTeamsForSession(session.id),
                teamDataManager.fetchTeamDecisionsForSession(session.id),
                teamDataManager.fetchTeamRoundDataForSession(session.id)
            ]);
            console.log('[GameProvider] Team data refresh complete');
        }
    };

    // ENHANCED: Reset team decision with proper broadcast
    const resetTeamDecision = useCallback(async (teamId: string, interactiveDataKey: string) => {
        if (!session?.id) {
            console.error('Cannot reset decision - no active session');
            return;
        }

        try {
            console.log(`[GameProvider] Resetting decision for team ${teamId}, phase ${interactiveDataKey}`);

            // Delete the team's decision from the database
            await teamDataManager.resetTeamDecisionInDb(session.id, teamId, interactiveDataKey);

            // CRITICAL: Force refresh of decision history after reset
            await teamDataManager.fetchTeamDecisionsForSession(session.id);

            // Send broadcast command to team to refresh their UI
            const broadcastManager = SimpleBroadcastManager.getInstance(session.id, 'host');
            broadcastManager.sendCommand('decision_reset', {teamId, interactiveDataKey});

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

    // ENHANCED: Auto-refresh data when slide changes to consequence slides
    useEffect(() => {
        if (gameController.currentSlideData?.type === 'consequence_reveal' && session?.id) {
            console.log('[GameProvider] Consequence slide detected, scheduling data refresh');
            // Small delay to ensure processing is complete
            setTimeout(async () => {
                await fetchTeamsForSession();
            }, 1500);
        }
    }, [gameController.currentSlideData?.type, gameController.currentSlideData?.id, session?.id]);

    // CORRECTED: Build AppState with proper property names (excluding allTeamsSubmitted)
    const state: AppState = {
        gameStructure,
        currentSessionId: session?.id || null,
        current_slide_index: session?.current_slide_index ?? null,
        hostNotes: gameController.teacherNotes, // CORRECTED: Use hostNotes instead of teacher_notes
        isPlaying: session?.is_playing ?? false, // ADDED: Missing property
        teams,
        teamDecisions,
        teamRoundData,
        isPlayerWindowOpen: false, // ADDED: Legacy field required by AppState
        isLoading: !session && !!sessionId,
        error: null,
        currentHostAlert: gameController.currentHostAlert,
    };

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
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};
