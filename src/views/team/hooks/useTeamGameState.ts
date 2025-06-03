// src/views/team/hooks/useTeamGameState.ts - Simplified to work without complex broadcast integration
import {useState, useEffect, useMemo} from 'react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {db} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {GamePhaseNode, Slide} from '@shared/types/game';
import {TeamRoundData} from '@shared/types/database';

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
}

/**
 * Simplified team game state hook - focuses on essential functionality
 * For now, returns basic state structure until full broadcast integration is complete
 */
export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    // Basic state structure for team displays
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentActivePhase, setCurrentActivePhase] = useState<GamePhaseNode | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    const [decisionOptionsKey, setDecisionOptionsKey] = useState<string | undefined>(undefined);

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // Basic KPI fetching (this part remains functional)
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

    // TODO: Integrate with SimpleBroadcastManager for receiving host updates
    // This will be implemented once all the complex broadcast components are removed
    useEffect(() => {
        if (!sessionId) return;

        console.log('[useTeamGameState] Simplified hook initialized for session:', sessionId);

        // For now, provide a basic waiting state
        // This will be replaced with SimpleBroadcastManager integration

        return () => {
            console.log('[useTeamGameState] Cleanup');
        };
    }, [sessionId]);

    // Basic timer countdown (this part remains functional)
    useEffect(() => {
        let timerInterval: NodeJS.Timeout | undefined;

        if (isDecisionTime && decisionPhaseTimerEndTime && decisionPhaseTimerEndTime > Date.now()) {
            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.round((decisionPhaseTimerEndTime - now) / 1000));
                setTimeRemainingSeconds(remaining);

                if (remaining <= 0) {
                    clearInterval(timerInterval);
                    setIsDecisionTime(false);
                }
            };

            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            setTimeRemainingSeconds(undefined);
            if (timerInterval) clearInterval(timerInterval);
        }

        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [isDecisionTime, decisionPhaseTimerEndTime]);

    return {
        currentActiveSlide,
        currentActivePhase,
        isDecisionTime,
        decisionPhaseTimerEndTime,
        timeRemainingSeconds,
        decisionOptionsKey,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure
    };
};
