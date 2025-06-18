// src/views/team/hooks/useTeamGameState.ts
// SIMPLE PRODUCTION VERSION - No complex tracking, just works

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
    // SIMPLE STATE
    // ========================================================================
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [isLoadingKpis, setIsLoadingKpis] = useState<boolean>(false);
    const [decisionResetTrigger, setDecisionResetTrigger] = useState<number>(0);
    const [permanentAdjustments, setPermanentAdjustments] = useState<PermanentKpiAdjustment[]>([]);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState<boolean>(false);

    // Simple refs for cleanup only
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fallbackPollRef = useRef<NodeJS.Timeout | null>(null);

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // ========================================================================
    // SIMPLE HELPER FUNCTIONS
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

    const fetchSessionData = useCallback(async () => {
        if (!sessionId) return;
        try {
            const sessionData = await db.sessions.getById(sessionId);
            if (sessionData?.current_slide_index !== null && sessionData?.current_slide_index !== undefined) {
                updateSlideState(sessionData.current_slide_index);
            }
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching session:', error);
        }
    }, [sessionId, updateSlideState]);

    const fetchTeamKpis = useCallback(async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) {
            setCurrentTeamKpis(null);
            return;
        }

        setIsLoadingKpis(true);
        try {
            const roundNumber = currentActiveSlide.round_number;
            if (roundNumber === 0) {
                setCurrentTeamKpis(null);
                return;
            }

            const kpiData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, roundNumber as 1 | 2 | 3);
            setCurrentTeamKpis(kpiData as TeamRoundData || null);
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide?.round_number]);

    const fetchAdjustments = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) {
            setPermanentAdjustments([]);
            return;
        }

        setIsLoadingAdjustments(true);
        try {
            const adjustments = await db.adjustments.getByTeam(sessionId, loggedInTeamId);
            setPermanentAdjustments(adjustments || []);
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching adjustments:', error);
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingAdjustments(false);
        }
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // SIMPLE EVENT HANDLERS
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

        // SIMPLE: Any delete in our session = trigger refresh
        // Let the submission hook figure out if it affects them
        if (resetDebounceRef.current) clearTimeout(resetDebounceRef.current);

        resetDebounceRef.current = setTimeout(() => {
            console.log('🔄 [useTeamGameState] Triggering reset for team app');
            setDecisionResetTrigger(prev => prev + 1);
        }, 150); // Short debounce to handle multiple rapid deletes

    }, []);

    const handleKpiUpdate = useCallback((payload: any) => {
        const updatedKpis = payload.new as TeamRoundData;
        if (updatedKpis?.team_id === loggedInTeamId && currentActiveSlide) {
            if (updatedKpis.round_number === currentActiveSlide.round_number) {
                console.log('🔔 [useTeamGameState] KPI update for our team');
                setCurrentTeamKpis(updatedKpis);
            }
        }
    }, [loggedInTeamId, currentActiveSlide?.round_number]);

    const handleAdjustmentUpdate = useCallback((payload: any) => {
        const adjustment = payload.new as PermanentKpiAdjustment;
        if (adjustment?.team_id === loggedInTeamId) {
            console.log('🔔 [useTeamGameState] Adjustment update for our team');
            fetchAdjustments();
        }
    }, [loggedInTeamId, fetchAdjustments]);

    // ========================================================================
    // SIMPLE REAL-TIME SUBSCRIPTIONS
    // ========================================================================

    // 1. Slide Updates
    useRealtimeSubscription(
        `slide-updates-${sessionId}`,
        {
            table: 'sessions',
            event: 'UPDATE',
            filter: `id=eq.${sessionId}`,
            onchange: handleSlideUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 2. Decision Deletes - SIMPLE: Any delete = refresh
    useRealtimeSubscription(
        `decision-deletes-${sessionId}`,
        {
            table: 'team_decisions',
            event: 'DELETE',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleDecisionDelete
        },
        !!sessionId && !!loggedInTeamId
    );

    // 3. KPI Updates
    useRealtimeSubscription(
        `kpi-updates-${sessionId}`,
        {
            table: 'team_round_data',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleKpiUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 4. Adjustment Updates
    useRealtimeSubscription(
        `adjustments-${sessionId}`,
        {
            table: 'permanent_kpi_adjustments',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleAdjustmentUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // ========================================================================
    // SIMPLE INITIALIZATION
    // ========================================================================

    // Initial setup - clean and simple
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) return;

        console.log(`[useTeamGameState] 🚀 Initial setup: ${sessionId.substring(0, 8)}/${loggedInTeamId}`);

        fetchSessionData();
        fetchTeamKpis();
        fetchAdjustments();

    }, [sessionId, loggedInTeamId, fetchSessionData, fetchTeamKpis, fetchAdjustments]);

    // KPI refresh when slide changes
    useEffect(() => {
        if (currentActiveSlide?.round_number) {
            fetchTeamKpis();
        }
    }, [currentActiveSlide?.round_number, fetchTeamKpis]);

    // Simple fallback polling - minimal
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            if (fallbackPollRef.current) {
                clearInterval(fallbackPollRef.current);
                fallbackPollRef.current = null;
            }
            return;
        }

        // Very conservative fallback polling
        fallbackPollRef.current = setInterval(() => {
            console.log('[useTeamGameState] 🔄 Fallback poll');
            fetchSessionData();
        }, 30000); // 30 seconds - just to catch missed slide changes

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
    }, [sessionId, loggedInTeamId, fetchSessionData]);

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
