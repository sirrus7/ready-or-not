// src/core/sync/SimpleRealtimeManager.ts
// Supabase Realtime manager for team communication using singleton pattern
// Mirrors SimpleBroadcastManager structure but uses Supabase custom channels

import {supabase} from '@shared/services/supabase';
import type {Slide} from '@shared/types/game';

export type RealtimeConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// Team game event structure
export interface TeamGameEvent {
    type: 'decision_time' | 'decision_closed' | 'kpi_updated' | 'round_transition' | 'decision_reset' | 'game_ended';
    sessionId: string;
    data?: any;
    timestamp: number;
}

/**
 * SimpleRealtimeManager - Singleton pattern Supabase Realtime manager
 * Handles team communication via Supabase custom channels
 * Mirrors SimpleBroadcastManager architecture for consistency
 */
export class SimpleRealtimeManager {
    private static instances: Map<string, SimpleRealtimeManager> = new Map();
    private channel: any; // Supabase channel
    private sessionId: string;
    private mode: 'host' | 'team';

    // Connection tracking (mirrors SimpleBroadcastManager)
    private connectionStatus: RealtimeConnectionStatus = 'disconnected';
    private statusCallbacks: Set<(status: RealtimeConnectionStatus) => void> = new Set();

    // Event handlers (mirrors SimpleBroadcastManager)
    private teamEventHandlers: Set<(event: TeamGameEvent) => void> = new Set();

    // Track if this instance has been destroyed
    private isDestroyed: boolean = false;

    private constructor(sessionId: string, mode: 'host' | 'team') {
        this.sessionId = sessionId;
        this.mode = mode;
        this.setupChannel();
    }

    static getInstance(sessionId: string, mode: 'host' | 'team'): SimpleRealtimeManager {
        const key = `${sessionId}-${mode}`;

        // Check if existing instance is destroyed and clean it up
        const existing = SimpleRealtimeManager.instances.get(key);
        if (existing && existing.isDestroyed) {
            SimpleRealtimeManager.instances.delete(key);
        }

        if (!SimpleRealtimeManager.instances.has(key)) {
            SimpleRealtimeManager.instances.set(key, new SimpleRealtimeManager(sessionId, mode));
        }
        return SimpleRealtimeManager.instances.get(key)!;
    }

    private setupChannel(): void {
        if (this.isDestroyed) return;

        // Create Supabase custom channel for this session
        this.channel = supabase.channel(`team-events-${this.sessionId}`);

        // Listen for team game events (teams only)
        if (this.mode === 'team') {
            this.channel.on('broadcast', {event: 'team_game_event'}, (payload: any) => {
                if (this.isDestroyed) return;

                const event = payload.payload as TeamGameEvent;
                this.teamEventHandlers.forEach(handler => {
                    try {
                        handler(event);
                    } catch (error) {
                        console.error('[SimpleRealtimeManager] Error in team event handler:', error);
                    }
                });
            });
        }

        // Subscribe to the channel
        this.channel.subscribe((status: string) => {
            if (this.isDestroyed) return;

            switch (status) {
                case 'SUBSCRIBED':
                    this.updateConnectionStatus('connected');
                    console.log(`[SimpleRealtimeManager] ${this.mode} connected to team events for session ${this.sessionId}`);
                    break;
                case 'CHANNEL_ERROR':
                case 'TIMED_OUT':
                    this.updateConnectionStatus('disconnected');
                    console.error(`[SimpleRealtimeManager] ${this.mode} connection error: ${status}`);
                    break;
                case 'CLOSED':
                    this.updateConnectionStatus('disconnected');
                    break;
            }
        });
    }

    private updateConnectionStatus(status: RealtimeConnectionStatus): void {
        if (this.isDestroyed) return;

        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.statusCallbacks.forEach(callback => {
                try {
                    callback(status);
                } catch (error) {
                    console.error('[SimpleRealtimeManager] Error in status callback:', error);
                }
            });
        }
    }

    // HOST METHODS - Broadcasting to teams
    sendTeamEvent(type: TeamGameEvent['type'], data?: any): void {
        if (this.mode !== 'host' || this.isDestroyed || !this.channel) return;

        const event: TeamGameEvent = {
            type,
            sessionId: this.sessionId,
            data,
            timestamp: Date.now()
        };

        try {
            this.channel.send({
                type: 'broadcast',
                event: 'team_game_event',
                payload: event
            });

            console.log(`[SimpleRealtimeManager] 📱 Broadcasted ${type} to teams:`, data);
        } catch (error) {
            console.error(`[SimpleRealtimeManager] Failed to broadcast ${type}:`, error);
        }
    }

    // Convenience methods for common events
    sendDecisionTime(slide: Slide): void {
        if (!slide.interactive_data_key) return;

        this.sendTeamEvent('decision_time', {
            decisionType: slide.type,
            decisionKey: slide.interactive_data_key,
            roundNumber: slide.round_number,
            title: slide.title,
            slideId: slide.id
        });
    }

    sendKpiUpdated(slide: Slide, kpiData?: Record<string, any>): void {
        this.sendTeamEvent('kpi_updated', {
            slideType: slide.type,
            roundNumber: slide.round_number,
            slideId: slide.id,
            requiresRefresh: true,
            updatedKpis: kpiData // NEW: Include KPI data
        });
    }

    sendRoundTransition(roundNumber: number): void {
        this.sendTeamEvent('round_transition', {
            newRound: roundNumber,
            resetRequired: true
        });
    }

    sendDecisionReset(message?: string, teamId?: string, decisionKey?: string): void {
        this.sendTeamEvent('decision_reset', {
            message: message || 'Decisions have been reset by the host',
            ...(teamId && { teamId }),
            ...(decisionKey && { decisionKey })
        });
    }

    sendGameEnded(): void {
        this.sendTeamEvent('game_ended', {
            message: 'Game session has ended'
        });
    }

    // TEAM METHODS - Listening to host events
    onTeamEvent(callback: (event: TeamGameEvent) => void): () => void {
        if (this.isDestroyed) return () => {
        };

        this.teamEventHandlers.add(callback);
        return () => {
            if (!this.isDestroyed) {
                this.teamEventHandlers.delete(callback);
            }
        };
    }

    // CONNECTION STATUS METHODS (mirrors SimpleBroadcastManager)
    onConnectionStatus(callback: (status: RealtimeConnectionStatus) => void): () => void {
        if (this.isDestroyed) return () => {
        };

        this.statusCallbacks.add(callback);
        return () => {
            if (!this.isDestroyed) {
                this.statusCallbacks.delete(callback);
            }
        };
    }

    getConnectionStatus(): RealtimeConnectionStatus {
        return this.connectionStatus;
    }

    // CLEANUP METHODS (mirrors SimpleBroadcastManager)
    destroy(): void {
        if (this.isDestroyed) return;

        console.log(`[SimpleRealtimeManager] Destroying ${this.mode} instance for session ${this.sessionId}`);

        this.isDestroyed = true;

        // Clear all handlers
        this.teamEventHandlers.clear();
        this.statusCallbacks.clear();

        // Remove Supabase channel
        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }

        // Remove from static instances
        const key = `${this.sessionId}-${this.mode}`;
        SimpleRealtimeManager.instances.delete(key);
    }

    static destroyAll(): void {
        console.log('[SimpleRealtimeManager] Destroying all instances');
        SimpleRealtimeManager.instances.forEach(instance => instance.destroy());
        SimpleRealtimeManager.instances.clear();
    }
}
