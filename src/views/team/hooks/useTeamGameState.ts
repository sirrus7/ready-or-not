// src/views/team/hooks/useTeamGameState.ts
// PRODUCTION-GRADE FIXED VERSION - Removed BroadcastChannel usage, implements proper Supabase real-time only

/**
 * COMMUNICATION ARCHITECTURE RULE:
 * - Host ↔ Presentation Display: Use BroadcastChannel (same device)
 * - Host ↔ Team Apps: Use Supabase Real-time ONLY (different devices)
 * - Team Apps: NEVER use BroadcastChannel - it won't work cross-device
 */

import {useState, useEffect, useMemo} from 'react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {useRealtimeSubscription} from '@shared/services/supabase';
import {db} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {Slide, GameStructure} from '@shared/types/game';
import {TeamRoundData} from '@shared/types/database';

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
}

export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [kpiUpdateTrigger, setKpiUpdateTrigger] = useState<number>(0); // Force refresh trigger

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // Helper function to update slide state
    const updateSlideState = (slide: Slide | null) => {
        setCurrentActiveSlide(slide);
        if (slide) {
            const isInteractive = slide.type.startsWith('interactive_') && !!slide.interactive_data_key;
            setIsDecisionTime(isInteractive);
            console.log(`[useTeamGameState] Updated slide: ${slide.id} (${slide.title}), isDecisionTime: ${isInteractive}`);
        } else {
            setIsDecisionTime(false);
        }
    };

    // 1. DATABASE POLLING: Refresh session data every 3 seconds
    const {refresh: refreshSession} = useSupabaseQuery(
        async () => {
            if (!sessionId || sessionId === 'new') return null;
            const session = await db.sessions.get(sessionId);
            if (session && session.current_slide_index !== null) {
                const slide = gameStructure.slides[session.current_slide_index] || null;
                updateSlideState(slide);
            }
            return session;
        },
        [sessionId, gameStructure],
        {
            cacheKey: `session-${sessionId}`,
            cacheTimeout: 3000
        }
    );

    // Manual polling for session updates (faster polling as backup)
    useEffect(() => {
        if (!sessionId) return;

        console.log('[useTeamGameState] Starting database polling for session updates');

        const pollInterval = setInterval(() => {
            console.log('[useTeamGameState] Polling for session updates...');
            refreshSession();
        }, 1000); // Poll every 1 second instead of 3 seconds

        return () => {
            console.log('[useTeamGameState] Stopping database polling');
            clearInterval(pollInterval);
        };
    }, [sessionId, refreshSession]);

    // 2. SUPABASE REAL-TIME: Listen for session changes (REPLACES BroadcastChannel)
    useRealtimeSubscription(
        `session-updates-${sessionId}`,
        {
            table: 'game_sessions',
            filter: `id=eq.${sessionId}`,
            onchange: (payload) => {
                console.log('[useTeamGameState] Session updated via Supabase real-time:', payload);
                console.log('[useTeamGameState] Payload new data:', payload.new);
                console.log('[useTeamGameState] Current slide index changed:', payload.new?.current_slide_index);

                setConnectionStatus('connected'); // Update connection status

                // Force immediate refresh to get the latest data
                setTimeout(() => {
                    refreshSession();
                }, 100);
            }
        },
        !!sessionId
    );

    // 3. SUPABASE REAL-TIME: Listen for decision reset commands
    useRealtimeSubscription(
        `decision-resets-${sessionId}`,
        {
            table: 'team_decisions',
            filter: `session_id=eq.${sessionId}`,
            event: 'DELETE',
            onchange: (payload) => {
                console.log('[useTeamGameState] Decision reset detected via Supabase real-time:', payload);
                setConnectionStatus('connected');
                // If this affects our team, we'll get notified via useTeamDecisionSubmission
            }
        },
        !!sessionId
    );

    // Connection status management via Supabase connectivity
    useEffect(() => {
        if (!sessionId) {
            setConnectionStatus('disconnected');
            return;
        }

        console.log('[useTeamGameState] Setting up connection for session:', sessionId);
        setConnectionStatus('connecting');

        // Connection timeout - if no real-time updates after 15 seconds, assume disconnected
        const connectionTimeout = setTimeout(() => {
            console.warn('[useTeamGameState] No real-time updates received after 15 seconds - connection status: disconnected');
            setConnectionStatus('disconnected');
        }, 15000);

        return () => clearTimeout(connectionTimeout);
    }, [sessionId]);

    // KPI data management with enhanced refresh trigger
    const {
        data: currentTeamKpis,
        isLoading: isLoadingKpis,
        refresh: refetchKpis
    } = useSupabaseQuery(
        () => {
            if (!sessionId || !loggedInTeamId || !currentActiveSlide || currentActiveSlide.round_number === 0) {
                return Promise.resolve(null);
            }
            return db.kpis.getForTeamRound(sessionId, loggedInTeamId, currentActiveSlide.round_number);
        },
        [sessionId, loggedInTeamId, currentActiveSlide?.round_number, kpiUpdateTrigger],
        {
            cacheKey: `team-kpis-${sessionId}-${loggedInTeamId}-${currentActiveSlide?.round_number}-${kpiUpdateTrigger}`,
            cacheTimeout: 2000 // Reduced cache timeout for faster updates
        }
    );

    // SUPABASE REAL-TIME: Listen for KPI updates (REPLACES BroadcastChannel KPI updates)
    useRealtimeSubscription(
        `team-kpis-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            filter: `session_id=eq.${sessionId}.and.team_id=eq.${loggedInTeamId}`,
            onchange: (payload) => {
                console.log('[useTeamGameState] KPI data updated via Supabase real-time subscription:', payload);
                setConnectionStatus('connected');
                refetchKpis();
                setKpiUpdateTrigger(prev => prev + 1);
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // Enhanced: Force refresh KPIs when consequence slides are detected
    useEffect(() => {
        if (currentActiveSlide?.type === 'consequence_reveal') {
            console.log('[useTeamGameState] Consequence slide detected, refreshing KPI data');
            // Add a small delay to ensure database updates are complete
            setTimeout(() => {
                refetchKpis();
                setKpiUpdateTrigger(prev => prev + 1);
            }, 1000);
        }
    }, [currentActiveSlide?.type, currentActiveSlide?.id, refetchKpis]);

    // Additional: Force refresh when slide changes to any new slide
    useEffect(() => {
        if (currentActiveSlide) {
            console.log('[useTeamGameState] Slide changed, checking for KPI updates');
            // Small delay to allow processing to complete
            setTimeout(() => {
                refetchKpis();
            }, 500);
        }
    }, [currentActiveSlide?.id, refetchKpis]);

    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure,
        connectionStatus
    };
};
