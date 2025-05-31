// src/utils/broadcastManager.ts - Enhanced with improved connection handling
export interface VideoState {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    lastUpdate: number;
}

export interface ConnectionStatus {
    isConnected: boolean;
    lastPing: number;
    connectionType: 'host' | 'presentation' | 'display' | 'unknown';
    latency?: number;
}

export interface BroadcastMessage {
    type: string;
    sessionId: string;
    timestamp: number;
    [key: string]: any;
}

export type MessageHandler = (message: BroadcastMessage) => void;

export class SessionBroadcastManager {
    private channel: BroadcastChannel;
    private handlers: Map<string, MessageHandler[]> = new Map();
    private pingInterval: NodeJS.Timeout | null = null;
    private connectionCheckInterval: NodeJS.Timeout | null = null;
    private connectionStatus: ConnectionStatus = {
        isConnected: false,
        lastPing: 0,
        connectionType: 'unknown'
    };
    private connectionListeners: Array<(status: ConnectionStatus) => void> = [];
    private lastPongTime = 0;
    private isDestroyed = false;
    private mode: 'host' | 'presentation' | 'display';

    constructor(
        private sessionId: string,
        mode: 'host' | 'presentation' | 'display' = 'host'
    ) {
        this.mode = mode;
        const channelName = `game-session-${sessionId}`;
        this.channel = new BroadcastChannel(channelName);
        this.setupMessageHandling();
        this.startConnectionMonitoring();

        console.log(`[BroadcastManager] Created for session ${sessionId} in ${mode} mode`);
    }

    private setupMessageHandling() {
        this.channel.addEventListener('message', (event: MessageEvent) => {
            if (this.isDestroyed) return;

            const message = event.data as BroadcastMessage;

            // Ignore messages from other sessions
            if (message.sessionId !== this.sessionId) {
                return;
            }

            console.log(`[BroadcastManager] [${this.mode}] Received message:`, message.type, message);

            // Handle connection messages internally
            this.handleConnectionMessages(message);

            // Call registered handlers
            const handlers = this.handlers.get(message.type) || [];
            handlers.forEach(handler => {
                try {
                    handler(message);
                } catch (error) {
                    console.error(`[BroadcastManager] Handler error for ${message.type}:`, error);
                }
            });
        });
    }

    private handleConnectionMessages(message: BroadcastMessage) {
        const now = Date.now();

        switch (message.type) {
            case 'PING':
                // Respond to ping with pong, include current video state if requested
                console.log(`[BroadcastManager] [${this.mode}] Responding to ping from ${message.connectionType || 'unknown'}`);
                this.broadcast('PONG', {
                    connectionType: this.mode,
                    latency: now - message.timestamp,
                    videoState: message.requestVideoState ? this.getVideoStateFromDOM() : undefined
                });
                break;

            case 'PONG':
                const latency = now - message.timestamp;
                console.log(`[BroadcastManager] [${this.mode}] Received pong from ${message.connectionType}, latency: ${latency}ms`);
                this.lastPongTime = now;
                this.updateConnectionStatus({
                    isConnected: true,
                    lastPing: now,
                    connectionType: message.connectionType || 'unknown',
                    latency
                });
                break;

            case 'PRESENTATION_READY':
                if (this.mode !== 'presentation') {
                    console.log(`[BroadcastManager] [${this.mode}] Presentation display is ready`);
                    this.updateConnectionStatus({
                        isConnected: true,
                        lastPing: now,
                        connectionType: 'presentation'
                    });
                }
                break;

            case 'SESSION_ENDED':
                console.log(`[BroadcastManager] [${this.mode}] Session ended`);
                this.updateConnectionStatus({
                    isConnected: false,
                    lastPing: 0,
                    connectionType: 'unknown'
                });
                break;
        }
    }

    private getVideoStateFromDOM(): VideoState | null {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (!video) return null;

        return {
            playing: !video.paused,
            currentTime: video.currentTime,
            duration: video.duration || 0,
            volume: video.volume,
            lastUpdate: Date.now()
        };
    }

    private updateConnectionStatus(newStatus: Partial<ConnectionStatus>) {
        const oldStatus = { ...this.connectionStatus };
        this.connectionStatus = { ...this.connectionStatus, ...newStatus };

        // Notify listeners if status changed
        if (oldStatus.isConnected !== this.connectionStatus.isConnected ||
            oldStatus.connectionType !== this.connectionStatus.connectionType) {
            console.log(`[BroadcastManager] [${this.mode}] Connection status changed:`, this.connectionStatus);
            this.connectionListeners.forEach(listener => {
                try {
                    listener(this.connectionStatus);
                } catch (error) {
                    console.error('[BroadcastManager] Error in connection listener:', error);
                }
            });
        }
    }

    private startConnectionMonitoring() {
        // Send periodic pings
        this.pingInterval = setInterval(() => {
            if (this.isDestroyed) return;

            console.log(`[BroadcastManager] [${this.mode}] Sending ping`);
            this.broadcast('PING', {
                connectionType: this.mode,
                requestVideoState: this.mode === 'host' // Host requests video state in pings
            });
        }, 3000); // Increased interval for stability

        // Check connection status
        this.connectionCheckInterval = setInterval(() => {
            if (this.isDestroyed) return;

            const timeSinceLastPong = Date.now() - this.lastPongTime;
            const wasConnected = this.connectionStatus.isConnected;

            if (timeSinceLastPong > 8000 && wasConnected) {
                console.log(`[BroadcastManager] [${this.mode}] Connection timeout (${timeSinceLastPong}ms since last pong)`);
                this.updateConnectionStatus({
                    isConnected: false,
                    connectionType: 'unknown'
                });
            }
        }, 2000);

        // Initial connection attempt for presentation mode
        if (this.mode === 'presentation') {
            setTimeout(() => {
                this.announcePresentation();
            }, 500);
        }
    }

