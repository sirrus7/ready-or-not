import {Slide} from '@shared/types/game';
import {
    HostCommand,
    PresentationStatus,
    PresentationVideoReady,
    VideoStatusPoll,
    VideoStatusResponse,
    BroadcastEventType
} from './types';
import {videoDebug} from '@shared/utils/video/debug';

/**
 * PresentationBroadcastManager - Presentation-side BroadcastChannel sync for host
 */
export class PresentationBroadcastManager {
    private static instances: Map<string, PresentationBroadcastManager> = new Map();
    private channel: BroadcastChannel;
    private sessionId: string;
    private slideHandlers: Set<(slide: Slide, teamData?: any) => void> = new Set();
    private joinInfoHandlers: Set<(joinUrl: string, qrCodeDataUrl: string) => void> = new Set();
    private commandHandlers: Set<(command: HostCommand) => void> = new Set();
    private pingHandlers: Set<() => void> = new Set();
    private videoStatusPollHandlers: Set<(poll: VideoStatusPoll) => void> = new Set();
    private isDestroyed: boolean = false;
    private closePresentationHandlers: Set<() => void> = new Set();

    private constructor(sessionId: string) {
        this.sessionId = sessionId;
        this.channel = new BroadcastChannel(`game-session-${sessionId}`);
        this.setupMessageHandling();
    }

    /**
     * Get the singleton instance for a sessionId
     */
    static getInstance(sessionId: string): PresentationBroadcastManager {
        if (!this.instances.has(sessionId)) {
            this.instances.set(sessionId, new PresentationBroadcastManager(sessionId));
        }
        return this.instances.get(sessionId)!;
    }

    private setupMessageHandling(): void {
        videoDebug.syncLog('PresentationBroadcastManager', 'Setting up message handling');
        this.channel.onmessage = (event) => {
            if (this.isDestroyed) return;
            const message = event.data;
            if (message.sessionId !== this.sessionId) return;

            switch (message.type) {
                case BroadcastEventType.HOST_COMMAND:
                    videoDebug.syncLog('PresentationBroadcastManager', `Processing host command: ${message.action}`);
                    this.commandHandlers.forEach(handler => handler(message as HostCommand));
                    // Send acknowledgment (optional, not used by presentation)
                    break;
                case BroadcastEventType.SLIDE_UPDATE:
                    videoDebug.syncLog('PresentationBroadcastManager', `Processing slide update: ${message.slide?.id}`);
                    this.slideHandlers.forEach(handler => handler(message.slide, message.teamData));
                    break;
                case BroadcastEventType.JOIN_INFO:
                    videoDebug.syncLog('PresentationBroadcastManager', 'Processing join info');
                    this.joinInfoHandlers.forEach(handler => handler(message.joinUrl, message.qrCodeDataUrl));
                    break;
                case BroadcastEventType.JOIN_INFO_CLOSE:
                    videoDebug.syncLog('PresentationBroadcastManager', 'Processing join info close');
                    this.joinInfoHandlers.forEach(handler => handler('', ''));
                    break;
                case BroadcastEventType.PING:
                    this.sendStatus('pong');
                    this.pingHandlers.forEach(handler => handler());
                    break;
                case BroadcastEventType.CLOSE_PRESENTATION:
                    videoDebug.syncLog('PresentationBroadcastManager', 'Processing close presentation');
                    this.closePresentationHandlers.forEach(handler => handler());
                    break;
                case BroadcastEventType.VIDEO_STATUS_POLL:
                    videoDebug.syncLog('PresentationBroadcastManager', 'Processing video status poll');
                    this.videoStatusPollHandlers.forEach(handler => handler(message as VideoStatusPoll));
                    break;
                default:
                    videoDebug.syncLog('PresentationBroadcastManager', `Ignoring unknown message type: ${message.type}`);
                    // Ignore other message types
                    break;
            }
        };
    }

    /**
     * Listen for slide updates from the host
     * @param callback (slide, teamData) => void
     * @returns unsubscribe function
     */
    onSlideUpdate(callback: (slide: Slide, teamData?: any) => void): () => void {
        if (this.isDestroyed) return () => {
        };
        this.slideHandlers.add(callback);
        return () => {
            this.slideHandlers.delete(callback);
        };
    }

    /**
     * Listen for join info updates from the host
     * @param callback (joinUrl, qrCodeDataUrl) => void
     * @returns unsubscribe function
     */
    onJoinInfo(callback: (joinUrl: string, qrCodeDataUrl: string) => void): () => void {
        if (this.isDestroyed) return () => {
        };
        this.joinInfoHandlers.add(callback);
        return () => {
            this.joinInfoHandlers.delete(callback);
        };
    }

    /**
     * Listen for host commands (play, pause, seek, etc.)
     * @param callback (command) => void
     * @returns unsubscribe function
     */
    onHostCommand(callback: (command: HostCommand) => void): () => void {
        if (this.isDestroyed) return () => {
        };
        this.commandHandlers.add(callback);
        return () => {
            this.commandHandlers.delete(callback);
        };
    }

    /**
     * Listen for ping messages from the host
     * @param callback () => void
     * @returns unsubscribe function
     */
    onPing(callback: () => void): () => void {
        if (this.isDestroyed) return () => {
        };
        this.pingHandlers.add(callback);
        return () => {
            this.pingHandlers.delete(callback);
        };
    }

    /**
     * Listen for video status polls from the host
     * @param callback (poll) => void
     * @returns unsubscribe function
     */
    onVideoStatusPoll(callback: (poll: VideoStatusPoll) => void): () => void {
        if (this.isDestroyed) return () => {
        };
        this.videoStatusPollHandlers.add(callback);
        return () => {
            this.videoStatusPollHandlers.delete(callback);
        };
    }

    /**
     * Send status ("ready" or "pong") to the host
     * @param status 'ready' | 'pong'
     */
    sendStatus(status: 'ready' | 'pong'): void {
        if (this.isDestroyed) return;
        const statusMessage: PresentationStatus = {
            type: BroadcastEventType.PRESENTATION_STATUS,
            sessionId: this.sessionId,
            status,
            timestamp: Date.now()
        };
        this.channel.postMessage(statusMessage);
    }

    onClosePresentation(callback: () => void): () => void {
        if (this.isDestroyed) return () => {
        };
        this.closePresentationHandlers.add(callback);
        return () => {
            this.closePresentationHandlers.delete(callback);
        };
    }

    /**
     * Notify the host that the presentation video is ready
     */
    sendPresentationVideoReady(): void {
        if (this.isDestroyed) return;
        const message: PresentationVideoReady = {
            type: BroadcastEventType.PRESENTATION_VIDEO_READY,
            sessionId: this.sessionId,
            timestamp: Date.now()
        };
        this.channel.postMessage(message);
    }

    /**
     * Send video status response to the host
     */
    sendVideoStatusResponse(isReady: boolean): void {
        if (this.isDestroyed) return;
        const response: VideoStatusResponse = {
            type: BroadcastEventType.VIDEO_STATUS_RESPONSE,
            sessionId: this.sessionId,
            isReady,
            timestamp: Date.now()
        };
        this.channel.postMessage(response);
    }

    /**
     * Destroy the manager and underlying channel
     */
    destroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        try {
            this.channel.close();
        } catch (error) {
            console.warn('[PresentationBroadcastManager] Error closing channel:', error);
        }
        this.slideHandlers.clear();
        this.joinInfoHandlers.clear();
        this.commandHandlers.clear();
        this.pingHandlers.clear();
        const key = this.sessionId;
        PresentationBroadcastManager.instances.delete(key);
    }
}
