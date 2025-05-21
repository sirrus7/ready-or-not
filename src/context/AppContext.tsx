// src/context/AppContext.tsx
import React, {createContext, useContext, useState, useEffect, useCallback, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    AppState, GamePhaseNode, Slide, Team, TeamDecision,
    TeamRoundData, TeacherBroadcastPayload, KpiEffect, KpiKey,
    PermanentKpiAdjustment
} from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {supabase} from '../lib/supabase';
import {useAuth} from './AuthContext';
import {useSessionManager} from '../hooks/useSessionManager';
import {useGameController} from '../hooks/useGameController';
import {useTeamDataManager} from '../hooks/useTeamDataManager';
import {ServerCrash} from 'lucide-react';

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
    setVideoPlaybackStateFromPreview: (playing: boolean, time: number, triggerSeek?: boolean) => void;
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
    processChoicePhaseDecisions: (phaseId: string) => Promise<void>;
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    processDoubleDownPayoff: () => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => void;
    isPlayingVideo: boolean;
    videoCurrentTime: number;
    triggerVideoSeek: boolean;
}

const initialAppContextLocalStateDefinition: {
    isStudentWindowOpen: boolean;
    isLoadingProcessing: boolean;
    errorProcessing: string | null;
} = {
    isStudentWindowOpen: false,
    isLoadingProcessing: false,
    errorProcessing: null,
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
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
        fetchTeamDecisionsForSession: fetchTeamDecisionsFromHook, // Added import from hook
        fetchTeamRoundDataForSession: fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly,
        resetTeamDecisionInDb,
    } = useTeamDataManager(currentDbSession?.id || null);

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructureInstance) return [];
        return [
            ...gameStructureInstance.welcome_phases,
            ...gameStructureInstance.rounds.flatMap(round => round.phases),
            ...gameStructureInstance.game_end_phases,
        ];
    }, [gameStructureInstance]);

    const applyKpiEffects = useCallback((currentKpisInput: TeamRoundData, effects: KpiEffect[], kpiContext: string = "Effect"): TeamRoundData => {
        const updatedKpis = {...currentKpisInput};
        console.log(`Applying ${kpiContext} to KPIs. Starting KPIs for team ${updatedKpis.team_id}, round ${updatedKpis.round_number}:`, JSON.parse(JSON.stringify(updatedKpis)));
        console.log("Effects to apply:", effects);
        effects.forEach(effect => {
            if (effect.timing === 'immediate') {
                const currentKpiName = `current_${effect.kpi}` as keyof TeamRoundData;
                const baseValue = (updatedKpis[currentKpiName] as number | undefined) ?? (updatedKpis[`start_${effect.kpi}` as keyof TeamRoundData] as number | undefined) ?? 0;
                let change = effect.change_value;
                if (effect.is_percentage_change && baseValue !== undefined) {
                    change = baseValue * (effect.change_value / 100);
                }
                (updatedKpis[currentKpiName] as number) = Math.round(baseValue + change);
                console.log(`Applied effect: ${effect.kpi} changed by ${change}. New value: ${updatedKpis[currentKpiName]}`);
            }
        });
        console.log(`Finished applying ${kpiContext}. Final KPIs for team ${updatedKpis.team_id}, round ${updatedKpis.round_number}:`, JSON.parse(JSON.stringify(updatedKpis)));
        return updatedKpis;
    }, []);

    const storePermanentAdjustments = useCallback(async (teamId: string, sessionId: string, effects: KpiEffect[], phaseSourceLabel: string) => {
        const adjustmentsToInsert = effects
            .filter(eff => eff.timing === 'permanent_next_round_start' && eff.applies_to_rounds && eff.applies_to_rounds.length > 0)
            .flatMap(eff => (eff.applies_to_rounds!).map(roundNum => ({
                session_id: sessionId, team_id: teamId, applies_to_round_start: roundNum,
                kpi_key: eff.kpi, change_value: eff.change_value,
                is_percentage: eff.is_percentage_change || false,
                description: eff.description || `Permanent effect from ${phaseSourceLabel}`
            })));
        if (adjustmentsToInsert.length > 0) {
            const {error} = await supabase.from('permanent_kpi_adjustments').insert(adjustmentsToInsert);
            if (error) console.error("Error storing permanent KPI adjustments:", error);
            else console.log("Permanent KPI adjustments stored successfully.");
        }
    }, []);

    const ensureTeamRoundData = useCallback(async (teamId: string, roundNumber: 1 | 2 | 3, sessionId: string): Promise<TeamRoundData> => {
        const kpis = teamRoundData[teamId]?.[roundNumber];
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
        let start_capacity = 5000, start_orders = 6250, start_cost = 1200000, start_asp = 1000;
        if (roundNumber > 1) {
            const prevRoundKey = (roundNumber - 1) as 1 | 2;
            let prevRoundData: TeamRoundData | null = teamRoundData[teamId]?.[prevRoundKey];
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
            session_id: sessionId,
            team_id: teamId,
            round_number: roundNumber,
            start_capacity,
            current_capacity: start_capacity,
            start_orders,
            current_orders: start_orders,
            start_cost,
            current_cost: start_cost,
            start_asp,
            current_asp: start_asp,
            revenue: 0,
            net_income: 0,
            net_margin: 0,
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
    }, [teamRoundData, setTeamRoundDataDirectly, supabase]);

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
                const effectsToApply: KpiEffect[] = [];
                let narrativeDesc = currentPhaseForProcessing.label;
                const selectedOptionId = decisionForPhase?.selected_challenge_option_id || gameStructureInstance.all_challenge_options[phaseId]?.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    narrativeDesc = `${currentPhaseForProcessing.label} - Team ${team.name} chose ${selectedOptionId}`;
                    if (!decisionForPhase) narrativeDesc = `${currentPhaseForProcessing.label} - Team ${team.name} Defaulted to ${selectedOptionId}`;
                    const consequencePhaseKey = `${phaseId}-conseq`;
                    const consequence = gameStructureInstance.all_consequences[consequencePhaseKey]?.find(c => c.challenge_option_id === selectedOptionId);
                    if (consequence) effectsToApply.push(...consequence.effects);
                    else console.warn(`No consequence found for phase ${phaseId}, option ${selectedOptionId}`);
                } else {
                    console.warn(`No decision or default found for team ${team.name} in phase ${phaseId}`);
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = applyKpiEffects(teamKpisForRound, effectsToApply, `Consequence for ${selectedOptionId}`);
                    await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply, narrativeDesc);
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
                        [team.id]: {
                            ...(prev[team.id] || {}),
                            [currentPhaseForProcessing.round_number]: upsertedData as TeamRoundData
                        }
                    }));
                }
            }
            if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log("AppContext: All team choice decisions for phase processed successfully.");
        } catch (err) {
            console.error("Error processing choice phase decisions:", err);
            setLocalUiState(s => ({...s, errorProcessing: "Failed to process choice decisions."}));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, fetchTeamRoundDataFromHook, allPhasesInOrder, setTeamRoundDataDirectly, supabase]);

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
                const effectsToApply: KpiEffect[] = [];
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
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, setTeamRoundDataDirectly, supabase]);

    const processDoubleDownPayoffInternal = useCallback(async () => {
        console.log("Processing Double Down Payoff...");
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        // TODO: Implement actual logic
        await new Promise(resolve => setTimeout(resolve, 500));
        setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        console.log("Double Down Payoff processed.");
        if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
    }, [currentDbSession, fetchTeamRoundDataFromHook]);

    const calculateAndFinalizeRoundKPIsInternal = useCallback(async (roundNumber: 1 | 2 | 3) => {
        if (!currentDbSession?.id || teams.length === 0) {
            console.warn("calculateAndFinalizeRoundKPIs: Prerequisites not met.");
            return;
        }
        console.log(`Calculating and Finalizing KPIs for round ${roundNumber}`);
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        try {
            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis) {
                    const revenue = kpis.current_orders * kpis.current_asp;
                    const netIncome = revenue - kpis.current_cost;
                    const netMargin = revenue !== 0 ? netIncome / revenue : 0;
                    const finalKpis: Partial<TeamRoundData> = {revenue, net_income: netIncome, net_margin: netMargin};
                    const {error} = await supabase.from('team_round_data').update(finalKpis).eq('id', kpis.id);
                    if (error) throw error;
                }
            }
            if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`Finalized KPIs for round ${roundNumber}`);
        } catch (err) {
            console.error("Error finalizing round KPIs:", err);
            setLocalUiState(s => ({...s, errorProcessing: "Failed to finalize round KPIs."}));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamRoundData, fetchTeamRoundDataFromHook, supabase]);

    const gameController = useGameController(currentDbSession, gameStructureInstance, updateSessionInDb, processChoicePhaseDecisionsInternal);

    const nextSlideCombined = useCallback(async () => {
        const phaseNode = gameController.currentPhaseNode;
        if (phaseNode) {
            if (phaseNode.is_interactive_student_phase && phaseNode.phase_type !== 'choice') { // Choices are processed by useGameController before advancing slide
                // For other interactive types that might need processing *before* showing next phase's content
                if (phaseNode.phase_type === 'invest') {
                    // Investment choices are made, but payoffs happen at a specific 'payoff' phase
                    console.log("End of investment phase. Payoffs will be processed later.");
                } else if (phaseNode.phase_type === 'double-down-select') {
                    // Decisions for DD are made, payoff happens at DD payoff phase.
                    console.log("End of double down selection phase. Payoffs will be processed later.");
                }
            }
            // Check if the *current* phase (before advancing) is a payoff or kpi finalization phase
            // This logic is tricky, as nextSlide in gameController updates phase THEN AppContext's nextSlide processes
            // It might be better for gameController's nextSlide to return the *next* phase, and process logic based on *that*.
            // For now, assume process logic is tied to end of certain *types* of phases from currentPhaseNode
            if (phaseNode.phase_type.includes('payoff') && phaseNode.round_number > 0) {
                setLocalUiState(s => ({...s, isLoadingProcessing: true}));
                try {
                    if (phaseNode.id.includes('double-down') || phaseNode.id.includes('DD-payoff')) {
                        await processDoubleDownPayoffInternal();
                    } else {
                        await processInvestmentPayoffsInternal(phaseNode.round_number as 1 | 2 | 3);
                    }
                } catch (e) {
                    console.error("Error in payoff processing:", e);
                    setLocalUiState(s => ({...s, errorProcessing: "Error processing payoffs."}));
                } finally {
                    setLocalUiState(s => ({...s, isLoadingProcessing: false}));
                }
            } else if (phaseNode.phase_type === 'kpi' && phaseNode.round_number > 0) {
                setLocalUiState(s => ({...s, isLoadingProcessing: true}));
                try {
                    await calculateAndFinalizeRoundKPIsInternal(phaseNode.round_number as 1 | 2 | 3);
                } catch (e) {
                    console.error("Error finalizing KPIs:", e);
                    setLocalUiState(s => ({...s, errorProcessing: "Error finalizing KPIs."}));
                } finally {
                    setLocalUiState(s => ({...s, isLoadingProcessing: false}));
                }
            }
        }
        await gameController.nextSlide();
    }, [gameController, processInvestmentPayoffsInternal, processDoubleDownPayoffInternal, calculateAndFinalizeRoundKPIsInternal]);

    const previousSlideCombined = useCallback(async () => {
        await gameController.previousSlide();
    }, [gameController]);

    const syncAndBroadcastAppState = useCallback(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new' && broadcastChannel) {
            const isStudentDecisionActive = gameController.currentPhaseNode?.is_interactive_student_phase && (gameController.currentSlideData?.type.startsWith('interactive_') || false);
            let decisionPhaseTimerEndTime: number | undefined = undefined;
            if (isStudentDecisionActive && gameController.currentSlideData?.timer_duration_seconds) {
                decisionPhaseTimerEndTime = Date.now() + (gameController.currentSlideData.timer_duration_seconds * 1000);
            }
            const payload: TeacherBroadcastPayload = {
                currentSlideId: gameController.currentSlideData?.id || null,
                currentPhaseId: gameController.currentPhaseNode?.id || null,
                currentPhaseType: gameController.currentPhaseNode?.phase_type || null,
                currentRoundNumber: gameController.currentPhaseNode?.round_number || null,
                isPlayingVideo: gameController.isPlayingVideo,
                videoCurrentTime: gameController.videoCurrentTime,
                triggerVideoSeek: gameController.triggerVideoSeek,
                isStudentDecisionPhaseActive: isStudentDecisionActive,
                decisionOptionsKey: isStudentDecisionActive ? gameController.currentSlideData?.interactive_data_key : undefined,
                decisionPhaseTimerEndTime: decisionPhaseTimerEndTime,
            };
            broadcastChannel.postMessage({type: 'TEACHER_STATE_UPDATE', payload});
            if (gameController.triggerVideoSeek) {
                gameController.setVideoPlaybackState(gameController.isPlayingVideo, gameController.videoCurrentTime, false);
            }
        }
    }, [currentDbSession, gameController]);

    useEffect(() => { // Initialize BroadcastChannel & handle STUDENT_DISPLAY_READY
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            if (broadcastChannel && broadcastChannel.name !== `classroom-${currentDbSession.id}`) {
                broadcastChannel.close();
                broadcastChannel = null;
            }
            if (!broadcastChannel) {
                broadcastChannel = new BroadcastChannel(`classroom-${currentDbSession.id}`);
                console.log("AppContext: BroadcastChannel initialized for session:", currentDbSession.id);
            }
            broadcastChannel.onmessage = (event) => {
                if (event.data.type === 'STUDENT_DISPLAY_READY') {
                    console.log('Student display ready for session:', currentDbSession.id, 'Sending current state.');
                    syncAndBroadcastAppState();
                }
            };
            syncAndBroadcastAppState(); // Initial broadcast when session is ready
            return () => {
                if (broadcastChannel) {
                    broadcastChannel.close();
                    broadcastChannel = null;
                }
            };
        }
    }, [currentDbSession?.id, syncAndBroadcastAppState]);

    useEffect(() => { // Broadcast on game controller state changes
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            syncAndBroadcastAppState();
        }
    }, [
        gameController.currentPhaseNode,
        gameController.currentSlideData,
        gameController.isPlayingVideo,
        gameController.videoCurrentTime,    // ADDED
        gameController.triggerVideoSeek,    // ADDED
        syncAndBroadcastAppState,
        currentDbSession
    ]);

    useEffect(() => { // Supabase Real-time Subscriptions (moved team_decisions to useTeamDataManager)
        if (!currentDbSession?.id || currentDbSession.id === 'new' || authLoading) return;
        // sessionSub for 'sessions' table is implicitly handled by useSessionManager reacting to DB changes
        // team_decisions subscription is now in useTeamDataManager
        // TODO: Add subscription for team_round_data if live KPI updates from DB are desired here
        return () => { /* No supabase.removeChannel needed here if subs are in other hooks */
        };
    }, [currentDbSession?.id, authLoading]);

    const fetchWrapperTeams = useCallback(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') fetchTeamsFromHook(currentDbSession.id);
    }, [currentDbSession?.id, fetchTeamsFromHook]);
    const resetWrapperTeamDecision = useCallback(async (teamId: string, phaseId: string) => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') await resetTeamDecisionInDb(currentDbSession.id, teamId, phaseId);
    }, [currentDbSession?.id, resetTeamDecisionInDb]);

    const resetGameProgressInternal = useCallback(async () => {
        if (currentDbSession?.id && gameStructureInstance) {
            const confirm = window.confirm("Are you sure you want to reset all game progress for this session? This will clear all team decisions and KPI history.");
            if (confirm) {
                setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
                try {
                    await supabase.from('team_decisions').delete().eq('session_id', currentDbSession.id);
                    await supabase.from('team_round_data').delete().eq('session_id', currentDbSession.id);
                    await supabase.from('permanent_kpi_adjustments').delete().eq('session_id', currentDbSession.id);
                    const initialPhase = gameStructureInstance.welcome_phases[0];
                    await updateSessionInDb({
                        current_phase_id: initialPhase?.id || null, current_slide_id_in_phase: initialPhase ? 0 : null,
                        is_playing: false, is_complete: false, teacher_notes: {}
                    });
                    fetchWrapperTeams();
                    fetchTeamDecisionsFromHook(currentDbSession.id);
                    fetchTeamRoundDataFromHook(currentDbSession.id);
                    alert("Game progress has been reset.");
                } catch (e) {
                    console.error("Reset error", e);
                    alert("Error resetting game data.");
                    setLocalUiState(s => ({...s, errorProcessing: "Failed to reset game."}));
                } finally {
                    setLocalUiState(s => ({...s, isLoadingProcessing: false}));
                }
            }
        }
    }, [currentDbSession, gameStructureInstance, updateSessionInDb, fetchWrapperTeams, fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook, supabase]);


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
        currentPhaseId: gameController.currentPhaseNode?.id || null,
        currentSlideIdInPhase: currentDbSession?.current_slide_id_in_phase ?? (gameController.currentPhaseNode === gameStructureInstance?.welcome_phases[0] ? 0 : null),
        teacherNotes: gameController.teacherNotes,
        isPlaying: gameController.isPlayingVideo,
        teams: teams, teamDecisions: teamDecisions, teamRoundData: teamRoundData,
        isStudentWindowOpen: localUiState.isStudentWindowOpen,
        isLoading: isLoadingSession || authLoading || isLoadingTeams || localUiState.isLoadingProcessing,
        error: sessionError || localUiState.errorProcessing,
        currentTeacherAlert: gameController.currentTeacherAlert,
    }), [currentDbSession, gameStructureInstance, gameController, teams, teamDecisions, teamRoundData, localUiState, isLoadingSession, authLoading, isLoadingTeams, sessionError]);

    const contextValue: AppContextProps = useMemo(() => ({
        state: combinedAppState,
        currentPhaseNode: gameController.currentPhaseNode, currentSlideData: gameController.currentSlideData,
        allPhasesInOrder,
        selectPhase: gameController.selectPhase,
        updateTeacherNotesForCurrentSlide: gameController.updateTeacherNotesForCurrentSlide,
        nextSlide: nextSlideCombined, previousSlide: previousSlideCombined,
        togglePlayPauseVideo: gameController.togglePlayPauseVideo,
        setVideoPlaybackStateFromPreview: gameController.setVideoPlaybackState,
        clearTeacherAlert: gameController.clearTeacherAlert,
        isLoadingSession, sessionError, clearSessionError,
        isStudentWindowOpen: localUiState.isStudentWindowOpen,
        setStudentWindowOpen: (isOpen: boolean) => setLocalUiState(s => ({...s, isStudentWindowOpen: isOpen})),
        teams, teamDecisions, teamRoundData, isLoadingTeams,
        fetchTeamsForSession: fetchWrapperTeams,
        fetchTeamRoundDataForSession: (sessionId: string) => fetchTeamRoundDataFromHook(sessionId || currentDbSession?.id || ''),
        resetTeamDecisionForPhase: resetWrapperTeamDecision,
        processChoicePhaseDecisions: processChoicePhaseDecisionsInternal,
        processInvestmentPayoffs: processInvestmentPayoffsInternal,
        processDoubleDownPayoff: processDoubleDownPayoffInternal,
        calculateAndFinalizeRoundKPIs: calculateAndFinalizeRoundKPIsInternal,
        resetGameProgress: resetGameProgressInternal,
        isLoadingProcessingDecisions: localUiState.isLoadingProcessing,
        isPlayingVideo: gameController.isPlayingVideo,
        videoCurrentTime: gameController.videoCurrentTime,
        triggerVideoSeek: gameController.triggerVideoSeek,
    }), [
        combinedAppState, gameController, allPhasesInOrder, isLoadingSession, sessionError, clearSessionError,
        localUiState.isStudentWindowOpen, teams, teamDecisions, teamRoundData, isLoadingTeams,
        fetchWrapperTeams, fetchTeamRoundDataFromHook, resetWrapperTeamDecision,
        processChoicePhaseDecisionsInternal, processInvestmentPayoffsInternal, processDoubleDownPayoffInternal,
        calculateAndFinalizeRoundKPIsInternal, nextSlideCombined, previousSlideCombined, resetGameProgressInternal
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
            ) : contextValue.state.error && (passedSessionId === 'new' || (contextValue.state.currentSessionId && !gameController.currentPhaseNode && contextValue.state.currentSessionId !== 'new')) ?
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                        <ServerCrash size={48} className="text-red-500 mx-auto mb-4"/>
                        <h2 className="text-2xl font-bold text-red-700 mb-2">Initialization Error</h2>
                        <p className="text-gray-600 mb-6">{contextValue.state.error || "An unknown error occurred."}</p>
                        <button onClick={() => {
                            clearSessionError();
                            navigate('/dashboard', {replace: true});
                        }}
                                className="bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
                : (children)}
        </AppContext.Provider>
    );
};