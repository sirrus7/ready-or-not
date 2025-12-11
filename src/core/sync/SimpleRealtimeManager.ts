// src/core/sync/SimpleRealtimeManager.ts
// Supabase Realtime manager for team communication using singleton pattern
// Mirrors SimpleBroadcastManager structure but uses Supabase custom channels

import {supabase} from '@shared/services/supabase';
import type {InvestmentOption, Slide, ChallengeOption} from '@shared/types';

export enum TeamGameEventType {
    DECISION_TIME = 'decision_time',
    DECISION_CLOSED = 'decision_closed',
    KPI_UPDATED = 'kpi_updated',
    DECISION_RESET = 'decision_reset',
    GAME_ENDED = 'game_ended',
    INTERACTIVE_SLIDE_DATA = 'interactive_slide_data',
}

export type RealtimeConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface InteractiveSlideData {
    slideId: number;
    slide: Slide;
    investmentOptions?: InvestmentOption[];
    challengeOptions?: ChallengeOption[];
    budgetForPhase?: number;
    rd3Investments?: InvestmentOption[];
    decisionType: string;
    decisionKey: string;
    roundNumber: number;
    title: string;
    isDecisionTime: boolean;
}


// Team game event structure
export interface TeamGameEvent {
    type: TeamGameEventType;
    sessionId: string;
    data?: any;
    timestamp: number;
}

/**
 * SimpleRealtimeManager - Singleton pattern Supabase Realtime manager
 * Handles team communication via Supabase custom channels
 * Mirrors SimpleBroadcastManager architecture for consistency
 * Automatic reconnection on connection failures
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

    // Reconnection state
    private reconnectInterval: ReturnType<typeof setInterval> | null = null;
    private reconnectAttempts: number = 0;
    private readonly RECONNECT_DELAY: number = 15000; // Reconnect every 15 seconds

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

        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }

        // Create Supabase custom channel 
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
                    if (this.reconnectAttempts > 0) {
                        console.log(`[SimpleRealtimeManager] Reconnected successfully after ${this.reconnectAttempts} attempt(s)`);
                    }
                    break;
                case 'CHANNEL_ERROR':
                case 'TIMED_OUT':
                case 'CLOSED':
                    this.updateConnectionStatus('disconnected');
                    console.warn(`[SimpleRealtimeManager] ${this.mode} connection closed`);
                    // Only schedule reconnect if not already connecting
                    if (!this.reconnectInterval) {
                        this.scheduleReconnect();
                    }
                    break;
            }
        });
    }

    private scheduleReconnect(): void {
        if (this.isDestroyed || this.reconnectInterval || this.connectionStatus === 'connected') {
            return;
        }
        const attemptReconnect = () => {
            if (this.isDestroyed) {
                if (this.reconnectInterval){
                    clearInterval(this.reconnectInterval);
                }
                return;
            }

            this.reconnectAttempts++;
            console.log(`[SimpleRealtimeManager] Attempting reconnection for ${this.mode}, ${this.reconnectAttempts} attempt...`);
            this.updateConnectionStatus('connecting');
            this.setupChannel();
        };

        this.reconnectInterval = setInterval(attemptReconnect, this.RECONNECT_DELAY);
        attemptReconnect();
    }

    private updateConnectionStatus(status: RealtimeConnectionStatus): void {
        if (this.isDestroyed) return;

        if (this.connectionStatus !== status) {
            this.connectionStatus = status;

            if (status === 'connected') {
                this.reconnectAttempts = 0;
                if (this.reconnectInterval) {
                    clearTimeout(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            }

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
    sendTeamEvent(type: TeamGameEventType, data?: any): void {
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

        this.sendTeamEvent(TeamGameEventType.DECISION_TIME, {
            decisionType: slide.type,
            decisionKey: slide.interactive_data_key,
            roundNumber: slide.round_number,
            title: slide.title,
            slideId: slide.id
        });
    }

    sendKpiUpdated(slide: Slide, kpiData?: Record<string, any>): void {
        this.sendTeamEvent(TeamGameEventType.KPI_UPDATED, {
            slideType: slide.type,
            roundNumber: slide.round_number,
            slideId: slide.id,
            requiresRefresh: true,
            ...kpiData
        });
    }

    sendDecisionReset(message?: string, teamId?: string, decisionKey?: string): void {
        this.sendTeamEvent(TeamGameEventType.DECISION_RESET, {
            message: message || 'Decisions have been reset by the host',
            ...(teamId && {teamId}),
            ...(decisionKey && {decisionKey})
        });
    }

    sendGameEnded(): void {
        this.sendTeamEvent(TeamGameEventType.GAME_ENDED, {
            message: 'Game session has ended'
        });
    }

    sendInteractiveSlideData(slideData: InteractiveSlideData): void {
        console.log(`[SimpleRealtimeManager] Broadcasting interactive slide data for slide ${slideData.slideId}`);
        this.sendTeamEvent(TeamGameEventType.INTERACTIVE_SLIDE_DATA, slideData);
    }

    // TEAM METHODS - Listening to host events
    onTeamEvent(callback: (event: TeamGameEvent) => void): () => void {
        if (this.isDestroyed) return () => {};

        this.teamEventHandlers.add(callback);
        return () => {
            if (!this.isDestroyed) {
                this.teamEventHandlers.delete(callback);
            }
        };
    }

    // CONNECTION STATUS METHODS (mirrors SimpleBroadcastManager)
    onConnectionStatus(callback: (status: RealtimeConnectionStatus) => void): () => void {
        if (this.isDestroyed) return () => {};

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

        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }

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
