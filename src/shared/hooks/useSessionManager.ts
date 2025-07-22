// src/shared/hooks/useSessionManager.ts
import {useState, useEffect, useCallback, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {GameSession, GameSessionInsert} from '@shared/types';
import {User} from '@shared/services/supabase'
import {GameSessionManager} from '@core/game/GameSessionManager';

interface SessionManagerOutput {
    session: GameSession | null;
    isLoading: boolean;
    error: string | null;
    updateSessionInDb: (updates: Partial<GameSessionInsert>) => Promise<void>;
    clearSessionError: () => void;
}

/**
 * useSessionManager is a React hook for managing the lifecycle of a single game session
 * within a component tree (e.g., HostApp for a specific session).
 * It loads/creates a session on mount and provides an update function.
 * It uses the GameSessionManager singleton for data persistence.
 */
export const useSessionManager = (
    passedSessionId: string | null | undefined,
    user: User | null,
    authLoading: boolean
): SessionManagerOutput => {
    const [session, setSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Get the singleton instance of GameSessionManager
    const sessionManager = GameSessionManager.getInstance();

    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }

        if (!passedSessionId) {
            setSession(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const initializeOrLoadSession = async (sessionIdToProcess: string) => {
            try {
                let currentSession: GameSession;

                if (sessionIdToProcess === 'new') {
                    // For new sessions, redirect to create-game wizard
                    navigate('/create-game', {replace: true});
                    setIsLoading(false);
                    return;
                } else {
                    // Load existing session from database
                    currentSession = await sessionManager.loadSession(sessionIdToProcess);
                }

                setSession(currentSession);
                setIsLoading(false);
                setError(null); // Clear error on success

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error("useSessionManager: Session initialization failed in CATCH block:", err, "SessionId was:", sessionIdToProcess);
                setError(errorMessage);
                setIsLoading(false);
                setSession(null);

                // If loading an existing session failed, redirect to dashboard
                if (sessionIdToProcess !== 'new') {
                    navigate('/dashboard', {replace: true});
                }
            }
        };

        initializeOrLoadSession(passedSessionId);

    }, [passedSessionId, user, authLoading, navigate, sessionManager]);

    const updateSessionInDb = useCallback(async (updates: Partial<GameSessionInsert>) => {
        if (!session?.id || session.id === 'new') {
            console.warn("updateSessionInDb: No valid session ID to update or session is 'new'. Current session:", session);
            setError("Cannot save progress: No active game session loaded.");
            return;
        }

        try {
            const updatedData = await sessionManager.updateSession(session.id, updates);
            setSession(updatedData);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error("useSessionManager: Error updating session:", err);
            setError(`Failed to save session progress: ${errorMessage}`);
        }
    }, [session, sessionManager]);

    const clearSessionError = useCallback(() => {
        setError(null);
    }, []);

    return useMemo(() => ({
        session,
        isLoading,
        error,
        updateSessionInDb,
        clearSessionError
    }), [session, isLoading, error, updateSessionInDb, clearSessionError]);
};
