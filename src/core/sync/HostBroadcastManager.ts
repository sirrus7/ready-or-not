import {Slide} from '@shared/types/game';
import {
    HostCommand,
    SlideUpdate,
    PresentationStatus,
    JoinInfoMessage,
    VideoStatusResponse,
    BroadcastEventType
} from './types';
import {Team, TeamDecision, TeamRoundData} from '@shared/types';
import {videoDebug} from '@shared/utils/video/debug';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * HostBroadcastManager - Host-side BroadcastChannel sync for presentation
 */
export class HostBroadcastManager {
    private static instances: Map<string, HostBroadcastManager> = new Map();
    private channel: BroadcastChannel;
    private sessionId: string;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private pingInterval: NodeJS.Timeout | null = null;
    private lastPong: number = 0;
    private statusCallbacks: Set<(status: ConnectionStatus) => void> = new Set();
    private onPresentationVideoReadyHandlers: Set<() => void> = new Set();
    private isDestroyed: boolean = false;

    private constructor(sessionId: string) {
        this.sessionId = sessionId;
        this.channel = new BroadcastChannel(`game-session-${sessionId}`);
        this.setupMessageHandling();
        this.startPingPong();
    }

    /**
     * Get the singleton instance for a sessionId
     */
    static getInstance(sessionId: string): HostBroadcastManager {
        if (!this.instances.has(sessionId)) {
            this.instances.set(sessionId, new HostBroadcastManager(sessionId));
        }
        return this.instances.get(sessionId)!;
    }

    private setupMessageHandling(): void {
        this.channel.onmessage = (event) => {
            if (this.isDestroyed) return;
            const message = event.data;
            if (message.sessionId !== this.sessionId) return;

            switch (message.type) {
                case BroadcastEventType.PRESENTATION_DISCONNECT:
                    this.updateConnectionStatus('disconnected');
                    break;
                case BroadcastEventType.PRESENTATION_STATUS: {
                    videoDebug.syncLog('HostBroadcastManager', 'received presentation status somehow');
                    const status = message as PresentationStatus;
                    if (status.status === 'ready') {
                        this.updateConnectionStatus('connected');
                    } else if (status.status === 'pong') {
                        this.lastPong = Date.now();
                        this.updateConnectionStatus('connected');
                    }
                    break;
                }
                case BroadcastEventType.PRESENTATION_VIDEO_READY:
                    videoDebug.syncLog('HostBroadcastManager', 'received presentation video ready somehow');
                    this.onPresentationVideoReadyHandlers.forEach(handler => handler());
                    break;
                case BroadcastEventType.VIDEO_STATUS_RESPONSE: {
                    const response = message as VideoStatusResponse;
                    if (response.isReady) {
                        videoDebug.syncLog('HostBroadcastManager', 'Received video status response: ready');
                        this.onPresentationVideoReadyHandlers.forEach(handler => handler());
                    } else {
                        videoDebug.syncLog('HostBroadcastManager', 'Received video status response: not ready');
                    }
                    break;
                }
                default:
                    // Ignore other message types
                    break;
            }
        };
    }

    private startPingPong(): void {
        // Host sends ping every 500ms
        this.pingInterval = setInterval(() => {
            if (this.isDestroyed) return;
            this.sendMessage({
                type: BroadcastEventType.PING,
                sessionId: this.sessionId,
                timestamp: Date.now()
            });
            // Check for presentation timeout (10 seconds)
            if (Date.now() - this.lastPong > 10000 && this.connectionStatus === 'connected') {
                this.updateConnectionStatus('disconnected');
            }
        }, 500);
    }

    private sendMessage(message: any): void {
        if (this.isDestroyed) return;
        try {
            this.channel.postMessage(message);
        } catch (error) {
            if (!this.isDestroyed) {
                videoDebug.error('[HostBroadcastManager] Failed to send message:', error);
            }
        }
    }

