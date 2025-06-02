// src/views/team/hooks/useTeamGameState.ts
import {useState, useEffect, useMemo} from 'react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {db} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {GamePhaseNode, Slide} from '@shared/types/game';
import {HostBroadcastPayload} from '@shared/types/sync';
import {TeamRoundData} from '@shared/types/database';
import {VideoSyncManager} from '@core/sync/VideoSyncManager'; // New import for VideoSyncManager

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
 * `useTeamGameState` is a React hook used by the team-facing application
 * to synchronize its state with the host's game progression. It listens for
 * broadcasts from the host (via `VideoSyncManager`) and fetches team-specific
 * data (like KPIs) from Supabase.
 */
export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    // State to hold the current active slide and phase data from host broadcasts.
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentActivePhase, setCurrentActivePhase] = useState<GamePhaseNode | null>(null);
    // State related to interactive decision phases.
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    const [decisionOptionsKey, setDecisionOptionsKey] = useState<string | undefined>(undefined);

    // The static game structure (defined in @core/content/GameStructure).
    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // Get the singleton instance of `VideoSyncManager` for the current session.
    // This manager handles all high-level broadcast communication related to video and game state.
    const videoSyncManager = sessionId ? VideoSyncManager.getInstance(sessionId) : null;

    // `useSupabaseQuery` hook for fetching team-specific KPI data for the current round.
    const {
        data: currentTeamKpis,
        isLoading: isLoadingKpis,
        refresh: refetchKpis // Function to manually refetch KPIs.
    } = useSupabaseQuery(
        () => {
            // Only fetch KPIs if a session and logged-in team are available, and the phase is not round 0 (welcome/setup).
            if (!sessionId || !loggedInTeamId || !currentActivePhase || currentActivePhase.round_number === 0) {
                return Promise.resolve(null);
            }
            // Fetch KPIs for the specific team and current round.
            return db.kpis.getForTeamRound(sessionId, loggedInTeamId, currentActivePhase.round_number);
        },
        // Dependencies for `useSupabaseQuery`. The query will re-run when these change.
        [sessionId, loggedInTeamId, currentActivePhase?.round_number],
        {
            cacheKey: `team-kpis-${sessionId}-${loggedInTeamId}-${currentActivePhase?.round_number}`, // Cache key for this specific query.
            cacheTimeout: 30 * 1000, // Cache data for 30 seconds.
            retryOnError: true, // Retry on query errors.
            maxRetries: 2 // Max 2 retries.
        }
    );

    // Effect hook to set up broadcast manager listeners for teacher state updates.
    useEffect(() => {
        // Ensure the `VideoSyncManager` is initialized before subscribing.
        if (!sessionId || !videoSyncManager) return;

        console.log('[useTeamGameState] Setting up broadcast listener for teacher updates');

        // Subscribe to `teacher_state_update` messages from the host.
        // This is the primary channel for host to client game state synchronization.
        const unsubscribeTeacherUpdates = videoSyncManager.subscribe('teacher_state_update', (message) => {
            console.log('[useTeamGameState] Received teacher broadcast:', message);

            const teacherPayload = message.payload as HostBroadcastPayload; // Extract the payload from the message.

            // Find the corresponding `GamePhaseNode` and `Slide` objects from the local game structure
            // based on the IDs provided in the host's payload.
            const newPhaseNode = teacherPayload.currentPhaseId ?
                gameStructure.allPhases.find(p => p.id === teacherPayload.currentPhaseId) || null : null;
            const newSlide = teacherPayload.currentSlideId !== null ?
                gameStructure.slides.find(s => s.id === teacherPayload.currentSlideId) || null : null;

            // Update local state with the received host data.
            setCurrentActivePhase(newPhaseNode);
            setCurrentActiveSlide(newSlide);
            setDecisionOptionsKey(teacherPayload.decisionOptionsKey); // Key for fetching decision options.

            // Determine if the current phase should activate decision-making for students.
            const shouldActivateDecisions = teacherPayload.isDecisionPhaseActive &&
                loggedInTeamId && // Ensure a team is logged in.
                newPhaseNode?.is_interactive_player_phase && // Phase is marked as interactive for players.
                (newSlide?.type === 'interactive_invest' || // Specific slide types that are interactive.
                    newSlide?.type === 'interactive_choice' ||
                    newSlide?.type === 'interactive_double_down_prompt' ||
                    newSlide?.type === 'interactive_double_down_select');

            // Set `isDecisionTime` based on host's signal and slide type.
            if (shouldActivateDecisions) {
                console.log('[useTeamGameState] ACTIVATING decision time');
                setIsDecisionTime(true);
            } else if (!teacherPayload.isDecisionPhaseActive) {
                console.log('[useTeamGameState] DEACTIVATING decision time');
                setIsDecisionTime(false);
            }

            // Update the end time for the decision phase timer.
            setDecisionPhaseTimerEndTime(teacherPayload.decisionPhaseTimerEndTime);

            // Trigger a refetch of team KPIs if the round number has changed.
            // This ensures the team's KPI display is up-to-date for the new round.
            if (loggedInTeamId && newPhaseNode && newPhaseNode.round_number > 0) {
                if (currentActivePhase?.round_number !== newPhaseNode.round_number) {
                    refetchKpis();
                }
            }
        });

        // Cleanup: Unsubscribe from teacher updates when the component unmounts.
        return () => {
            console.log('[useTeamGameState] Cleaning up broadcast subscription');
            unsubscribeTeacherUpdates();
        };
    }, [sessionId, videoSyncManager, gameStructure, loggedInTeamId, refetchKpis, currentActivePhase?.round_number]);

    // Effect hook for managing the countdown timer for decision phases.
    useEffect(() => {
        let timerInterval: NodeJS.Timeout | undefined;
        // Only start the timer if `isDecisionTime` is true, an end time is set, and it's in the future.
        if (isDecisionTime && decisionPhaseTimerEndTime && decisionPhaseTimerEndTime > Date.now()) {
            const updateTimer = () => {
                const now = Date.now();
                // Calculate remaining seconds, ensuring it doesn't go below zero.
                const remaining = Math.max(0, Math.round((decisionPhaseTimerEndTime - now) / 1000));
                setTimeRemainingSeconds(remaining);
                // If time runs out, clear the interval.
                if (remaining <= 0) {
                    clearInterval(timerInterval);
                }
            };
            updateTimer(); // Call once immediately to set initial time.
            timerInterval = setInterval(updateTimer, 1000); // Update every second.
        } else {
            // If not decision time or time has run out, clear the timer and reset seconds.
            setTimeRemainingSeconds(undefined);
            if (timerInterval) clearInterval(timerInterval);
        }
        // Cleanup: Clear the interval when the effect re-runs or component unmounts.
        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [isDecisionTime, decisionPhaseTimerEndTime]);

    // Return the state and derived values needed by team-facing components.
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
