// src/hooks/useSessionManager.ts
import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {GameSession, User, GameStructure} from '../types';

interface SessionManagerOutput {
    session: GameSession | null;
    isLoading: boolean;
    error: string | null;
    updateSessionInDb: (
        updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes' | 'is_complete'>>
    ) => Promise<void>;
    clearSessionError: () => void;
}

export const useSessionManager = (
    passedSessionId: string | null | undefined,
    user: User | null,
    authLoading: boolean,
    gameStructure: GameStructure | null // Pass the game structure for default phase/slide
): SessionManagerOutput => {
    const [session, setSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

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
                if (sessionIdToProcess === 'new') {
                    if (user && gameStructure) { // Ensure gameStructure is available
                        console.log("useSessionManager: [NEW] Creating new session for user:", user.id);
                        const initialPhase = gameStructure.welcome_phases[0];
                        const {data: newSessionData, error: sessionError} = await supabase
                            .from('sessions')
                            .insert({
                                name: `New Game - ${new Date().toLocaleDateString()}`,
                                teacher_id: user.id,
                                game_version: gameStructure.id,
                                current_phase_id: initialPhase?.id || null,
                                current_slide_id_in_phase: initialPhase ? 0 : null,
                                is_playing: false,
                                is_complete: false,
                                teacher_notes: {},
                            })
                            .select()
                            .single();

                        if (sessionError) {
                            console.error("useSessionManager: [NEW] Supabase error creating session:", JSON.stringify(sessionError, null, 2));
                            throw sessionError;
                        }
                        if (newSessionData?.id) {
                            console.log("useSessionManager: [NEW] Session CREATED, ID:", newSessionData.id, ". Navigating now...");
                            navigate(`/classroom/${newSessionData.id}`, {replace: true});
                            // The navigation will cause a re-render and this useEffect will run again with the new ID.
                            // isLoading will be true for that new run until the session is fetched.
                        } else {
                            console.error("useSessionManager: [NEW] New session data is null or ID is missing after insert.");
                            throw new Error("Failed to create session record or retrieve its ID.");
                        }
                    } else if (!user) {
                        console.warn("useSessionManager: [NEW] User not authenticated. Cannot create session.");
                        setError("Authentication is required to create a new game.");
                        setIsLoading(false);
                        navigate('/login', {replace: true});
                    } else { // gameStructure is null
                        console.error("useSessionManager: [NEW] Game structure not available for new session.");
                        setError("Game configuration error.");
                        setIsLoading(false);
                    }
                } else { // Existing session ID (UUID)
                    console.log("useSessionManager: [EXISTING] Loading session:", sessionIdToProcess);
                    const {data: existingSessionData, error: fetchError} = await supabase
                        .from('sessions')
                        .select('*')
                        .eq('id', sessionIdToProcess)
                        .single();

                    if (fetchError || !existingSessionData) {
                        console.error("useSessionManager: [EXISTING] Error fetching session or not found.", fetchError);
                        throw fetchError || new Error(`Session ${sessionIdToProcess} not found.`);
                    }
                    console.log("useSessionManager: [EXISTING] Session data loaded:", existingSessionData.id);
                    setSession(existingSessionData as GameSession);
                    setIsLoading(false);
                    setError(null);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to initialize/load session.";
                console.error("useSessionManager: CATCH block:", err, "SessionId was:", sessionIdToProcess);
                setError(errorMessage);
                setIsLoading(false);
                setSession(null);
                if (sessionIdToProcess !== 'new') {
                    navigate('/dashboard', {replace: true});
                }
            }
        };

        initializeOrLoadSession(passedSessionId);

    }, [passedSessionId, user, authLoading, navigate, gameStructure]);

    const updateSessionInDb = useCallback(async (
        updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes' | 'is_complete'>>
    ) => {
        if (!session?.id || session.id === 'new') {
            console.warn("updateSessionInDb: No valid session ID to update or session is 'new'. Current session:", session);
            setError("Cannot save progress: No active game session loaded.");
            return;
        }
        console.log("useSessionManager: Updating session in DB:", session.id, updates);
        try {
            const {data: updatedData, error: updateError} = await supabase
                .from('sessions')
                .update({...updates, updated_at: new Date().toISOString()})
                .eq('id', session.id)
                .select()
                .single(); // Get the updated row back

            if (updateError) {
                console.error("useSessionManager: Error updating session in DB:", updateError);
                setError("Failed to save session progress to database.");
                throw updateError;
            }
            if (updatedData) {
                console.log("useSessionManager: Session updated in DB successfully. New data:", updatedData);
                setSession(updatedData as GameSession); // Update local session state with confirmed DB state
            }
        } catch (err) {
            // Error already logged, setError called if needed
        }
    }, [session]);

    const clearSessionError = useCallback(() => {
        setError(null);
    }, []);

    return {session, isLoading, error, updateSessionInDb, clearSessionError};
};