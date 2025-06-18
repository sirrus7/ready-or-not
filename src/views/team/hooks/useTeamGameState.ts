// src/views/team/hooks/useTeamGameState.ts
// VERSION 3 FIXED - Proper decision tracking that stays in sync

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
    // FIXED: PERSISTENT TRACKING WITH PROPER SYNC
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
    // FIXED: ROBUST DECISION TRACKING THAT STAYS IN SYNC
    // ========================================================================
    const updateDecisionTracking = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) {
            console.log('[useTeamGameState] 🔄 Clearing decision tracking (no session/team)');
            teamDecisionIdsRef.current = new Set();
            lastDecisionSnapshotRef.current = {};
            return;
        }

        try {
            console.log('[useTeamGameState] 🔍 Updating decision tracking...');

            // Get ALL decisions for this session
            const allDecisions = await db.decisions.getBySession(sessionId);
            console.log(`[useTeamGameState] 📊 Found ${allDecisions.length} total decisions in session`);

            // Filter to our team's decisions
            const teamDecisions = allDecisions.filter(d => d.team_id === loggedInTeamId);
            console.log(`[useTeamGameState] 🎯 Found ${teamDecisions.length} decisions for our team`);

            const newDecisionIds = new Set(teamDecisions.map(d => d.id));
            const newSnapshot: Record<string, string> = {};

            teamDecisions.forEach(decision => {
                newSnapshot[decision.phase_id] = decision.id;
                console.log(`[useTeamGameState] 📝 Tracking: ${decision.phase_id} -> ${decision.id}`);
            });

            // Check for deletions
            const oldSnapshot = lastDecisionSnapshotRef.current;
            const deletedPhases: string[] = [];

            Object.keys(oldSnapshot).forEach(phaseId => {
                const oldId = oldSnapshot[phaseId];
                const newId = newSnapshot[phaseId];

                if (oldId && !newId) {
                    deletedPhases.push(phaseId);
                    console.log(`[useTeamGameState] 🔄 Decision deleted: ${phaseId} (was ${oldId})`);
                }
            });

            // Update refs IMMEDIATELY
            const oldIds = Array.from(teamDecisionIdsRef.current);
            const newIds = Array.from(newDecisionIds);

            teamDecisionIdsRef.current = newDecisionIds;
            lastDecisionSnapshotRef.current = newSnapshot;

            console.log(`[useTeamGameState] 📊 Decision tracking updated:`);
            console.log(`[useTeamGameState] 📊 Old IDs: [${oldIds.join(', ')}]`);
            console.log(`[useTeamGameState] 📊 New IDs: [${newIds.join(', ')}]`);

            // Trigger reset if needed
            if (deletedPhases.length > 0) {
                console.log(`[useTeamGameState] ✅ TRIGGERING RESET for deleted phases: ${deletedPhases.join(', ')}`);

                if (resetDebounceRef.current) clearTimeout(resetDebounceRef.current);

                resetDebounceRef.current = setTimeout(() => {
                    setDecisionResetTrigger(prev => {
                        const newTrigger = prev + 1;
                        console.log(`[useTeamGameState] 🔄 Reset trigger: ${prev} -> ${newTrigger}`);
                        return newTrigger;
                    });
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
    // FIXED: REAL-TIME EVENT HANDLERS WITH IMMEDIATE SYNC
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

        // Debug current state
        console.log('🔍 [DEBUG] Current tracked decisions:', Array.from(teamDecisionIdsRef.current));
        console.log('🔍 [DEBUG] Is this our decision?', teamDecisionIdsRef.current.has(deletedId));

        // FIXED: ALWAYS refresh decision tracking on ANY delete in our session
        // This ensures we stay in sync even if we missed tracking the decision initially
        console.log('🔄 [useTeamGameState] Refreshing decision tracking due to DELETE event');

        if (resetDebounceRef.current) clearTimeout(resetDebounceRef.current);
        resetDebounceRef.current = setTimeout(async () => {
            // Force a fresh sync of decision tracking
            await updateDecisionTracking();

            // If we still don't detect the deletion, force a reset trigger
            // This handles edge cases where timing causes issues
            if (teamDecisionIdsRef.current.has(deletedId)) {
                console.log('🔄 [useTeamGameState] Force triggering reset for detected deletion');
                setDecisionResetTrigger(prev => prev + 1);
            }
        }, 50); // Very short delay for immediate response

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
    // PERSISTENT REAL-TIME SUBSCRIPTIONS (UNCHANGED)
    // ========================================================================

    // 1. Session/Slide Updates
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

    // 2. Decision Deletes
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
    // FIXED: IMMEDIATE DECISION TRACKING ON MOUNT
    // ========================================================================

    // Initial setup - IMMEDIATE decision tracking
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) return;

        console.log(`[useTeamGameState] 🚀 Initial setup: ${sessionId.substring(0, 8)}/${loggedInTeamId}`);

        // FIXED: Fetch decision tracking IMMEDIATELY and frequently during setup
        const immediateSetup = async () => {
            await fetchSessionData();
            await updateDecisionTracking(); // Get initial decision state
            await fetchTeamKpis();
            await fetchAdjustments();

            // Double-check decision tracking after a brief delay
            setTimeout(async () => {
                console.log('[useTeamGameState] 🔄 Double-checking decision tracking...');
                await updateDecisionTracking();
            }, 1000);
        };

        immediateSetup();

    }, [sessionId, loggedInTeamId, fetchSessionData, updateDecisionTracking, fetchTeamKpis, fetchAdjustments]);

    // KPI refresh when slide changes
    useEffect(() => {
        if (currentActiveSlide) {
            fetchTeamKpis();
        }
    }, [currentActiveSlide?.round_number, fetchTeamKpis]);

    // FIXED: More frequent decision tracking refresh
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            if (fallbackPollRef.current) {
                clearInterval(fallbackPollRef.current);
                fallbackPollRef.current = null;
            }
            return;
        }

        // More frequent polling to keep decision tracking in sync
        fallbackPollRef.current = setInterval(() => {
            console.log('[useTeamGameState] 🔄 Fallback poll - refreshing decision tracking');
            updateDecisionTracking();
            fetchSessionData();
        }, 10000); // Every 10 seconds to catch any missed updates

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
    }, [sessionId, loggedInTeamId, updateDecisionTracking, fetchSessionData]);

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
