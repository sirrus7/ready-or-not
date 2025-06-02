// src/shared/hooks/useGameSessionManagement.ts - Comprehensive session management actions
import { useCallback } from 'react';
import { GameStructure, GameSession } from '@shared/types';
import { GameSessionManager } from '@core/game/GameSessionManager';

interface GameSessionManagementReturn {
    deleteSession: (sessionId: string) => Promise<void>;
    resetSessionProgress: (sessionId: string, gameStructure: GameStructure) => Promise<GameSession>;
    completeSession: (sessionId: string) => Promise<GameSession>;
    navigateToPhaseSlide: (sessionId: string, phaseId: string, slideIndex: number) => Promise<GameSession>;
    validateSession: (sessionId: string) => Promise<boolean>;
    getSessionStatus: (sessionId: string) => Promise<{
        exists: boolean;
        isComplete: boolean;
        currentPhase: string | null;
        lastUpdated: string;
    }>;
    updateTeacherNotes: (sessionId: string, notes: Record<string, string>) => Promise<GameSession>;
}

/**
 * useGameSessionManagement is a React hook providing a comprehensive set of actions
 * for managing game sessions. It's suitable for components like the Dashboard where
 * a teacher interacts with multiple sessions or performs high-level session operations.
 * It uses the GameSessionManager singleton for data persistence.
 */
export const useGameSessionManagement = (): GameSessionManagementReturn => {
    const sessionManager = GameSessionManager.getInstance();

    const deleteSession = useCallback(async (sessionId: string) => {
        console.log('[useGameSessionManagement] Deleting session:', sessionId);
        await sessionManager.deleteSession(sessionId);
    }, [sessionManager]);

    const resetSessionProgress = useCallback(async (sessionId: string, gameStructure: GameStructure) => {
        console.log('[useGameSessionManagement] Resetting session progress:', sessionId);
        return await sessionManager.resetSessionProgress(sessionId, gameStructure);
    }, [sessionManager]);

    const completeSession = useCallback(async (sessionId: string) => {
        console.log('[useGameSessionManagement] Completing session:', sessionId);
        return await sessionManager.completeSession(sessionId);
    }, [sessionManager]);

    const navigateToPhaseSlide = useCallback(async (
        sessionId: string,
        phaseId: string,
        slideIndex: number
    ) => {
        console.log('[useGameSessionManagement] Navigating to phase/slide:', sessionId, phaseId, slideIndex);
        return await sessionManager.navigateToPhaseSlide(sessionId, phaseId, slideIndex);
    }, [sessionManager]);

    const validateSession = useCallback(async (sessionId: string) => {
        return sessionManager.validateSession(sessionId);
    }, [sessionManager]);

    const getSessionStatus = useCallback(async (sessionId: string) => {
        return sessionManager.getSessionStatus(sessionId);
    }, [sessionManager]);

    const updateTeacherNotes = useCallback(async (sessionId: string, notes: Record<string, string>) => {
        return await sessionManager.updateTeacherNotes(sessionId, notes);
    }, [sessionManager]);

    return {
        deleteSession,
        resetSessionProgress,
        completeSession,
        navigateToPhaseSlide,
        validateSession,
        getSessionStatus,
        updateTeacherNotes,
    };
};
