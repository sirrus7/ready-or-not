// src/views/team/hooks/useTeamGameState.ts
// VERSION 2 - Simple debounce fix to prevent cascade loops

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
    // V2 FIX: DEBOUNCE REFS TO PREVENT CASCADE LOOPS
    // ========================================================================
    const [teamDecisionIds, setTeamDecisionIds] = useState<Set<string>>(new Set());
    const lastDecisionSnapshotRef = useRef<Record<string, string>>({});
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null); // ✅ NEW: Debounce ref

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // ========================================================================
    // HELPER FUNCTIONS
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

        if (isInteractive) {
            console.log(`[useTeamGameState] 🎮 Decision time activated for slide: ${slide.interactive_data_key}`);
        }
    }, [gameStructure.slides]);

    // ========================================================================
    // V2 FIX: DEBOUNCED DECISION TRACKING
    // ========================================================================
    const fetchAndTrackTeamDecisions = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) {
            setTeamDecisionIds(new Set());
            lastDecisionSnapshotRef.current = {};
            return {teamDecisions: [], deletedPhases: []};
        }

        try {
            console.log(`[useTeamGameState] 🔍 Fetching team decisions for tracking...`);

            const decisions = await db.decisions.getBySession(sessionId);
            const teamDecisions = decisions.filter(d => d.team_id === loggedInTeamId);

            const newDecisionIds = new Set(teamDecisions.map(d => d.id));
            const newSnapshot: Record<string, string> = {};

            teamDecisions.forEach(decision => {
                newSnapshot[decision.phase_id] = decision.id;
            });

            const oldSnapshot = lastDecisionSnapshotRef.current;
            const deletedPhases: string[] = [];

            Object.keys(oldSnapshot).forEach(phaseId => {
                const oldId = oldSnapshot[phaseId];
                const newId = newSnapshot[phaseId];

                if (oldId && !newId) {
                    deletedPhases.push(phaseId);
                    console.log(`[useTeamGameState] 🔄 Detected decision deletion: ${phaseId} (ID: ${oldId})`);
                }
            });

            // Update tracking
            setTeamDecisionIds(newDecisionIds);
            lastDecisionSnapshotRef.current = newSnapshot;

            // ✅ V2 FIX: DEBOUNCED RESET TRIGGER
            if (deletedPhases.length > 0) {
                console.log(`[useTeamGameState] ✅ Triggering DEBOUNCED reset for phases: ${deletedPhases.join(', ')}`);

                // Clear any existing debounce
                if (resetDebounceRef.current) {
                    clearTimeout(resetDebounceRef.current);
                }

                // Set debounced reset trigger
                resetDebounceRef.current = setTimeout(() => {
                    setDecisionResetTrigger(prev => {
                        const newTrigger = prev + deletedPhases.length;
                        console.log(`[useTeamGameState] 🔄 Reset trigger fired: ${prev} -> ${newTrigger}`);
                        return newTrigger;
                    });
                }, 250); // ✅ 250ms debounce to prevent cascade
            }

            return {teamDecisions, deletedPhases};

        } catch (error) {
            console.error('[useTeamGameState] ❌ Error tracking team decisions:', error);
            return {teamDecisions: [], deletedPhases: []};
        }
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // V2 FIX: DEBOUNCED DECISION RESET HANDLER
    // ========================================================================
    const handleDecisionReset = useCallback(async (payload: any) => {
        console.log(`🔔 [useTeamGameState] DELETE event received:`, {
            eventType: payload.eventType,
            deletedId: payload.old?.id,
            timestamp: new Date().toISOString()
        });

        const deletedId = payload.old?.id;

        if (!deletedId) {
            console.log(`[useTeamGameState] ⚠️  DELETE event missing ID - cannot process`);
            return;
        }

        // Check if this deletion affects our team
        if (teamDecisionIds.has(deletedId)) {
            console.log(`[useTeamGameState] 🎯 CONFIRMED: Our team's decision was deleted (ID: ${deletedId})`);

            // ✅ V2 FIX: DEBOUNCED RESET RESPONSE
            if (resetDebounceRef.current) {
                clearTimeout(resetDebounceRef.current);
            }

            resetDebounceRef.current = setTimeout(async () => {
                console.log(`[useTeamGameState] 🔄 Processing debounced reset for ID: ${deletedId}`);

                // Refresh our decision tracking
                const result = await fetchAndTrackTeamDecisions();

                if (!result || result.deletedPhases.length === 0) {
                    // Manual trigger if tracking didn't catch it
                    console.log(`[useTeamGameState] 🔄 Manual reset trigger for deleted ID: ${deletedId}`);
                    setDecisionResetTrigger(prev => prev + 1);
                }
            }, 200); // ✅ Debounce the reset handling

        } else {
            console.log(`[useTeamGameState] ℹ️  DELETE event for different team (ID: ${deletedId}) - ignoring`);
        }
    }, [teamDecisionIds, fetchAndTrackTeamDecisions]);

    // ========================================================================
    // OTHER FETCH FUNCTIONS (UNCHANGED)
    // ========================================================================
    const fetchAndUpdateSessionData = useCallback(async () => {
        if (!sessionId) return;

        try {
            const sessionData = await db.sessions.getById(sessionId);
            if (sessionData?.current_slide_index !== null && sessionData?.current_slide_index !== undefined) {
                updateSlideState(sessionData.current_slide_index);
            }
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching session data:', error);
        }
    }, [sessionId, updateSlideState]);

    const fetchCurrentTeamKpis = useCallback(async () => {
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

            if (kpiData) {
                console.log(`[useTeamGameState] 📊 Updated KPIs for team ${loggedInTeamId}, round ${roundNumber}`);
            }
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching team KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide]);

    const fetchPermanentAdjustments = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) {
            setPermanentAdjustments([]);
            return;
        }

        setIsLoadingAdjustments(true);
        try {
            const adjustments = await db.adjustments.getByTeam(sessionId, loggedInTeamId);
            setPermanentAdjustments(adjustments || []);
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching permanent adjustments:', error);
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingAdjustments(false);
        }
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // REAL-TIME SUBSCRIPTIONS (UNCHANGED)
    // ========================================================================

    // 1. SLIDE CHANGES
    useRealtimeSubscription(
        `team-slide-updates-${sessionId}`,
        {
            table: 'sessions',
            event: 'UPDATE',
            filter: `id=eq.${sessionId}`,
            onchange: (payload) => {
                console.log('🔔 [useTeamGameState] Session update received');
                const newSlideIndex = payload.new?.current_slide_index;
                if (newSlideIndex !== null && newSlideIndex !== undefined) {
                    updateSlideState(newSlideIndex);
                }
                setConnectionStatus('connected');
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // 2. DECISION RESETS (with debounced handling)
    useRealtimeSubscription(
        `team-decision-resets-${sessionId}`,
        {
            table: 'team_decisions',
            event: 'DELETE',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleDecisionReset
        },
        !!sessionId && !!loggedInTeamId
    );

    // 3. KPI UPDATES
    useRealtimeSubscription(
        `team-kpi-updates-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: (payload) => {
                const updatedKpis = payload.new as TeamRoundData;

                if (updatedKpis?.team_id === loggedInTeamId) {
                    console.log(`🔔 [useTeamGameState] KPI update for our team`);

                    if (currentActiveSlide && updatedKpis.round_number === currentActiveSlide.round_number) {
                        setCurrentTeamKpis(updatedKpis);
                    }
                }
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // 4. KPI IMPACT CARDS
    useRealtimeSubscription(
        `team-adjustments-${sessionId}-${loggedInTeamId}`,
        {
            table: 'permanent_kpi_adjustments',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: (payload) => {
                const adjustment = payload.new as PermanentKpiAdjustment;

                if (adjustment?.team_id === loggedInTeamId) {
                    console.log(`🔔 [useTeamGameState] New KPI Impact Card for our team`);
                    fetchPermanentAdjustments();
                }
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // ========================================================================
    // V2 FIX: CONTROLLED POLLING WITH CLEANUP
    // ========================================================================
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            // Clean up all timers
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            if (resetDebounceRef.current) {
                clearTimeout(resetDebounceRef.current);
                resetDebounceRef.current = null;
            }
            return;
        }

        console.log(`[useTeamGameState] 🚀 Setting up controlled polling for sessionId: ${sessionId}, teamId: ${loggedInTeamId}`);

        // Initial fetch
        fetchAndTrackTeamDecisions();

        // Controlled polling
        pollIntervalRef.current = setInterval(() => {
            console.log('[useTeamGameState] 🔄 Polling for changes (fallback)');
            fetchAndTrackTeamDecisions();
            fetchAndUpdateSessionData();
        }, 15000); // ✅ V2 FIX: Increased to 15 seconds to reduce load

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            if (resetDebounceRef.current) {
                clearTimeout(resetDebounceRef.current);
                resetDebounceRef.current = null;
            }
        };
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // INITIAL DATA FETCHING (UNCHANGED)
    // ========================================================================
    useEffect(() => {
        if (sessionId && loggedInTeamId) {
            console.log(`[useTeamGameState] 🚀 Initial setup for sessionId: ${sessionId}, teamId: ${loggedInTeamId}`);
            fetchAndUpdateSessionData();
            fetchCurrentTeamKpis();
            fetchPermanentAdjustments();
        }
    }, [sessionId, loggedInTeamId, fetchAndUpdateSessionData, fetchCurrentTeamKpis, fetchPermanentAdjustments]);

    // Refresh KPIs when slide changes
    useEffect(() => {
        if (currentActiveSlide) {
            fetchCurrentTeamKpis();
        }
    }, [currentActiveSlide, fetchCurrentTeamKpis]);

    // ========================================================================
    // V2 FIX: REDUCED DEBUG LOGGING
    // ========================================================================
    useEffect(() => {
        console.log(`[useTeamGameState] 📊 State Update:`, {
            sessionId,
            loggedInTeamId,
            currentSlide: currentActiveSlide?.title,
            isDecisionTime,
            connectionStatus,
            decisionResetTrigger,
            hasKpis: !!currentTeamKpis,
            trackedDecisions: teamDecisionIds.size
        });
    }, [sessionId, loggedInTeamId, currentActiveSlide?.title, isDecisionTime, connectionStatus, decisionResetTrigger, currentTeamKpis, teamDecisionIds.size]);

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
