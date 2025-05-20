// src/context/AppContext.tsx
import React, {createContext, useContext, useState, useEffect, useCallback, useMemo} from 'react';
// REMOVED: import { useParams } from 'react-router-dom';
import {useNavigate} from 'react-router-dom'; // Keep useNavigate
import {
    AppState,
    GameStructure,
    GamePhaseNode,
    Slide,
    Team,
    TeamDecision,
    TeamRoundData,
    User,
    TeacherBroadcastPayload, GameSession,
} from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {supabase} from '../lib/supabase';
import {useAuth} from './AuthContext';

interface AppContextProps {
    state: AppState;
    currentPhase: GamePhaseNode | null;
    currentSlideData: Slide | null;
    allPhasesInOrder: GamePhaseNode[];
    selectPhase: (phaseId: string) => void;
    updateTeacherNotes: (slideId: number, notes: string) => void;
    nextSlide: () => void;
    previousSlide: () => void;
    togglePlayPauseVideo: () => void;
    resetGameProgress: () => void;
    setStudentWindowOpen: (isOpen: boolean) => void;
    fetchTeamsForSession: () => Promise<void>;
    clearTeacherAlert: () => void;
    resetTeamDecisionForPhase: (teamId: string, phaseId: string) => Promise<void>;
    processPhaseDecisions: (phaseId: string) => Promise<void>;
}

