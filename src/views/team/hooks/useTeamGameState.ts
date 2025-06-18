// src/views/team/hooks/useTeamGameState.ts
// VERSION 3 - Persistent real-time connections, minimal reconnections

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
    // CORE STATE (STABLE)
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
    // V3: PERSISTENT TRACKING (REFS FOR STABILITY)
    // ========================================================================
    const teamDecisionIdsRef = useRef<Set<string>>(new Set());
    const lastDecisionSnapshotRef = useRef<Record<string, string>>({});
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fallbackPollRef = useRef<NodeJS.Timeout | null>(null);

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // ========================================================================
    // STABLE HELPER FUNCTIONS
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
    // V3: LIGHTWEIGHT DECISION TRACKING
    // ========================================================================
    const updateDecisionTracking = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) return;

        try {
            const decisions = await db.decisions.getBySession(sessionId);
            const teamDecisions = decisions.filter(d => d.team_id === loggedInTeamId);

            const newDecisionIds = new Set(teamDecisions.map(d => d.id));
            const newSnapshot: Record<string, string> = {};

            teamDecisions.forEach(decision => {
                newSnapshot[decision.phase_id] = decision.id;
            });

            // Check for deletions
            const oldSnapshot = lastDecisionSnapshotRef.current;
            const deletedPhases: string[] = [];

            Object.keys(oldSnapshot).forEach(phaseId => {
                const oldId = oldSnapshot[phaseId];
                const newId = newSnapshot[phaseId];

                if (oldId && !newId) {
                    deletedPhases.push(phaseId);
                    console.log(`[useTeamGameState] 🔄 Decision deleted: ${phaseId}`);
                }
            });

            // Update refs (no re-renders)
            teamDecisionIdsRef.current = newDecisionIds;
            lastDecisionSnapshotRef.current = newSnapshot;

            // Trigger reset if needed (debounced)
            if (deletedPhases.length > 0) {
                if (resetDebounceRef.current) clearTimeout(resetDebounceRef.current);

                resetDebounceRef.current = setTimeout(() => {
                    console.log(`[useTeamGameState] ✅ Reset trigger for: ${deletedPhases.join(', ')}`);
                    setDecisionResetTrigger(prev => prev + 1);
                }, 100);
            }

        } catch (error) {
            console.error('[useTeamGameState] ❌ Error updating decision tracking:', error);
        }
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // OTHER FETCH FUNCTIONS (MEMOIZED STABLY)
    // ========================================================================
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
    // V3: STABLE REAL-TIME EVENT HANDLERS
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
        const deletedId = payload.old?.id;
        if (!deletedId) return;

        console.log(`🔔 [useTeamGameState] DELETE event: ${deletedId}`);

        // ✅ ADD DEBUG: Check if we're tracking this decision
        console.log('🔍 [DEBUG] Current tracked decisions:', Array.from(teamDecisionIdsRef.current));
        console.log('🔍 [DEBUG] Is this our decision?', teamDecisionIdsRef.current.has(deletedId));

        // Check if it's our team's decision
        if (teamDecisionIdsRef.current.has(deletedId)) {
            console.log(`[useTeamGameState] 🎯 Our decision deleted: ${deletedId}`);

            // ✅ ADD DEBUG: Force immediate trigger for testing
            console.log('🔄 [DEBUG] Forcing reset trigger increment');
            setDecisionResetTrigger(prev => {
                const newValue = prev + 1;
                console.log('🔄 [DEBUG] Reset trigger: ', prev, '->', newValue);
                return newValue;
            });

            // Debounced response
            if (resetDebounceRef.current) clearTimeout(resetDebounceRef.current);
            resetDebounceRef.current = setTimeout(() => {
                console.log('🔄 [DEBUG] Running updateDecisionTracking');
                updateDecisionTracking();
            }, 100);
        } else {
            console.log('ℹ️ [DEBUG] Not our decision, ignoring');
        }
    }, [updateDecisionTracking]);

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
    // V3: PERSISTENT REAL-TIME SUBSCRIPTIONS
    // Only recreate when sessionId or loggedInTeamId actually changes
    // ========================================================================

    // 1. Session/Slide Updates - STABLE
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

    // 2. Decision Deletes - STABLE
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

    // 3. KPI Updates - STABLE
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

    // 4. Adjustment Updates - STABLE
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
    // V3: MINIMAL EFFECTS - ONLY RUN WHEN NECESSARY
    // ========================================================================

    // Initial setup - only when session/team changes
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) return;

        console.log(`[useTeamGameState] 🚀 Initial setup: ${sessionId.substring(0, 8)}/${loggedInTeamId}`);

        // Fetch initial data
        fetchSessionData();
        fetchTeamKpis();
        fetchAdjustments();
        updateDecisionTracking();

    }, [sessionId, loggedInTeamId]); // Only depend on core identifiers

    // KPI refresh when slide changes
    useEffect(() => {
        if (currentActiveSlide) {
            fetchTeamKpis();
        }
    }, [currentActiveSlide?.round_number, fetchTeamKpis]);

    // Lightweight fallback polling - much less aggressive
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            if (fallbackPollRef.current) {
                clearInterval(fallbackPollRef.current);
                fallbackPollRef.current = null;
            }
            return;
        }

        // Only poll every 30 seconds as emergency fallback
        fallbackPollRef.current = setInterval(() => {
            console.log('[useTeamGameState] 🔄 Fallback poll');
            fetchSessionData();
            updateDecisionTracking();
        }, 30000);

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
    }, [sessionId, loggedInTeamId, fetchSessionData, updateDecisionTracking]);

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
