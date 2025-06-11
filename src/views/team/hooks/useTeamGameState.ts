// src/views/team/hooks/useTeamGameState.ts - REFACTOR: Simplified to rely on slide data
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
    decisionPhaseTimerEndTime: number | undefined;
    timeRemainingSeconds: number | undefined;
    currentTeamKpis: TeamRoundData | null;
    isLoadingKpis: boolean;
    gameStructure: GameStructure;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

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

    useEffect(() => {
        if (!sessionId) return;

        const broadcastManager = SimpleBroadcastManager.getInstance(sessionId, 'team');
        setConnectionStatus('connecting');

        // Host connection check
        let connectionTimeout: NodeJS.Timeout | null = null;
        const setConnected = () => {
            if (connectionStatus !== 'connected') {
                setConnectionStatus('connected');
            }
            if (connectionTimeout) clearTimeout(connectionTimeout);
            connectionTimeout = setTimeout(() => {
                setConnectionStatus('disconnected');
                console.warn('[useTeamGameState] Host connection timed out.');
            }, 15000); // 15s timeout
        };

        const unsubscribeSlideUpdates = broadcastManager.onSlideUpdate((slide: Slide) => {
            console.log('[useTeamGameState] Received slide update from host:', slide);
            setCurrentActiveSlide(slide);
            setConnected();

            const isInteractive = slide.type.startsWith('interactive_') && !!slide.interactive_data_key;
            console.log(`[useTeamGameState] Slide ${slide.id} is interactive: ${isInteractive}`);
            setIsDecisionTime(isInteractive);

            if (isInteractive && slide.timer_duration_seconds) {
                const newEndTime = Date.now() + slide.timer_duration_seconds * 1000;
                setDecisionPhaseTimerEndTime(newEndTime);
                console.log(`[useTeamGameState] Timer set for ${slide.timer_duration_seconds}s. Ends at: ${new Date(newEndTime).toLocaleTimeString()}`);
            } else {
                setDecisionPhaseTimerEndTime(undefined);
            }
        });

        // Also listen for host video commands to keep the connection alive
        const unsubscribeCommands = broadcastManager.onHostCommand(() => {
            setConnected();
        });

        return () => {
            if (connectionTimeout) clearTimeout(connectionTimeout);
            unsubscribeSlideUpdates();
            unsubscribeCommands();
        };
    }, [sessionId, connectionStatus]);

    useEffect(() => {
        let timerInterval: NodeJS.Timeout | undefined;
        if (isDecisionTime && decisionPhaseTimerEndTime && decisionPhaseTimerEndTime > Date.now()) {
            const updateTimer = () => {
                const remaining = Math.round((decisionPhaseTimerEndTime - Date.now()) / 1000);
                setTimeRemainingSeconds(Math.max(0, remaining));
                if (remaining <= 0) {
                    setIsDecisionTime(false);
                    setDecisionPhaseTimerEndTime(undefined);
                    if (timerInterval) clearInterval(timerInterval);
                }
            };
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            setTimeRemainingSeconds(undefined);
        }
        return () => clearInterval(timerInterval);
    }, [isDecisionTime, decisionPhaseTimerEndTime]);

    return {
        currentActiveSlide,
        isDecisionTime,
        decisionPhaseTimerEndTime,
        timeRemainingSeconds,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure,
        connectionStatus
    };
};
