// src/context/AppContext.tsx
import React, {createContext, useContext, useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    AppState, GamePhaseNode, Slide, Team, TeamDecision,
    TeamRoundData, TeacherBroadcastPayload, KpiEffect, KpiKey,
    PermanentKpiAdjustment, GameStructure
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
    selectPhase: (phaseId: string) => Promise<void>;
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    togglePlayPauseVideo: () => Promise<void>;
    setVideoPlaybackStateFromPreview: (playing: boolean, time: number, triggerSeek?: boolean) => Promise<void>;
    reportVideoDuration: (duration: number) => void;
    clearTeacherAlert: () => Promise<void>;
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
    processChoicePhaseDecisions: (phaseId: string, associatedSlide: Slide | null) => Promise<void>;
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3, currentPhaseId: string | null) => Promise<void>;
    processDoubleDownPayoff: () => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => void;
    isPlayingVideo: boolean;
    videoCurrentTime: number;
    triggerVideoSeek: boolean;
    setCurrentTeacherAlertState: (alert: { title: string; message: string } | null) => void;
    handlePreviewVideoEnded: () => Promise<void>;
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
    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD as GameStructure, []);

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

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructureInstance?.allPhases) return [];
        return gameStructureInstance.allPhases;
    }, [gameStructureInstance]);

    const currentVideoDurationRef = useRef<number | null>(null);

    // Immediate broadcast function - called synchronously when state changes
    const broadcastStateImmediately = useCallback((state: {
        isPlayingVideo: boolean;
        videoCurrentTime: number;
        triggerVideoSeek: boolean;
        currentSlideData: Slide | null;
        currentPhaseNode: GamePhaseNode | null;
    }) => {
        if (currentDbSession?.id && currentDbSession.id !== 'new' && broadcastChannel) {
            let isStudentDecisionActive = false;
            let decisionPhaseTimerEndTime: number | undefined = undefined;
            let decisionOptionsKey: string | undefined = undefined;

            console.log(`[AppContext] Broadcasting state - Phase: ${state.currentPhaseNode?.id}, Slide: ${state.currentSlideData?.id}, SlideType: ${state.currentSlideData?.type}`);

            if (state.currentPhaseNode?.is_interactive_student_phase && state.currentSlideData) {
                console.log(`[AppContext] Phase is interactive: ${state.currentPhaseNode.id}, slide type: ${state.currentSlideData.type}`);

                // Check if this is an interactive slide type
                if (state.currentSlideData.type === 'interactive_invest' ||
                    state.currentSlideData.type === 'interactive_choice' ||
                    state.currentSlideData.type === 'interactive_double_down_prompt' ||
                    state.currentSlideData.type === 'interactive_double_down_select') {

                    isStudentDecisionActive = true;
                    decisionOptionsKey = state.currentSlideData.interactive_data_key || state.currentPhaseNode.id;

                    console.log(`[AppContext] Setting decision active - Phase: ${state.currentPhaseNode.id}, OptionsKey: ${decisionOptionsKey}`);

                    // Timer logic for investment phases
                    if (state.currentSlideData.id === 7 && state.currentSlideData.type === 'interactive_invest' &&
                        state.currentSlideData.source_url && currentVideoDurationRef.current && currentVideoDurationRef.current > 0) {
                        const videoAlreadyPlayed = state.videoCurrentTime > 0 ? state.videoCurrentTime : 0;
                        const remainingVideoDuration = Math.max(0, currentVideoDurationRef.current - videoAlreadyPlayed);
                        decisionPhaseTimerEndTime = Date.now() + (remainingVideoDuration * 1000);
                        console.log(`[AppContext] Setting video timer - Duration: ${currentVideoDurationRef.current}, Played: ${videoAlreadyPlayed}, Remaining: ${remainingVideoDuration}`);
                    } else if (state.currentSlideData.timer_duration_seconds) {
                        const slideActivationTime = currentDbSession?.updated_at ? new Date(currentDbSession.updated_at).getTime() : Date.now();
                        decisionPhaseTimerEndTime = slideActivationTime + (state.currentSlideData.timer_duration_seconds * 1000);
                        console.log(`[AppContext] Setting slide timer - Duration: ${state.currentSlideData.timer_duration_seconds}s`);
                    }
                }
            }

            const payload: TeacherBroadcastPayload = {
                currentSlideId: state.currentSlideData?.id || null,
                currentPhaseId: state.currentPhaseNode?.id || null,
                currentPhaseType: state.currentPhaseNode?.phase_type || null,
                currentRoundNumber: state.currentPhaseNode?.round_number || null,
                isPlayingVideo: state.isPlayingVideo,
                videoCurrentTime: state.videoCurrentTime,
                triggerVideoSeek: state.triggerVideoSeek,
                isStudentDecisionPhaseActive: isStudentDecisionActive,
                decisionOptionsKey: decisionOptionsKey,
                decisionPhaseTimerEndTime: decisionPhaseTimerEndTime,
            };

            console.log(`[AppContext] Broadcasting payload:`, payload);

            try {
                broadcastChannel.postMessage({type: 'TEACHER_STATE_UPDATE', payload});
                console.log(`[AppContext] Broadcast sent successfully`);
            } catch (error) {
                console.error(`[AppContext] Broadcast error:`, error);
            }
        } else {
            console.log(`[AppContext] Not broadcasting - Session: ${currentDbSession?.id}, Channel: ${!!broadcastChannel}`);
        }
    }, [currentDbSession]);

    // Initialize game controller with immediate broadcast callback
    const gameController = useGameController(
        currentDbSession,
        gameStructureInstance,
        updateSessionInDb,
        (phaseId) => {
            const currentPhaseNodeForDecision = allPhasesInOrder.find(p => p.id === phaseId);
            const slideForDecision = currentPhaseNodeForDecision && gameStructureInstance.slides.find(s => s.id === currentPhaseNodeForDecision.slide_ids[currentPhaseNodeForDecision.slide_ids.length - 1]);
            return processChoicePhaseDecisionsInternal(phaseId, slideForDecision || null);
        },
        broadcastStateImmediately // Pass the broadcast callback
    );

    const updateVideoDuration = useCallback((duration: number) => {
        currentVideoDurationRef.current = duration;
        console.log(`[AppContext] Updated video duration ref: ${duration}`);
    }, []);

    const reportVideoDurationWithRef = useCallback((duration: number) => {
        gameController.reportVideoDuration(duration);
        updateVideoDuration(duration);
    }, [gameController.reportVideoDuration, updateVideoDuration]);

    // All other AppContext logic remains the same...
    const applyKpiEffects = useCallback((currentKpisInput: TeamRoundData, effects: KpiEffect[], kpiContext: string = "Effect"): TeamRoundData => {
        const updatedKpis = JSON.parse(JSON.stringify(currentKpisInput));
        effects.forEach(effect => {
            if (effect.timing === 'immediate') {
                const currentKpiName = `current_${effect.kpi}` as keyof TeamRoundData;
                const baseValueForEffect = (updatedKpis[currentKpiName] as number | undefined) ?? (updatedKpis[`start_${effect.kpi}` as keyof TeamRoundData] as number | undefined) ?? 0;
                let changeAmount = effect.change_value;
                if (effect.is_percentage_change) {
                    changeAmount = baseValueForEffect * (effect.change_value / 100);
                }
                (updatedKpis[currentKpiName] as number) = Math.round(baseValueForEffect + changeAmount);
            }
        });
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
        }
    }, []);

    const ensureTeamRoundData = useCallback(async (teamId: string, roundNumber: 1 | 2 | 3, sessionId: string): Promise<TeamRoundData> => {
        if (!sessionId || sessionId === 'new') throw new Error("ensureTeamRoundData: Invalid sessionId");
        const kpisFromState = teamRoundData[teamId]?.[roundNumber];
        if (kpisFromState) return kpisFromState;

        const {
            data: existingData,
            error: fetchErr
        } = await supabase.from('team_round_data').select('*').eq('session_id', sessionId).eq('team_id', teamId).eq('round_number', roundNumber).single();
        if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
        if (existingData) {
            setTeamRoundDataDirectly(prev => ({
                ...prev,
                [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
            }));
            return existingData as TeamRoundData;
        }

        let start_capacity = 5000, start_orders = 6250, start_cost = 1200000, start_asp = 1000;
        if (roundNumber > 1) {
            const prevRoundKey = (roundNumber - 1) as 1 | 2;
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
                console.warn(`[AppContext] ensureTeamRoundData: Prev round (${prevRoundKey}) data for team ${teamId} not found. Using game defaults for RD${roundNumber}.`);
            }
        }
        const {data: adjustments} = await supabase.from('permanent_kpi_adjustments').select('*').eq('session_id', sessionId).eq('team_id', teamId).eq('applies_to_round_start', roundNumber);
        (adjustments as PermanentKpiAdjustment[] || []).forEach(adj => {
            let baseVal = 0;
            switch (adj.kpi_key as KpiKey) {
                case 'capacity':
                    baseVal = start_capacity;
                    start_capacity += adj.is_percentage ? baseVal * (adj.change_value / 100) : adj.change_value;
                    break;
                case 'orders':
                    baseVal = start_orders;
                    start_orders += adj.is_percentage ? baseVal * (adj.change_value / 100) : adj.change_value;
                    break;
                case 'cost':
                    baseVal = start_cost;
                    start_cost += adj.is_percentage ? baseVal * (adj.change_value / 100) : adj.change_value;
                    break;
                case 'asp':
                    baseVal = start_asp;
                    start_asp += adj.is_percentage ? baseVal * (adj.change_value / 100) : adj.change_value;
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
            revenue: 0, net_income: 0, net_margin: 0,
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

    const processChoicePhaseDecisionsInternal = useCallback(async (phaseId: string, associatedSlide: Slide | null) => {
        const currentPhaseForProcessing = allPhasesInOrder.find(p => p.id === phaseId);
        if (!currentDbSession?.id || !gameStructureInstance || !currentPhaseForProcessing || !associatedSlide || teams.length === 0 || currentPhaseForProcessing.phase_type !== 'choice') {
            console.warn("[AppContext] processChoicePhaseDecisions: Prerequisites not met or not a choice phase.", {
                phaseId,
                associatedSlideId: associatedSlide?.id,
                currentPhaseType: currentPhaseForProcessing?.phase_type
            });
            return;
        }
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        try {
            for (const team of teams) {
                const teamKpisForRound = await ensureTeamRoundData(team.id, currentPhaseForProcessing.round_number as 1 | 2 | 3, currentDbSession.id);
                const decisionForPhase = teamDecisions[team.id]?.[phaseId];
                const effectsToApply: KpiEffect[] = [];
                let narrativeDesc = `${currentPhaseForProcessing.label} - Team ${team.name}`;

                const optionsKey = associatedSlide.interactive_data_key || phaseId;
                const optionsForPhase = gameStructureInstance.all_challenge_options[optionsKey] || [];
                const selectedOptionId = decisionForPhase?.selected_challenge_option_id || optionsForPhase.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    narrativeDesc += decisionForPhase ? ` chose ${selectedOptionId}` : ` Defaulted to ${selectedOptionId}`;
                    const consequencePhaseKey = `${phaseId}-conseq`;
                    const consequence = gameStructureInstance.all_consequences[consequencePhaseKey]?.find(c => c.challenge_option_id === selectedOptionId);
                    if (consequence) effectsToApply.push(...consequence.effects);
                    else console.warn(`No consequence found for phase ${phaseId} (using key ${consequencePhaseKey}), option ${selectedOptionId}`);
                } else {
                    console.warn(`No decision or default found for team ${team.name} in choice phase ${phaseId}`);
                }
                if (effectsToApply.length > 0) {
                    const updatedKpis = applyKpiEffects(teamKpisForRound, effectsToApply, `Choice Consequence (${selectedOptionId})`);
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
        } catch (err) {
            setLocalUiState(s => ({
                ...s,
                errorProcessing: err instanceof Error ? err.message : "Failed to process choice decisions."
            }));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, fetchTeamRoundDataFromHook, allPhasesInOrder, setTeamRoundDataDirectly]);

    const setCurrentTeacherAlertState = gameController.setCurrentTeacherAlertState;

    const combinedAppState: AppState = useMemo(() => ({
        currentSessionId: currentDbSession?.id || null,
        gameStructure: gameStructureInstance,
        currentPhaseId: gameController.currentPhaseNode?.id || null,
        currentSlideIdInPhase: currentDbSession?.current_slide_id_in_phase ?? (gameController.currentPhaseNode === gameStructureInstance?.welcome_phases[0] ? 0 : null),
        teacherNotes: gameController.teacherNotes,
        isPlaying: gameController.isPlayingVideo,
        teams: teams,
        teamDecisions: teamDecisions,
        teamRoundData: teamRoundData,
        isStudentWindowOpen: localUiState.isStudentWindowOpen,
        isLoading: isLoadingSession || authLoading || isLoadingTeams || localUiState.isLoadingProcessing || !gameController.currentPhaseNode,
        error: sessionError || localUiState.errorProcessing,
        currentTeacherAlert: gameController.currentTeacherAlert,
    }), [currentDbSession, gameStructureInstance, gameController, teams, teamDecisions, teamRoundData, localUiState, isLoadingSession, authLoading, isLoadingTeams, sessionError]);

    useEffect(() => {
        if (gameController.currentPhaseNode?.is_interactive_student_phase && teams.length > 0 && currentDbSession?.id) {
            const currentInteractivePhaseId = gameController.currentPhaseNode.id;
            let submittedCount = 0;
            for (const team of teams) {
                if (teamDecisions[team.id] && teamDecisions[team.id][currentInteractivePhaseId]) {
                    submittedCount++;
                }
            }
            const allSubmitted = submittedCount === teams.length;
            if (gameController.allTeamsSubmittedCurrentInteractivePhase !== allSubmitted) {
                gameController.setAllTeamsSubmittedCurrentInteractivePhase(allSubmitted);
            }
        } else if (gameController.currentPhaseNode && !gameController.currentPhaseNode.is_interactive_student_phase) {
            if (gameController.allTeamsSubmittedCurrentInteractivePhase) {
                gameController.setAllTeamsSubmittedCurrentInteractivePhase(false);
            }
        }
    }, [teamDecisions, teams, gameController.currentPhaseNode, gameController.setAllTeamsSubmittedCurrentInteractivePhase, currentDbSession?.id, gameController.allTeamsSubmittedCurrentInteractivePhase]);

    // All other processing functions remain the same...
    const processInvestmentPayoffsInternal = useCallback(async (roundNumber: 1 | 2 | 3, currentPhaseIdForPayoff: string | null) => {
        if (!currentDbSession?.id || !gameStructureInstance || teams.length === 0) return;
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        const payoffDataKey = `rd${roundNumber}-payoff`;
        const allPayoffsForRound = gameStructureInstance.all_investment_payoffs[payoffDataKey] || [];

        if (allPayoffsForRound.length === 0) {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
            return;
        }
        try {
            for (const team of teams) {
                const teamKpisForRound = await ensureTeamRoundData(team.id, roundNumber, currentDbSession.id);
                const investPhaseId = `rd${roundNumber}-invest`;
                const teamInvestmentsDecision = teamDecisions[team.id]?.[investPhaseId];
                const teamSelectedInvestmentIds = teamInvestmentsDecision?.selected_investment_ids || [];

                const effectsToApply: KpiEffect[] = [];
                teamSelectedInvestmentIds.forEach(investId => {
                    const payoff = allPayoffsForRound.find(p => p.investment_option_id === investId);
                    if (payoff) {
                        effectsToApply.push(...payoff.effects);
                    }
                });
                if (roundNumber === 1 && currentPhaseIdForPayoff === 'rd1-payoff') {
                    const budgetForRd1 = gameStructureInstance.investment_phase_budgets['rd1-invest'];
                    const spentOnRd1 = teamInvestmentsDecision?.total_spent_budget ?? 0;
                    const unspent = budgetForRd1 - spentOnRd1;
                    if (unspent > 0) {
                        effectsToApply.push({
                            kpi: 'cost', change_value: -unspent, timing: 'immediate',
                            description: 'RD-1 Unspent Budget Cost Reduction'
                        });
                    }
                }
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
        } catch (err) {
            setLocalUiState(s => ({
                ...s,
                errorProcessing: err instanceof Error ? err.message : "Failed to process investment payoffs."
            }));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, setTeamRoundDataDirectly]);

    const processDoubleDownPayoffInternal = useCallback(async () => {
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        await new Promise(resolve => setTimeout(resolve, 200));
        setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
    }, [currentDbSession, fetchTeamRoundDataFromHook]);

    const calculateAndFinalizeRoundKPIsInternal = useCallback(async (roundNumber: 1 | 2 | 3) => {
        if (!currentDbSession?.id || teams.length === 0) return;
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        try {
            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis) {
                    const revenue = kpis.current_orders * kpis.current_asp;
                    const netIncome = revenue - kpis.current_cost;
                    const netMargin = revenue > 0 ? netIncome / revenue : 0;
                    const finalKpis: Partial<TeamRoundData> = {
                        revenue: Math.round(revenue),
                        net_income: Math.round(netIncome),
                        net_margin: parseFloat(netMargin.toFixed(4))
                    };
                    const {error} = await supabase.from('team_round_data').update(finalKpis).eq('id', kpis.id);
                    if (error) throw error;
                } else {
                    console.warn(`[AppContext] No KPI data found for team ${team.id} in RD-${roundNumber} to finalize.`);
                }
            }
            if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
        } catch (err) {
            setLocalUiState(s => ({
                ...s,
                errorProcessing: err instanceof Error ? err.message : "Failed to finalize round KPIs."
            }));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamRoundData, fetchTeamRoundDataFromHook]);

    const nextSlideCombined = useCallback(async () => {
        const currentPhase = gameController.currentPhaseNode;
        const currentSlide = gameController.currentSlideData;

        if (currentPhase && currentSlide && (gameController.currentSlideIdInPhase === currentPhase.slide_ids.length - 1)) {
            if (currentPhase.phase_type === 'payoff' && currentPhase.round_number > 0) {
                await processInvestmentPayoffsInternal(currentPhase.round_number as 1 | 2 | 3, currentPhase.id);
            } else if (currentPhase.phase_type === 'double-down-payoff') {
                await processDoubleDownPayoffInternal();
            } else if (currentPhase.phase_type === 'kpi' && currentPhase.round_number > 0) {
                await calculateAndFinalizeRoundKPIsInternal(currentPhase.round_number as 1 | 2 | 3);
            }
        }
        await gameController.nextSlide();
    }, [gameController, processInvestmentPayoffsInternal, processDoubleDownPayoffInternal, calculateAndFinalizeRoundKPIsInternal]);

    // Setup broadcast channel
    useEffect(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            const channelName = `classroom-${currentDbSession.id}`;
            console.log(`[AppContext] Setting up broadcast channel: ${channelName}`);

            if (broadcastChannel && broadcastChannel.name !== channelName) {
                console.log(`[AppContext] Closing old broadcast channel`);
                broadcastChannel.close();
                broadcastChannel = null;
            }

            if (!broadcastChannel) {
                console.log(`[AppContext] Creating new broadcast channel: ${channelName}`);
                broadcastChannel = new BroadcastChannel(channelName);

                broadcastChannel.onmessage = (event) => {
                    console.log(`[AppContext] Received message:`, event.data);
                    if (event.data.type === 'STUDENT_DISPLAY_READY') {
                        console.log('[AppContext] Student display connected, broadcasting current state');

                        // Get the most current video time from the teacher preview if it's a video slide
                        let currentVideoTime = gameController.videoCurrentTime;

                        // If there's a video element in the teacher preview, get its actual current time
                        const teacherVideoElements = document.querySelectorAll('video[src]');
                        if (teacherVideoElements.length > 0) {
                            const latestVideo = teacherVideoElements[teacherVideoElements.length - 1] as HTMLVideoElement;
                            if (!latestVideo.paused || latestVideo.currentTime > 0) {
                                currentVideoTime = latestVideo.currentTime;
                                console.log(`[AppContext] Using actual video time from teacher preview: ${currentVideoTime}`);
                            }
                        }

                        // Force a seek event to sync video time exactly
                        broadcastStateImmediately({
                            isPlayingVideo: gameController.isPlayingVideo,
                            videoCurrentTime: currentVideoTime,
                            triggerVideoSeek: true, // Force seek to sync time
                            currentSlideData: gameController.currentSlideData,
                            currentPhaseNode: gameController.currentPhaseNode
                        });

                        // Send a second broadcast without seek trigger after a brief delay
                        setTimeout(() => {
                            broadcastStateImmediately({
                                isPlayingVideo: gameController.isPlayingVideo,
                                videoCurrentTime: currentVideoTime,
                                triggerVideoSeek: false,
                                currentSlideData: gameController.currentSlideData,
                                currentPhaseNode: gameController.currentPhaseNode
                            });
                        }, 300);
                    }
                };
            }

            // Broadcast current state immediately when channel is set up
            setTimeout(() => {
                broadcastStateImmediately({
                    isPlayingVideo: gameController.isPlayingVideo,
                    videoCurrentTime: gameController.videoCurrentTime,
                    triggerVideoSeek: false,
                    currentSlideData: gameController.currentSlideData,
                    currentPhaseNode: gameController.currentPhaseNode
                });
            }, 100);

            return () => {
                if (broadcastChannel) {
                    console.log(`[AppController] Cleaning up broadcast channel`);
                    broadcastChannel.close();
                    broadcastChannel = null;
                }
            };
        }
    }, [currentDbSession?.id, broadcastStateImmediately]);


    const fetchWrapperTeams = useCallback(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') fetchTeamsFromHook(currentDbSession.id);
    }, [currentDbSession?.id, fetchTeamsFromHook]);

    const resetWrapperTeamDecision = useCallback(async (teamId: string, phaseId: string) => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            await resetTeamDecisionInDb(currentDbSession.id, teamId, phaseId);
            if (gameController.currentPhaseNode?.is_interactive_student_phase) {
                gameController.setAllTeamsSubmittedCurrentInteractivePhase(false);
            }
        }
    }, [currentDbSession?.id, resetTeamDecisionInDb, gameController]);

    const resetGameProgressInternal = useCallback(async () => {
        if (currentDbSession?.id && gameStructureInstance) {
            const confirmReset = window.confirm("Are you sure you want to reset all game progress for this session? This will clear all team decisions and KPI history.");
            if (confirmReset) {
                setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
                try {
                    await supabase.from('team_decisions').delete().eq('session_id', currentDbSession.id);
                    await supabase.from('team_round_data').delete().eq('session_id', currentDbSession.id);
                    await supabase.from('permanent_kpi_adjustments').delete().eq('session_id', currentDbSession.id);

                    const initialPhase = gameStructureInstance.allPhases[0];
                    await updateSessionInDb({
                        current_phase_id: initialPhase?.id || null,
                        current_slide_id_in_phase: initialPhase ? 0 : null,
                        is_playing: false, is_complete: false, teacher_notes: {}
                    });

                    await fetchTeamsFromHook(currentDbSession.id);
                    await fetchTeamDecisionsFromHook(currentDbSession.id);
                    await fetchTeamRoundDataFromHook(currentDbSession.id);

                    if (initialPhase) await gameController.selectPhase(initialPhase.id);
                    else if (allPhasesInOrder.length > 0) await gameController.selectPhase(allPhasesInOrder[0].id);

                    alert("Game progress has been reset.");
                    navigate('/dashboard', {replace: true});

                } catch (e) {
                    setLocalUiState(s => ({
                        ...s,
                        errorProcessing: e instanceof Error ? e.message : "Failed to reset game."
                    }));
                } finally {
                    setLocalUiState(s => ({...s, isLoadingProcessing: false}));
                }
            }
        }
    }, [currentDbSession, gameStructureInstance, updateSessionInDb, fetchTeamsFromHook, fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook, gameController, allPhasesInOrder, navigate]);

    useEffect(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new' && !isLoadingSession && !authLoading) {
            fetchWrapperTeams();
            fetchTeamDecisionsFromHook(currentDbSession.id);
            fetchTeamRoundDataFromHook(currentDbSession.id);
        }
    }, [currentDbSession?.id, isLoadingSession, authLoading, fetchWrapperTeams, fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook]);

    const contextValue: AppContextProps = useMemo(() => ({
        state: combinedAppState,
        currentPhaseNode: gameController.currentPhaseNode,
        currentSlideData: gameController.currentSlideData,
        allPhasesInOrder,
        selectPhase: gameController.selectPhase,
        updateTeacherNotesForCurrentSlide: gameController.updateTeacherNotesForCurrentSlide,
        nextSlide: nextSlideCombined,
        previousSlide: gameController.previousSlide,
        togglePlayPauseVideo: gameController.togglePlayPauseVideo,
        setVideoPlaybackStateFromPreview: gameController.setVideoPlaybackState,
        clearTeacherAlert: gameController.clearTeacherAlert,
        isLoadingSession,
        sessionError,
        clearSessionError,
        isStudentWindowOpen: localUiState.isStudentWindowOpen,
        setStudentWindowOpen: (isOpen: boolean) => setLocalUiState(s => ({...s, isStudentWindowOpen: isOpen})),
        teams,
        teamDecisions,
        teamRoundData,
        isLoadingTeams,
        fetchTeamsForSession: fetchWrapperTeams,
        fetchTeamRoundDataForSession: (sessionIdToFetch: string) => fetchTeamRoundDataFromHook(sessionIdToFetch || currentDbSession?.id || ''),
        resetTeamDecisionForPhase: resetWrapperTeamDecision,
        processChoicePhaseDecisions: (phaseId) => {
            const phaseNode = allPhasesInOrder.find(p => p.id === phaseId);
            const slide = phaseNode && gameStructureInstance?.slides.find(s => s.id === phaseNode.slide_ids[phaseNode.slide_ids.length - 1]);
            return processChoicePhaseDecisionsInternal(phaseId, slide || null);
        },
        processInvestmentPayoffs: (roundNumber, currentPhaseId) => processInvestmentPayoffsInternal(roundNumber, currentPhaseId),
        processDoubleDownPayoff: processDoubleDownPayoffInternal,
        calculateAndFinalizeRoundKPIs: calculateAndFinalizeRoundKPIsInternal,
        resetGameProgress: resetGameProgressInternal,
        isLoadingProcessingDecisions: localUiState.isLoadingProcessing,
        isPlayingVideo: gameController.isPlayingVideo,
        videoCurrentTime: gameController.videoCurrentTime,
        triggerVideoSeek: gameController.triggerVideoSeek,
        handlePreviewVideoEnded: gameController.handlePreviewVideoEnded,
        setCurrentTeacherAlertState,
        reportVideoDuration: reportVideoDurationWithRef,
    }), [
        combinedAppState, gameController, allPhasesInOrder, isLoadingSession, sessionError, clearSessionError,
        localUiState.isStudentWindowOpen, teams, teamDecisions, teamRoundData, isLoadingTeams,
        fetchWrapperTeams, fetchTeamRoundDataFromHook, resetWrapperTeamDecision, nextSlideCombined,
        processChoicePhaseDecisionsInternal, processInvestmentPayoffsInternal, processDoubleDownPayoffInternal,
        calculateAndFinalizeRoundKPIsInternal, resetGameProgressInternal, gameStructureInstance, setCurrentTeacherAlertState,
        reportVideoDurationWithRef,
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            {contextValue.state.isLoading && (!passedSessionId || passedSessionId === 'new' || !currentDbSession?.id || !gameController.currentPhaseNode) ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    <p className="ml-4 text-lg font-semibold text-gray-700">
                        {authLoading ? "Authenticating..." :
                            (passedSessionId === 'new' && !contextValue.state.error) ? "Creating New Session..." :
                                !gameController.currentPhaseNode ? "Loading Game Controller..." :
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