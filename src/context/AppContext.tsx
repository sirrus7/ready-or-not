// src/context/AppContext.tsx - Updated with New Supabase Structure and Enhanced Error Handling
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    AppState,
    GamePhaseNode,
    GameStructure,
    KpiEffect,
    Slide,
    Team,
    TeamDecision,
    TeamRoundData,
    HostBroadcastPayload
} from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {db} from '../utils/supabase';
import {useSupabaseMutation} from '../hooks/useSupabaseOperation'
import {useAuth} from './AuthContext';
import {useSessionManager} from '../hooks/useSessionManager';
import {useGameController} from '../hooks/useGameController';
import {useTeamDataManager} from '../hooks/useTeamDataManager';
import {useBroadcastManager} from '../utils/broadcastManager';

interface AppContextProps {
    // Core state
    state: AppState;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    allPhasesInOrder: GamePhaseNode[];

    // Navigation
    selectPhase: (phaseId: string) => Promise<void>;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;

    // Host features
    updateHostNotesForCurrentSlide: (notes: string) => void;
    clearHostAlert: () => Promise<void>;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;

    // Session management
    isLoadingSession: boolean;
    sessionError: string | null;
    clearSessionError: () => void;

    // Team data
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    isLoadingTeams: boolean;
    fetchTeamsForSession: () => Promise<void>;
    resetTeamDecisionForPhase: (teamId: string, phaseId: string) => Promise<void>;

    // Game processing
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3, currentPhaseId: string | null) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => void;
    isLoadingProcessingDecisions: boolean;

    // Decision phase controls
    activateDecisionPhase: (durationSeconds?: number) => void;
    deactivateDecisionPhase: () => void;
    isDecisionPhaseActive: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};

interface AppProviderProps {
    children: React.ReactNode;
    passedSessionId?: string | null;
}

