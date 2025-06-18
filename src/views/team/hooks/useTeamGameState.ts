// src/views/team/hooks/useTeamGameState.ts
// STABLE VERSION - Connections created once, no endless loops

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
}

export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    // ========================================================================
    // STATE
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
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fallbackPollRef = useRef<NodeJS.Timeout | null>(null);
    const sessionIdRef = useRef<string | null>(sessionId);
    const teamIdRef = useRef<string | null>(loggedInTeamId);

    // Keep refs updated but don't trigger re-renders
    sessionIdRef.current = sessionId;
    teamIdRef.current = loggedInTeamId;

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // ========================================================================
    // STABLE FUNCTIONS - Never recreate to prevent subscription churn
    // ========================================================================
    const updateSlideState = useCallback((slideIndex: number) => {
        const slide = gameStructure.slides.find(s => s.id === slideIndex);
        if (!slide) {
            console.warn(`[useTeamGameState] ⚠️  Slide not found for index: ${slideIndex}`);
            return;
        }

        console.log(`[useTeamGameState] 🎯 Updating to slide: ${slide.title} (${slide.type})`);
        setCurrentActiveSlide(slide);

        const isInteractive = ['interactive_invest', 'interactive_choice', 'interactive_double_down_prompt', 'interactive_double_down_select'].includes(slide.type);
        setIsDecisionTime(isInteractive);
    }, [gameStructure.slides]);

    // ========================================================================
    // FETCH FUNCTIONS - Stable references
    // ========================================================================
    const fetchSessionData = useCallback(async () => {
        const currentSessionId = sessionIdRef.current;
        if (!currentSessionId) return;

        try {
            const sessionData = await db.sessions.getById(currentSessionId);
            if (sessionData?.current_slide_index !== null && sessionData?.current_slide_index !== undefined) {
                updateSlideState(sessionData.current_slide_index);
            }
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching session:', error);
        }
    }, [updateSlideState]);

    const fetchTeamKpis = useCallback(async () => {
        const currentSessionId = sessionIdRef.current;
        const currentTeamId = teamIdRef.current;

        if (!currentSessionId || !currentTeamId) {
            setCurrentTeamKpis(null);
            return;
        }

        setIsLoadingKpis(true);
        try {
            // Get current slide from state, not from changing dependencies
            const currentSlide = currentActiveSlide;
            if (!currentSlide || currentSlide.round_number === 0) {
                setCurrentTeamKpis(null);
                return;
            }

            const kpiData = await db.kpis.getForTeamRound(currentSessionId, currentTeamId, currentSlide.round_number as 1 | 2 | 3);
            setCurrentTeamKpis(kpiData as TeamRoundData || null);
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [currentActiveSlide]);

    const fetchAdjustments = useCallback(async () => {
        const currentSessionId = sessionIdRef.current;
        const currentTeamId = teamIdRef.current;

        if (!currentSessionId || !currentTeamId) {
            setPermanentAdjustments([]);
            return;
        }

        setIsLoadingAdjustments(true);
        try {
            const adjustments = await db.adjustments.getByTeam(currentSessionId, currentTeamId);
            setPermanentAdjustments(adjustments || []);
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching adjustments:', error);
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingAdjustments(false);
        }
    }, []);

    // ========================================================================
    // COMPLETELY STABLE EVENT HANDLERS - Never change reference
    // ========================================================================
    const handleSlideUpdate = useCallback((payload: any) => {
        console.log('🔔 [useTeamGameState] Session update received');
        const newSlideIndex = payload.new?.current_slide_index;
        if (newSlideIndex !== null && newSlideIndex !== undefined) {
            updateSlideState(newSlideIndex);
        }
        setConnectionStatus('connected');
    }, [updateSlideState]);

    const handleDecisionDelete = useCallback((payload: any) => {
        console.log(`🔔 [useTeamGameState] Decision deleted in session - triggering refresh`);

        // Clear any existing timeout
        if (resetDebounceRef.current) {
            clearTimeout(resetDebounceRef.current);
        }

        // Debounced reset trigger
        resetDebounceRef.current = setTimeout(() => {
            console.log('🔄 [useTeamGameState] Triggering reset for team app');
            setDecisionResetTrigger(prev => prev + 1);
        }, 300); // Longer debounce to prevent rapid-fire

    }, []); // ✅ Empty deps - completely stable

    const handleKpiUpdate = useCallback((payload: any) => {
        const currentTeamId = teamIdRef.current;
        const updatedKpis = payload.new as TeamRoundData;

        if (updatedKpis?.team_id === currentTeamId) {
            console.log('🔔 [useTeamGameState] KPI update for our team');

            // Use a ref to get current slide to avoid dependency
            setCurrentTeamKpis(prev => {
                // Only update if it's for the current round
                const slide = currentActiveSlide;
                if (slide && updatedKpis.round_number === slide.round_number) {
                    return updatedKpis;
                }
                return prev;
            });
        }
    }, []); // ✅ Empty deps - completely stable

    const handleAdjustmentUpdate = useCallback((payload: any) => {
        const currentTeamId = teamIdRef.current;
        const adjustment = payload.new as PermanentKpiAdjustment;

        if (adjustment?.team_id === currentTeamId) {
            console.log('🔔 [useTeamGameState] Adjustment update for our team');
            fetchAdjustments();
        }
    }, [fetchAdjustments]);

    // ========================================================================
    // STABLE REAL-TIME SUBSCRIPTIONS - Only created once!
    // ========================================================================

    // 1. Session/Slide Updates - STABLE
    useRealtimeSubscription(
        `team-slide-${sessionId}`, // Simple unique name
        {
            table: 'sessions',
            event: 'UPDATE',
            filter: `id=eq.${sessionId}`,
            onchange: handleSlideUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 2. Decision Deletes - STABLE
    useRealtimeSubscription(
        `team-deletes-${sessionId}`, // Simple unique name
        {
            table: 'team_decisions',
            event: 'DELETE',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleDecisionDelete
        },
        !!sessionId && !!loggedInTeamId
    );

    // 3. KPI Updates - STABLE
    useRealtimeSubscription(
        `team-kpis-${sessionId}`, // Simple unique name
        {
            table: 'team_round_data',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleKpiUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 4. Adjustment Updates - STABLE
    useRealtimeSubscription(
        `team-adj-${sessionId}`, // Simple unique name
        {
            table: 'permanent_kpi_adjustments',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleAdjustmentUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // ========================================================================
    // MINIMAL EFFECTS - Only run when actually needed
    // ========================================================================

    // Initial data fetch - only when session/team changes
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) return;

        console.log(`[useTeamGameState] 🚀 Initial setup: ${sessionId.substring(0, 8)}/${loggedInTeamId}`);

        // Fetch initial data
        fetchSessionData();
        fetchAdjustments();
        // Note: KPIs fetched when slide is determined

    }, [sessionId, loggedInTeamId]); // Only these two dependencies

    // Fetch KPIs when slide changes to decision slides
    useEffect(() => {
        if (currentActiveSlide && isDecisionTime) {
            console.log('[useTeamGameState] 📊 Decision slide detected, fetching KPIs');
            fetchTeamKpis();
        }
    }, [currentActiveSlide?.id, isDecisionTime]); // Only when slide actually changes

    // Conservative fallback polling
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            if (fallbackPollRef.current) {
                clearInterval(fallbackPollRef.current);
                fallbackPollRef.current = null;
            }
            return;
        }

        // Very light fallback polling
        fallbackPollRef.current = setInterval(() => {
            console.log('[useTeamGameState] 🔄 Fallback poll (30s)');
            fetchSessionData();
        }, 30000); // 30 seconds

        return () => {
            if (fallbackPollRef.current) {
                clearInterval(fallbackPollRef.current);
                fallbackPollRef.current = null;
            }
            if (resetDebounceRef.current) {
                clearTimeout(resetDebounceRef.current);
                resetDebounceRef.current = null;
            }
        };
    }, [sessionId, loggedInTeamId]); // Only these dependencies

    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure,
        connectionStatus,
        decisionResetTrigger,
        permanentAdjustments,
        isLoadingAdjustments,
    };
};
