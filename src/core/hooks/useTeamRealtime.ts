// src/core/hooks/useTeamRealtime.ts
// Custom hook for using SimpleRealtimeManager in React components
// Mirrors the pattern used with SimpleBroadcastManager

import {useEffect, useMemo, useCallback} from 'react';
import {
    SimpleRealtimeManager,
    type RealtimeConnectionStatus,
    type TeamGameEvent
} from '@core/sync/SimpleRealtimeManager';
import type {Slide} from '@shared/types/game';

/**
 * Custom hook for team realtime communication
 * Provides a React-friendly interface to SimpleRealtimeManager
 */
export const useTeamRealtime = (sessionId: string | null, mode: 'host' | 'team') => {
    // Create manager instance (memoized like SimpleBroadcastManager usage)
    const realtimeManager = useMemo(() => {
        return sessionId ? SimpleRealtimeManager.getInstance(sessionId, mode) : null;
    }, [sessionId, mode]);

    // Cleanup on unmount or session change
    useEffect(() => {
        return () => {
            // Don't destroy the manager here - let it persist like SimpleBroadcastManager
            // The singleton pattern manages cleanup when instances are no longer needed
        };
    }, [realtimeManager]);

    // HOST METHODS - Broadcasting to teams
    const broadcastToTeams = useCallback((type: TeamGameEvent['type'], data?: any) => {
        if (mode !== 'host' || !realtimeManager) return;
        realtimeManager.sendTeamEvent(type, data);
    }, [realtimeManager, mode]);

    const broadcastDecisionTime = useCallback((slide: Slide) => {
        if (mode !== 'host' || !realtimeManager) return;
        realtimeManager.sendDecisionTime(slide);
    }, [realtimeManager, mode]);

    const broadcastKpiUpdated = useCallback((slide: Slide) => {
        if (mode !== 'host' || !realtimeManager) return;
        realtimeManager.sendKpiUpdated(slide);
    }, [realtimeManager, mode]);

    const broadcastRoundTransition = useCallback((roundNumber: number) => {
        if (mode !== 'host' || !realtimeManager) return;
        realtimeManager.sendRoundTransition(roundNumber);
    }, [realtimeManager, mode]);

    const broadcastDecisionReset = useCallback((message?: string) => {
        if (mode !== 'host' || !realtimeManager) return;
        realtimeManager.sendDecisionReset(message);
    }, [realtimeManager, mode]);

    const broadcastGameEnded = useCallback(() => {
        if (mode !== 'host' || !realtimeManager) return;
        realtimeManager.sendGameEnded();
    }, [realtimeManager, mode]);

    // TEAM METHODS - Listening to host events
    const onTeamEvent = useCallback((callback: (event: TeamGameEvent) => void) => {
        if (mode !== 'team' || !realtimeManager) return () => {
        };
        return realtimeManager.onTeamEvent(callback);
    }, [realtimeManager, mode]);

    // CONNECTION STATUS METHODS
    const onConnectionStatus = useCallback((callback: (status: RealtimeConnectionStatus) => void) => {
        if (!realtimeManager) return () => {
        };
        return realtimeManager.onConnectionStatus(callback);
    }, [realtimeManager]);

    const getConnectionStatus = useCallback(() => {
        return realtimeManager?.getConnectionStatus() || 'disconnected';
    }, [realtimeManager]);

    return {
        // Manager instance (for advanced usage)
        realtimeManager,

        // HOST METHODS
        broadcastToTeams,
        broadcastDecisionTime,
        broadcastKpiUpdated,
        broadcastRoundTransition,
        broadcastDecisionReset,
        broadcastGameEnded,

        // TEAM METHODS
        onTeamEvent,

        // CONNECTION METHODS
        onConnectionStatus,
        getConnectionStatus,

        // STATUS
        isConnected: getConnectionStatus() === 'connected'
    };
};
