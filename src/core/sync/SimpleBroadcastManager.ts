// src/core/sync/SimpleBroadcastManager.ts
// Enhanced version with KPI update broadcasting support

import {Slide} from '@shared/types/game';
import {HostCommand, SlideUpdate, PresentationStatus} from './types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// Enhanced KPI update data structure
export interface KpiUpdateData {
    type: 'kpi_update';
    timestamp: number;
    updatedTeams: Array<{
        teamId: string;
        roundNumber: number;
        kpis: {
            capacity: number;
            orders: number;
            cost: number;
            asp: number;
            revenue: number;
            net_income: number;
            net_margin: number;
        };
    }>;
}

/**
 * Enhanced SimpleBroadcastManager with KPI update support
 * Uses native BroadcastChannel API directly with singleton pattern
 */
export class SimpleBroadcastManager {
    private static instances: Map<string, SimpleBroadcastManager> = new Map();
    private channel: BroadcastChannel;
    private sessionId: string;
    private mode: 'host' | 'presentation' | 'team';

    // Connection tracking
    private connectionStatus: ConnectionStatus = 'disconnected';
    private pingInterval: NodeJS.Timeout | null = null;
    private lastPong: number = 0;
    private statusCallbacks: Set<(status: ConnectionStatus) => void> = new Set();

    // Message handlers
    private commandHandlers: Set<(command: HostCommand) => void> = new Set();
    private slideHandlers: Set<(slide: Slide) => void> = new Set();
    private kpiHandlers: Set<(data: KpiUpdateData) => void> = new Set(); // NEW: KPI update handlers

    // Track if this instance has been destroyed
    private isDestroyed: boolean = false;

    private constructor(sessionId: string, mode: 'host' | 'presentation' | 'team') {
        this.sessionId = sessionId;
        this.mode = mode;
        this.channel = new BroadcastChannel(`game-session-${sessionId}`);
        this.setupMessageHandling();
        this.startPingPong();
    }

    static getInstance(sessionId: string, mode: 'host' | 'presentation' | 'team'): SimpleBroadcastManager {
        const key = `${sessionId}-${mode}`;

        // Check if existing instance is destroyed and clean it up
        const existing = SimpleBroadcastManager.instances.get(key);
        if (existing && existing.isDestroyed) {
            SimpleBroadcastManager.instances.delete(key);
        }

        if (!SimpleBroadcastManager.instances.has(key)) {
            SimpleBroadcastManager.instances.set(key, new SimpleBroadcastManager(sessionId, mode));
        }
        return SimpleBroadcastManager.instances.get(key)!;
    }

    private setupMessageHandling(): void {
        this.channel.onmessage = (event) => {
            if (this.isDestroyed) return;

            const message = event.data;

            // Only process messages for this session
            if (message.sessionId !== this.sessionId) return;

            switch (message.type) {
                case 'HOST_COMMAND':
                    if (this.mode === 'presentation' || this.mode === 'team') {
                        this.commandHandlers.forEach(handler => handler(message as HostCommand));
                        // Send acknowledgment
                        this.sendMessage({
                            type: 'COMMAND_ACK',
                            sessionId: this.sessionId,
                            commandId: message.id,
                            timestamp: Date.now()
                        });
                    }
                    break;

                case 'SLIDE_UPDATE':
                    if (this.mode === 'presentation' || this.mode === 'team') {
                        this.slideHandlers.forEach(handler => handler(message.slide));
                    }
                    break;

                case 'KPI_UPDATE': // NEW: Handle KPI updates
                    if (this.mode === 'team') {
                        this.kpiHandlers.forEach(handler => handler(message.payload));
                    }
                    break;

                case 'PRESENTATION_STATUS':
                    if (this.mode === 'host') {
                        const status = message as PresentationStatus;
                        if (status.status === 'ready') {
                            this.updateConnectionStatus('connected');
                        } else if (status.status === 'pong') {
                            this.lastPong = Date.now();
                            this.updateConnectionStatus('connected');
                        }
                    }
                    break;

                case 'PING':
                    if (this.mode === 'presentation') {
                        this.sendStatus('pong');
                    }
                    break;

                case 'COMMAND_ACK':
                    break;
            }
        };
    }