export const AppProvider: React.FC<AppProviderProps> = ({children, passedSessionId}) => {
    const [isDecisionPhaseActive, setIsDecisionPhaseActive] = useState(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);

    const {user, loading: authLoading} = useAuth();
    const navigate = useNavigate();
    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD as GameStructure, []);

    // Session management
    const {
        session: currentDbSession,
        isLoading: isLoadingSession,
        error: sessionError,
        updateSessionInDb,
        clearSessionError
    } = useSessionManager(passedSessionId, user, authLoading, gameStructureInstance);

    // Broadcast manager for teacher communications
    const broadcastManager = useBroadcastManager(currentDbSession?.id || null, 'host');

    // Team data management
    const {
        teams,
        teamDecisions,
        teamRoundData,
        isLoadingTeams,
        fetchTeamsForSession: fetchTeamsFromHook,
        fetchTeamDecisionsForSession: fetchTeamDecisionsFromHook,
        fetchTeamRoundDataForSession: fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly,
        resetTeamDecisionInDb,
    } = useTeamDataManager(currentDbSession?.id || null);

    // All phases for navigation
    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        return gameStructureInstance?.allPhases || [];
    }, [gameStructureInstance]);

    // Game controller
    const gameController = useGameController(
        currentDbSession,
        gameStructureInstance,
        updateSessionInDb,
        (phaseId) => processChoicePhaseDecisionsInternal(phaseId)
    );

    // Enhanced mutations for game processing
    const {
        execute: processInvestmentPayoffsExecute,
        isLoading: isProcessingPayoffs,
        error: payoffProcessingError
    } = useSupabaseMutation(
        async (data: { roundNumber: 1 | 2 | 3; currentPhaseId: string | null }) => {
            return processInvestmentPayoffsInternal(data.roundNumber, data.currentPhaseId);
        },
        {
            onSuccess: () => {
                console.log('[AppContext] Investment payoffs processed successfully');
                if (currentDbSession?.id) {
                    fetchTeamRoundDataFromHook(currentDbSession.id);
                }
            },
            onError: (error) => {
                console.error('[AppContext] Failed to process investment payoffs:', error);
            }
        }
    );

    const {
        execute: calculateKPIsExecute,
        isLoading: isCalculatingKPIs,
        error: kpiCalculationError
    } = useSupabaseMutation(
        async (roundNumber: 1 | 2 | 3) => {
            return calculateAndFinalizeRoundKPIsInternal(roundNumber);
        },
        {
            onSuccess: () => {
                console.log('[AppContext] Round KPIs calculated successfully');
                if (currentDbSession?.id) {
                    fetchTeamRoundDataFromHook(currentDbSession.id);
                }
            },
            onError: (error) => {
                console.error('[AppContext] Failed to calculate round KPIs:', error);
            }
        }
    );

    const {
        execute: resetGameProgressExecute,
        isLoading: isResettingGame,
        error: gameResetError
    } = useSupabaseMutation(
        async () => {
            return resetGameProgressInternal();
        },
        {
            onSuccess: () => {
                console.log('[AppContext] Game progress reset successfully');
                navigate('/dashboard', {replace: true});
            },
            onError: (error) => {
                console.error('[AppContext] Failed to reset game progress:', error);
            }
        }
    );

    // Enhanced team decision reset
    const {
        execute: resetTeamDecisionExecute,
        isLoading: isResettingDecision,
        error: decisionResetError
    } = useSupabaseMutation(
        async (data: { teamId: string; phaseId: string }) => {
            if (!currentDbSession?.id || currentDbSession.id === 'new') {
                throw new Error("Invalid session for decision reset");
            }
            return resetTeamDecisionInDb(currentDbSession.id, data.teamId, data.phaseId);
        },
        {
            onSuccess: (_, data) => {
                console.log(`[AppContext] Successfully reset decision for team ${data.teamId}, phase ${data.phaseId}`);
            },
            onError: (error, data) => {
                console.error(`[AppContext] Failed to reset decision for team ${data?.teamId}:`, error);
            }
        }
    );

    // Decision phase management
    const activateDecisionPhase = useCallback((durationSeconds: number = 300) => {
        console.log('[AppContext] Activating decision phase with duration:', durationSeconds);
        setIsDecisionPhaseActive(true);
        const endTime = Date.now() + (durationSeconds * 1000);
        setDecisionPhaseTimerEndTime(endTime);
    }, []);

    const deactivateDecisionPhase = useCallback(() => {
        console.log('[AppContext] Deactivating decision phase');
        setIsDecisionPhaseActive(false);
        setDecisionPhaseTimerEndTime(undefined);
    }, []);

    // Broadcast teacher state changes to student devices
    useEffect(() => {
        if (!broadcastManager || !gameController.currentPhaseNode || !gameController.currentSlideData) {
            return;
        }

        const currentPhase = gameController.currentPhaseNode;
        const currentSlide = gameController.currentSlideData;

        // Create teacher broadcast payload
        const teacherPayload: HostBroadcastPayload = {
            currentSlideId: currentSlide.id,
            currentPhaseId: currentPhase.id,
            currentPhaseType: currentPhase.phase_type,
            currentRoundNumber: currentPhase.round_number,
            isPlayingVideo: false, // This will be managed by video components
            isDecisionPhaseActive: isDecisionPhaseActive,
            decisionOptionsKey: currentPhase.interactive_data_key || currentPhase.id,
            decisionPhaseTimerEndTime: decisionPhaseTimerEndTime,
        };

        console.log('[AppContext] Broadcasting teacher state update:', teacherPayload);
        broadcastManager.sendTeacherStateUpdate(teacherPayload);

    }, [
        broadcastManager,
        gameController.currentPhaseNode,
        gameController.currentSlideData,
        isDecisionPhaseActive,
        decisionPhaseTimerEndTime
    ]);

    // Auto-activate decision phases for interactive slides
    useEffect(() => {
        const currentPhase = gameController.currentPhaseNode;
        const currentSlide = gameController.currentSlideData;

        if (!currentPhase || !currentSlide) return;

        // Check if this is an interactive slide that should activate decisions
        const isInteractiveSlide = currentSlide.type === 'interactive_invest' ||
            currentSlide.type === 'interactive_choice' ||
            currentSlide.type === 'interactive_double_down_prompt' ||
            currentSlide.type === 'interactive_double_down_select';

        if (isInteractiveSlide && currentPhase.is_interactive_player_phase && !isDecisionPhaseActive) {
            const timerDuration = currentSlide.timer_duration_seconds || 300; // Default 5 minutes
            console.log('[AppContext] Auto-activating decision phase for interactive slide');
            activateDecisionPhase(timerDuration);
        } else if (!isInteractiveSlide && isDecisionPhaseActive) {
            console.log('[AppContext] Auto-deactivating decision phase for non-interactive slide');
            deactivateDecisionPhase();
        }
    }, [gameController.currentPhaseNode, gameController.currentSlideData, isDecisionPhaseActive, activateDecisionPhase, deactivateDecisionPhase]);

    // KPI Effects Processing
    const applyKpiEffects = useCallback((currentKpisInput: TeamRoundData, effects: KpiEffect[]): TeamRoundData => {
        const updatedKpis = JSON.parse(JSON.stringify(currentKpisInput));
        effects.forEach(effect => {
            if (effect.timing === 'immediate') {
                const currentKpiName = `current_${effect.kpi}` as keyof TeamRoundData;
                const baseValue = (updatedKpis[currentKpiName] as number) ??
                    (updatedKpis[`start_${effect.kpi}` as keyof TeamRoundData] as number) ?? 0;
                let changeAmount = effect.change_value;
                if (effect.is_percentage_change) {
                    changeAmount = baseValue * (effect.change_value / 100);
                }
                (updatedKpis[currentKpiName] as number) = Math.round(baseValue + changeAmount);
            }
        });
        return updatedKpis;
    }, []);

    // Store permanent adjustments
    const storePermanentAdjustments = useCallback(async (
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        phaseSourceLabel: string
    ) => {
        const adjustmentsToInsert = effects
            .filter(eff => eff.timing === 'permanent_next_round_start' && eff.applies_to_rounds?.length)
            .flatMap(eff => (eff.applies_to_rounds!).map(roundNum => ({
                session_id: sessionId,
                team_id: teamId,
                applies_to_round_start: roundNum,
                kpi_key: eff.kpi,
                change_value: eff.change_value,
                is_percentage: eff.is_percentage_change || false,
                description: eff.description || `Permanent effect from ${phaseSourceLabel}`
            })));

        if (adjustmentsToInsert.length > 0) {
            await db.adjustments.create(adjustmentsToInsert);
        }
    }, []);

    // Ensure team round data exists
    const ensureTeamRoundData = useCallback(async (
        teamId: string,
        roundNumber: 1 | 2 | 3,
        sessionId: string
    ): Promise<TeamRoundData> => {
        if (!sessionId || sessionId === 'new') throw new Error("Invalid sessionId");

        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

        // Try to fetch from database using enhanced service
        try {
            const existingData = await db.kpis.getForTeamRound(sessionId, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                return existingData as TeamRoundData;
            }
        } catch (error) {
            // Continue to create new data if not found
            console.log('[AppContext] No existing round data found, creating new');
        }

        // Create new round data
        let start_capacity = 5000, start_orders = 6250, start_cost = 1200000, start_asp = 1000;

        if (roundNumber > 1) {
            const prevRoundKey = (roundNumber - 1) as 1 | 2;
            const prevRoundData = teamRoundData[teamId]?.[prevRoundKey];
            if (prevRoundData) {
                start_capacity = prevRoundData.current_capacity;
                start_orders = prevRoundData.current_orders;
                start_cost = prevRoundData.current_cost;
                start_asp = prevRoundData.current_asp;
            }
        }

        // Apply permanent adjustments
        const adjustments = await db.adjustments.getBySession(sessionId);
        const teamAdjustments = (adjustments || []).filter(adj =>
            adj.team_id === teamId && adj.applies_to_round_start === roundNumber
        );

        teamAdjustments.forEach(adj => {
            const baseValue = adj.kpi_key === 'capacity' ? start_capacity :
                adj.kpi_key === 'orders' ? start_orders :
                    adj.kpi_key === 'cost' ? start_cost : start_asp;

            const change = adj.is_percentage ? baseValue * (adj.change_value / 100) : adj.change_value;

            if (adj.kpi_key === 'capacity') start_capacity = Math.round(start_capacity + change);
            else if (adj.kpi_key === 'orders') start_orders = Math.round(start_orders + change);
            else if (adj.kpi_key === 'cost') start_cost = Math.round(start_cost + change);
            else if (adj.kpi_key === 'asp') start_asp = Math.round(start_asp + change);
        });

        const newRoundData = {
            session_id: sessionId,
            team_id: teamId,
            round_number: roundNumber,
            start_capacity, current_capacity: start_capacity,
            start_orders, current_orders: start_orders,
            start_cost, current_cost: start_cost,
            start_asp, current_asp: start_asp,
            revenue: 0, net_income: 0, net_margin: 0,
        };

        const insertedData = await db.kpis.create(newRoundData);
        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        return insertedData as TeamRoundData;
    }, [teamRoundData, setTeamRoundDataDirectly]);

    // Process choice phase decisions
    const processChoicePhaseDecisionsInternal = useCallback(async (phaseId: string) => {
        const currentPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (!currentDbSession?.id || !gameStructureInstance || !currentPhase ||
            !teams.length || currentPhase.phase_type !== 'choice') {
            return;
        }

        try {
            for (const team of teams) {
                const teamKpis = await ensureTeamRoundData(team.id, currentPhase.round_number as 1 | 2 | 3, currentDbSession.id);
                const decision = teamDecisions[team.id]?.[phaseId];
                const effectsToApply: KpiEffect[] = [];

                const optionsKey = currentPhase.interactive_data_key || phaseId;
                const options = gameStructureInstance.all_challenge_options[optionsKey] || [];
                const selectedOptionId = decision?.selected_challenge_option_id ||
                    options.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    const consequenceKey = `${phaseId}-conseq`;
                    const consequence = gameStructureInstance.all_consequences[consequenceKey]
                        ?.find(c => c.challenge_option_id === selectedOptionId);
                    if (consequence) effectsToApply.push(...consequence.effects);
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = applyKpiEffects(teamKpis, effectsToApply);
                    await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply,
                        `${currentPhase.label} - ${selectedOptionId}`);

                    await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                }
            }

            await fetchTeamRoundDataFromHook(currentDbSession.id);
        } catch (err) {
            console.error('[AppContext] Error processing choice decisions:', err);
            throw err;
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData,
        applyKpiEffects, storePermanentAdjustments, fetchTeamRoundDataFromHook, allPhasesInOrder]);

    // Process investment payoffs
    const processInvestmentPayoffsInternal = useCallback(async (
        roundNumber: 1 | 2 | 3,
        currentPhaseId: string | null
    ) => {
        if (!currentDbSession?.id || !gameStructureInstance || !teams.length) return;

        const payoffKey = `rd${roundNumber}-payoff`;
        const payoffs = gameStructureInstance.all_investment_payoffs[payoffKey] || [];

        for (const team of teams) {
            const teamKpis = await ensureTeamRoundData(team.id, roundNumber, currentDbSession.id);
            const investPhaseId = `rd${roundNumber}-invest`;
            const investmentDecision = teamDecisions[team.id]?.[investPhaseId];
            const selectedInvestmentIds = investmentDecision?.selected_investment_ids || [];

            const effectsToApply: KpiEffect[] = [];
            selectedInvestmentIds.forEach(investId => {
                const payoff = payoffs.find(p => p.investment_option_id === investId);
                if (payoff) effectsToApply.push(...payoff.effects);
            });

            // Handle unspent budget for RD1
            if (roundNumber === 1 && currentPhaseId === 'rd1-payoff') {
                const budget = gameStructureInstance.investment_phase_budgets['rd1-invest'];
                const spent = investmentDecision?.total_spent_budget ?? 0;
                const unspent = budget - spent;
                if (unspent > 0) {
                    effectsToApply.push({
                        kpi: 'cost',
                        change_value: -unspent,
                        timing: 'immediate',
                        description: 'RD-1 Unspent Budget Cost Reduction'
                    });
                }
            }

            if (effectsToApply.length > 0) {
                const updatedKpis = applyKpiEffects(teamKpis, effectsToApply);
                await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply,
                    `RD${roundNumber} Investment Payoff`);

                await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
            }
        }
    }, [currentDbSession, teams, teamDecisions, gameStructureInstance, ensureTeamRoundData,
        applyKpiEffects, storePermanentAdjustments]);

    // Calculate and finalize round KPIs
    const calculateAndFinalizeRoundKPIsInternal = useCallback(async (roundNumber: 1 | 2 | 3) => {
        if (!currentDbSession?.id || !teams.length) return;

        for (const team of teams) {
            const kpis = teamRoundData[team.id]?.[roundNumber];
            if (kpis) {
                const revenue = kpis.current_orders * kpis.current_asp;
                const netIncome = revenue - kpis.current_cost;
                const netMargin = revenue > 0 ? netIncome / revenue : 0;

                await db.kpis.update(kpis.id, {
                    revenue: Math.round(revenue),
                    net_income: Math.round(netIncome),
                    net_margin: parseFloat(netMargin.toFixed(4))
                });
            }
        }

        await fetchTeamRoundDataFromHook(currentDbSession.id);
    }, [currentDbSession, teams, teamRoundData, fetchTeamRoundDataFromHook]);

    // Reset game progress
    const resetGameProgressInternal = useCallback(async () => {
        if (!currentDbSession?.id || !gameStructureInstance) return;

        const confirmReset = window.confirm("Are you sure you want to reset all game progress?");
        if (!confirmReset) return;

        // Use enhanced database services for cleanup
        await db.adjustments.deleteBySession(currentDbSession.id);
        await db.kpis.getBySession(currentDbSession.id).then(async (kpis) => {
            for (const kpi of kpis) {
                await db.kpis.update(kpi.id, { /* reset values */ });
            }
        });
        await db.decisions.getBySession(currentDbSession.id).then(async (decisions) => {
            for (const decision of decisions) {
                await db.decisions.delete(currentDbSession.id, decision.team_id, decision.phase_id);
            }
        });

        const initialPhase = gameStructureInstance.allPhases[0];
        await updateSessionInDb({
            current_phase_id: initialPhase?.id || null,
            current_slide_id_in_phase: initialPhase ? 0 : null,
            is_playing: false,
            is_complete: false,
            teacher_notes: {}
        });

        await fetchTeamsFromHook(currentDbSession.id);
        await fetchTeamDecisionsFromHook(currentDbSession.id);
        await fetchTeamRoundDataFromHook(currentDbSession.id);

        if (initialPhase) await gameController.selectPhase(initialPhase.id);

        alert("Game progress has been reset.");
    }, [currentDbSession, gameStructureInstance, updateSessionInDb, fetchTeamsFromHook,
        fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook, gameController]);

    // Enhanced nextSlide with processing
    const nextSlideWithProcessing = useCallback(async () => {
        const currentPhase = gameController.currentPhaseNode;
        const currentSlide = gameController.currentSlideData;

        if (currentPhase && currentSlide &&
            (gameController.currentSlideIdInPhase === currentPhase.slide_ids.length - 1)) {

            if (currentPhase.phase_type === 'payoff' && currentPhase.round_number > 0) {
                await processInvestmentPayoffsExecute({
                    roundNumber: currentPhase.round_number as 1 | 2 | 3,
                    currentPhaseId: currentPhase.id
                });
            } else if (currentPhase.phase_type === 'kpi' && currentPhase.round_number > 0) {
                await calculateKPIsExecute(currentPhase.round_number as 1 | 2 | 3);
            }
        }

        await gameController.nextSlide();
    }, [gameController, processInvestmentPayoffsExecute, calculateKPIsExecute]);

    // Wrapper for team fetching
    const fetchWrapperTeams = useCallback(async () => {
        if (currentDbSession?.id && currentDbSession.id !== 'new') {
            await fetchTeamsFromHook(currentDbSession.id);
        }
    }, [currentDbSession?.id, fetchTeamsFromHook]);

    // Wrapper for team decision reset
    const resetWrapperTeamDecision = useCallback(async (teamId: string, phaseId: string) => {
        await resetTeamDecisionExecute({ teamId, phaseId });
    }, [resetTeamDecisionExecute]);

    // Combined app state
    const combinedAppState: AppState = useMemo(() => ({
        currentSessionId: currentDbSession?.id || null,
        gameStructure: gameStructureInstance,
        currentPhaseId: gameController.currentPhaseNode?.id || null,
        currentSlideIdInPhase: currentDbSession?.current_slide_id_in_phase ??
            (gameController.currentPhaseNode === gameStructureInstance?.welcome_phases[0] ? 0 : null),
        hostNotes: gameController.teacherNotes,
        isPlaying: false, // Removed - no longer managed here
        teams: teams,
        teamDecisions: teamDecisions,
        teamRoundData: teamRoundData,
        isPlayerWindowOpen: false, // Moved to local component state
        isLoading: isLoadingSession || authLoading || isLoadingTeams ||
            isProcessingPayoffs || isCalculatingKPIs || isResettingGame ||
            !gameController.currentPhaseNode,
        error: sessionError || payoffProcessingError || kpiCalculationError ||
            gameResetError || decisionResetError,
        currentHostAlert: gameController.currentHostAlert,
    }), [currentDbSession, gameStructureInstance, gameController, teams, teamDecisions, teamRoundData,
        isLoadingSession, authLoading, isLoadingTeams, isProcessingPayoffs, isCalculatingKPIs,
        isResettingGame, sessionError, payoffProcessingError, kpiCalculationError,
        gameResetError, decisionResetError]);

    // Load team data when session changes
    useEffect(() => {
        if (currentDbSession?.id && currentDbSession.id !== 'new' && !isLoadingSession && !authLoading) {
            fetchWrapperTeams();
            fetchTeamDecisionsFromHook(currentDbSession.id);
            fetchTeamRoundDataFromHook(currentDbSession.id);
        }
    }, [currentDbSession?.id, isLoadingSession, authLoading, fetchWrapperTeams,
        fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook]);

    const contextValue: AppContextProps = useMemo(() => ({
        state: combinedAppState,
        currentPhaseNode: gameController.currentPhaseNode,
        currentSlideData: gameController.currentSlideData,
        allPhasesInOrder,
        selectPhase: gameController.selectPhase,
        updateHostNotesForCurrentSlide: gameController.updateHostNotesForCurrentSlide,
        nextSlide: nextSlideWithProcessing,
        previousSlide: gameController.previousSlide,
        clearHostAlert: gameController.clearHostAlert,
        setCurrentHostAlertState: gameController.setCurrentHostAlertState,
        isLoadingSession,
        sessionError,
        clearSessionError,
        teams,
        teamDecisions,
        teamRoundData,
        isLoadingTeams,
        fetchTeamsForSession: fetchWrapperTeams,
        resetTeamDecisionForPhase: resetWrapperTeamDecision,
        processInvestmentPayoffs: (roundNumber, currentPhaseId) =>
            processInvestmentPayoffsExecute({ roundNumber, currentPhaseId }),
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress: () => resetGameProgressExecute(),
        isLoadingProcessingDecisions: isProcessingPayoffs || isCalculatingKPIs || isResettingDecision,
        activateDecisionPhase,
        deactivateDecisionPhase,
        isDecisionPhaseActive,
    }), [combinedAppState, gameController, allPhasesInOrder, nextSlideWithProcessing, isLoadingSession,
        sessionError, clearSessionError, teams, teamDecisions, teamRoundData, isLoadingTeams,
        fetchWrapperTeams, resetWrapperTeamDecision, processInvestmentPayoffsExecute,
        calculateKPIsExecute, resetGameProgressExecute, isProcessingPayoffs, isCalculatingKPIs,
        isResettingDecision, activateDecisionPhase, deactivateDecisionPhase, isDecisionPhaseActive]);

    // Loading state
    if (contextValue.state.isLoading && (!passedSessionId || passedSessionId === 'new' ||
        !currentDbSession?.id || !gameController.currentPhaseNode)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="ml-4 text-lg font-semibold text-gray-700">
                    {authLoading ? "Authenticating..." :
                        (passedSessionId === 'new' && !contextValue.state.error) ? "Creating New Session..." :
                            !gameController.currentPhaseNode ? "Loading Game Controller..." :
                                "Initializing Simulator..."}
                </p>
            </div>
        );
    }

    // Error state
    if (contextValue.state.error && (passedSessionId === 'new' ||
        (contextValue.state.currentSessionId && !gameController.currentPhaseNode &&
            contextValue.state.currentSessionId !== 'new'))) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                    <h2 className="text-2xl font-bold text-red-700 mb-2">Initialization Error</h2>
                    <p className="text-gray-600 mb-6">{contextValue.state.error}</p>
                    <button
                        onClick={() => {
                            clearSessionError();
                            navigate('/dashboard', {replace: true});
                        }}
                        className="bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};