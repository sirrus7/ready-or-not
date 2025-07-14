// src/core/sync/SimpleBroadcastManager.ts
// Enhanced version with KPI update broadcasting support

import {Slide} from '@shared/types/game';
import {HostCommand, SlideUpdate, PresentationStatus, JoinInfoMessage, VideoReadyMessage} from './types';
import {SyncAction, Team, TeamDecision, TeamRoundData} from "@shared/types";

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export type TeamData = {
    teams: Team[];
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    teamDecisions: TeamDecision[];
}

export type SlideHandler = (slide: Slide, teamData?: TeamData) => void;

/**
 * SimpleBroadcastManager - Host ↔ Presentation Communication
 *
 * PURPOSE: Handles real-time communication between the host interface and presentation
 * display within the same browser/device using the BroadcastChannel API.
 *
 * RESPONSIBILITIES:
 * - Slide synchronization for projection display
 * - Video controls (play, pause, seek, volume)
 * - Presentation window connection status
 * - Host commands and acknowledgments
 *
 * ARCHITECTURE:
 * - Uses BroadcastChannel API for same-browser communication
 * - Singleton pattern per session-mode combination
 * - Automatic reconnection and status tracking
 *
 * NOT USED FOR:
 * - Team communication (use SimpleRealtimeManager instead)
 * - KPI updates to teams (use Supabase Realtime instead)
 * - Cross-device communication (use Supabase Realtime instead)
 *
 * USAGE:
 * - Host mode: Send slide updates and commands to presentation
 * - Presentation mode: Receive slide updates and commands from host
 */
export class SimpleBroadcastManager {
    private static instances: Map<string, SimpleBroadcastManager> = new Map();
    private channel: BroadcastChannel;
    private sessionId: string;
    private mode: 'host' | 'presentation';

    // Connection tracking
    private connectionStatus: ConnectionStatus = 'disconnected';
    private pingInterval: NodeJS.Timeout | null = null;
    private lastPong: number = 0;
    private statusCallbacks: Set<(status: ConnectionStatus) => void> = new Set();

    // Message handlers
    private commandHandlers: Set<(command: HostCommand) => void> = new Set();
<<<<<<< HEAD
    private slideHandlers: Set<(slide: Slide, teamData?: any) => void> = new Set();
=======
    private slideHandlers: Set<SlideHandler> = new Set();
>>>>>>> 50354c8 (fix a couple errors and unknown types causing problems)
    private joinInfoHandlers: Set<(joinUrl: string, qrCodeDataUrl: string) => void> = new Set();
    private videoReadyHandlers: Set<(ready: boolean) => void> = new Set();

    // Track if this instance has been destroyed
    private isDestroyed: boolean = false;

    private constructor(sessionId: string, mode: 'host' | 'presentation') {
        this.sessionId = sessionId;
        this.mode = mode;
        this.channel = new BroadcastChannel(`game-session-${sessionId}`);
        console.log(`[SimpleBroadcastManager-${mode}] Created new instance for session ${sessionId}, initial status: ${this.connectionStatus}`);
        this.setupMessageHandling();
        this.startPingPong();
    }

