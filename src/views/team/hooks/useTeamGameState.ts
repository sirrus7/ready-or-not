// src/views/team/hooks/useTeamGameState.ts
// CRITICAL FIX: Team KPI Real-time Updates + Impact Cards

import {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {db, useRealtimeSubscription} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {Slide, GameStructure} from '@shared/types/game';
import {TeamRoundData, PermanentKpiAdjustment} from '@shared/types/database';

interface useTeamGameStateProps {
    sessionId: string | null;
    loggedInTeamId: string | null;
}

interface useTeamGameStateReturn {
    currentActiveSlide: Slide | null;
    isDecisionTime: boolean;
    currentTeamKpis: TeamRoundData | null;
    isLoadingKpis: boolean;
    gameStructure: GameStructure;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    decisionResetTrigger: number;
    permanentAdjustments: PermanentKpiAdjustment[];
    isLoadingAdjustments: boolean;
    // Manual refresh functions for fallback
    fetchCurrentKpis: () => Promise<void>;
    fetchAdjustments: () => Promise<void>;
}

export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [isLoadingKpis, setIsLoadingKpis] = useState<boolean>(false);
    const [decisionResetTrigger, setDecisionResetTrigger] = useState<number>(0);
    const [permanentAdjustments, setPermanentAdjustments] = useState<PermanentKpiAdjustment[]>([]);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState<boolean>(false);

    // ========================================================================
    // STABLE REFS - Never change, prevent subscription recreation
    // ========================================================================
    const teamIdRef = useRef<string | null>(loggedInTeamId);
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Update ref when teamId changes
    useEffect(() => {
        teamIdRef.current = loggedInTeamId;
    }, [loggedInTeamId]);

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    const updateSlideState = useCallback((slideId: number) => {
        console.log(`🎬 [useTeamGameState] Slide updated to ID ${slideId}`);
        const slide = gameStructure.slides.find(s => s.id === slideId);
        if (slide) {
            setCurrentActiveSlide(slide);
            setIsDecisionTime(slide.type.startsWith('interactive_'));
        }
    }, [gameStructure.slides]);

    // ========================================================================
    // DATA FETCHING FUNCTIONS
    // ========================================================================
    const fetchCurrentKpis = useCallback(async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) return;

        try {
            setIsLoadingKpis(true);
            console.log(`📊 [useTeamGameState] Fetching KPIs for team ${loggedInTeamId}, round ${currentActiveSlide.round_number}`);

            const kpiData = await db.kpis.getForTeamRound(
                sessionId,
                loggedInTeamId,
                currentActiveSlide.round_number
            );

            if (kpiData) {
                console.log(`✅ [useTeamGameState] Loaded KPIs for round ${currentActiveSlide.round_number}:`, kpiData);
                setCurrentTeamKpis(kpiData as TeamRoundData);
            } else {
                console.log(`⚠️ [useTeamGameState] No KPI data found for round ${currentActiveSlide.round_number}`);
                setCurrentTeamKpis(null);
            }
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide]);

    const fetchAdjustments = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) return;

        try {
            setIsLoadingAdjustments(true);
            console.log(`🎯 [useTeamGameState] Fetching permanent adjustments for team ${loggedInTeamId}`);

            const adjustments = await db.adjustments.getByTeam(sessionId, loggedInTeamId);

            console.log(`✅ [useTeamGameState] Loaded ${adjustments.length} permanent adjustments`);
            setPermanentAdjustments(adjustments);
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching adjustments:', error);
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingAdjustments(false);
        }
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // REAL-TIME EVENT HANDLERS - STABLE CALLBACKS
    // ========================================================================
    const handleSlideUpdate = useCallback((payload: any) => {
        console.log('🔔 [useTeamGameState] Session slide update received');
        const newSlideIndex = payload.new?.current_slide_index;
        if (newSlideIndex !== null && newSlideIndex !== undefined) {
            // Convert slide index to slide ID
            const slide = gameStructure.slides[newSlideIndex];
            if (slide) {
                updateSlideState(slide.id);
            }
        }
        setConnectionStatus('connected');
    }, [updateSlideState, gameStructure.slides]);

    const handleDecisionDelete = useCallback((payload: any) => {
        console.log(`🔔 [useTeamGameState] Decision deleted - triggering refresh`);

        // Clear any existing timeout
        if (resetDebounceRef.current) {
            clearTimeout(resetDebounceRef.current);
        }

        // Debounced reset trigger
        resetDebounceRef.current = setTimeout(() => {
            console.log('🔄 [useTeamGameState] Triggering reset for team app');
            setDecisionResetTrigger(prev => prev + 1);
        }, 300);
    }, []);

    // CRITICAL FIX: KPI Update Handler
    const handleKpiUpdate = useCallback((payload: any) => {
        const currentTeamId = teamIdRef.current;
        const updatedKpis = payload.new as TeamRoundData;

        console.log('🔔 [useTeamGameState] KPI update received:', {
            eventType: payload.eventType,
            teamId: updatedKpis?.team_id,
            currentTeamId,
            roundNumber: updatedKpis?.round_number,
            capacity: updatedKpis?.current_capacity,
            orders: updatedKpis?.current_orders,
            cost: updatedKpis?.current_cost,
            asp: updatedKpis?.current_asp
        });

        // Only update if it's for our team
        if (updatedKpis?.team_id === currentTeamId) {
            console.log('✅ [useTeamGameState] KPI update is for our team - applying update');

            // CRITICAL: Always update KPIs when they change
            setCurrentTeamKpis(updatedKpis);

            // Also refresh adjustments in case permanent effects were added
            fetchAdjustments();
        }
    }, [fetchAdjustments]);

    // CRITICAL FIX: Adjustment Update Handler
    const handleAdjustmentUpdate = useCallback((payload: any) => {
        const currentTeamId = teamIdRef.current;
        const adjustment = payload.new as PermanentKpiAdjustment;

        console.log('🔔 [useTeamGameState] Adjustment update received:', {
            eventType: payload.eventType,
            teamId: adjustment?.team_id,
            currentTeamId,
            challengeId: adjustment?.challenge_id,
            kpiKey: adjustment?.kpi_key,
            value: adjustment?.change_value
        });

        if (adjustment?.team_id === currentTeamId) {
            console.log('✅ [useTeamGameState] Adjustment update is for our team - refreshing');
            fetchAdjustments();
        }
    }, [fetchAdjustments]);

    // ========================================================================
    // REAL-TIME SUBSCRIPTIONS - CRITICAL FIXES
    // ========================================================================

    // 1. Session/Slide Updates
    useRealtimeSubscription(
        `team-slide-${sessionId}`,
        {
            table: 'sessions',
            event: 'UPDATE',
            filter: `id=eq.${sessionId}`,
            onchange: handleSlideUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 2. Decision Deletes (for reset handling)
    useRealtimeSubscription(
        `team-deletes-${sessionId}`,
        {
            table: 'team_decisions',
            event: 'DELETE',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleDecisionDelete
        },
        !!sessionId && !!loggedInTeamId
    );

    // 3. CRITICAL FIX: KPI Updates - More specific filter
    useRealtimeSubscription(
        `team-kpis-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            filter: `session_id=eq.${sessionId}`,
            onchange: handleKpiUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 4. CRITICAL FIX: Permanent Adjustments - More specific filter
    useRealtimeSubscription(
        `team-adj-${sessionId}-${loggedInTeamId}`,
        {
            table: 'permanent_kpi_adjustments',
            event: '*', // Listen to all events
            filter: `session_id=eq.${sessionId}`,
            onchange: handleAdjustmentUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // ========================================================================
    // EFFECTS - Initial data loading and slide-based updates
    // ========================================================================

    // Load initial data when session/team changes
    useEffect(() => {
        if (sessionId && loggedInTeamId) {
            console.log(`🚀 [useTeamGameState] Initializing for session ${sessionId}, team ${loggedInTeamId}`);
            fetchCurrentKpis();
            fetchAdjustments();
        }
    }, [sessionId, loggedInTeamId, fetchCurrentKpis, fetchAdjustments]);

    // CRITICAL: Refresh KPIs when slide changes (especially for consequence slides)
    useEffect(() => {
        if (currentActiveSlide && sessionId && loggedInTeamId) {
            console.log(`🎬 [useTeamGameState] Slide changed to ${currentActiveSlide.id} (${currentActiveSlide.type}), refreshing KPIs`);

            // Always refresh on slide change - this ensures we get latest data
            // especially important for consequence slides
            fetchCurrentKpis();
        }
    }, [currentActiveSlide, fetchCurrentKpis]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (resetDebounceRef.current) {
                clearTimeout(resetDebounceRef.current);
            }
        };
    }, []);

    // ========================================================================
    // RETURN STATE AND FUNCTIONS
    // ========================================================================
    return {
        // Current game state
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        permanentAdjustments,
        gameStructure,

        // Loading states
        isLoadingKpis,
        isLoadingAdjustments,

        // Connection status
        connectionStatus,

        // Reset handling
        decisionResetTrigger,

        // Manual refresh functions (for fallback/debugging)
        fetchCurrentKpis,
        fetchAdjustments
    };
};
