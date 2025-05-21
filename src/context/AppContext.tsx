// src/context/AppContext.tsx
import React, {createContext, useContext, useState, useEffect, useCallback, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    AppState, GameStructure, GamePhaseNode, Slide, Team, TeamDecision,
    TeamRoundData, User, TeacherBroadcastPayload, KpiEffect, KpiKey,
    PermanentKpiAdjustment, InvestmentPayoff, Consequence
} from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {supabase} from '../lib/supabase';
import {useAuth} from './AuthContext';
import {useSessionManager} from '../hooks/useSessionManager';
import {useGameController} from '../hooks/useGameController';
import {useTeamDataManager} from '../hooks/useTeamDataManager';

interface AppContextProps {
    state: AppState;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    allPhasesInOrder: GamePhaseNode[];
    selectPhase: (phaseId: string) => void;
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    nextSlide: () => Promise<void>;
    previousSlide: () => void;
    togglePlayPauseVideo: () => void;
    clearTeacherAlert: () => void;
    isLoadingSession: boolean;
    sessionError: string | null;
    clearSessionError: () => void;
    isStudentWindowOpen: boolean;
    setStudentWindowOpen: (isOpen: boolean) => void;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    isLoadingTeams: boolean;
    isLoadingProcessingDecisions: boolean;
    fetchTeamsForSession: () => Promise<void>;
    fetchTeamRoundDataForSession: (sessionId: string) => Promise<void>;
    resetTeamDecisionForPhase: (teamId: string, phaseId: string) => Promise<void>;
    // Processors are now more specific
    processChoicePhaseDecisions: (phaseId: string) => Promise<void>;
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    processDoubleDownPayoff: () => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => void;
}

const initialAppContextLocalStateDefinition: {
    isStudentWindowOpen: boolean;
    currentTeacherAlert: { title: string; message: string } | null;
    isLoadingProcessing: boolean;
    errorProcessing: string | null;
} = {
    isStudentWindowOpen: false,
    currentTeacherAlert: null,
    isLoadingProcessing: false,
    errorProcessing: null,
};

const AppContext = createContext<AppContextProps | undefined>(undefined);
export const useAppContext = () => { /* ... same ... */
};
let broadcastChannel: BroadcastChannel | null = null;

interface AppProviderProps {
    children: React.ReactNode;
    passedSessionId?: string | null;
}