const initialAppState: AppState = {
    currentSessionId: null,
    gameStructure: null,
    currentPhaseId: null,
    currentSlideIdInPhase: null,
    teacherNotes: {},
    isPlaying: false,
    teams: [],
    teamDecisions: {},
    teamRoundData: {},
    isStudentWindowOpen: false,
    isLoading: true,
    error: null,
    currentTeacherAlert: null,
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

let broadcastChannel: BroadcastChannel | null = null;

interface AppProviderProps { // For accepting passedSessionId
    children: React.ReactNode;
    passedSessionId?: string | null;
}

export const AppProvider: React.FC<AppProviderProps> = ({children, passedSessionId}) => {
    const [state, setState] = useState<AppState>(initialAppState);
    const {user, loading: authLoading} = useAuth();
    const navigate = useNavigate();

    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructureInstance) return [];
        return [
            ...gameStructureInstance.welcome_phases,
            ...gameStructureInstance.rounds.flatMap(round => round.phases),
            ...gameStructureInstance.game_end_phases,
        ];
    }, [gameStructureInstance]);

    const currentPhase = useMemo(() => {
        return allPhasesInOrder.find(p => p.id === state.currentPhaseId) || null;
    }, [allPhasesInOrder, state.currentPhaseId]);

    const currentSlideData = useMemo(() => {
        if (!currentPhase || state.currentSlideIdInPhase === null || !gameStructureInstance) return null;
        if (currentPhase.slide_ids.length === 0 && state.currentSlideIdInPhase === 0) {
            return null;
        }
        if (state.currentSlideIdInPhase >= currentPhase.slide_ids.length) {
            return null;
        }
        const slideId = currentPhase.slide_ids[state.currentSlideIdInPhase];
        return gameStructureInstance.slides.find(s => s.id === slideId) || null;
    }, [currentPhase, state.currentSlideIdInPhase, gameStructureInstance]);

    const syncStateToDbAndBroadcast = useCallback(async (newState: AppState, oldState?: AppState) => {
        const derivedNewCurrentPhase = allPhasesInOrder.find(p => p.id === newState.currentPhaseId) || null;
        let derivedNewCurrentSlideId: number | null = null;
        let derivedNewCurrentSlide: Slide | null = null;

        if (derivedNewCurrentPhase && newState.currentSlideIdInPhase !== null && gameStructureInstance) {
            if (derivedNewCurrentPhase.slide_ids.length > 0 && newState.currentSlideIdInPhase < derivedNewCurrentPhase.slide_ids.length) {
                derivedNewCurrentSlideId = derivedNewCurrentPhase.slide_ids[newState.currentSlideIdInPhase];
                derivedNewCurrentSlide = gameStructureInstance.slides.find(s => s.id === derivedNewCurrentSlideId) || null;
            }
        }

        setState(newState);

        if (newState.currentSessionId && broadcastChannel) {
            let decisionPhaseTimerEndTime: number | undefined = undefined;
            const isStudentDecisionActive = derivedNewCurrentPhase?.is_interactive_student_phase &&
                (derivedNewCurrentSlide?.type.startsWith('interactive_') || false);

            if (isStudentDecisionActive && derivedNewCurrentSlide?.timer_duration_seconds) {
                const oldDerivedOldCurrentPhase = oldState ? allPhasesInOrder.find(p => p.id === oldState.currentPhaseId) || null : null;
                let oldDerivedOldSlideId: number | null = null;
                if (oldDerivedOldCurrentPhase && oldState && oldState.currentSlideIdInPhase !== null && oldDerivedOldCurrentPhase.slide_ids.length > oldState.currentSlideIdInPhase) {
                    oldDerivedOldSlideId = oldDerivedOldCurrentPhase.slide_ids[oldState.currentSlideIdInPhase];
                }
                if (derivedNewCurrentSlideId !== oldDerivedOldSlideId || derivedNewCurrentPhase?.id !== oldDerivedOldCurrentPhase?.id) {
                    decisionPhaseTimerEndTime = Date.now() + (derivedNewCurrentSlide.timer_duration_seconds * 1000);
                }
            }
            const payload: TeacherBroadcastPayload = {
                currentSlideId: derivedNewCurrentSlideId,
                currentPhaseId: newState.currentPhaseId,
                currentPhaseType: derivedNewCurrentPhase?.phase_type || null,
                currentRoundNumber: derivedNewCurrentPhase?.round_number || null,
                isPlayingVideo: newState.isPlaying && derivedNewCurrentSlide?.type === 'video',
                isStudentDecisionPhaseActive: isStudentDecisionActive,
                decisionOptionsKey: isStudentDecisionActive ? derivedNewCurrentSlide?.interactive_data_key : undefined,
                decisionPhaseTimerEndTime: decisionPhaseTimerEndTime,
            };
            broadcastChannel.postMessage({type: 'TEACHER_STATE_UPDATE', payload: payload});
        }

        if (newState.currentSessionId && newState.currentSessionId !== 'new') {
            try {
                const dbUpdateNeeded = !oldState || newState.currentPhaseId !== oldState.currentPhaseId ||
                    newState.currentSlideIdInPhase !== oldState.currentSlideIdInPhase || newState.isPlaying !== oldState.isPlaying ||
                    JSON.stringify(newState.teacherNotes) !== JSON.stringify(oldState.teacherNotes);
                if (dbUpdateNeeded) {
                    await supabase.from('sessions').update({
                        current_phase_id: newState.currentPhaseId,
                        current_slide_id_in_phase: newState.currentSlideIdInPhase,
                        is_playing: newState.isPlaying,
                        teacher_notes: newState.teacherNotes,
                        updated_at: new Date().toISOString(),
                    }).eq('id', newState.currentSessionId);
                }
            } catch (error) {
                console.error("Error updating session in Supabase:", error);
                setState(s => ({...s, error: "Failed to save session state."}));
            }
        }
    }, [allPhasesInOrder, gameStructureInstance]);

    useEffect(() => {
        const effectSessionId = passedSessionId; // Use the prop
        console.log("AppContext INIT EFFECT - Prop passedSessionId:", effectSessionId, "AuthLoading:", authLoading, "User:", !!user, "Current AppState SessionId:", state.currentSessionId, "Is Loading:", state.isLoading);

        if (authLoading) {
            console.log("AppContext: Auth is loading. Setting app isLoading: true.");
            if (!state.isLoading) setState(s => ({...s, isLoading: true, gameStructure: gameStructureInstance}));
            return;
        }

        if (effectSessionId === undefined || effectSessionId === null) {
            console.log("AppContext: No sessionId from prop (e.g. on /dashboard). isLoading: false.");
            if (state.currentSessionId !== null || state.isLoading) {
                setState(s => ({...initialAppState, isLoading: false, gameStructure: gameStructureInstance}));
            }
            return;
        }

        if (state.currentSessionId === effectSessionId && !state.isLoading && effectSessionId !== 'new') {
            console.log(`AppContext: Session ${effectSessionId} already processed. No re-init.`);
            return;
        }

        console.log(`AppContext: Proceeding with session initialization for: ${effectSessionId}`);
        setState(prevState => ({
            ...prevState,
            isLoading: true,
            gameStructure: gameStructureInstance,
            error: null,
            currentSessionId: effectSessionId
        }));

        const initializeActualSession = async (sessionIdToProcess: string) => {
            console.log(`AppContext: Starting initializeActualSession for: ${sessionIdToProcess}`);
            try {
                if (sessionIdToProcess === 'new') {
                    if (user) {
                        console.log("AppContext: [NEW SESSION PATH] Creating session...");
                        const initialPhase = gameStructureInstance.welcome_phases[0];
                        const {data: newSession, error: sessionError} = await supabase.from('sessions').insert({
                            name: `New Game - ${new Date().toLocaleDateString()}`,
                            teacher_id: user.id,
                            game_version: gameStructureInstance.id,
                            current_phase_id: initialPhase?.id || null,
                            current_slide_id_in_phase: initialPhase ? 0 : null,
                            is_playing: false,
                            is_complete: false,
                            teacher_notes: {},
                        }).select().single();
                        if (sessionError) {
                            console.error("AppContext: [NEW] Supabase error:", JSON.stringify(sessionError, null, 2));
                            throw sessionError;
                        }
                        if (newSession?.id) {
                            console.log("AppContext: [NEW] Session CREATED:", newSession.id, ". Navigating now...");
                            navigate(`/classroom/${newSession.id}`, {replace: true});
                            return;
                        } else {
                            console.error("AppContext: [NEW] No session data/ID returned.");
                            throw new Error("Failed to create session.");
                        }
                    } else {
                        console.warn("AppContext: [NEW] User not auth'd. Navigating to login.");
                        setState(s => ({...s, isLoading: false, error: "User auth needed."}));
                        navigate('/login', {replace: true});
                    }
                } else {
                    console.log("AppContext: [EXISTING] Loading session:", sessionIdToProcess);
                    const {
                        data: existingSession,
                        error: fetchError
                    } = await supabase.from('sessions').select('*').eq('id', sessionIdToProcess).single();
                    if (fetchError || !existingSession) {
                        console.error("AppContext: [EXISTING] Fetch error or not found.", fetchError);
                        throw fetchError || new Error(`Session ${sessionIdToProcess} not found.`);
                    }

                    console.log("AppContext: [EXISTING] Session data loaded:", existingSession.id);
                    setState(prevState => ({
                        ...prevState, currentSessionId: existingSession.id,
                        currentPhaseId: existingSession.current_phase_id,
                        currentSlideIdInPhase: existingSession.current_slide_id_in_phase ?? 0,
                        isPlaying: existingSession.is_playing, teacherNotes: existingSession.teacher_notes || {},
                        teams: [], teamDecisions: {}, teamRoundData: {},
                        isLoading: false, error: null,
                    }));

                    if (broadcastChannel && broadcastChannel.name !== `classroom-${sessionIdToProcess}`) {
                        broadcastChannel.close();
                        broadcastChannel = null;
                    }
                    if (!broadcastChannel) {
                        broadcastChannel = new BroadcastChannel(`classroom-${sessionIdToProcess}`);
                        console.log("AppContext: BroadcastChannel initialized for", sessionIdToProcess);
                    }
                    broadcastChannel.onmessage = (event) => {
                        if (event.data.type === 'STUDENT_DISPLAY_READY') {
                            console.log('Student display ready for session:', sessionIdToProcess, 'Sending current state.');
                            setState(currentState => {
                                syncStateToDbAndBroadcast(currentState, currentState);
                                return currentState;
                            });
                        }
                    };
                    setState(currentState => {
                        syncStateToDbAndBroadcast(currentState, currentState);
                        return currentState;
                    });
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to initialize session.";
                console.error("AppContext: CATCH in initializeActualSession:", err, "SessionId was:", sessionIdToProcess);
                setState(prevState => ({
                    ...prevState,
                    error: errorMessage,
                    isLoading: false,
                    currentSessionId: sessionIdToProcess
                }));
                if (sessionIdToProcess !== 'new') {
                    navigate('/dashboard', {replace: true});
                }
            }
        };

        if (effectSessionId) {
            initializeActualSession(effectSessionId);
        }

        return () => {
            if (broadcastChannel) {
                console.log("AppContext: useEffect cleanup for session:", effectSessionId, "- Closing broadcast channel.");
                broadcastChannel.close();
                broadcastChannel = null;
            }
        };
    }, [passedSessionId, user, authLoading, navigate, gameStructureInstance, syncStateToDbAndBroadcast, state.currentSessionId, state.isLoading]);

    useEffect(() => {
        if (!state.currentSessionId || state.currentSessionId === 'new' || authLoading) return;
        const sessionSub = supabase.channel(`session-${state.currentSessionId}-updates`)
            .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sessions',
                    filter: `id=eq.${state.currentSessionId}`
                },
                (payload) => {
                    const updatedSession = payload.new as GameSession;
                    if (updatedSession.current_phase_id !== state.currentPhaseId ||
                        (updatedSession.current_slide_id_in_phase ?? 0) !== (state.currentSlideIdInPhase ?? 0) ||
                        updatedSession.is_playing !== state.isPlaying ||
                        JSON.stringify(updatedSession.teacher_notes || {}) !== JSON.stringify(state.teacherNotes)) {
                        console.log('Supabase session update received from external source:', payload.new);
                        setState(prevState => ({
                            ...prevState, currentPhaseId: updatedSession.current_phase_id,
                            currentSlideIdInPhase: updatedSession.current_slide_id_in_phase ?? 0,
                            isPlaying: updatedSession.is_playing, teacherNotes: updatedSession.teacher_notes || {},
                        }));
                    }
                }
            ).subscribe();
        const decisionSub = supabase.channel(`team-decisions-${state.currentSessionId}`)
            .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'team_decisions',
                    filter: `session_id=eq.${state.currentSessionId}`
                },
                (payload) => {
                    console.log('Team decision change received:', payload);
                    const newDecision = payload.new as TeamDecision;
                    const oldDecision = payload.old as TeamDecision;
                    setState(prev => {
                        const updatedTeamDecisions = JSON.parse(JSON.stringify(prev.teamDecisions));
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            if (!updatedTeamDecisions[newDecision.team_id]) {
                                updatedTeamDecisions[newDecision.team_id] = {};
                            }
                            updatedTeamDecisions[newDecision.team_id][newDecision.phase_id] = newDecision;
                        } else if (payload.eventType === 'DELETE' && oldDecision?.team_id && oldDecision?.phase_id) {
                            if (updatedTeamDecisions[oldDecision.team_id]) {
                                delete updatedTeamDecisions[oldDecision.team_id][oldDecision.phase_id];
                                if (Object.keys(updatedTeamDecisions[oldDecision.team_id]).length === 0) {
                                    delete updatedTeamDecisions[oldDecision.team_id];
                                }
                            }
                        }
                        return {...prev, teamDecisions: updatedTeamDecisions};
                    });
                }
            ).subscribe();
        return () => {
            supabase.removeChannel(sessionSub);
            supabase.removeChannel(decisionSub);
        };
    }, [state.currentSessionId, authLoading]);

    const selectPhase = (phaseId: string) => {
        const targetPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (targetPhase) {
            const oldState = {...state};
            syncStateToDbAndBroadcast({
                ...state, currentPhaseId: phaseId, currentSlideIdInPhase: 0,
                isPlaying: false, currentTeacherAlert: null,
            }, oldState);
        }
    };

    const handleTeacherAlert = (slide: Slide | null): boolean => {
        if (slide?.teacher_alert) {
            setState(prevState => ({...prevState, currentTeacherAlert: slide.teacher_alert, isPlaying: false}));
            return true;
        }
        return false;
    };

    const clearTeacherAlert = () => {
        setState(prevState => ({...prevState, currentTeacherAlert: null}));
    };

    const nextSlide = () => {
        const oldState = {...state};
        if (state.currentTeacherAlert) {
            console.warn("Alert active.");
            return;
        }
        if (currentPhase && state.currentSlideIdInPhase !== null) {
            if (handleTeacherAlert(currentSlideData)) return;

            const isLastSlideInPhase = state.currentSlideIdInPhase >= currentPhase.slide_ids.length - 1;
            if (isLastSlideInPhase) {
                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === state.currentPhaseId);
                if (currentPhaseIndex < allPhasesInOrder.length - 1) {
                    const nextPhaseNode = allPhasesInOrder[currentPhaseIndex + 1];
                    if (currentPhase.is_interactive_student_phase) {
                        console.log(`Phase ${currentPhase.id} ended. Processing decisions before moving to ${nextPhaseNode.id}`);
                        processPhaseDecisions(currentPhase.id).then(() => {
                            syncStateToDbAndBroadcast({
                                ...state,
                                currentPhaseId: nextPhaseNode.id,
                                currentSlideIdInPhase: 0,
                                isPlaying: false,
                            }, oldState);
                        }).catch(err => console.error("Error processing phase decisions:", err));
                    } else {
                        syncStateToDbAndBroadcast({
                            ...state,
                            currentPhaseId: nextPhaseNode.id,
                            currentSlideIdInPhase: 0,
                            isPlaying: false,
                        }, oldState);
                    }
                } else {
                    console.log("End of game.");
                }
            } else {
                syncStateToDbAndBroadcast({
                    ...state,
                    currentSlideIdInPhase: state.currentSlideIdInPhase + 1,
                }, oldState);
            }
        }
    };

    const previousSlide = () => {
        const oldState = {...state};
        if (state.currentTeacherAlert) return;
        if (currentPhase && state.currentSlideIdInPhase !== null) {
            if (state.currentSlideIdInPhase > 0) {
                syncStateToDbAndBroadcast({
                    ...state,
                    currentSlideIdInPhase: state.currentSlideIdInPhase - 1,
                    isPlaying: false
                }, oldState);
            } else {
                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === state.currentPhaseId);
                if (currentPhaseIndex > 0) {
                    const prevPhaseNode = allPhasesInOrder[currentPhaseIndex - 1];
                    syncStateToDbAndBroadcast({
                        ...state,
                        currentPhaseId: prevPhaseNode.id,
                        currentSlideIdInPhase: prevPhaseNode.slide_ids.length - 1,
                        isPlaying: false,
                    }, oldState);
                }
            }
        }
    };

    const togglePlayPauseVideo = () => {
        if (currentSlideData?.type === 'video') {
            const oldState = {...state};
            syncStateToDbAndBroadcast({...state, isPlaying: !state.isPlaying}, oldState);
        }
    };

    const updateTeacherNotes = (slideId: number, notes: string) => {
        const oldState = {...state};
        syncStateToDbAndBroadcast({...state, teacherNotes: {...state.teacherNotes, [slideId]: notes,},}, oldState);
    };

    const setStudentWindowOpen = (isOpen: boolean) => {
        setState(prevState => ({...prevState, isStudentWindowOpen: isOpen}));
    };

    const resetGameProgress = async () => {
        if (state.currentSessionId && state.gameStructure) {
            const confirmReset = window.confirm("Are you sure you want to reset all progress for this game session? This action cannot be undone.");
            if (confirmReset) {
                const oldState = {...state};
                const initialPhaseId = state.gameStructure.welcome_phases[0]?.id || null;
                const newState: AppState = {
                    ...initialAppState, currentSessionId: state.currentSessionId,
                    gameStructure: state.gameStructure, currentPhaseId: initialPhaseId,
                    currentSlideIdInPhase: initialPhaseId ? 0 : null, isLoading: false,
                    teams: state.teams,
                };
                try {
                    await supabase.from('team_decisions').delete().eq('session_id', state.currentSessionId);
                    await supabase.from('team_round_data').delete().eq('session_id', state.currentSessionId);
                    await supabase.from('permanent_kpi_adjustments').delete().eq('session_id', state.currentSessionId);
                    syncStateToDbAndBroadcast(newState, oldState);
                    alert("Game progress has been reset. Team data (decisions, KPIs) cleared.");
                } catch (err) {
                    console.error("Error during game reset:", err);
                    alert("Failed to fully reset game. Check console.");
                }
            }
        }
    };

    const fetchTeamsForSession = useCallback(async () => {
        if (!state.currentSessionId || state.currentSessionId === 'new') return;
        const {data, error} = await supabase.from('teams').select('*').eq('session_id', state.currentSessionId);
        if (error) {
            console.error("Error fetching teams:", error);
            setState(s => ({...s, error: "Failed to fetch teams."}));
        } else if (data) {
            setState(s => ({...s, teams: data as Team[], error: null}));
        } else {
            setState(s => ({...s, teams: [], error: null}));
        }
    }, [state.currentSessionId]);

    const resetTeamDecisionForPhase = async (teamId: string, phaseId: string) => {
        if (!state.currentSessionId) {
            throw new Error("No active session.");
        }
        try {
            const {error} = await supabase.from('team_decisions').delete()
                .eq('session_id', state.currentSessionId).eq('team_id', teamId).eq('phase_id', phaseId);
            if (error) throw error;
            console.log(`AppContext: Decision reset for team ${teamId}, phase ${phaseId} successful in DB.`);
        } catch (err) {
            console.error("Error in AppContext resetTeamDecisionForPhase (Supabase):", err);
            throw err;
        }
    };

    const processPhaseDecisions = async (phaseId: string) => {
        console.log(`TODO: Implement all game logic for processing decisions for phase: ${phaseId}`);
        alert(`Placeholder: Processing decisions for ${phaseId}. KPIs for teams would be updated.`);
        console.log("Current Team Decisions for processing:", state.teamDecisions);
    };

    useEffect(() => {
        if (state.currentSessionId && state.currentSessionId !== 'new' && !state.isLoading && !authLoading) {
            fetchTeamsForSession();
        }
    }, [state.currentSessionId, state.isLoading, authLoading, fetchTeamsForSession]);

    return (
        <AppContext.Provider
            value={{
                state, currentPhase, currentSlideData, allPhasesInOrder, selectPhase,
                updateTeacherNotes, nextSlide, previousSlide, togglePlayPauseVideo,
                resetGameProgress, setStudentWindowOpen, fetchTeamsForSession,
                clearTeacherAlert, resetTeamDecisionForPhase, processPhaseDecisions,
            }}
        >
            {state.isLoading || authLoading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    <p className="ml-4 text-lg font-semibold text-gray-700">
                        {authLoading ? "Authenticating..." :
                            (passedSessionId === 'new' && !state.error) ? "Creating New Session..." :  // Check passedSessionId for "Creating" message
                                "Initializing Simulator..."}
                    </p>
                </div>
            ) : state.error && (passedSessionId === 'new' || (state.currentSessionId && !currentPhase && state.currentSessionId !== 'new')) ?
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Initialization Error</h2>
                        <p className="text-gray-700 mb-6">{state.error || "An unknown error occurred during initialization."}</p>
                        <button
                            onClick={() => {
                                if (passedSessionId === 'new' || !state.currentSessionId) {
                                    navigate('/dashboard', {replace: true});
                                } else {
                                    navigate('/dashboard', {replace: true});
                                }
                            }}
                            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
                : (
                    children
                )}
        </AppContext.Provider>
    );
};