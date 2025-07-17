import { PresentationBroadcastManager } from './PresentationBroadcastManager';
import { Slide, Team, TeamDecision, TeamRoundData } from '@shared/types';
import { HostCommand } from './types';
import { useEffect, useRef } from 'react';

/**
 * PresentationSyncManager
 *
 * Singleton manager for all presentation-side sync logic.
 * Encapsulates all usage of PresentationBroadcastManager for the presentation window.
 */
export class PresentationSyncManager {
  private static instances: Map<string, PresentationSyncManager> = new Map();
  private broadcastManager: PresentationBroadcastManager;
  private sessionId: string;
  private isDestroyed: boolean = false;

  private constructor(sessionId: string) {
    this.sessionId = sessionId;
    console.log('[PresentationSyncManager] Created for sessionId:', sessionId);
    this.broadcastManager = PresentationBroadcastManager.getInstance(sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the singleton instance for a sessionId
   */
  static getInstance(sessionId: string): PresentationSyncManager {
    const key = `${sessionId}`;
    
    // Check if existing instance is destroyed and clean it up
    const existing = PresentationSyncManager.instances.get(key);
    if (existing && existing.isDestroyed) {
      console.log('[PresentationSyncManager] Cleaning up destroyed instance for sessionId:', sessionId);
      PresentationSyncManager.instances.delete(key);
    }

    if (!PresentationSyncManager.instances.has(key)) {
      console.log('[PresentationSyncManager] Creating new instance for sessionId:', sessionId);
      PresentationSyncManager.instances.set(key, new PresentationSyncManager(sessionId));
    } else {
      console.log('[PresentationSyncManager] Reusing existing instance for sessionId:', sessionId);
    }
    return PresentationSyncManager.instances.get(key)!;
  }

  /**
   * Listen for slide updates from the host
   * @param callback (slide, teamData) => void
   * @returns unsubscribe function
   */
  onSlideUpdate(callback: (slide: Slide, teamData?: any) => void): () => void {
    console.log('[PresentationSyncManager] Setting up slide update listener');
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
    console.log('[PresentationSyncManager] Setting up host command listener');
    return this.broadcastManager.onHostCommand(callback);
  }

  /**
   * Listen for PING messages from the host (for connection keepalive)
   * @param callback () => void
   * @returns unsubscribe function
   */
  onPing(callback: () => void): () => void {
    console.log('[PresentationSyncManager] Setting up ping listener');
    return this.broadcastManager.onPing(callback);
  }

  /**
   * Send status ("ready" or "pong") to the host
   * @param status 'ready' | 'pong'
   */
  sendStatus(status: 'ready' | 'pong'): void {
    console.log('[PresentationSyncManager] Sending status:', status);
    this.broadcastManager.sendStatus(status);
  }

  /**
   * Notify the host that the presentation video is ready
   */
  sendPresentationVideoReady(): void {
    this.broadcastManager.sendPresentationVideoReady();
  }

  /**
   * Destroy the manager and underlying broadcast manager
   */
  destroy(): void {
    this.broadcastManager.destroy();
    PresentationSyncManager.instances.delete(this.sessionId);
    this.isDestroyed = true;
  }
}

/**
 * React hook to get the PresentationSyncManager singleton for a sessionId.
 * Handles cleanup on unmount.
 */
export function usePresentationSyncManager(sessionId: string | null): PresentationSyncManager | null {
  const managerRef = useRef<PresentationSyncManager | null>(null);

  if (!managerRef.current && sessionId) {
    console.log('[usePresentationSyncManager] Creating new manager for sessionId:', sessionId);
    managerRef.current = PresentationSyncManager.getInstance(sessionId);
  } else if (managerRef.current && !sessionId) {
    console.log('[usePresentationSyncManager] Destroying manager - no sessionId');
    managerRef.current.destroy();
    managerRef.current = null;
  } else if (managerRef.current && sessionId && managerRef.current.getSessionId() !== sessionId) {
    console.log('[usePresentationSyncManager] SessionId changed, destroying old manager');
    managerRef.current.destroy();
    managerRef.current = PresentationSyncManager.getInstance(sessionId);
  }

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        console.log('[usePresentationSyncManager] Cleanup - destroying manager');
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [sessionId]);

  return managerRef.current;
} 