export const AppProvider: React.FC<AppProviderProps> = ({children, passedSessionId}) => {
    const [localUiState, setLocalUiState] = useState(initialAppContextLocalStateDefinition);
    const {user, loading: authLoading} = useAuth();
    const navigate = useNavigate();
    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);

    const {
        session: currentDbSession, isLoading: isLoadingSession, error: sessionError,
        updateSessionInDb, clearSessionError
    } = useSessionManager(passedSessionId, user, authLoading, gameStructureInstance);

    const {
        teams, teamDecisions, teamRoundData, isLoadingTeams,
        fetchTeamsForSession: fetchTeamsFromHook,
        fetchTeamDecisionsForSession: fetchTeamDecisionsFromHook,
        fetchTeamRoundDataForSession: fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly,
        resetTeamDecisionInDb,
    } = useTeamDataManager(currentDbSession?.id || null);

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => { /* ... same ... */
    }, [gameStructureInstance]);

    const applyKpiEffects = useCallback((currentKpisInput: TeamRoundData, effects: KpiEffect[], kpiContext: string = "Effect"): TeamRoundData => { /* ... same ... */
    }, []);
    const storePermanentAdjustments = useCallback(async (teamId: string, sessionId: string, effects: KpiEffect[], phaseSourceLabel: string) => { /* ... same ... */
    }, []);

    const ensureTeamRoundData = useCallback(async (teamId: string, roundNumber: 1 | 2 | 3, sessionId: string): Promise<TeamRoundData> => {
        let kpis = teamRoundData[teamId]?.[roundNumber];
        if (kpis) {
            console.log(`ensureTeamRoundData: Found local KPI data for team ${teamId}, round ${roundNumber}.`);
            return kpis;
        }

        console.log(`ensureTeamRoundData: No local KPI data for team ${teamId}, round ${roundNumber}. Checking DB.`);
        const {
            data: existingData,
            error: fetchErr
        } = await supabase.from('team_round_data').select('*').eq('session_id', sessionId).eq('team_id', teamId).eq('round_number', roundNumber).single();
        if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
        if (existingData) {
            console.log(`ensureTeamRoundData: Fetched KPI data from DB for team ${teamId}, round ${roundNumber}.`);
            setTeamRoundDataDirectly(prev => ({
                ...prev,
                [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
            }));
            return existingData as TeamRoundData;
        }

        console.log(`ensureTeamRoundData: No data in DB for team ${teamId}, round ${roundNumber}. Initializing.`);
        let start_capacity = 5000, start_orders = 6250, start_cost = 1200000, start_asp = 1000; // Game defaults
        if (roundNumber > 1) {
            const prevRoundKey = (roundNumber - 1) as 1 | 2;
            // Try to get previous round data, first from local state, then DB if necessary
            let prevRoundData = teamRoundData[teamId]?.[prevRoundKey];
            if (!prevRoundData) {
                const {data: prevDataFromDb} = await supabase.from('team_round_data').select('*').eq('session_id', sessionId).eq('team_id', teamId).eq('round_number', prevRoundKey).single();
                prevRoundData = prevDataFromDb as TeamRoundData | null;
            }
            if (prevRoundData) {
                start_capacity = prevRoundData.current_capacity;
                start_orders = prevRoundData.current_orders;
                start_cost = prevRoundData.current_cost;
                start_asp = prevRoundData.current_asp;
            } else {
                console.warn(`ensureTeamRoundData: Cannot find prev round (${prevRoundKey}) data for team ${teamId}. Using game defaults for RD${roundNumber}.`);
            }
        }
        const {data: adjustments} = await supabase.from('permanent_kpi_adjustments').select('*').eq('session_id', sessionId).eq('team_id', teamId).eq('applies_to_round_start', roundNumber);
        (adjustments as PermanentKpiAdjustment[] || []).forEach(adj => {
            let baseValForPermAdj = 0;
            switch (adj.kpi_key as KpiKey) {
                case 'capacity':
                    baseValForPermAdj = start_capacity;
                    start_capacity += adj.is_percentage ? baseValForPermAdj * (adj.change_value / 100) : adj.change_value;
                    break;
                case 'orders':
                    baseValForPermAdj = start_orders;
                    start_orders += adj.is_percentage ? baseValForPermAdj * (adj.change_value / 100) : adj.change_value;
                    break;
                case 'cost':
                    baseValForPermAdj = start_cost;
                    start_cost += adj.is_percentage ? baseValForPermAdj * (adj.change_value / 100) : adj.change_value;
                    break;
                case 'asp':
                    baseValForPermAdj = start_asp;
                    start_asp += adj.is_percentage ? baseValForPermAdj * (adj.change_value / 100) : adj.change_value;
                    break;
            }
            start_capacity = Math.round(start_capacity);
            start_orders = Math.round(start_orders);
            start_cost = Math.round(start_cost);
            start_asp = Math.round(start_asp);
        });
        const newRoundDataContent: Omit<TeamRoundData, 'id' | 'created_at' | 'updated_at'> = {
            session_id: sessionId, team_id: teamId, round_number: roundNumber,
            start_capacity, current_capacity: start_capacity, start_orders, current_orders: start_orders,
            start_cost, current_cost: start_cost, start_asp, current_asp: start_asp,
            revenue: 0, net_income: 0, net_margin: 0, // Initialize calculated fields
        };
        const {
            data: insertedData,
            error: insertError
        } = await supabase.from('team_round_data').insert(newRoundDataContent).select().single();
        if (insertError || !insertedData) throw insertError || new Error("Failed to insert new team_round_data");
        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));
        return insertedData as TeamRoundData;
    }, [teamRoundData, setTeamRoundDataDirectly]);

    const processChoicePhaseDecisionsInternal = useCallback(async (phaseId: string) => {
        const currentPhaseForProcessing = allPhasesInOrder.find(p => p.id === phaseId);
        if (!currentDbSession?.id || !gameStructureInstance || !currentPhaseForProcessing || teams.length === 0 || currentPhaseForProcessing.phase_type !== 'choice') {
            console.warn("processChoicePhaseDecisions: Prerequisites not met or not a choice phase.", {
                currentDbSessionId: currentDbSession?.id,
                gameStructureInstanceExists: !!gameStructureInstance,
                currentPhaseForProcessing,
                teamsLength: teams.length
            });
            return;
        }
        console.log(`AppContext: Processing CHOICE decisions for phase: ${phaseId}, round ${currentPhaseForProcessing.round_number}`);
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        try {
            for (const team of teams) {
                const teamKpisForRound = await ensureTeamRoundData(team.id, currentPhaseForProcessing.round_number as 1 | 2 | 3, currentDbSession.id);
                const decisionForPhase = teamDecisions[team.id]?.[phaseId];
                let effectsToApply: KpiEffect[] = [];
                let narrativeDesc = currentPhaseForProcessing.label;
                const selectedOptionId = decisionForPhase?.selected_challenge_option_id || gameStructureInstance.all_challenge_options[phaseId]?.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    narrativeDesc = `${currentPhaseForProcessing.label} - Team ${team.name} chose ${selectedOptionId}`;
                    if (!decisionForPhase) narrativeDesc = `${currentPhaseForProcessing.label} - Team ${team.name} Defaulted to ${selectedOptionId}`;

                    const consequencePhaseKey = `${phaseId}-conseq`; // e.g. ch1-conseq
                    const consequence = gameStructureInstance.all_consequences[consequencePhaseKey]?.find(c => c.challenge_option_id === selectedOptionId);
                    if (consequence) {
                        console.log(`Applying consequence for ${team.name}, choice ${selectedOptionId}:`, consequence.effects);
                        effectsToApply.push(...consequence.effects);
                    } else {
                        console.warn(`No consequence found for phase ${phaseId}, option ${selectedOptionId}`);
                    }
                } else {
                    console.warn(`No decision or default found for team ${team.name} in phase ${phaseId}`);
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = applyKpiEffects(teamKpisForRound, effectsToApply, `Consequence for ${selectedOptionId}`);
                    await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply, narrativeDesc);

                    const {data: upsertedData, error: upsertError} = await supabase.from('team_round_data').upsert({
                        ...updatedKpis, id: teamKpisForRound.id // Important: pass id for upsert to update
                    }, {onConflict: 'id'}).select().single(); // Use 'id' if it's the unique PK constraint for upsert
                    if (upsertError) throw upsertError;
                    if (upsertedData) setTeamRoundDataDirectly(prev => ({
                        ...prev,
                        [team.id]: {
                            ...(prev[team.id] || {}),
                            [currentPhaseForProcessing.round_number]: upsertedData as TeamRoundData
                        }
                    }));
                }
            }
            // After processing all teams for the choice phase, we might not need to fetch all round data again immediately,
            // as individual upserts update the local state via setTeamRoundDataDirectly.
            // However, a final fetch could ensure consistency if there were partial failures.
            // if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log("AppContext: All team choice decisions for phase processed successfully.");
        } catch (err) {
            console.error("Error processing choice phase decisions:", err);
            setLocalUiState(s => ({...s, errorProcessing: "Failed to process choice decisions."}));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, fetchTeamRoundDataFromHook, allPhasesInOrder, setTeamRoundDataDirectly]);

    const processInvestmentPayoffsInternal = useCallback(async (roundNumber: 1 | 2 | 3) => {
        if (!currentDbSession?.id || !gameStructureInstance || teams.length === 0) {
            console.warn("processInvestmentPayoffs: Prerequisites not met.");
            return;
        }
        console.log(`Processing INVESTMENT payoffs for round: ${roundNumber}`);
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        const payoffPhaseKey = `rd${roundNumber}-payoff`;
        const allPayoffsForRound = gameStructureInstance.all_investment_payoffs[payoffPhaseKey] || [];
        if (allPayoffsForRound.length === 0) {
            console.warn(`No payoffs defined for ${payoffPhaseKey}`);
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
            return;
        }

        try {
            for (const team of teams) {
                const teamKpisForRound = await ensureTeamRoundData(team.id, roundNumber, currentDbSession.id);
                const investPhaseId = `rd${roundNumber}-invest`;
                const teamInvestments = teamDecisions[team.id]?.[investPhaseId]?.selected_investment_ids || [];
                let effectsToApply: KpiEffect[] = [];

                teamInvestments.forEach(investId => {
                    const payoff = allPayoffsForRound.find(p => p.investment_option_id === investId);
                    if (payoff) effectsToApply.push(...payoff.effects);
                });

                if (effectsToApply.length > 0) {
                    const updatedKpis = applyKpiEffects(teamKpisForRound, effectsToApply, `RD${roundNumber} Investment Payoff`);
                    await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply, `RD${roundNumber} Investment Payoff`);
                    const {
                        data: upsertedData,
                        error: upsertError
                    } = await supabase.from('team_round_data').upsert({
                        ...updatedKpis,
                        id: teamKpisForRound.id
                    }, {onConflict: 'id'}).select().single();
                    if (upsertError) throw upsertError;
                    if (upsertedData) setTeamRoundDataDirectly(prev => ({
                        ...prev,
                        [team.id]: {...(prev[team.id] || {}), [roundNumber]: upsertedData as TeamRoundData}
                    }));
                }
            }
            console.log("AppContext: All investment payoffs for round processed successfully.");
        } catch (err) {
            console.error("Error processing investment payoffs:", err);
            setLocalUiState(s => ({...s, errorProcessing: "Failed to process investment payoffs."}));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, setTeamRoundDataDirectly]);

    const processDoubleDownPayoffInternal = useCallback(async () => {
        console.log("TODO: Implement processDoubleDownPayoff");
        setLocalUiState(s => ({...s, isLoadingProcessing: false}));
    }, []);
    const calculateAndFinalizeRoundKPIsInternal = useCallback(async (roundNumber: 1 | 2 | 3) => {
        console.log(`TODO: Implement calculateAndFinalizeRoundKPIs for round ${roundNumber}`);
        setLocalUiState(s => ({...s, isLoadingProcessing: false}));
    }, []);

    const {
        currentPhaseNode, currentSlideData, teacherNotes, isPlayingVideo, currentTeacherAlert,
        selectPhase, nextSlideRaw, previousSlideRaw, togglePlayPauseVideo,
        updateTeacherNotesForCurrentSlide, clearTeacherAlert,
    } = useGameController(currentDbSession, gameStructureInstance, updateSessionInDb, processChoicePhaseDecisionsInternal); // Pass choice processor

    const nextSlide = useCallback(async () => {
        if (localUiState.currentTeacherAlert) {
            console.warn("Alert active.");
            return;
        } // Use localUiState for alert
        const phaseToEnd = currentPhaseNode; // Capture before potential async ops change it
        const slideIsLast = currentSlideData && phaseToEnd ? (currentDbSession?.current_slide_id_in_phase ?? 0) >= phaseToEnd.slide_ids.length - 1 : false;

        if (slideIsLast && phaseToEnd) {
            setLocalUiState(s => ({...s, isLoadingProcessing: true}));
            try {
                if (phaseToEnd.phase_type === 'choice') {
                    // Already processed by useGameController's processPhaseDecisionsFunction if it's the last slide of choice phase
                    // Or if we want to ensure it's called here: await processChoicePhaseDecisionsInternal(phaseToEnd.id);
                } else if (phaseToEnd.phase_type === 'payoff' && phaseToEnd.round_number > 0) {
                    if (phaseToEnd.id.includes('rd3') && phaseToEnd.id.includes('dd')) { // Specific check for DD payoff phase
                        await processDoubleDownPayoffInternal();
                    } else {
                        await processInvestmentPayoffsInternal(phaseToEnd.round_number as 1 | 2 | 3);
                    }
                } else if (phaseToEnd.phase_type === 'kpi' && phaseToEnd.round_number > 0) {
                    await calculateAndFinalizeRoundKPIsInternal(phaseToEnd.round_number as 1 | 2 | 3);
                }
            } catch (e) {
                console.error("Error in nextSlide processing logic:", e); /* set error state */
            } finally {
                setLocalUiState(s => ({...s, isLoadingProcessing: false}));
            }
        }
        await nextSlideRaw(); // This will call the game controller's next slide logic
    }, [localUiState.currentTeacherAlert, currentPhaseNode, currentSlideData, currentDbSession, nextSlideRaw, processChoicePhaseDecisionsInternal, processInvestmentPayoffsInternal, processDoubleDownPayoffInternal, calculateAndFinalizeRoundKPIsInternal]);

    const previousSlide = useCallback(async () => {
        await previousSlideRaw();
    }, [previousSlideRaw]);

    const syncAndBroadcastAppState = useCallback(() => { /* ... (No changes from last full version) ... */
    }, [currentDbSession, currentPhaseNode, currentSlideData, isPlayingVideo, gameStructureInstance, allPhasesInOrder]);
    useEffect(() => { /* ... BroadcastChannel init ... */
    }, [currentDbSession?.id, syncAndBroadcastAppState]);
    useEffect(() => { /* ... Broadcast on game controller state changes ... */
    }, [currentPhaseNode, currentSlideData, isPlayingVideo, syncAndBroadcastAppState, currentDbSession]);

    const fetchWrapperTeams = useCallback(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') fetchTeamsFromHook(currentDbSession.id);
    }, [currentDbSession?.id, fetchTeamsFromHook]);
    const resetWrapperTeamDecision = useCallback(async (teamId: string, phaseId: string) => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') await resetTeamDecisionInDb(currentDbSession.id, teamId, phaseId);
    }, [currentDbSession?.id, resetTeamDecisionInDb]);

    useEffect(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new' && !isLoadingSession && !authLoading) {
            fetchWrapperTeams();
            fetchTeamDecisionsFromHook(currentDbSession.id);
            fetchTeamRoundDataFromHook(currentDbSession.id);
        }
    }, [currentDbSession?.id, isLoadingSession, authLoading, fetchWrapperTeams, fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook]);

    const combinedAppState: AppState = useMemo(() => ({
        currentSessionId: currentDbSession?.id || null,
        gameStructure: gameStructureInstance,
        currentPhaseId: currentPhaseNode?.id || null,
        currentSlideIdInPhase: currentDbSession?.current_slide_id_in_phase ?? (currentPhaseNode === gameStructureInstance?.welcome_phases[0] ? 0 : null),
        teacherNotes: teacherNotes, isPlaying: isPlayingVideo,
        teams: teams, teamDecisions: teamDecisions, teamRoundData: teamRoundData,
        isStudentWindowOpen: localUiState.isStudentWindowOpen,
        isLoading: isLoadingSession || authLoading || isLoadingTeams || localUiState.isLoadingProcessing,
        error: sessionError || localUiState.errorProcessing,
        currentTeacherAlert: currentTeacherAlert,
    }), [
        currentDbSession, gameStructureInstance, currentPhaseNode, teacherNotes, isPlayingVideo,
        teams, teamDecisions, teamRoundData, localUiState,
        isLoadingSession, authLoading, isLoadingTeams, sessionError, currentTeacherAlert
    ]);

    const contextValue: AppContextProps = useMemo(() => ({
        state: combinedAppState, currentPhaseNode, currentSlideData, allPhasesInOrder,
        selectPhase: selectPhaseCtrl, updateTeacherNotesForCurrentSlide,
        nextSlide, previousSlide, // Use wrapped next/prev
        togglePlayPauseVideo: togglePlayPauseVideoCtrl, clearTeacherAlert: clearTeacherAlertCtrl,
        isLoadingSession, sessionError, clearSessionError,
        isStudentWindowOpen: localUiState.isStudentWindowOpen,
        setStudentWindowOpen: (isOpen: boolean) => setLocalUiState(s => ({...s, isStudentWindowOpen: isOpen})),
        teams, teamDecisions, teamRoundData, isLoadingTeams,
        fetchTeamsForSession: fetchWrapperTeams,
        fetchTeamRoundDataForSession: (sessionId: string) => fetchTeamRoundDataFromHook(sessionId),
        resetTeamDecisionForPhase: resetWrapperTeamDecision,
        processChoicePhaseDecisions: processChoicePhaseDecisionsInternal,
        processInvestmentPayoffs: processInvestmentPayoffsInternal,
        processDoubleDownPayoff: processDoubleDownPayoffInternal,
        calculateAndFinalizeRoundKPIs: calculateAndFinalizeRoundKPIsInternal,
        resetGameProgress: async () => { /* ... (Full reset logic from previous complete version) ... */
        },
    }), [
        combinedAppState, currentPhaseNode, currentSlideData, allPhasesInOrder,
        selectPhaseCtrl, updateTeacherNotesForCurrentSlide, nextSlide, previousSlide, togglePlayPauseVideoCtrl,
        clearTeacherAlertCtrl, isLoadingSession, sessionError, clearSessionError, localUiState.isStudentWindowOpen,
        teams, teamDecisions, teamRoundData, isLoadingTeams, fetchWrapperTeams, fetchTeamRoundDataFromHook, resetWrapperTeamDecision,
        processChoicePhaseDecisionsInternal, processInvestmentPayoffsInternal, processDoubleDownPayoffInternal, calculateAndFinalizeRoundKPIsInternal
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            {contextValue.state.isLoading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    <p className="ml-4 text-lg font-semibold text-gray-700">
                        {authLoading ? "Authenticating..." :
                            (passedSessionId === 'new' && !contextValue.state.error) ? "Creating New Session..." :
                                "Initializing Simulator..."}
                    </p>
                </div>
            ) : contextValue.state.error && (passedSessionId === 'new' || (contextValue.state.currentSessionId && !currentPhaseNode && contextValue.state.currentSessionId !== 'new')) ?
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Initialization Error</h2>
                        <p className="text-gray-700 mb-6">{contextValue.state.error || "An unknown error occurred."}</p>
                        <button onClick={() => navigate('/dashboard', {replace: true})}
                                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
                : (children)}
        </AppContext.Provider>
    );
};