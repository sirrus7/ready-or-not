// src/context/AppContext.tsx - Refactored with extracted hooks and utils
import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AppState,
    GamePhaseNode,
    GameStructure,
    Slide,
    Team,
    TeamDecision,
    TeamRoundData,
} from '../types';
import { readyOrNotGame_2_0_DD } from '../data/gameStructure';
import { useSupabaseMutation } from '../hooks/supabase';
import { useAuth } from './AuthContext';
import { useSessionManager } from '../hooks/useSessionManager';
import { useGameController } from '../hooks/useGameController';
import { useTeamDataManager } from '../hooks/useTeamDataManager';
import { useDecisionPhaseManager } from '../hooks/useDecisionPhaseManager';
import { useGameProcessing } from '../hooks/useGameProcessing';
import { useBroadcastIntegration } from '../hooks/useBroadcastIntegration';

interface AppContextProps {
    // Core state
    state: AppState;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    allPhasesInOrder: GamePhaseNode[];

    // Navigation
    selectPhase: (phaseId: string) => Promise<void>;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;

    // Host features
    updateHostNotesForCurrentSlide: (notes: string) => void;
    clearHostAlert: () => Promise<void>;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;

    // Session management
    isLoadingSession: boolean;
    sessionError: string | null;
    clearSessionError: () => void;

    // Team data
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    isLoadingTeams: boolean;
    fetchTeamsForSession: () => Promise<void>;
    resetTeamDecisionForPhase: (teamId: string, phaseId: string) => Promise<void>;

    // Game processing
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3, currentPhaseId: string | null) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => void;
    isLoadingProcessingDecisions: boolean;

    // Decision phase controls
    activateDecisionPhase: (durationSeconds?: number) => void;
    deactivateDecisionPhase: () => void;
    isDecisionPhaseActive: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};

