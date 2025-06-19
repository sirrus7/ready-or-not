// src/app/providers/GameProvider.tsx
// UPDATED: Now provides permanent adjustments globally from centralized system

import React, {createContext, useContext, useCallback} from 'react';
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
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;
    clearHostAlert: () => Promise<void>; // ADDED: Missing method from interface
    permanentAdjustments: PermanentKpiAdjustment[]; // Now available globally
    isLoadingAdjustments: boolean; // Loading state for adjustments
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

    // Initialize team data management - NOW INCLUDES PERMANENT ADJUSTMENTS
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
        gameProcessing.processInteractiveSlide,
        gameProcessing.processConsequenceSlide,
        gameProcessing.processPayoffSlide
    );

    const resetTeamDecision = useCallback(async (teamId: string, interactiveDataKey: string) => {
        if (!session?.id) {
            console.error('GameProvider: Cannot reset team decision - no session ID');
            return;
        }

        try {
            console.log(`GameProvider: Resetting decision for team ${teamId}, phase ${interactiveDataKey}`);
            await teamDataManager.resetTeamDecisionInDb(session.id, teamId, interactiveDataKey);
            console.log('GameProvider: Team decision reset successfully');
        } catch (error) {
            console.error('GameProvider: Error resetting team decision:', error);
            throw error;
        }
    }, [session?.id, teamDataManager]);

    // Construct the app state - FIXED: gameController returns individual properties, not a state object
    const appState: AppState = {
        currentSessionId: session?.id || null,
        gameStructure,
        current_slide_index: gameController.currentSlideIndex,
        hostNotes: {[gameController.currentSlideIndex || 0]: gameController.hostNotes}, // Convert to Record format
        isPlaying: session?.is_playing ?? false,
        teams,
        teamDecisions,
        teamRoundData,
        isPlayerWindowOpen: false,
        isLoading: teamDataManager.isLoadingTeams ||
            teamDataManager.isLoadingDecisions ||
            teamDataManager.isLoadingRoundData ||
            teamDataManager.isLoadingAdjustments, // ADDED: Include adjustment loading
        error: teamDataManager.error,
        currentHostAlert: gameController.currentHostAlert,
    };

    // Context value with all game functionality - FIXED: Use gameController properties directly
    const contextValue: GameContextType = {
        state: appState,
        currentSlideData: gameController.currentSlideData,
        nextSlide: gameController.nextSlide,
        previousSlide: gameController.previousSlide,
        selectSlideByIndex: gameController.selectSlideByIndex,
        processPayoffSlide: gameProcessing.processPayoffSlide,
        processConsequenceSlide: gameProcessing.processConsequenceSlide,
        calculateAndFinalizeRoundKPIs: gameProcessing.calculateAndFinalizeRoundKPIs,
        resetGameProgress: gameProcessing.resetGameProgress,
        resetTeamDecision,
        updateHostNotesForCurrentSlide: gameController.updateHostNotesForCurrentSlide,
        setAllTeamsSubmittedCurrentInteractivePhase: gameController.setAllTeamsSubmittedCurrentInteractivePhase,
        setCurrentHostAlertState: gameController.setCurrentHostAlertState,
        clearHostAlert: gameController.clearHostAlert, // ADDED: Missing method
        permanentAdjustments, // Now available globally
        isLoadingAdjustments   // Loading state for adjustments
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};
