import {HostBroadcastManager, ConnectionStatus} from './HostBroadcastManager';
import {GameVersion, Slide, Team, TeamDecision, TeamRoundData} from '@shared/types';
import {useEffect, useRef} from 'react';

/**
 * HostSyncManager
 *
 * Singleton manager for all host-side sync logic.
 * Encapsulates all usage of HostBroadcastManager for the host window.
 */
export class HostSyncManager {
    private static instances: Map<string, HostSyncManager> = new Map();
    private broadcastManager: HostBroadcastManager;
    private sessionId: string;

    private constructor(sessionId: string) {
        this.sessionId = sessionId;
        this.broadcastManager = HostBroadcastManager.getInstance(sessionId);
    }

    /**
     * Get the singleton instance for a sessionId
     */
    static getInstance(sessionId: string): HostSyncManager {
        if (!this.instances.has(sessionId)) {
            this.instances.set(sessionId, new HostSyncManager(sessionId));
        }
        return this.instances.get(sessionId)!;
    }

    /**
     * Send a slide update to the presentation
     */
    sendSlideUpdate(slide: Slide, gameVersion?: GameVersion, teamData?: {
        teams: Team[];
        teamRoundData: Record<string, Record<number, TeamRoundData>>;
        teamDecisions: TeamDecision[];
    }): void {
        this.broadcastManager.sendSlideUpdate(slide, teamData, gameVersion);
    }

    sendPresenationClose() {
        this.broadcastManager.sendClosePresentation();
    }

    /**
     * Force disconnect status (for when window is closed)
     */
    forceDisconnect(): void {
        this.broadcastManager.forceDisconnect();
    }

    /**
     * Send join info (URL and QR code) to the presentation
     */
    sendJoinInfo(joinUrl: string, qrCodeDataUrl: string): void {
        this.broadcastManager.sendJoinInfo(joinUrl, qrCodeDataUrl);
    }

    /**
     * Close the join info display on the presentation
     */
    sendJoinInfoClose(): void {
        this.broadcastManager.sendJoinInfoClose();
    }

    /**
     * Send a host command (play, pause, seek, etc.) to the presentation
     */
    sendCommand(action: 'play'
        | 'pause'
        | 'seek'
        | 'reset'
        | 'close_presentation'
        | 'decision_reset'
        | 'sync'
        | 'volume'
        | 'video_status_poll'
        | 'scroll', data?: any): void {
        this.broadcastManager.sendCommand(action, data);
    }

    /**
     * Send a video status poll to the presentation
     */
    sendVideoStatusPoll(): void {
        this.broadcastManager.sendVideoStatusPoll();
    }

    /**
     * Listen for presentation connection status changes
     * @param callback (status) => void
     * @returns unsubscribe function
     */
    onPresentationStatus(callback: (status: ConnectionStatus) => void): () => void {
        return this.broadcastManager.onPresentationStatus(callback);
    }

    /**
     * Listen for video ready events from the presentation
     * @param callback () => void
     */
    onPresentationVideoReady(callback: () => void): void {
        this.broadcastManager.onPresentationVideoReady(callback);
    }

    /**
     * Destroy the manager and underlying broadcast manager
     */
    destroy(): void {
        this.broadcastManager.destroy();
        HostSyncManager.instances.delete(this.sessionId);
    }
}

/**
 * React hook to get the HostSyncManager singleton for a sessionId.
 * Handles cleanup on unmount.
 */
export function useHostSyncManager(sessionId: string | null): HostSyncManager | null {
    const managerRef = useRef<HostSyncManager | null>(null);

    if (!managerRef.current && sessionId) {
        managerRef.current = HostSyncManager.getInstance(sessionId);
    }

    useEffect(() => {
        return () => {
            managerRef.current?.destroy();
            managerRef.current = null;
        };
    }, [sessionId]);

    return managerRef.current;
} 