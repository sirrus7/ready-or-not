// src/shared/hooks/useGameSessionManagement.ts - Updated session management actions
import {useCallback} from 'react';
import {GameSession} from '@shared/types';
import {GameSessionManager} from '@core/game/GameSessionManager';

interface GameSessionManagementReturn {
    deleteSession: (sessionId: string) => Promise<void>;
    completeSession: (sessionId: string) => Promise<GameSession>;
    validateSession: (sessionId: string) => Promise<boolean>;
    getSessionStatus: (sessionId: string) => Promise<{
        exists: boolean;
        isComplete: boolean;
        currentSlide: number | null;
        lastUpdated: string;
    }>;
}

/**
 * useGameSessionManagement is a React hook providing essential session management actions
 * for high-level operations like the Dashboard. This hook focuses on session lifecycle
 * management (create, delete, complete, validate).
 *
 * For functionality not included here:
 * - Real-time game navigation → use useGameController (nextSlide, previousSlide, selectSlideByIndex)
 * - Real-time host notes → use useGameController (updateHostNotesForCurrentSlide)
 * - Game progress reset → use useGameProcessing (resetGameProgress)
 */
export const useGameSessionManagement = (): GameSessionManagementReturn => {
    const sessionManager = GameSessionManager.getInstance();

    const deleteSession = useCallback(async (sessionId: string) => {
        await sessionManager.deleteSession(sessionId);
    }, [sessionManager]);

    const completeSession = useCallback(async (sessionId: string) => {
        return await sessionManager.completeSession(sessionId);
    }, [sessionManager]);

    const validateSession = useCallback(async (sessionId: string) => {
        return sessionManager.validateSession(sessionId);
    }, [sessionManager]);

    const getSessionStatus = useCallback(async (sessionId: string) => {
        const status = await sessionManager.getSessionStatus(sessionId);
        return {
            exists: status.exists,
            isComplete: status.isComplete,
            currentSlide: status.currentPhase ? parseInt(status.currentPhase) : null, // Convert to slide index
            lastUpdated: status.lastUpdated
        };
    }, [sessionManager]);

    return {
        deleteSession,
        completeSession,
        validateSession,
        getSessionStatus,
    };
};