    static getInstance(sessionId: string, mode: 'host' | 'presentation'): SimpleBroadcastManager {
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

            console.log(`[SimpleBroadcastManager-${this.mode}] Received message:`, message.type, message);

            if (message.type === 'PRESENTATION_DISCONNECT' && this.mode === 'host') {
                console.log('[SimpleBroadcastManager] Received explicit disconnect from presentation');
                this.updateConnectionStatus('disconnected');
                return;
            }

            switch (message.type) {
                case 'HOST_COMMAND':
                    if (this.mode === 'presentation') {
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
                    if (this.mode === 'presentation') {
                        this.slideHandlers.forEach(handler => handler(message.slide, message.teamData));
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

                case 'JOIN_INFO':
                    if (this.mode === 'presentation') {
                        this.joinInfoHandlers.forEach(handler =>
                            handler(message.joinUrl, message.qrCodeDataUrl)
                        );
                    }
                    break;

                case 'JOIN_INFO_CLOSE':
                    if (this.mode === 'presentation') {
                        this.joinInfoHandlers.forEach(handler => handler('', ''));
                    }
                    break;

                case 'PING':
                    if (this.mode === 'presentation') {
                        this.sendStatus('pong');
                    }
                    break;

                case 'COMMAND_ACK':
                    break;

                case 'VIDEO_READY':
                    if (this.mode === 'host') {
                        const videoReady = message as VideoReadyMessage;
                        console.log(`[SimpleBroadcastManager-${this.mode}] Received VIDEO_READY:`, videoReady.ready);
                        this.videoReadyHandlers.forEach(handler => handler(videoReady.ready));
                    }
                    break;
            }
        };
    }

    private startPingPong(): void {
        if (this.mode === 'host') {
            // Host sends ping every 2 seconds
            this.pingInterval = setInterval(() => {
                if (this.isDestroyed) return;

                this.sendMessage({
                    type: 'PING',
                    sessionId: this.sessionId,
                    timestamp: Date.now()
                });

                // Check for presentation timeout (5 seconds)
                // Only check timeout if we've ever been connected (lastPong > 0)
                if (this.lastPong > 0 && Date.now() - this.lastPong > 5000 && this.connectionStatus === 'connected') {
                    console.log('[SimpleBroadcastManager] Presentation timeout detected');
                    this.updateConnectionStatus('disconnected');
                }
            }, 2000);
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
            console.log(`[SimpleBroadcastManager-${this.mode}] Connection status changing from '${this.connectionStatus}' to '${status}'`);
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

    sendCommand(action: SyncAction, data?: any): void {
        if (this.mode !== 'host' || this.isDestroyed) return;

        const command: HostCommand = {
            type: 'HOST_COMMAND',
            sessionId: this.sessionId,
            id: `cmd_${Date.now()}`,
            action,
<<<<<<< HEAD
            data: {
                time: Date.now(),
                ...data
            },
=======
            data,
>>>>>>> 50354c8 (fix a couple errors and unknown types causing problems)
            timestamp: Date.now(),
        };

        this.sendMessage(command);
    }

    sendSlideUpdate(slide: Slide, teamData?: {
        teams: Team[];
        teamRoundData: Record<string, Record<number, TeamRoundData>>;
        teamDecisions: TeamDecision[];
    }): void {
        if (this.mode !== 'host' || this.isDestroyed) return;

        const update: SlideUpdate = {
            type: 'SLIDE_UPDATE',
            sessionId: this.sessionId,
            slide,
            teamData,
            timestamp: Date.now()
        };

        this.sendMessage(update);
    }

    sendJoinInfo(joinUrl: string, qrCodeDataUrl: string): void {
        if (this.mode !== 'host' || this.isDestroyed) return;

        const message: JoinInfoMessage = {
            type: 'JOIN_INFO',
            sessionId: this.sessionId,
            joinUrl,
            qrCodeDataUrl,
            timestamp: Date.now()
        };

        this.sendMessage(message);
    }

    sendJoinInfoClose(): void {
        if (this.mode !== 'host' || this.isDestroyed) return;

        const message = {
            type: 'JOIN_INFO_CLOSE',
            sessionId: this.sessionId,
            timestamp: Date.now()
        };

        this.sendMessage(message);
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

    onSlideUpdate(callback: (slide: Slide, teamData?: any) => void): () => void {
        if (this.isDestroyed) return () => {};

        this.slideHandlers.add(callback);
        return () => {
            this.slideHandlers.delete(callback);
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

    destroy(): void {
        if (this.isDestroyed) return;
        if (this.mode === 'presentation') {
            this.sendDisconnectMessage();
        }
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
        this.videoReadyHandlers.clear();

        // Remove from instances map
        const key = `${this.sessionId}-${this.mode}`;
        SimpleBroadcastManager.instances.delete(key);
    }

    onJoinInfo(callback: (joinUrl: string, qrCodeDataUrl: string) => void): () => void {
        if (this.isDestroyed) return () => {};

        this.joinInfoHandlers.add(callback);
        return () => {
            this.joinInfoHandlers.delete(callback);
        };
    }

    // Video ready methods
    sendVideoReady(ready: boolean): void {
        if (this.mode !== 'presentation' || this.isDestroyed) return;
        
        console.log(`[SimpleBroadcastManager-${this.mode}] Sending video ready:`, ready);
        const message: VideoReadyMessage = {
            type: 'VIDEO_READY',
            sessionId: this.sessionId,
            ready,
            timestamp: Date.now()
        };

        this.sendMessage(message);
    }

    onVideoReady(callback: (ready: boolean) => void): () => void {
        if (this.isDestroyed) return () => {};

        this.videoReadyHandlers.add(callback);
        return () => {
            this.videoReadyHandlers.delete(callback);
        };
    }

    private sendDisconnectMessage(): void {
        if (this.mode !== 'presentation' || this.isDestroyed) return;

        const message = {
            type: 'PRESENTATION_DISCONNECT',
            sessionId: this.sessionId,
            timestamp: Date.now()
        };

        try {
            this.channel.postMessage(message);
        } catch (error) {
            console.warn('[SimpleBroadcastManager] Failed to send disconnect message:', error);
        }
    }
}
