// src/pages/TeamDisplayPage/hooks/useTeamBroadcast.ts - Broadcast listening logic
import { useState, useEffect, useMemo } from 'react';
import { useBroadcastManager } from '../../../utils/broadcastManager';
import { useSupabaseQuery } from '../../../hooks/supabase';
import { db } from '../../../utils/supabase';
import { readyOrNotGame_2_0_DD } from '../../../data/gameStructure';
import {
    GamePhaseNode,
    Slide,
    HostBroadcastPayload,
    TeamRoundData
} from '../../../types';

interface UseTeamBroadcastProps {
    sessionId: string | null;
    loggedInTeamId: string | null;
}

interface UseTeamBroadcastReturn {
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

export const useTeamBroadcast = ({ sessionId, loggedInTeamId }: UseTeamBroadcastProps): UseTeamBroadcastReturn => {
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentActivePhase, setCurrentActivePhase] = useState<GamePhaseNode | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    const [decisionOptionsKey, setDecisionOptionsKey] = useState<string | undefined>(undefined);

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);
    const broadcastManager = useBroadcastManager(sessionId, 'display');

    // Enhanced query for team KPIs
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
            cacheTimeout: 30 * 1000, // 30 seconds
            retryOnError: true,
            maxRetries: 2
        }
    );

    // Set up broadcast manager for teacher updates
    useEffect(() => {
        if (!sessionId || !broadcastManager) return;

        console.log('[useTeamBroadcast] Setting up broadcast listener');

        const unsubscribeTeacherUpdates = broadcastManager.subscribe('teacher_state_update', (message) => {
            console.log('[useTeamBroadcast] Received teacher broadcast:', message);

            const teacherPayload = message as HostBroadcastPayload;
            const newPhaseNode = teacherPayload.currentPhaseId ?
                gameStructure.allPhases.find(p => p.id === teacherPayload.currentPhaseId) || null : null;
            const newSlide = teacherPayload.currentSlideId !== null ?
                gameStructure.slides.find(s => s.id === teacherPayload.currentSlideId) || null : null;

            // Update state immediately
            setCurrentActivePhase(newPhaseNode);
            setCurrentActiveSlide(newSlide);
            setDecisionOptionsKey(teacherPayload.decisionOptionsKey);

            // Decision activation logic
            const shouldActivateDecisions = teacherPayload.isDecisionPhaseActive &&
                loggedInTeamId &&
                newPhaseNode?.is_interactive_player_phase &&
                (newSlide?.type === 'interactive_invest' ||
                    newSlide?.type === 'interactive_choice' ||
                    newSlide?.type === 'interactive_double_down_prompt' ||
                    newSlide?.type === 'interactive_double_down_select');

            if (shouldActivateDecisions) {
                console.log('[useTeamBroadcast] ACTIVATING decision time');
                setIsDecisionTime(true);
            } else if (!teacherPayload.isDecisionPhaseActive) {
                console.log('[useTeamBroadcast] DEACTIVATING decision time');
                setIsDecisionTime(false);
            }

            // Handle timer
            setDecisionPhaseTimerEndTime(teacherPayload.decisionPhaseTimerEndTime);

            // Refresh KPIs when phase changes to a different round
            if (loggedInTeamId && newPhaseNode && newPhaseNode.round_number > 0) {
                if (currentActivePhase?.round_number !== newPhaseNode.round_number) {
                    refetchKpis();
                }
            }
        });

        return () => {
            console.log('[useTeamBroadcast] Cleaning up broadcast subscription');
            unsubscribeTeacherUpdates();
        };
    }, [sessionId, broadcastManager, gameStructure, loggedInTeamId, refetchKpis, currentActivePhase?.round_number]);

    // Timer effect
    useEffect(() => {
        let timerInterval: NodeJS.Timeout | undefined;
        if (isDecisionTime && decisionPhaseTimerEndTime && decisionPhaseTimerEndTime > Date.now()) {
            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.round((decisionPhaseTimerEndTime - now) / 1000));
                setTimeRemainingSeconds(remaining);
                if (remaining <= 0) {
                    clearInterval(timerInterval);
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
