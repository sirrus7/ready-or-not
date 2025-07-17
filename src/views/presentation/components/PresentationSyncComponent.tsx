import React, { useEffect, useCallback, useRef } from 'react';
import { SimpleBroadcastManager } from '@core/sync/SimpleBroadcastManager';
import { Slide, Team, TeamDecision, TeamRoundData } from '@shared/types';
import { HostCommand } from '@core/sync/types';

interface PresentationSyncComponentProps {
  sessionId: string | null;
  onSlideUpdate: (slide: Slide, teamData?: {
    teams: Team[];
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    teamDecisions: TeamDecision[];
  }) => void;
  onJoinInfoUpdate: (joinInfo: { joinUrl: string; qrCodeDataUrl: string } | null) => void;
  onHostCommand: (command: HostCommand) => void;
  onConnectionStatusChange: (connected: boolean) => void;
  onVideoReady?: () => void;
}

export const PresentationSyncComponent: React.FC<PresentationSyncComponentProps> = ({
  sessionId,
  onSlideUpdate,
  onJoinInfoUpdate,
  onHostCommand,
  onConnectionStatusChange,
  onVideoReady,
}) => {
  const broadcastManager = sessionId
    ? SimpleBroadcastManager.getInstance(sessionId, 'presentation')
    : null;
  
  // Keep track of connection status
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle slide updates from host
  useEffect(() => {
    if (!broadcastManager) return;

    const unsubscribe = broadcastManager.onSlideUpdate((slide, teamData) => {
      console.log('[PresentationSync] Received slide update:', slide.id);
      onSlideUpdate(slide, teamData);
      onConnectionStatusChange(true);
      
      // Reset connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      connectionTimeoutRef.current = setTimeout(() => {
        onConnectionStatusChange(false);
      }, 10000); // 10 seconds timeout
    });

    return () => {
      unsubscribe();
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [broadcastManager, onSlideUpdate, onConnectionStatusChange]);

  // Handle join info updates from host
  useEffect(() => {
    if (!broadcastManager) return;

    const unsubscribe = broadcastManager.onJoinInfo((joinUrl, qrCodeDataUrl) => {
      if (joinUrl && qrCodeDataUrl) {
        console.log('[PresentationSync] Received join info');
        onJoinInfoUpdate({ joinUrl, qrCodeDataUrl });
      } else {
        console.log('[PresentationSync] Closing join info');
        onJoinInfoUpdate(null);
      }
    });

    return unsubscribe;
  }, [broadcastManager, onJoinInfoUpdate]);

  // Handle host commands (play, pause, seek, etc.)
  useEffect(() => {
    if (!broadcastManager) return;

    const unsubscribe = broadcastManager.onHostCommand((command) => {
      console.log('[PresentationSync] Received host command:', command.action);
      onHostCommand(command);
      onConnectionStatusChange(true);
      
      // Reset connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      connectionTimeoutRef.current = setTimeout(() => {
        onConnectionStatusChange(false);
      }, 10000);
    });

    return unsubscribe;
  }, [broadcastManager, onHostCommand, onConnectionStatusChange]);

  // Send initial ready status
  useEffect(() => {
    if (!broadcastManager) return;

    console.log('[PresentationSync] Sending ready status');
    broadcastManager.sendStatus('ready');

    // Send periodic pongs to maintain connection
    const interval = setInterval(() => {
      broadcastManager.sendStatus('pong');
    }, 3000);

    return () => clearInterval(interval);
  }, [broadcastManager]);

  // Send video ready status when video is loaded
  const sendVideoReady = useCallback(() => {
    if (!broadcastManager) return;
    
    console.log('[PresentationSync] Sending video ready status');
    broadcastManager.sendPresentationVideoReady();
  }, [broadcastManager]);

  // Expose sendVideoReady through callback
  useEffect(() => {
    if (onVideoReady) {
      onVideoReady();
    }
  }, [onVideoReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (broadcastManager) {
        console.log('[PresentationSync] Destroying broadcast manager');
        broadcastManager.destroy();
      }
    };
  }, [broadcastManager]);

  // This component doesn't render anything - it just handles sync
  return null;
};