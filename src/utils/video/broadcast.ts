// src/utils/video/broadcast.ts - Broadcast integration for video sync
import { useEffect } from 'react';
import { VideoSyncMode } from './types';
import { getVideoState } from './helpers';
import { SessionBroadcastManager } from '../broadcastManager';

interface UseVideoBroadcastConfig {
    broadcastManager: SessionBroadcastManager | null;
    mode: VideoSyncMode;
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToPresentation: boolean;
    lastCommandTimeRef: React.MutableRefObject<number>;
    allowHostAudio: boolean;
    onExecuteCommand: (action: 'play' | 'pause' | 'seek', value?: number) => Promise<boolean>;
    onConnectionChange: (connected: boolean) => void;
    onSyncCorrection: (remoteState: any) => void;
}

export const useVideoBroadcast = ({
                                      broadcastManager,
                                      mode,
                                      videoRef,
                                      isConnectedToPresentation,
                                      lastCommandTimeRef,
                                      allowHostAudio,
                                      onExecuteCommand,
                                      onConnectionChange,
                                      onSyncCorrection
                                  }: UseVideoBroadcastConfig) => {
    // Setup broadcast listeners
    useEffect(() => {
        if (!broadcastManager) return;

        const subscriptions: Array<() => void> = [];

        if (mode === 'master') {
            // Listen for video commands from host
            subscriptions.push(
                broadcastManager.subscribe('VIDEO_CONTROL', async (message) => {
                    const { action, value } = message;
                    console.log('[VideoBroadcast] Master received command:', action, value);
                    await onExecuteCommand(action as any, value);
                })
            );

            // Announce presentation ready
            broadcastManager.announcePresentation();
        }

        if (mode === 'host') {
            // Handle presentation connection
            subscriptions.push(
                broadcastManager.subscribe('PRESENTATION_READY', () => {
                    console.log('[VideoBroadcast] Presentation display connected');
                    onConnectionChange(true);

                    // Send initial state to presentation
                    const currentState = getVideoState(videoRef.current);
                    if (currentState) {
                        // Pause both videos when presentation connects
                        if (currentState.playing) {
                            onExecuteCommand('pause', currentState.currentTime);
                        }

                        setTimeout(() => {
                            broadcastManager.sendInitialVideoState({
                                ...currentState,
                                playing: false // Force both to pause initially
                            });
                        }, 300);
                    }
                })
            );

            // Monitor connection status
            subscriptions.push(
                broadcastManager.onConnectionChange((status) => {
                    const wasConnected = isConnectedToPresentation;
                    const nowConnected = status.isConnected && status.connectionType === 'presentation';

                    onConnectionChange(nowConnected);

                    // Handle disconnection - restore host audio
                    if (wasConnected && !nowConnected) {
                        console.log('[VideoBroadcast] Presentation disconnected, restoring host audio');
                        const video = videoRef.current;
                        if (video && allowHostAudio) {
                            video.muted = false;
                        }
                    }
                })
            );

            // Listen for video state updates from presentation
            subscriptions.push(
                broadcastManager.subscribe('VIDEO_STATE_UPDATE', (message) => {
                    if (message.videoState) {
                        const remoteState = message.videoState;
                        const timeSinceCommand = Date.now() - lastCommandTimeRef.current;

                        // Only sync if we haven't sent a command recently
                        if (timeSinceCommand > 1000) {
                            onSyncCorrection(remoteState);
                        }
                    }
                })
            );
        }

        return () => {
            subscriptions.forEach(unsubscribe => unsubscribe());
        };
    }, [
        broadcastManager,
        mode,
        videoRef,
        isConnectedToPresentation,
        lastCommandTimeRef,
        allowHostAudio,
        onExecuteCommand,
        onConnectionChange,
        onSyncCorrection
    ]);
};