    // Public API
    subscribe(eventType: string, handler: MessageHandler): () => void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);

        console.log(`[BroadcastManager] [${this.mode}] Subscribed to ${eventType} (${this.handlers.get(eventType)!.length} handlers)`);

        // Return unsubscribe function
        return () => {
            const handlers = this.handlers.get(eventType);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                    console.log(`[BroadcastManager] [${this.mode}] Unsubscribed from ${eventType}`);
                }
            }
        };
    }

    broadcast(eventType: string, data: Partial<BroadcastMessage> = {}): void {
        if (this.isDestroyed) return;

        const message: BroadcastMessage = {
            type: eventType,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            ...data
        };

        console.log(`[BroadcastManager] [${this.mode}] Broadcasting ${eventType}:`, message);
        this.channel.postMessage(message);
    }

    // Connection status management
    onConnectionChange(listener: (status: ConnectionStatus) => void): () => void {
        this.connectionListeners.push(listener);

        // Immediately call with current status
        listener(this.connectionStatus);

        return () => {
            const index = this.connectionListeners.indexOf(listener);
            if (index > -1) {
                this.connectionListeners.splice(index, 1);
            }
        };
    }

    getConnectionStatus(): ConnectionStatus {
        return { ...this.connectionStatus };
    }

    // Enhanced video control helpers
    sendVideoControl(action: string, value?: number): void {
        console.log(`[BroadcastManager] [${this.mode}] Sending video control: ${action}`, value);

        // Handle special coordinated actions
        if (action === 'COORDINATED_AUTOPLAY') {
            this.broadcast('COORDINATED_AUTOPLAY', {
                timestamp: Date.now()
            });
            return;
        }

        this.broadcast('VIDEO_CONTROL', {
            action,
            value,
            timestamp: Date.now()
        });
    }

    sendVideoState(videoState: VideoState): void {
        // Throttle video state updates to prevent spam
        const now = Date.now();
        if (now - videoState.lastUpdate < 300) return; // Max 3 updates per second

        this.broadcast('VIDEO_STATE_UPDATE', {
            videoState: {
                ...videoState,
                lastUpdate: now
            }
        });
    }

    sendSlideUpdate(slide: any): void {
        console.log(`[BroadcastManager] [${this.mode}] Sending slide update:`, slide?.id);
        this.broadcast('SLIDE_UPDATE', {
            slide,
            timestamp: Date.now()
        });
    }

    // Presentation-specific methods
    announcePresentation(): void {
        console.log(`[BroadcastManager] [${this.mode}] Announcing presentation ready`);
        this.broadcast('PRESENTATION_READY', {
            connectionType: 'presentation',
            timestamp: Date.now()
        });
    }

    requestCurrentState(): void {
        console.log(`[BroadcastManager] [${this.mode}] Requesting current state`);
        this.broadcast('REQUEST_CURRENT_STATE', {
            timestamp: Date.now()
        });
    }

    sendInitialVideoState(videoState: VideoState): void {
        console.log(`[BroadcastManager] [${this.mode}] Sending initial video state:`, videoState);
        this.broadcast('INITIAL_VIDEO_STATE', {
            videoState,
            timestamp: Date.now()
        });
    }

    // Team communication helpers
    sendTeacherStateUpdate(payload: any): void {
        this.broadcast('teacher_state_update', {
            ...payload,
            timestamp: Date.now()
        });
    }

    // Cleanup
    destroy(): void {
        console.log(`[BroadcastManager] [${this.mode}] Destroying manager for session ${this.sessionId}`);
        this.isDestroyed = true;

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }

        // Send session ended message
        this.broadcast('SESSION_ENDED', {});

        // Clear handlers
        this.handlers.clear();
        this.connectionListeners = [];

        // Close channel
        this.channel.close();
    }
}

// Factory function for easy usage
export const createBroadcastManager = (
    sessionId: string,
    mode: 'host' | 'presentation' | 'display' = 'host'
): SessionBroadcastManager => {
    return new SessionBroadcastManager(sessionId, mode);
};

// Hook for React components
import { useEffect, useRef } from 'react';

export const useBroadcastManager = (
    sessionId: string | null,
    mode: 'host' | 'presentation' | 'display' = 'host'
): SessionBroadcastManager | null => {
    const managerRef = useRef<SessionBroadcastManager | null>(null);

    useEffect(() => {
        if (!sessionId) {
            if (managerRef.current) {
                managerRef.current.destroy();
                managerRef.current = null;
            }
            return;
        }

        // Create new manager if needed
        if (!managerRef.current || managerRef.current['sessionId'] !== sessionId) {
            if (managerRef.current) {
                managerRef.current.destroy();
            }
            managerRef.current = new SessionBroadcastManager(sessionId, mode);
        }

        return () => {
            if (managerRef.current) {
                managerRef.current.destroy();
                managerRef.current = null;
            }
        };
    }, [sessionId, mode]);

    return managerRef.current;
};
