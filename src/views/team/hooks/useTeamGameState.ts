// src/views/team/hooks/useTeamGameState.ts
// CRITICAL FIX: Stabilized real-time subscriptions with proper dependency management

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
    // CRITICAL FIX: STABLE REFS TO PREVENT INFINITE LOOPS
    // ========================================================================
    const stableSessionId = useRef<string | null>(sessionId);
    const stableTeamId = useRef<string | null>(loggedInTeamId);
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // Update refs when props change (but don't trigger re-renders)
    useEffect(() => {
        stableSessionId.current = sessionId;
        stableTeamId.current = loggedInTeamId;
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // CRITICAL FIX: STABILIZED HELPER FUNCTIONS
    // ========================================================================
    const updateSlideState = useCallback((slideId: number) => {
        console.log(`🎬 [useTeamGameState] Slide updated to ID ${slideId}`);
        const slide = gameStructure.slides.find(s => s.id === slideId);
        if (slide) {
            setCurrentActiveSlide(slide);
            setIsDecisionTime(slide.type.startsWith('interactive_'));
        }
    }, [gameStructure.slides]);

    // ========================================================================
    // CRITICAL FIX: DEBOUNCED DATA FETCHING TO PREVENT LOOPS
    // ========================================================================
    const fetchCurrentKpis = useCallback(async () => {
        const currentSessionId = stableSessionId.current;
        const currentTeamId = stableTeamId.current;

        if (!currentSessionId || !currentTeamId || !currentActiveSlide) return;

        // Clear any existing debounce
        if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
        }

        // Debounce the actual fetch
        fetchDebounceRef.current = setTimeout(async () => {
            try {
                setIsLoadingKpis(true);
                console.log(`📊 [useTeamGameState] Fetching KPIs for team ${currentTeamId}, round ${currentActiveSlide.round_number}`);

                const kpiData = await db.kpis.getForTeamRound(
                    currentSessionId,
                    currentTeamId,
                    currentActiveSlide.round_number
                );

                if (kpiData) {
                    console.log(`✅ [useTeamGameState] Loaded KPIs for round ${currentActiveSlide.round_number}`);
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
        }, 100); // 100ms debounce
    }, [currentActiveSlide]); // CRITICAL: Only depend on currentActiveSlide

    const fetchAdjustments = useCallback(async () => {
        const currentSessionId = stableSessionId.current;
        const currentTeamId = stableTeamId.current;

        if (!currentSessionId || !currentTeamId) return;

        try {
            setIsLoadingAdjustments(true);
            console.log(`🎯 [useTeamGameState] Fetching permanent adjustments for team ${currentTeamId}`);

            const adjustments = await db.adjustments.getByTeam(currentSessionId, currentTeamId);

            console.log(`✅ [useTeamGameState] Loaded ${adjustments.length} permanent adjustments`);
            setPermanentAdjustments(adjustments);
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching adjustments:', error);
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingAdjustments(false);
        }
    }, []); // CRITICAL: Empty dependency array - function is stable

    // ========================================================================
    // CRITICAL FIX: STABILIZED REAL-TIME EVENT HANDLERS
    // ========================================================================
    const handleSlideUpdate = useCallback((payload: any) => {
        console.log('🔔 [useTeamGameState] Session slide update received');
        const newSlideIndex = payload.new?.current_slide_index;
        if (newSlideIndex !== null && newSlideIndex !== undefined) {
            const slide = gameStructure.slides[newSlideIndex];
            if (slide) {
                updateSlideState(slide.id);
            }
        }
        setConnectionStatus('connected');
    }, [updateSlideState, gameStructure.slides]);

    const handleDecisionDelete = useCallback((payload: any) => {
        console.log(`🔔 [useTeamGameState] Decision deleted - triggering refresh`);

        if (resetDebounceRef.current) {
            clearTimeout(resetDebounceRef.current);
        }

        resetDebounceRef.current = setTimeout(() => {
            console.log('🔄 [useTeamGameState] Triggering reset for team app');
            setDecisionResetTrigger(prev => prev + 1);
        }, 300);
    }, []);

    // CRITICAL FIX: KPI Update Handler - No recursive calls
    const handleKpiUpdate = useCallback((payload: any) => {
        const currentTeamId = stableTeamId.current;
        const updatedKpis = payload.new as TeamRoundData;

        console.log('🔔 [useTeamGameState] KPI update received:', {
            eventType: payload.eventType,
            teamId: updatedKpis?.team_id,
            currentTeamId,
            roundNumber: updatedKpis?.round_number,
        });

        if (updatedKpis?.team_id === currentTeamId) {
            console.log('✅ [useTeamGameState] KPI update is for our team - applying update');
            setCurrentTeamKpis(updatedKpis);
        }
    }, []);

    // CRITICAL FIX: Adjustment Update Handler - No recursive calls
    const handleAdjustmentUpdate = useCallback((payload: any) => {
        const currentTeamId = stableTeamId.current;
        const currentSessionId = stableSessionId.current;
        const adjustment = payload.new as PermanentKpiAdjustment;

        console.log('🔔 [useTeamGameState] Adjustment update received:', {
            eventType: payload.eventType,
            teamId: adjustment?.team_id,
            currentTeamId,
            challengeId: adjustment?.challenge_id,
        });

        if (adjustment?.session_id === currentSessionId && adjustment?.team_id === currentTeamId) {
            console.log('✅ [useTeamGameState] Adjustment update is for our team - refreshing adjustments');

            // Direct state update instead of fetching to prevent loops
            if (payload.eventType === 'INSERT') {
                setPermanentAdjustments(prev => [...prev, adjustment]);
            } else if (payload.eventType === 'UPDATE') {
                setPermanentAdjustments(prev => prev.map(adj =>
                    adj.id === adjustment.id ? adjustment : adj
                ));
            } else if (payload.eventType === 'DELETE') {
                setPermanentAdjustments(prev => prev.filter(adj => adj.id !== adjustment.id));
            }
        }
    }, []);

    // ========================================================================
    // CRITICAL FIX: STABILIZED REAL-TIME SUBSCRIPTIONS
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

    // 3. CRITICAL FIX: KPI Updates - Team-specific filter
    useRealtimeSubscription(
        `team-kpis-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleKpiUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 4. CRITICAL FIX: Permanent Adjustments - Team-specific filter
    useRealtimeSubscription(
        `team-adj-${sessionId}-${loggedInTeamId}`,
        {
            table: 'permanent_kpi_adjustments',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleAdjustmentUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // ========================================================================
    // EFFECTS - Initial data loading and controlled updates
    // ========================================================================

    // Load initial data when session/team changes
    useEffect(() => {
        if (sessionId && loggedInTeamId) {
            console.log(`🚀 [useTeamGameState] Initializing for session ${sessionId}, team ${loggedInTeamId}`);
            fetchAdjustments();
        }
    }, [sessionId, loggedInTeamId, fetchAdjustments]);

    // CRITICAL: Controlled KPI refresh on slide changes
    useEffect(() => {
        if (currentActiveSlide && sessionId && loggedInTeamId) {
            console.log(`🎬 [useTeamGameState] Slide changed to ${currentActiveSlide.id}, refreshing KPIs`);
            fetchCurrentKpis();
        }
    }, [currentActiveSlide?.id, fetchCurrentKpis]); // CRITICAL: Only depend on slide ID

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (resetDebounceRef.current) {
                clearTimeout(resetDebounceRef.current);
            }
            if (fetchDebounceRef.current) {
                clearTimeout(fetchDebounceRef.current);
            }
        };
    }, []);

    // ========================================================================
    // RETURN STATE AND FUNCTIONS
    // ========================================================================
    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        permanentAdjustments,
        gameStructure,
        isLoadingKpis,
        isLoadingAdjustments,
        connectionStatus,
        decisionResetTrigger,
        fetchCurrentKpis,
        fetchAdjustments
    };
};
