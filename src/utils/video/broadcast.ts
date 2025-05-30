// src/utils/video/broadcast.ts - Enhanced broadcast integration
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
    onInitialSync: (remoteState: any, shouldPauseBoth?: boolean) => void;
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
                                      onSyncCorrection,
                                      onInitialSync
                                  }: UseVideoBroadcastConfig) => {
    // Setup broadcast listeners
    useEffect(() => {
        if (!broadcastManager) return;

        const subscriptions: Array<() => void> = [];

        if (mode === 'master') {
            // Master (Presentation Display) - Listen for commands from host
            subscriptions.push(
                broadcastManager.subscribe('VIDEO_CONTROL', async (message) => {
                    const { action, value } = message;
                    console.log('[VideoBroadcast] Master received command:', action, value);
                    await onExecuteCommand(action as any, value);
                })
            );

            // Listen for coordinated auto-play commands
            subscriptions.push(
                broadcastManager.subscribe('COORDINATED_AUTOPLAY', async () => {
                    console.log('[VideoBroadcast] Master received coordinated auto-play');
                    await onExecuteCommand('play', 0);
                })
            );

            // Announce presentation ready
            console.log('[VideoBroadcast] Master announcing presentation ready');
            broadcastManager.announcePresentation();
        }

        if (mode === 'host') {
            // Host - Handle presentation connection and sync
            subscriptions.push(
                broadcastManager.subscribe('PRESENTATION_READY', () => {
                    console.log('[VideoBroadcast] Host: Presentation display connected');
                    const wasConnected = isConnectedToPresentation;
                    onConnectionChange(true);

                    // Send initial state to presentation when it connects
                    const currentState = getVideoState(videoRef.current);
                    if (currentState && !wasConnected) {
                        console.log('[VideoBroadcast] Host: Sending initial state to presentation');

                        // REQUIREMENT: When presentation opens, pause both videos
                        if (currentState.playing) {
                            console.log('[VideoBroadcast] Host: Pausing host video for presentation sync');
                            onExecuteCommand('pause', currentState.currentTime);
                        }

                        // Send initial state with forced pause
                        setTimeout(() => {
                            broadcastManager.sendInitialVideoState({
                                ...currentState,
                                playing: false // Force both to pause initially
                            });
                        }, 300);
                    }
                })
            );

            // Monitor connection status changes
            subscriptions.push(
                broadcastManager.onConnectionChange((status) => {
                    const wasConnected = isConnectedToPresentation;
                    const nowConnected = status.isConnected && status.connectionType === 'presentation';

                    onConnectionChange(nowConnected);

                    // Handle disconnection - restore host audio
                    if (wasConnected && !nowConnected) {
                        console.log('[VideoBroadcast] Host: Presentation disconnected, restoring host audio');
                        const video = videoRef.current;
                        if (video && allowHostAudio) {
                            video.muted = false;
                        }
                    }

                    // Handle new connection - mute host audio
                    if (!wasConnected && nowConnected) {
                        console.log('[VideoBroadcast] Host: Presentation connected, muting host audio');
                        const video = videoRef.current;
                        if (video) {
                            video.muted = true;
                        }
                    }
                })
            );

            // Listen for video state updates from presentation (for sync)
            subscriptions.push(
                broadcastManager.subscribe('VIDEO_STATE_UPDATE', (message) => {
                    if (message.videoState) {
                        const remoteState = message.videoState;
                        const timeSinceCommand = Date.now() - lastCommandTimeRef.current;

                        // Only sync if we haven't sent a command recently
                        if (timeSinceCommand > 1500) { // Increased threshold for less aggressive sync
                            console.log('[VideoBroadcast] Host: Syncing with presentation state');
                            onSyncCorrection(remoteState);
                        } else {
                            console.log('[VideoBroadcast] Host: Skipping sync - recent command sent');
                        }
                    }
                })
            );

            // Listen for initial video state from presentation
            subscriptions.push(
                broadcastManager.subscribe('INITIAL_VIDEO_STATE', (message) => {
                    if (message.videoState) {
                        console.log('[VideoBroadcast] Host: Received initial state from presentation');
                        onInitialSync(message.videoState, true); // Always pause both initially
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
        onSyncCorrection,
        onInitialSync
    ]);

    // Send coordinated auto-play command when presentation is ready
    const sendCoordinatedAutoPlay = (broadcastManager: SessionBroadcastManager) => {
        if (mode === 'host' && isConnectedToPresentation) {
            console.log('[VideoBroadcast] Host: Sending coordinated auto-play');
            broadcastManager.sendVideoControl('COORDINATED_AUTOPLAY');
        }
    };

    return {
        sendCoordinatedAutoPlay
    };
};