interface AppProviderProps {
    children: React.ReactNode;
    passedSessionId?: string | null;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, passedSessionId }) => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD as GameStructure, []);

    // Session management
    const {
        session: currentDbSession,
        isLoading: isLoadingSession,
        error: sessionError,
        updateSessionInDb,
        clearSessionError
    } = useSessionManager(passedSessionId, user, authLoading, gameStructureInstance);

    // Team data management
    const {
        teams,
        teamDecisions,
        teamRoundData,
        isLoadingTeams,
        fetchTeamsForSession: fetchTeamsFromHook,
        fetchTeamDecisionsForSession: fetchTeamDecisionsFromHook,
        fetchTeamRoundDataForSession: fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly,
        resetTeamDecisionInDb,
    } = useTeamDataManager(currentDbSession?.id || null);

    // All phases for navigation
    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        return gameStructureInstance?.allPhases || [];
    }, [gameStructureInstance]);

    // Game controller
    const gameController = useGameController(
        currentDbSession,
        gameStructureInstance,
        updateSessionInDb,
        (phaseId) => gameProcessing.processChoicePhaseDecisions(phaseId)
    );

    // Decision phase management
    const {
        isDecisionPhaseActive,
        decisionPhaseTimerEndTime,
        activateDecisionPhase,
        deactivateDecisionPhase
    } = useDecisionPhaseManager(gameController.currentPhaseNode, gameController.currentSlideData);

    // Game processing (investments, KPIs, etc.)
    const gameProcessing = useGameProcessing({
        currentDbSession,
        gameStructure: gameStructureInstance,
        teams,
        teamDecisions,
        teamRoundData,
        allPhasesInOrder,
        updateSessionInDb,
        fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly
    });

    // Broadcast integration for student devices
    useBroadcastIntegration({
        sessionId: currentDbSession?.id || null,
        currentPhaseNode: gameController.currentPhaseNode,
        currentSlideData: gameController.currentSlideData,
        isDecisionPhaseActive,
        decisionPhaseTimerEndTime
    });

    // Enhanced team decision reset
    const {
        execute: resetTeamDecisionExecute,
        isLoading: isResettingDecision,
        error: decisionResetError
    } = useSupabaseMutation(
        async (data: { teamId: string; phaseId: string }) => {
            if (!currentDbSession?.id || currentDbSession.id === 'new') {
                throw new Error("Invalid session for decision reset");
            }
            return resetTeamDecisionInDb(currentDbSession.id, data.teamId, data.phaseId);
        },
        {
            onSuccess: (_, data) => {
                console.log(`[AppContext] Successfully reset decision for team ${data.teamId}, phase ${data.phaseId}`);
            },
            onError: (error, data) => {
                console.error(`[AppContext] Failed to reset decision for team ${data?.teamId}:`, error);
            }
        }
    );

    // Enhanced nextSlide with processing
    const nextSlideWithProcessing = useCallback(async () => {
        const currentPhase = gameController.currentPhaseNode;
        const currentSlide = gameController.currentSlideData;

        if (currentPhase && currentSlide &&
            (gameController.currentSlideIdInPhase === currentPhase.slide_ids.length - 1)) {

            if (currentPhase.phase_type === 'payoff' && currentPhase.round_number > 0) {
                await gameProcessing.processInvestmentPayoffs(
                    currentPhase.round_number as 1 | 2 | 3,
                    currentPhase.id
                );
            } else if (currentPhase.phase_type === 'kpi' && currentPhase.round_number > 0) {
                await gameProcessing.calculateAndFinalizeRoundKPIs(currentPhase.round_number as 1 | 2 | 3);
            }
        }

        await gameController.nextSlide();
    }, [gameController, gameProcessing]);

    // Wrapper functions
    const fetchWrapperTeams = useCallback(async () => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            await fetchTeamsFromHook(currentDbSession.id);
        }
    }, [currentDbSession?.id, fetchTeamsFromHook]);

    const resetWrapperTeamDecision = useCallback(async (teamId: string, phaseId: string) => {
        await resetTeamDecisionExecute({ teamId, phaseId });
    }, [resetTeamDecisionExecute]);

    // Combined app state
    const combinedAppState: AppState = useMemo(() => ({
        currentSessionId: currentDbSession?.id || null,
        gameStructure: gameStructureInstance,
        currentPhaseId: gameController.currentPhaseNode?.id || null,
        currentSlideIdInPhase: currentDbSession?.current_slide_id_in_phase ??
            (gameController.currentPhaseNode === gameStructureInstance?.welcome_phases[0] ? 0 : null),
        hostNotes: gameController.teacherNotes,
        isPlaying: false, // Removed - no longer managed here
        teams: teams,
        teamDecisions: teamDecisions,
        teamRoundData: teamRoundData,
        isPlayerWindowOpen: false, // Moved to local component state
        isLoading: isLoadingSession || authLoading || isLoadingTeams ||
            gameProcessing.isLoadingProcessingDecisions || isResettingDecision ||
            !gameController.currentPhaseNode,
        error: sessionError || decisionResetError,
        currentHostAlert: gameController.currentHostAlert,
    }), [
        currentDbSession, gameStructureInstance, gameController, teams, teamDecisions, teamRoundData,
        isLoadingSession, authLoading, isLoadingTeams, gameProcessing.isLoadingProcessingDecisions,
        isResettingDecision, sessionError, decisionResetError
    ]);

    // Load team data when session changes
    useEffect(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new' && !isLoadingSession && !authLoading) {
            fetchWrapperTeams();
            fetchTeamDecisionsFromHook(currentDbSession.id);
            fetchTeamRoundDataFromHook(currentDbSession.id);
        }
    }, [currentDbSession?.id, isLoadingSession, authLoading, fetchWrapperTeams,
        fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook]);

    const contextValue: AppContextProps = useMemo(() => ({
        state: combinedAppState,
        currentPhaseNode: gameController.currentPhaseNode,
        currentSlideData: gameController.currentSlideData,
        allPhasesInOrder,
        selectPhase: gameController.selectPhase,
        updateHostNotesForCurrentSlide: gameController.updateHostNotesForCurrentSlide,
        nextSlide: nextSlideWithProcessing,
        previousSlide: gameController.previousSlide,
        clearHostAlert: gameController.clearHostAlert,
        setCurrentHostAlertState: gameController.setCurrentHostAlertState,
        isLoadingSession,
        sessionError,
        clearSessionError,
        teams,
        teamDecisions,
        teamRoundData,
        isLoadingTeams,
        fetchTeamsForSession: fetchWrapperTeams,
        resetTeamDecisionForPhase: resetWrapperTeamDecision,
        processInvestmentPayoffs: gameProcessing.processInvestmentPayoffs,
        calculateAndFinalizeRoundKPIs: gameProcessing.calculateAndFinalizeRoundKPIs,
        resetGameProgress: gameProcessing.resetGameProgress,
        isLoadingProcessingDecisions: gameProcessing.isLoadingProcessingDecisions,
        activateDecisionPhase,
        deactivateDecisionPhase,
        isDecisionPhaseActive,
    }), [
        combinedAppState, gameController, allPhasesInOrder, nextSlideWithProcessing, isLoadingSession,
        sessionError, clearSessionError, teams, teamDecisions, teamRoundData, isLoadingTeams,
        fetchWrapperTeams, resetWrapperTeamDecision, gameProcessing, activateDecisionPhase,
        deactivateDecisionPhase, isDecisionPhaseActive
    ]);

    // Loading state
    if (contextValue.state.isLoading && (!passedSessionId || passedSessionId === 'new' ||
        !currentDbSession?.id || !gameController.currentPhaseNode)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="ml-4 text-lg font-semibold text-gray-700">
                    {authLoading ? "Authenticating..." :
                        (passedSessionId === 'new' && !contextValue.state.error) ? "Creating New Session..." :
                            !gameController.currentPhaseNode ? "Loading Game Controller..." :
                                "Initializing Simulator..."}
                </p>
            </div>
        );
    }

    // Error state
    if (contextValue.state.error && (passedSessionId === 'new' ||
        (contextValue.state.currentSessionId && !gameController.currentPhaseNode &&
            contextValue.state.currentSessionId !== 'new'))) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                    <h2 className="text-2xl font-bold text-red-700 mb-2">Initialization Error</h2>
                    <p className="text-gray-600 mb-6">{contextValue.state.error}</p>
                    <button
                        onClick={() => {
                            clearSessionError();
                            navigate('/dashboard', { replace: true });
                        }}
                        className="bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};