    private updateConnectionStatus(status: ConnectionStatus): void {
        if (this.isDestroyed) return;
        videoDebug.syncLog('HostBroadcastManager', `updating connection status to ${status}`);
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            videoDebug.syncLog('HostBroadcastManager', `Calling ${this.statusCallbacks.size} status callbacks`);
            this.statusCallbacks.forEach(callback => {
                try {
                    callback(status);
                } catch (error) {
                    videoDebug.error('[HostBroadcastManager] Error in status callback:', error);
                }
            });
        } else {
            videoDebug.syncLog('HostBroadcastManager', 'Status unchanged, not calling callbacks');
        }
    }

    sendClosePresentation(): void {
        const message = {
            type: BroadcastEventType.CLOSE_PRESENTATION,
        }
        this.sendMessage(message);
    }

    /**
     * Force disconnect status (for when window is closed)
     */
    forceDisconnect(): void {
        videoDebug.syncLog('HostBroadcastManager', 'Force disconnecting presentation');
        this.updateConnectionStatus('disconnected');
    }

    /**
     * Send a host command (play, pause, seek, etc.) to the presentation
     */
    sendCommand(action: 'play'
        | 'pause'
        | 'seek'
        | 'reset'
        | 'decision_reset'
        | 'sync'
        | 'volume'
        | 'close_presentation'
        | 'video_status_poll'
        | 'scroll', data?: any): void {
        if (this.isDestroyed) return;
        const command: HostCommand = {
            type: BroadcastEventType.HOST_COMMAND,
            sessionId: this.sessionId,
            id: `cmd_${Date.now()}`,
            action,
            data: {
                time: Date.now(),
                ...data
            },
            timestamp: Date.now(),
        };
        this.sendMessage(command);
    }

    /**
     * Send a video status poll to the presentation
     */
    sendVideoStatusPoll(): void {
        if (this.isDestroyed) return;
        const poll = {
            type: BroadcastEventType.VIDEO_STATUS_POLL,
            sessionId: this.sessionId,
            timestamp: Date.now()
        };
        this.sendMessage(poll);
    }

    /**
     * Send a slide update to the presentation
     */
    sendSlideUpdate(slide: Slide, teamData?: {
        teams: Team[];
        teamRoundData: Record<string, Record<number, TeamRoundData>>;
        teamDecisions: TeamDecision[];
    }): void {
        if (this.isDestroyed) return;
        const update: SlideUpdate = {
            type: BroadcastEventType.SLIDE_UPDATE,
            sessionId: this.sessionId,
            slide,
            teamData,
            timestamp: Date.now()
        };
        this.sendMessage(update);
    }

    /**
     * Send join info (URL and QR code) to the presentation
     */
    sendJoinInfo(joinUrl: string, qrCodeDataUrl: string): void {
        if (this.isDestroyed) return;
        const message: JoinInfoMessage = {
            type: BroadcastEventType.JOIN_INFO,
            sessionId: this.sessionId,
            joinUrl,
            qrCodeDataUrl,
            timestamp: Date.now()
        };
        this.sendMessage(message);
    }

    /**
     * Close the join info display on the presentation
     */
    sendJoinInfoClose(): void {
        if (this.isDestroyed) return;
        const message = {
            type: BroadcastEventType.JOIN_INFO_CLOSE,
            sessionId: this.sessionId,
            timestamp: Date.now()
        };
        this.sendMessage(message);
    }

    /**
     * Listen for presentation connection status changes
     * @param callback (status) => void
     * @returns unsubscribe function
     */
    onPresentationStatus(callback: (status: ConnectionStatus) => void): () => void {
        if (this.isDestroyed) return () => {
        };
        this.statusCallbacks.add(callback);
        videoDebug.syncLog('HostBroadcastManager', 'registering onPresentationStatus');
        // Immediately call with current status
        callback(this.connectionStatus);
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    /**
     * Listen for video ready events from the presentation
     * @param callback () => void
     */
    onPresentationVideoReady(callback: () => void): void {
        this.onPresentationVideoReadyHandlers.add(callback);
    }

    /**
     * Destroy the manager and underlying channel
     */
    destroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        try {
            this.channel.close();
        } catch (error) {
            videoDebug.warn('[HostBroadcastManager] Error closing channel:', error);
        }
        this.statusCallbacks.clear();
        this.onPresentationVideoReadyHandlers.clear();
        const key = this.sessionId;
        HostBroadcastManager.instances.delete(key);
    }
}
