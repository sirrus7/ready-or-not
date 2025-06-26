// src/shared/hooks/useVideoSyncManager.ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { SimpleBroadcastManager } from '@core/sync/SimpleBroadcastManager';
import { HostCommand } from '@core/sync/types';

interface UseVideoSyncManagerProps {
  sessionId: string | null;
  role: 'host' | 'presentation';
}

interface UseVideoSyncManagerReturn {
  isConnected: boolean;
  sendCommand: (action: HostCommand['action'], data?: HostCommand['data']) => void;
  onCommand: (callback: (command: HostCommand) => void) => () => void;
  onConnectionChange: (callback: (connected: boolean) => void) => () => void;
}

export const useVideoSyncManager = ({
                                      sessionId,
                                      role
                                    }: UseVideoSyncManagerProps): UseVideoSyncManagerReturn => {
  const [isConnected, setIsConnected] = useState(false);

  const broadcastManager = useMemo(() =>
          sessionId ? SimpleBroadcastManager.getInstance(sessionId, role) : null,
      [sessionId, role]
  );

  // Send commands (host only)
  const sendCommand = useCallback((action: HostCommand['action'], data?: HostCommand['data']) => {
    if (broadcastManager && role === 'host') {
      console.log(`[VideoSync] Sending command: ${action}`, data);
      broadcastManager.sendCommand(action, data);
    }
  }, [broadcastManager, role]);

  // Listen for commands (presentation only)
  const onCommand = useCallback((callback: (command: HostCommand) => void) => {
    if (!broadcastManager || role !== 'presentation') return () => {};
    return broadcastManager.onHostCommand(callback);
  }, [broadcastManager, role]);

  // Connection status changes
  const onConnectionChange = useCallback((callback: (connected: boolean) => void) => {
    if (!broadcastManager) return () => {};

    if (role === 'host') {
      return broadcastManager.onPresentationStatus((status) => {
        const connected = status === 'connected';
        callback(connected);
      });
    } else {
      // For presentation, we need to monitor connection differently
      // Since presentation doesn't have a direct way to know if it's connected,
      // we'll rely on receiving commands as a sign of connection
      let timeout: NodeJS.Timeout;
      const checkConnection = () => {
        callback(false); // Assume disconnected if no activity
      };

      // Set up a timeout that assumes disconnection after 5 seconds of no activity
      const resetTimeout = () => {
        clearTimeout(timeout);
        timeout = setTimeout(checkConnection, 5000);
        callback(true); // We're connected if we're receiving commands
      };

      // Listen for any command as a sign of connection
      const unsubscribe = broadcastManager.onHostCommand(() => {
        resetTimeout();
      });

      // Initial check
      resetTimeout();

      return () => {
        clearTimeout(timeout);
        unsubscribe();
      };
    }
  }, [broadcastManager, role]);

  // Monitor connection status internally
  useEffect(() => {
    if (!broadcastManager) return;

    const unsubscribe = onConnectionChange(setIsConnected);
    return unsubscribe;
  }, [broadcastManager, onConnectionChange]);

  // Send ready status for presentation
  useEffect(() => {
    if (role === 'presentation' && broadcastManager) {
      broadcastManager.sendStatus('ready');

      // Send periodic pings to maintain connection
      const interval = setInterval(() => {
        broadcastManager.sendStatus('pong');
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [role, broadcastManager]);

  return {
    isConnected,
    sendCommand,
    onCommand,
    onConnectionChange,
  };
};