    private startPingPong(): void {
        if (this.mode === 'host') {
            // Host sends ping every 5 seconds
            this.pingInterval = setInterval(() => {
                if (this.isDestroyed) return;

                this.sendMessage({
                    type: 'PING',
                    sessionId: this.sessionId,
                    timestamp: Date.now()
                });

                // Check for presentation timeout (10 seconds)
                if (Date.now() - this.lastPong > 10000 && this.connectionStatus === 'connected') {
                    this.updateConnectionStatus('disconnected');
                }
            }, 5000);
        } else {
            // Presentation announces ready after a short delay
            if (this.mode === 'presentation') {
                setTimeout(() => {
                    if (!this.isDestroyed) {
                        this.sendStatus('ready');
                    }
                }, 100);
            }
        }
    }

    private sendMessage(message: any): void {
        if (this.isDestroyed) {
            console.warn('[SimpleBroadcastManager] Attempted to send message on destroyed instance');
            return;
        }

        try {
            this.channel.postMessage(message);
        } catch (error) {
            if (!this.isDestroyed) {
                console.error('[SimpleBroadcastManager] Failed to send message:', error);
            }
        }
    }

    private updateConnectionStatus(status: ConnectionStatus): void {
        if (this.isDestroyed) return;

        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.statusCallbacks.forEach(callback => {
                try {
                    callback(status);
                } catch (error) {
                    console.error('[SimpleBroadcastManager] Error in status callback:', error);
                }
            });
        }
    }

    // HOST METHODS

    sendCommand(action: 'play' | 'pause' | 'seek' | 'reset' | 'close_presentation' | 'decision_reset' | 'sync', data?: any): void {
        if (this.mode !== 'host' || this.isDestroyed) return;

        const command: HostCommand = {
            type: 'HOST_COMMAND',
            sessionId: this.sessionId,
            id: `cmd_${Date.now()}`,
            action,
            data,
            time: Date.now(),
            timestamp: Date.now(),
        };

        this.sendMessage(command);
    }

    sendSlideUpdate(slide: Slide): void {
        if (this.mode !== 'host' || this.isDestroyed) return;

        const update: SlideUpdate = {
            type: 'SLIDE_UPDATE',
            sessionId: this.sessionId,
            slide,
            timestamp: Date.now()
        };

        this.sendMessage(update);
    }

    // NEW: Send KPI updates to all team interfaces
    sendKpiUpdate(data: KpiUpdateData): void {
        if (this.mode !== 'host' || this.isDestroyed) return;

        const update = {
            type: 'KPI_UPDATE',
            sessionId: this.sessionId,
            payload: data,
            timestamp: Date.now()
        };

        this.sendMessage(update);
    }

    onPresentationStatus(callback: (status: ConnectionStatus) => void): () => void {
        if (this.isDestroyed) return () => {
        };

        this.statusCallbacks.add(callback);
        // Immediately call with current status
        callback(this.connectionStatus);

        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    // PRESENTATION METHODS

    onHostCommand(callback: (command: HostCommand) => void): () => void {
        if (this.isDestroyed) return () => {
        };

        this.commandHandlers.add(callback);
        return () => {
            this.commandHandlers.delete(callback);
        };
    }

    onSlideUpdate(callback: (slide: Slide) => void): () => void {
        if (this.isDestroyed) return () => {
        };

        this.slideHandlers.add(callback);
        return () => {
            this.slideHandlers.delete(callback);
        };
    }

    // NEW: Listen for KPI updates (for team interfaces)
    onKpiUpdate(callback: (data: KpiUpdateData) => void): () => void {
        if (this.isDestroyed) return () => {
        };

        this.kpiHandlers.add(callback);
        return () => {
            this.kpiHandlers.delete(callback);
        };
    }

    sendStatus(status: 'ready' | 'pong'): void {
        if (this.mode !== 'presentation' || this.isDestroyed) return;

        const statusMessage: PresentationStatus = {
            type: 'PRESENTATION_STATUS',
            sessionId: this.sessionId,
            status,
            timestamp: Date.now()
        };

        this.sendMessage(statusMessage);
    }

    // COMMON METHODS

    getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    destroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        // Close the channel
        try {
            this.channel.close();
        } catch (error) {
            console.warn('[SimpleBroadcastManager] Error closing channel:', error);
        }

        // Clear all handlers
        this.statusCallbacks.clear();
        this.commandHandlers.clear();
        this.slideHandlers.clear();
        this.kpiHandlers.clear(); // NEW: Clear KPI handlers

        // Remove from instances map
        const key = `${this.sessionId}-${this.mode}`;
        SimpleBroadcastManager.instances.delete(key);
    }
}
