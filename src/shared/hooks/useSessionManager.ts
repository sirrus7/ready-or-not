// src/shared/hooks/useSessionManager.ts
import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {GameSession, User, GameStructure, NewGameData} from '@shared/types';
import {GameSessionManager, SessionUpdatePayload} from '@core/game/GameSessionManager';

interface SessionManagerOutput {
    session: GameSession | null;
    isLoading: boolean;
    error: string | null;
    updateSessionInDb: (updates: SessionUpdatePayload) => Promise<void>;
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
    authLoading: boolean,
    gameStructure: GameStructure | null // Still needed for new session creation
): SessionManagerOutput => {
    const [session, setSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Get the singleton instance of GameSessionManager
    const sessionManager = GameSessionManager.getInstance();

    useEffect(() => {
        console.log("useSessionManager EFFECT - Passed SessionId:", passedSessionId, "AuthLoading:", authLoading, "User:", !!user);

        if (authLoading) {
            console.log("useSessionManager: Auth is loading. Waiting.");
            setIsLoading(true);
            return;
        }

        if (!passedSessionId) {
            console.log("useSessionManager: No passedSessionId. Hook inactive for this route context.");
            setSession(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const initializeOrLoadSession = async (sessionIdToProcess: string) => {
            console.log(`useSessionManager: Initializing/Loading session: ${sessionIdToProcess}`);

            try {
                let currentSession: GameSession;

                if (sessionIdToProcess === 'new') {
                    if (!user) {
                        console.warn("useSessionManager: [NEW] User not authenticated. Cannot create session.");
                        setError("Authentication is required to create a new game.");
                        setIsLoading(false);
                        navigate('/login', {replace: true});
                        return;
                    }
                    if (!gameStructure) {
                        console.error("useSessionManager: [NEW] Game structure not available for new session.");
                        setError("Game configuration error: Game structure not loaded.");
                        setIsLoading(false);
                        return;
                    }

                    console.log("useSessionManager: [NEW] Attempting to create new session...");
                    // Construct NewGameData payload for GameSessionManager.createSession
                    // This is a minimal payload for initial creation via the game route
                    const newGameDataPayload: NewGameData = {
                        game_version: gameStructure.id as '2.0_dd' | '1.5_dd',
                        name: `New Game - ${new Date().toLocaleDateString()}`,
                        class_name: '', // Will be updated via the create-game wizard
                        grade_level: 'Freshman',
                        num_players: 0,
                        num_teams: 0,
                        teams_config: []
                    };

                    currentSession = await sessionManager.createSession(
                        newGameDataPayload,
                        user.id,
                        gameStructure
                    );

                    console.log("useSessionManager: [NEW] Session CREATED, ID:", currentSession.id, ". Navigating now...");
                    navigate(`/game/${currentSession.id}`, {replace: true});

                } else {
                    // Existing session ID (UUID)
                    console.log("useSessionManager: [EXISTING] Loading session:", sessionIdToProcess);
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

    }, [passedSessionId, user, authLoading, navigate, gameStructure, sessionManager]);

    const updateSessionInDb = useCallback(async (updates: SessionUpdatePayload) => {
        if (!session?.id || session.id === 'new') {
            console.warn("updateSessionInDb: No valid session ID to update or session is 'new'. Current session:", session);
            setError("Cannot save progress: No active game session loaded.");
            return;
        }

        console.log("useSessionManager: Updating session in DB:", session.id, updates);

        try {
            const updatedData = await sessionManager.updateSession(session.id, updates);
            console.log("useSessionManager: Session updated in DB successfully. New data:", updatedData);
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

    return {session, isLoading, error, updateSessionInDb, clearSessionError};
};
