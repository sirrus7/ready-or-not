import { SimpleBroadcastManager } from './SimpleBroadcastManager';
import { Slide, Team, TeamDecision, TeamRoundData } from '@shared/types';
import { HostCommand, PresentationStatus, JoinInfoMessage } from './types';
import { useEffect, useRef } from 'react';

/**
 * PresentationSyncManager
 *
 * Singleton manager for all presentation-side sync logic.
 * Encapsulates all usage of SimpleBroadcastManager for the presentation window.
 */
export class PresentationSyncManager {
  private static instances: Map<string, PresentationSyncManager> = new Map();
  private broadcastManager: SimpleBroadcastManager;
  private sessionId: string;

  private constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.broadcastManager = SimpleBroadcastManager.getInstance(sessionId, 'presentation');
  }

  /**
   * Get the singleton instance for a sessionId
   */
  static getInstance(sessionId: string): PresentationSyncManager {
    if (!this.instances.has(sessionId)) {
      this.instances.set(sessionId, new PresentationSyncManager(sessionId));
    }
    return this.instances.get(sessionId)!;
  }

  /**
   * Listen for slide updates from the host
   * @param callback (slide, teamData) => void
   * @returns unsubscribe function
   */
  onSlideUpdate(callback: (slide: Slide, teamData?: {
    teams: Team[];
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    teamDecisions: TeamDecision[];
  }) => void): () => void {
    return this.broadcastManager.onSlideUpdate(callback);
  }

  /**
   * Listen for join info updates from the host
   * @param callback (joinUrl, qrCodeDataUrl) => void
   * @returns unsubscribe function
   */
  onJoinInfo(callback: (joinUrl: string, qrCodeDataUrl: string) => void): () => void {
    return this.broadcastManager.onJoinInfo(callback);
  }

  /**
   * Listen for host commands (play, pause, seek, etc.)
   * @param callback (command) => void
   * @returns unsubscribe function
   */
  onHostCommand(callback: (command: HostCommand) => void): () => void {
    return this.broadcastManager.onHostCommand(callback);
  }

  /**
   * Send status ("ready" or "pong") to the host
   * @param status 'ready' | 'pong'
   */
  sendStatus(status: 'ready' | 'pong'): void {
    this.broadcastManager.sendStatus(status);
  }

  /**
   * Listen for presentation connection status changes
   * @param callback (status) => void
   * @returns unsubscribe function
   */
  onPresentationStatus(callback: (status: string) => void): () => void {
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
    PresentationSyncManager.instances.delete(this.sessionId);
  }
}

/**
 * React hook to get the PresentationSyncManager singleton for a sessionId.
 * Handles cleanup on unmount.
 */
export function usePresentationSyncManager(sessionId: string | null): PresentationSyncManager | null {
  const managerRef = useRef<PresentationSyncManager | null>(null);

  if (!managerRef.current && sessionId) {
    managerRef.current = PresentationSyncManager.getInstance(sessionId);
  }

  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, [sessionId]);

  return managerRef.current;
} 