// src/views/team/hooks/useTeamGameState.ts - Enhanced with decision phase integration
import {useState, useEffect, useMemo} from 'react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {useRealtimeSubscription} from '@shared/services/supabase';
import {db} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {GamePhaseNode, Slide} from '@shared/types/game';
import {TeamRoundData} from '@shared/types/database';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';

interface useTeamGameStateProps {
    sessionId: string | null;
    loggedInTeamId: string | null;
}

interface useTeamGameStateReturn {
    currentActiveSlide: Slide | null;
    currentActivePhase: GamePhaseNode | null;
    isDecisionTime: boolean;
    decisionPhaseTimerEndTime: number | undefined;
    timeRemainingSeconds: number | undefined;
    decisionOptionsKey: string | undefined;
    currentTeamKpis: TeamRoundData | null;
    isLoadingKpis: boolean;
    gameStructure: typeof readyOrNotGame_2_0_DD;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

/**
 * Enhanced team game state hook with decision phase integration
 */
export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    // Core state
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentActivePhase, setCurrentActivePhase] = useState<GamePhaseNode | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // Fetch current session state from database
    const {
        data: sessionData,
        isLoading: isLoadingSession,
        refresh: refetchSession
    } = useSupabaseQuery(
        () => {
            if (!sessionId) return Promise.resolve(null);
            return db.sessions.get(sessionId);
        },
        [sessionId],
        {
            cacheKey: `session-${sessionId}`,
            cacheTimeout: 5 * 1000, // Short cache for real-time feel
            retryOnError: true,
            maxRetries: 2
        }
    );

    // Fetch current team KPIs
    const {
        data: currentTeamKpis,
        isLoading: isLoadingKpis,
        refresh: refetchKpis
    } = useSupabaseQuery(
        () => {
            if (!sessionId || !loggedInTeamId || !currentActivePhase || currentActivePhase.round_number === 0) {
                return Promise.resolve(null);
            }
            return db.kpis.getForTeamRound(sessionId, loggedInTeamId, currentActivePhase.round_number);
        },
        [sessionId, loggedInTeamId, currentActivePhase?.round_number],
        {
            cacheKey: `team-kpis-${sessionId}-${loggedInTeamId}-${currentActivePhase?.round_number}`,
            cacheTimeout: 30 * 1000,
            retryOnError: true,
            maxRetries: 2
        }
    );

    // Real-time subscription for session changes
    useRealtimeSubscription(
        `session-changes-${sessionId}`,
        {
            table: 'game_sessions',  // Make sure this matches your actual table name
            filter: `id=eq.${sessionId}`,
            onchange: (payload) => {
                console.log('[useTeamGameState] Session updated via real-time:', payload.eventType, payload.new);
                refetchSession();
            }
        },
        !!(sessionId && sessionId !== 'new')
    );

    // Real-time subscription for KPI changes
    useRealtimeSubscription(
        `team-kpis-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            filter: `session_id=eq.${sessionId}.and.team_id=eq.${loggedInTeamId}`,
            onchange: (payload) => {
                console.log('[useTeamGameState] KPI data updated via real-time:', payload);
                refetchKpis();
            }
        },
        !!(sessionId && loggedInTeamId && sessionId !== 'new')
    );

    // Update current phase and slide based on session data
    useEffect(() => {
        if (!sessionData || !gameStructure) return;

        const phaseId = sessionData.current_phase_id;
        const slideIndex = sessionData.current_slide_id_in_phase;

        if (!phaseId || slideIndex === null || slideIndex === undefined) {
            console.warn('[useTeamGameState] Session data incomplete:', {phaseId, slideIndex});
            return;
        }

        // Find the current phase
        const phase = gameStructure.allPhases.find(p => p.id === phaseId);
        if (!phase) {
            console.error('[useTeamGameState] Phase not found:', phaseId);
            return;
        }

        // Find the current slide
        const slideId = phase.slide_ids[slideIndex];
        const slide = gameStructure.slides.find(s => s.id === slideId);

        if (!slide) {
            console.error('[useTeamGameState] Slide not found:', slideId, 'for phase:', phaseId, 'index:', slideIndex);
            return;
        }

        console.log('[useTeamGameState] Updated current phase and slide:', {
            phase: phase.label,
            slide: slide.title,
            isInteractive: phase.is_interactive_player_phase
        });

        setCurrentActivePhase(phase);
        setCurrentActiveSlide(slide);

        // Determine if this is a decision time
        const isInteractiveSlide = slide.type === 'interactive_invest' ||
            slide.type === 'interactive_choice' ||
            slide.type === 'interactive_double_down_prompt' ||
            slide.type === 'interactive_double_down_select';

        const shouldBeDecisionTime = isInteractiveSlide && phase.is_interactive_player_phase;

        if (shouldBeDecisionTime !== isDecisionTime) {
            console.log('[useTeamGameState] Decision time changed:', shouldBeDecisionTime);
            setIsDecisionTime(shouldBeDecisionTime);

            // Set timer if this is a timed decision phase
            if (shouldBeDecisionTime && slide.timer_duration_seconds) {
                const endTime = Date.now() + (slide.timer_duration_seconds * 1000);
                setDecisionPhaseTimerEndTime(endTime);
                console.log('[useTeamGameState] Set decision timer for', slide.timer_duration_seconds, 'seconds');
            } else if (!shouldBeDecisionTime) {
                setDecisionPhaseTimerEndTime(undefined);
            }
        }

    }, [sessionData, gameStructure, isDecisionTime]);

    // Broadcast integration for real-time slide updates
    useEffect(() => {
        if (!sessionId) return;

        const broadcastManager = SimpleBroadcastManager.getInstance(sessionId, 'presentation');

        console.log('[useTeamGameState] Setting up broadcast listener for session:', sessionId);
        setConnectionStatus('connecting');

        const unsubscribeSlideUpdates = broadcastManager.onSlideUpdate((slide: Slide) => {
            console.log('[useTeamGameState] Received slide update from host:', slide.id, slide.title);

            // Find the phase that contains this slide
            const containingPhase = gameStructure.allPhases.find(phase =>
                phase.slide_ids.includes(slide.id)
            );

            if (containingPhase) {
                setCurrentActivePhase(containingPhase);
                setCurrentActiveSlide(slide);

                // Check if this should trigger decision time
                const isInteractiveSlide = slide.type === 'interactive_invest' ||
                    slide.type === 'interactive_choice' ||
                    slide.type === 'interactive_double_down_prompt' ||
                    slide.type === 'interactive_double_down_select';

                const shouldBeDecisionTime = isInteractiveSlide && containingPhase.is_interactive_player_phase;

                setIsDecisionTime(shouldBeDecisionTime);

                if (shouldBeDecisionTime && slide.timer_duration_seconds) {
                    const endTime = Date.now() + (slide.timer_duration_seconds * 1000);
                    setDecisionPhaseTimerEndTime(endTime);
                } else if (!shouldBeDecisionTime) {
                    setDecisionPhaseTimerEndTime(undefined);
                }

                console.log('[useTeamGameState] Updated from broadcast - Decision time:', shouldBeDecisionTime);
            }
        });

        // Monitor connection status
        const checkConnection = () => {
            const status = broadcastManager.getConnectionStatus();
            setConnectionStatus(status);
        };

        const connectionInterval = setInterval(checkConnection, 2000);

        // Initial check
        setTimeout(checkConnection, 500);

        return () => {
            console.log('[useTeamGameState] Cleaning up broadcast listeners');
            unsubscribeSlideUpdates();
            clearInterval(connectionInterval);
        };
    }, [sessionId, gameStructure]);

    // Timer countdown effect
    useEffect(() => {
        let timerInterval: NodeJS.Timeout | undefined;

        if (isDecisionTime && decisionPhaseTimerEndTime && decisionPhaseTimerEndTime > Date.now()) {
            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.round((decisionPhaseTimerEndTime - now) / 1000));
                setTimeRemainingSeconds(remaining);

                if (remaining <= 0) {
                    console.log('[useTeamGameState] Decision timer expired');
                    clearInterval(timerInterval);
                    setIsDecisionTime(false);
                    setDecisionPhaseTimerEndTime(undefined);
                }
            };

            updateTimer(); // Initial update
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            setTimeRemainingSeconds(undefined);
            if (timerInterval) clearInterval(timerInterval);
        }

        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [isDecisionTime, decisionPhaseTimerEndTime]);

    // Calculate decision options key
    const decisionOptionsKey = useMemo(() => {
        if (!currentActivePhase || !isDecisionTime) return undefined;
        return currentActivePhase.interactive_data_key || currentActivePhase.id;
    }, [currentActivePhase, isDecisionTime]);

    return {
        currentActiveSlide,
        currentActivePhase,
        isDecisionTime,
        decisionPhaseTimerEndTime,
        timeRemainingSeconds,
        decisionOptionsKey,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure,
        connectionStatus
    };
};
