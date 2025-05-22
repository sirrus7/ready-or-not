// src/context/AppContext.tsx
import React, {createContext, useContext, useState, useEffect, useCallback, useMemo} from 'react';
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
import {useGameController, GameControllerOutput} from '../hooks/useGameController';
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
    isLoadingProcessingDecisions: boolean; // This will be true during payoff/consequence calculations
    fetchTeamsForSession: () => Promise<void>;
    fetchTeamRoundDataForSession: (sessionId: string) => Promise<void>;
    resetTeamDecisionForPhase: (teamId: string, phaseId: string) => Promise<void>;
    processChoicePhaseDecisions: (phaseId: string) => Promise<void>; // Still needed for explicit calls if any
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    processDoubleDownPayoff: () => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => void;
    // Direct video states now come from gameController via AppState
    isPlayingVideo: boolean;
    videoCurrentTime: number;
    triggerVideoSeek: boolean;
}

const initialAppContextLocalStateDefinition: {
    isStudentWindowOpen: boolean;
    isLoadingProcessing: boolean; // For long async game logic processing like payoffs
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
        if (!gameStructureInstance?.allPhases) return []; // Use allPhases from gameStructure
        return gameStructureInstance.allPhases;
    }, [gameStructureInstance]);

    const applyKpiEffects = useCallback((currentKpisInput: TeamRoundData, effects: KpiEffect[], kpiContext: string = "Effect"): TeamRoundData => {
        const updatedKpis = {...currentKpisInput};
        effects.forEach(effect => {
            if (effect.timing === 'immediate') {
                const currentKpiName = `current_${effect.kpi}` as keyof TeamRoundData;
                const baseValue = (updatedKpis[currentKpiName] as number | undefined) ?? (updatedKpis[`start_${effect.kpi}` as keyof TeamRoundData] as number | undefined) ?? 0;
                let change = effect.change_value;
                if (effect.is_percentage_change && baseValue !== undefined) {
                    change = baseValue * (effect.change_value / 100);
                }
                (updatedKpis[currentKpiName] as number) = Math.round(baseValue + change);
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
        const kpis = teamRoundData[teamId]?.[roundNumber];
        if (kpis) return kpis;

        const { data: existingData, error: fetchErr } = await supabase.from('team_round_data').select('*').eq('session_id', sessionId).eq('team_id', teamId).eq('round_number', roundNumber).single();
        if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
        if (existingData) {
            setTeamRoundDataDirectly(prev => ({...prev, [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}}));
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
                start_capacity = prevRoundData.current_capacity; start_orders = prevRoundData.current_orders;
                start_cost = prevRoundData.current_cost; start_asp = prevRoundData.current_asp;
            }
        }
        const {data: adjustments} = await supabase.from('permanent_kpi_adjustments').select('*').eq('session_id', sessionId).eq('team_id', teamId).eq('applies_to_round_start', roundNumber);
        (adjustments as PermanentKpiAdjustment[] || []).forEach(adj => {
            let baseVal = 0;
            switch (adj.kpi_key as KpiKey) {
                case 'capacity': baseVal = start_capacity; start_capacity += adj.is_percentage ? baseVal * (adj.change_value/100) : adj.change_value; break;
                case 'orders': baseVal = start_orders; start_orders += adj.is_percentage ? baseVal * (adj.change_value/100) : adj.change_value; break;
                case 'cost': baseVal = start_cost; start_cost += adj.is_percentage ? baseVal * (adj.change_value/100) : adj.change_value; break;
                case 'asp': baseVal = start_asp; start_asp += adj.is_percentage ? baseVal * (adj.change_value/100) : adj.change_value; break;
            }
            start_capacity = Math.round(start_capacity); start_orders = Math.round(start_orders);
            start_cost = Math.round(start_cost); start_asp = Math.round(start_asp);
        });
        const newRoundDataContent: Omit<TeamRoundData, 'id' | 'created_at' | 'updated_at'> = {
            session_id: sessionId, team_id: teamId, round_number: roundNumber,
            start_capacity, current_capacity: start_capacity, start_orders, current_orders: start_orders,
            start_cost, current_cost: start_cost, start_asp, current_asp: start_asp,
            revenue: 0, net_income: 0, net_margin: 0,
        };
        const { data: insertedData, error: insertError } = await supabase.from('team_round_data').insert(newRoundDataContent).select().single();
        if (insertError || !insertedData) throw insertError || new Error("Failed to insert new team_round_data");
        setTeamRoundDataDirectly(prev => ({...prev, [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}}));
        return insertedData as TeamRoundData;
    }, [teamRoundData, setTeamRoundDataDirectly]);

    const processChoicePhaseDecisionsInternal = useCallback(async (phaseId: string) => {
        const currentPhaseForProcessing = allPhasesInOrder.find(p => p.id === phaseId);
        if (!currentDbSession?.id || !gameStructureInstance || !currentPhaseForProcessing || teams.length === 0 || currentPhaseForProcessing.phase_type !== 'choice') {
            console.warn("processChoicePhaseDecisions: Prerequisites not met or not a choice phase.", {phaseId});
            return;
        }
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        try {
            for (const team of teams) {
                const teamKpisForRound = await ensureTeamRoundData(team.id, currentPhaseForProcessing.round_number as 1 | 2 | 3, currentDbSession.id);
                const decisionForPhase = teamDecisions[team.id]?.[phaseId];
                const effectsToApply: KpiEffect[] = [];
                let narrativeDesc = `${currentPhaseForProcessing.label} - Team ${team.name}`;
                const optionsForPhase = gameStructureInstance.all_challenge_options[phaseId] || [];
                const selectedOptionId = decisionForPhase?.selected_challenge_option_id || optionsForPhase.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    narrativeDesc += decisionForPhase ? ` chose ${selectedOptionId}` : ` Defaulted to ${selectedOptionId}`;
                    const consequencePhaseKey = `${phaseId}-conseq`;
                    const consequence = gameStructureInstance.all_consequences[consequencePhaseKey]?.find(c => c.challenge_option_id === selectedOptionId);
                    if (consequence) effectsToApply.push(...consequence.effects);
                    else console.warn(`No consequence found for phase ${phaseId}, option ${selectedOptionId}`);
                } else {
                    console.warn(`No decision or default found for team ${team.name} in choice phase ${phaseId}`);
                }
                if (effectsToApply.length > 0) {
                    const updatedKpis = applyKpiEffects(teamKpisForRound, effectsToApply, `Consequence for ${selectedOptionId}`);
                    await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply, narrativeDesc);
                    const { data: upsertedData, error: upsertError } = await supabase.from('team_round_data').upsert({...updatedKpis, id: teamKpisForRound.id}, {onConflict: 'id'}).select().single();
                    if (upsertError) throw upsertError;
                    if (upsertedData) setTeamRoundDataDirectly(prev => ({...prev, [team.id]: {...(prev[team.id] || {}), [currentPhaseForProcessing.round_number]: upsertedData as TeamRoundData}}));
                }
            }
            if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`[AppContext] Choice decisions processed for phase: ${phaseId}`);
        } catch (err) {
            console.error(`[AppContext] Error processing choice phase ${phaseId} decisions:`, err);
            setLocalUiState(s => ({...s, errorProcessing: err instanceof Error ? err.message : "Failed to process choice decisions."}));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, fetchTeamRoundDataFromHook, allPhasesInOrder, setTeamRoundDataDirectly]);

    const gameController = useGameController(currentDbSession, gameStructureInstance, updateSessionInDb, processChoicePhaseDecisionsInternal);

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
            // console.log(`[AppContext] Submission Check for ${currentInteractivePhaseId}: ${submittedCount}/${teams.length} submitted. AllSubmitted: ${allSubmitted}`);
            gameController.setAllTeamsSubmittedCurrentInteractivePhase(allSubmitted);
        } else if (gameController.currentPhaseNode && !gameController.currentPhaseNode.is_interactive_student_phase) {
            gameController.setAllTeamsSubmittedCurrentInteractivePhase(false);
        }
    }, [teamDecisions, teams, gameController.currentPhaseNode, gameController.setAllTeamsSubmittedCurrentInteractivePhase, currentDbSession?.id]);


    const processInvestmentPayoffsInternal = useCallback(async (roundNumber: 1 | 2 | 3) => {
        if (!currentDbSession?.id || !gameStructureInstance || teams.length === 0) return;
        console.log(`[AppContext] Processing RD-${roundNumber} investment payoffs.`);
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        const payoffDataKey = `rd${roundNumber}-payoff`;
        const allPayoffsForRound = gameStructureInstance.all_investment_payoffs[payoffDataKey] || [];

        if (allPayoffsForRound.length === 0) {
            console.warn(`No investment payoffs defined for ${payoffDataKey}`);
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
                    const { data: upsertedData, error: upsertError } = await supabase.from('team_round_data').upsert({...updatedKpis, id: teamKpisForRound.id}, {onConflict: 'id'}).select().single();
                    if (upsertError) throw upsertError;
                    if (upsertedData) setTeamRoundDataDirectly(prev => ({...prev, [team.id]: {...(prev[team.id] || {}), [roundNumber]: upsertedData as TeamRoundData}}));
                }
            }
            console.log(`[AppContext] RD-${roundNumber} investment payoffs processed.`);
        } catch (err) {
            console.error(`[AppContext] Error processing RD-${roundNumber} investment payoffs:`, err);
            setLocalUiState(s => ({...s, errorProcessing: err instanceof Error ? err.message : "Failed to process investment payoffs."}));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData, applyKpiEffects, storePermanentAdjustments, setTeamRoundDataDirectly]);

    const processDoubleDownPayoffInternal = useCallback(async () => {
        console.log("[AppContext] Processing Double Down Payoff... (Not yet fully implemented)");
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        // Placeholder for DD logic
        await new Promise(resolve => setTimeout(resolve, 200));
        setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id);
    }, [currentDbSession, fetchTeamRoundDataFromHook]);

    const calculateAndFinalizeRoundKPIsInternal = useCallback(async (roundNumber: 1 | 2 | 3) => {
        if (!currentDbSession?.id || teams.length === 0) return;
        console.log(`[AppContext] Calculating and Finalizing KPIs for RD-${roundNumber}.`);
        setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
        try {
            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis) {
                    const revenue = kpis.current_orders * kpis.current_asp;
                    const netIncome = revenue - kpis.current_cost;
                    const netMargin = revenue > 0 ? netIncome / revenue : 0; // Avoid division by zero
                    const finalKpis: Partial<TeamRoundData> = {revenue, net_income: netIncome, net_margin: netMargin};
                    const {error} = await supabase.from('team_round_data').update(finalKpis).eq('id', kpis.id);
                    if (error) throw error;
                } else {
                    console.warn(`[AppContext] No KPI data found for team ${team.id} in RD-${roundNumber} to finalize.`);
                }
            }
            if (currentDbSession?.id) await fetchTeamRoundDataFromHook(currentDbSession.id); // Refresh all data
            console.log(`[AppContext] Finalized KPIs for RD-${roundNumber}.`);
        } catch (err) {
            console.error(`[AppContext] Error finalizing RD-${roundNumber} KPIs:`, err);
            setLocalUiState(s => ({...s, errorProcessing: err instanceof Error ? err.message : "Failed to finalize round KPIs."}));
        } finally {
            setLocalUiState(s => ({...s, isLoadingProcessing: false}));
        }
    }, [currentDbSession, teams, teamRoundData, fetchTeamRoundDataFromHook]);

    const nextSlideCombined = useCallback(async () => {
        const currentPhase = gameController.currentPhaseNode;
        const currentSlide = gameController.currentSlideData;

        // Process logic *before* advancing if this is the last slide of certain phase types
        if (currentPhase && currentSlide && (gameController.currentSlideIdInPhase === currentPhase.slide_ids.length - 1)) {
            if (currentPhase.phase_type === 'payoff' && currentPhase.round_number > 0) {
                await processInvestmentPayoffsInternal(currentPhase.round_number as 1 | 2 | 3);
            } else if (currentPhase.phase_type === 'double-down-payoff') {
                await processDoubleDownPayoffInternal();
            } else if (currentPhase.phase_type === 'kpi' && currentPhase.round_number > 0) {
                await calculateAndFinalizeRoundKPIsInternal(currentPhase.round_number as 1 | 2 | 3);
            }
            // Note: processChoicePhaseDecisions is now called *within* gameController.advanceToNextSlideInternal
            // if the phase is 'choice' and it's the last slide.
        }
        await gameController.nextSlide();
    }, [gameController, processInvestmentPayoffsInternal, processDoubleDownPayoffInternal, calculateAndFinalizeRoundKPIsInternal]);

    const syncAndBroadcastAppState = useCallback(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new' && broadcastChannel) {
            const currentSlide = gameController.currentSlideData;
            const currentPhase = gameController.currentPhaseNode;

            let isStudentDecisionActive = false;
            let decisionPhaseTimerEndTime: number | undefined = undefined;
            let decisionOptionsKey: string | undefined = undefined;

            if (currentPhase?.is_interactive_student_phase && currentSlide) {
                if (currentSlide.type.startsWith('interactive_')) {
                    isStudentDecisionActive = true;
                    decisionOptionsKey = currentSlide.interactive_data_key;

                    if (currentSlide.id === 8 && currentSlide.type === 'interactive_invest' && currentSlide.source_url && gameController.currentVideoDuration && gameController.currentVideoDuration > 0) {
                        // Timer is based on remaining video duration.
                        // Estimate when this slide/video actually started to get an accurate end time.
                        // For simplicity, if video just loaded (currentTime is near 0), start full duration timer.
                        // Otherwise, calculate remaining.
                        let videoTimeElapsed = gameController.videoCurrentTime || 0;
                        if (gameController.isPlayingVideo && videoTimeElapsed === 0 && gameController.triggerVideoSeek === false) {
                            // If isPlaying=true, currentTime=0, and not a seek, likely just started.
                            // This might need a more robust "slide activation timestamp".
                        }
                        const remainingDuration = Math.max(0, gameController.currentVideoDuration - videoTimeElapsed);
                        decisionPhaseTimerEndTime = Date.now() + (remainingDuration * 1000);
                        // console.log(`[AppContext] Slide 8 Timer: Duration=${gameController.currentVideoDuration}, Elapsed=${videoTimeElapsed.toFixed(1)}, Remaining=${remainingDuration.toFixed(1)}, EndTime=${new Date(decisionPhaseTimerEndTime).toLocaleTimeString()}`);
                    } else if (currentSlide.timer_duration_seconds) {
                        // For other interactive slides with explicit timers
                        // This assumes the timer starts when the slide becomes active.
                        // currentDbSession.updated_at is a rough proxy for slide activation.
                        const slideActivationTime = currentDbSession?.updated_at ? new Date(currentDbSession.updated_at).getTime() : Date.now();
                        decisionPhaseTimerEndTime = slideActivationTime + (currentSlide.timer_duration_seconds * 1000);
                    }
                }
            }

            const payload: TeacherBroadcastPayload = {
                currentSlideId: currentSlide?.id || null,
                currentPhaseId: currentPhase?.id || null,
                currentPhaseType: currentPhase?.phase_type || null,
                currentRoundNumber: currentPhase?.round_number || null,
                isPlayingVideo: gameController.isPlayingVideo,
                videoCurrentTime: gameController.videoCurrentTime,
                triggerVideoSeek: gameController.triggerVideoSeek,
                isStudentDecisionPhaseActive: isStudentDecisionActive,
                decisionOptionsKey: decisionOptionsKey,
                decisionPhaseTimerEndTime: decisionPhaseTimerEndTime,
            };
            broadcastChannel.postMessage({ type: 'TEACHER_STATE_UPDATE', payload });
        }
    }, [currentDbSession, gameController]);

    useEffect(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            if (broadcastChannel && broadcastChannel.name !== `classroom-${currentDbSession.id}`) {
                broadcastChannel.close(); broadcastChannel = null;
            }
            if (!broadcastChannel) {
                broadcastChannel = new BroadcastChannel(`classroom-${currentDbSession.id}`);
            }
            broadcastChannel.onmessage = (event) => {
                if (event.data.type === 'STUDENT_DISPLAY_READY') { syncAndBroadcastAppState(); }
            };
            syncAndBroadcastAppState();
            return () => {
                if (broadcastChannel) { broadcastChannel.close(); broadcastChannel = null; }
            };
        }
    }, [currentDbSession?.id, syncAndBroadcastAppState]);

    useEffect(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            syncAndBroadcastAppState();
        }
    }, [
        gameController.currentPhaseNode, gameController.currentSlideData,
        gameController.isPlayingVideo, gameController.videoCurrentTime,
        gameController.triggerVideoSeek, gameController.currentVideoDuration,
        syncAndBroadcastAppState, currentDbSession?.id
    ]);

    const fetchWrapperTeams = useCallback(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') fetchTeamsFromHook(currentDbSession.id);
    }, [currentDbSession?.id, fetchTeamsFromHook]);

    const resetWrapperTeamDecision = useCallback(async (teamId: string, phaseId: string) => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            await resetTeamDecisionInDb(currentDbSession.id, teamId, phaseId);
            // After resetting, re-check submission status
            if (gameController.currentPhaseNode?.is_interactive_student_phase && teams.length > 0) {
                gameController.setAllTeamsSubmittedCurrentInteractivePhase(false); // Force re-evaluation
            }
        }
    }, [currentDbSession?.id, resetTeamDecisionInDb, gameController, teams]);

    const resetGameProgressInternal = useCallback(async () => {
        if (currentDbSession?.id && gameStructureInstance) {
            const confirmReset = window.confirm("Are you sure you want to reset all game progress for this session? This will clear all team decisions and KPI history.");
            if (confirmReset) {
                setLocalUiState(s => ({...s, isLoadingProcessing: true, errorProcessing: null}));
                try {
                    await supabase.from('team_decisions').delete().eq('session_id', currentDbSession.id);
                    await supabase.from('team_round_data').delete().eq('session_id', currentDbSession.id);
                    await supabase.from('permanent_kpi_adjustments').delete().eq('session_id', currentDbSession.id);

                    const initialPhase = gameStructureInstance.allPhases[0]; // Use allPhases for safety
                    await updateSessionInDb({
                        current_phase_id: initialPhase?.id || null,
                        current_slide_id_in_phase: initialPhase ? 0 : null,
                        is_playing: false, is_complete: false, teacher_notes: {}
                    });

                    fetchTeamsFromHook(currentDbSession.id);
                    fetchTeamDecisionsFromHook(currentDbSession.id);
                    fetchTeamRoundDataFromHook(currentDbSession.id);

                    if (initialPhase) gameController.selectPhase(initialPhase.id);
                    else if (allPhasesInOrder.length > 0) gameController.selectPhase(allPhasesInOrder[0].id);

                    alert("Game progress has been reset. Reloading dashboard...");
                    navigate('/dashboard', { replace: true }); // Navigate to dashboard to refresh context fully

                } catch (e) {
                    setLocalUiState(s => ({...s, errorProcessing: e instanceof Error ? e.message : "Failed to reset game."}));
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
        reportVideoDuration: gameController.reportVideoDuration,
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
        calculateAndFinalizeRoundKPIsInternal, nextSlideCombined, resetGameProgressInternal
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            {contextValue.state.isLoading && (!passedSessionId || passedSessionId === 'new' || !currentDbSession?.id) ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    <p className="ml-4 text-lg font-semibold text-gray-700">
                        {authLoading ? "Authenticating..." :
                            (passedSessionId === 'new' && !contextValue.state.error) ? "Creating New Session..." :
                                "Initializing Simulator..."}
                    </p>
                </div>
            ) : contextValue.state.error && (passedSessionId === 'new' || (contextValue.state.currentSessionId && !gameController.currentPhaseNode && contextValue.state.currentSessionId !== 'new') ) ?
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                        <ServerCrash size={48} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-red-700 mb-2">Initialization Error</h2>
                        <p className="text-gray-600 mb-6">{contextValue.state.error || "An unknown error occurred."}</p>
                        <button onClick={() => {clearSessionError(); navigate('/dashboard', { replace: true });}}
                                className="bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
                : ( children )}
        </AppContext.Provider>
    );
};