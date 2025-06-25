// src/shared/hooks/useVideoSyncManager.ts
// A hook to consolidate video sync logic without major refactoring

import { useRef, useCallback, useEffect, useState } from 'react';
import { SimpleBroadcastManager, ConnectionStatus } from '@core/sync/SimpleBroadcastManager';
import { HostCommand } from '@core/sync/types';

interface VideoSyncConfig {
  sessionId: string | null;
  role: 'host' | 'presentation';
  videoRef: React.RefObject<HTMLVideoElement>;
  onConnectionChange?: (isConnected: boolean) => void;
}

interface VideoSyncManager {
  isConnected: boolean;
  sendCommand: (command: string, data?: any) => void;
  setupVideoSync: () => () => void;
  broadcastManager: SimpleBroadcastManager | null;
}

export const useVideoSyncManager = ({
  sessionId,
  role,
  videoRef,
  onConnectionChange,
}: VideoSyncConfig): VideoSyncManager => {
  const [isConnected, setIsConnected] = useState(false);
  const broadcastManager = sessionId
    ? SimpleBroadcastManager.getInstance(sessionId, role)
    : null;
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isBufferingRef = useRef(false);

  // Send command helper
  const sendCommand = useCallback(
    (command: string, data?: any) => {
      if (broadcastManager) {
        broadcastManager.sendCommand(command, data);
      }
    },
    [broadcastManager]
  );

  // Setup video synchronization
  const setupVideoSync = useCallback(() => {
    if (!broadcastManager || !videoRef.current) {
      return () => {};
    }

    const video = videoRef.current;
    const cleanupFunctions: (() => void)[] = [];

    // Helper to start sync interval
    const startSyncInterval = () => {
      if (syncIntervalRef.current) return;

      syncIntervalRef.current = setInterval(() => {
        if (video && !video.paused && isConnected && role === 'host') {
          sendCommand('sync', {
            time: video.currentTime,
            playbackRate: video.playbackRate,
          });
        }
      }, 500);
    };

    // Helper to stop sync interval
    const stopSyncInterval = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };

    if (role === 'host') {
      // Host-specific setup
      const handlePlay = () => {
        startSyncInterval();
        if (isConnected) {
          sendCommand('play', {
            time: video.currentTime,
            playbackRate: video.playbackRate,
          });
        }
      };

      const handlePause = () => {
        stopSyncInterval();
        if (isConnected) {
          sendCommand('pause', {
            time: video.currentTime,
          });
        }
      };

      const handleSeeked = () => {
        if (isConnected) {
          sendCommand('seek', {
            time: video.currentTime,
          });
        }
      };

      const handleRateChange = () => {
        if (!video.paused && isConnected) {
          sendCommand('sync', {
            time: video.currentTime,
            playbackRate: video.playbackRate,
          });
        }
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('ratechange', handleRateChange);

      cleanupFunctions.push(() => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('ratechange', handleRateChange);
        stopSyncInterval();
      });

      // Start sync if already playing
      if (!video.paused && isConnected) {
        startSyncInterval();
      }
    } else {
      // Presentation-specific setup
      const handleWaiting = () => {
        isBufferingRef.current = true;
      };

      const handleCanPlay = () => {
        isBufferingRef.current = false;
      };

      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('canplay', handleCanPlay);

      cleanupFunctions.push(() => {
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('canplay', handleCanPlay);
      });

      const handleCommand = async (command: HostCommand) => {
        try {
          if (command.data?.playbackRate && video.playbackRate !== command.data.playbackRate) {
            video.playbackRate = command.data.playbackRate;
          }

          switch (command.action) {
            case 'play':
              if (command.data?.time !== undefined) {
                const timeDiff = Math.abs(video.currentTime - command.data.time);
                if (timeDiff > 0.2) {
                  video.currentTime = command.data.time;
                }
              }
              await video.play();
              break;

            case 'pause':
              video.pause();
              if (command.data?.time !== undefined) {
                video.currentTime = command.data.time;
              }
              break;

            case 'seek':
              if (command.data?.time !== undefined) {
                video.currentTime = command.data.time;
              }
              break;

            case 'sync':
              if (command.data?.time !== undefined && !video.paused && !isBufferingRef.current) {
                const timeDiff = Math.abs(video.currentTime - command.data.time);
                if (timeDiff > 0.2) {
                  console.log(`[VideoSync] Adjusting drift: ${timeDiff.toFixed(2)}s`);
                  video.currentTime = command.data.time;
                }
              }
              break;

            case 'reset':
              video.pause();
              video.currentTime = 0;
              break;

            case 'close_presentation':
              window.close();
              break;
          }
        } catch (error) {
          console.error('[VideoSync] Command execution failed:', error);
        }
      };

      const unsubscribeCommand = broadcastManager.onHostCommand(handleCommand);
      cleanupFunctions.push(unsubscribeCommand);
    }

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [broadcastManager, videoRef, role, isConnected, sendCommand]);

  // Connection monitoring
  useEffect(() => {
    if (!broadcastManager) return;

    const handleConnectionStatus = (status: ConnectionStatus) => {
      const connected = status === 'connected';
      setIsConnected(connected);
      onConnectionChange?.(connected);

      // Handle host-specific connection logic
      if (role === 'host' && videoRef.current) {
        const video = videoRef.current;

        if (connected) {
          // Mute host when presentation connects
          video.muted = true;

          // Send initial state after a delay
          setTimeout(() => {
            const commandData = {
              time: video.currentTime,
              playbackRate: video.playbackRate,
            };

            // Check readyState to ensure video is loaded
            if (!video.paused && video.readyState >= 3) {
              broadcastManager.sendCommand('play', commandData);
            } else {
              broadcastManager.sendCommand('pause', commandData);
            }
          }, 200);
        } else {
          // Unmute host when presentation disconnects
          video.muted = false;
        }
      }
    };

    const unsubscribe = role === 'host'
      ? broadcastManager.onPresentationStatus(handleConnectionStatus)
      : () => {}; // Presentation doesn't need to listen for connection status this way

    // For presentation, we need to set connected state when receiving commands
    if (role === 'presentation') {
      const handleFirstCommand = () => {
        setIsConnected(true);
        onConnectionChange?.(true);
      };

      // This is a bit of a hack, but we can listen for any command as a sign of connection
      const unsubCmd = broadcastManager.onHostCommand(handleFirstCommand);
      return () => {
        unsubCmd();
      };
    }

    return unsubscribe;
  }, [broadcastManager, role, videoRef, onConnectionChange]);

  return {
    isConnected,
    sendCommand,
    setupVideoSync,
    broadcastManager,
  };
};

// Example usage in useHostVideo.ts:
/*
export const useHostVideo = ({ sessionId, sourceUrl, isEnabled }: UseHostVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const { isConnected, sendCommand, setupVideoSync } = useVideoSyncManager({
    sessionId,
    role: 'host',
    videoRef,
  });

  // Set up video sync when enabled
  useEffect(() => {
    if (isEnabled && sourceUrl) {
      const cleanup = setupVideoSync();
      return cleanup;
    }
  }, [isEnabled, sourceUrl, setupVideoSync]);

  // ... rest of the hook logic

  const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void) => {
    return createVideoProps({
      videoRef,
      muted: isConnected, // Automatically handled by sync manager
      onVideoEnd,
      onError
    });
  }, [isConnected]);

  return {
    videoRef,
    play: async (time?: number) => {
      // ... existing play logic
    },
    pause: async (time?: number) => {
      // ... existing pause logic
    },
    seek: async (time: number) => {
      // ... existing seek logic
    },
    isConnectedToPresentation: isConnected,
    getVideoProps,
  };
};
*/