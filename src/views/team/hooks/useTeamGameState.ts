// src/views/team/hooks/useTeamGameState.ts
// CORRECTED VERSION - Fixed database method and query options

import {useState, useEffect, useMemo} from 'react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {useRealtimeSubscription} from '@shared/services/supabase';
import {db} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {Slide, GameStructure} from '@shared/types/game';
import {TeamRoundData} from '@shared/types/database';
import {SimpleBroadcastManager, KpiUpdateData} from '@core/sync/SimpleBroadcastManager';

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
            const session = await db.sessions.get(sessionId); // CORRECTED: Use db.sessions.get instead of db.sessions.getById
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

    // Manual polling for session updates
    useEffect(() => {
        if (!sessionId) return;

        const pollInterval = setInterval(() => {
            refreshSession();
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(pollInterval);
    }, [sessionId, refreshSession]);

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

        // ENHANCED: Listen for KPI updates via broadcast
        const unsubscribeKpiUpdates = broadcastManager.onKpiUpdate((kpiData: KpiUpdateData) => {
            console.log('[useTeamGameState] Received KPI update from host broadcast:', kpiData);

            // Check if this update is for our team
            if (loggedInTeamId && kpiData.updatedTeams) {
                const ourTeamUpdate = kpiData.updatedTeams.find(team => team.teamId === loggedInTeamId);
                if (ourTeamUpdate) {
                    console.log('[useTeamGameState] KPI update detected for our team, refreshing KPI data');
                    // Force refresh of KPI data
                    setKpiUpdateTrigger(prev => prev + 1);
                }
            }
            setConnected();
        });

        // Listen for host commands (to maintain connection)
        const unsubscribeCommands = broadcastManager.onHostCommand(() => {
            setConnected();
        });

        return () => {
            if (connectionTimeout) clearTimeout(connectionTimeout);
            unsubscribeSlideUpdates();
            unsubscribeKpiUpdates();
            unsubscribeCommands();
        };
    }, [sessionId, connectionStatus, loggedInTeamId]);

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
        [sessionId, loggedInTeamId, currentActiveSlide?.round_number, kpiUpdateTrigger], // Added kpiUpdateTrigger
        {
            cacheKey: `team-kpis-${sessionId}-${loggedInTeamId}-${currentActiveSlide?.round_number}-${kpiUpdateTrigger}`,
            cacheTimeout: 2000 // Reduced cache timeout for faster updates
        }
    );

    // Real-time KPI updates via Supabase subscription
    useRealtimeSubscription(
        `team-kpis-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            filter: `session_id=eq.${sessionId}.and.team_id=eq.${loggedInTeamId}`,
            onchange: (payload) => {
                console.log('[useTeamGameState] KPI data updated via real-time subscription:', payload);
                refetchKpis();
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
