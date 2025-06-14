// src/views/team/hooks/useTeamGameState.ts
// Production-ready version with real-time sync + database polling

import {useState, useEffect, useMemo} from 'react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {useRealtimeSubscription} from '@shared/services/supabase';
import {db} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {Slide, GameStructure} from '@shared/types/game';
import {TeamRoundData} from '@shared/types/database';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';

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

    // 1. DATABASE POLLING: Get current session state (for teams joining mid-session)
    const {
        data: currentSession,
        isLoading: isLoadingSession,
        refresh: refreshSession
    } = useSupabaseQuery(
        () => {
            if (!sessionId) return Promise.resolve(null);
            return db.sessions.get(sessionId); // Using correct db.sessions.get method
        },
        [sessionId],
        {
            cacheKey: `session-${sessionId}`,
            cacheTimeout: 5000, // Short cache for more responsive updates
        }
    );

    // Set up polling interval for session state
    useEffect(() => {
        if (!sessionId) return;

        const pollInterval = setInterval(() => {
            refreshSession();
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(pollInterval);
    }, [sessionId, refreshSession]);

    // Update slide from database polling
    useEffect(() => {
        if (currentSession && gameStructure && !isLoadingSession) {
            const slideIndex = currentSession.current_slide_index;
            if (slideIndex !== null && slideIndex >= 0 && slideIndex < gameStructure.slides.length) {
                const slide = gameStructure.slides[slideIndex];
                updateSlideState(slide);
            } else {
                updateSlideState(null);
            }
        }
    }, [currentSession?.current_slide_index, gameStructure, isLoadingSession]);

    // 2. REAL-TIME SUBSCRIPTION: Listen for session changes
    useRealtimeSubscription(
        `session-updates-${sessionId}`,
        {
            table: 'game_sessions',
            filter: `id=eq.${sessionId}`,
            onchange: (payload) => {
                console.log('[useTeamGameState] Session updated via real-time:', payload);
                refreshSession(); // Refresh to get latest state immediately
            }
        },
        !!sessionId
    );

    // 3. BROADCAST CHANNEL: Listen for live updates from host (fastest)
    useEffect(() => {
        if (!sessionId) return;

        const broadcastManager = SimpleBroadcastManager.getInstance(sessionId, 'team');
        setConnectionStatus('connecting');

        let connectionTimeout: NodeJS.Timeout | null = null;
        const setConnected = () => {
            if (connectionStatus !== 'connected') {
                setConnectionStatus('connected');
            }
            if (connectionTimeout) clearTimeout(connectionTimeout);
            connectionTimeout = setTimeout(() => {
                setConnectionStatus('disconnected');
                console.warn('[useTeamGameState] Host connection timed out - falling back to database polling');
            }, 15000);
        };

        // Listen for slide updates via broadcast (immediate)
        const unsubscribeSlideUpdates = broadcastManager.onSlideUpdate((slide: Slide) => {
            console.log('[useTeamGameState] Received slide update from host broadcast:', slide);
            updateSlideState(slide);
            setConnected();
        });

        // Listen for host commands (to maintain connection)
        const unsubscribeCommands = broadcastManager.onHostCommand(() => {
            setConnected();
        });

        return () => {
            if (connectionTimeout) clearTimeout(connectionTimeout);
            unsubscribeSlideUpdates();
            unsubscribeCommands();
        };
    }, [sessionId, connectionStatus]);

    // KPI data management
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
        [sessionId, loggedInTeamId, currentActiveSlide?.round_number],
        {cacheKey: `team-kpis-${sessionId}-${loggedInTeamId}-${currentActiveSlide?.round_number}`, cacheTimeout: 30000}
    );

    // Real-time KPI updates
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
        !!(sessionId && loggedInTeamId)
    );

    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure,
        connectionStatus
    };
};
