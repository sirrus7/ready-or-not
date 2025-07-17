// src/shared/hooks/useVideoSyncManager.ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { HostBroadcastManager } from '@core/sync/HostBroadcastManager';
import { PresentationBroadcastManager } from '@core/sync/PresentationBroadcastManager';
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

export function useVideoSyncManager({ sessionId, role }: { sessionId: string | null, role: 'host' | 'presentation' }) {
  let manager: HostBroadcastManager | PresentationBroadcastManager | null = null;
  if (sessionId) {
    if (role === 'host') {
      manager = HostBroadcastManager.getInstance(sessionId);
    } else {
      manager = PresentationBroadcastManager.getInstance(sessionId);
    }
  }
  const [isConnected, setIsConnected] = useState(false);

  // Send commands (host only)
  const sendCommand = useCallback((action: import('@core/sync/types').HostCommand['action'], data?: import('@core/sync/types').HostCommand['data']) => {
    if (role === 'host' && manager instanceof HostBroadcastManager) {
      manager.sendCommand(action, data);
    }
  }, [manager, role]);

  // Listen for commands (presentation only)
  const onCommand = useCallback((callback: (command: import('@core/sync/types').HostCommand) => void) => {
    if (role === 'presentation' && manager instanceof PresentationBroadcastManager) {
      return manager.onHostCommand(callback);
    }
    return () => {};
  }, [manager, role]);

  // Connection status changes
  const onConnectionChange = useCallback((callback: (connected: boolean) => void) => {
    if (!manager) return () => {};
    if (role === 'host' && manager instanceof HostBroadcastManager) {
      return manager.onPresentationStatus((status) => {
        const connected = status === 'connected';
        callback(connected);
      });
    } else if (role === 'presentation' && manager instanceof PresentationBroadcastManager) {
      // Listen for any command as a sign of connection
      let timeout: NodeJS.Timeout | null = null;
      const resetTimeout = () => {
        if (timeout) clearTimeout(timeout);
        callback(true);
        timeout = setTimeout(() => callback(false), 10000);
      };
      const unsubscribe = manager.onHostCommand(() => {
        resetTimeout();
      });
      resetTimeout();
      return () => {
        if (timeout) clearTimeout(timeout);
        unsubscribe();
      };
    }
    return () => {};
  }, [manager, role]);

  // Monitor connection status internally
  useEffect(() => {
    if (!manager) return;
    const unsubscribe = onConnectionChange(setIsConnected);
    return unsubscribe;
  }, [manager, onConnectionChange]);

  // Send ready status for presentation
  useEffect(() => {
    if (role === 'presentation' && manager instanceof PresentationBroadcastManager) {
      manager.sendStatus('ready');
      const interval = setInterval(() => {
        manager.sendStatus('pong');
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [role, manager]);

  return {
    isConnected,
    sendCommand,
    onCommand,
    onConnectionChange,
  };
}