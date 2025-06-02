// src/shared/utils/video/broadcast.ts
import {useEffect, useCallback} from 'react';
import {VideoSyncMode, VideoState} from '@shared/types/video';
import {getVideoState} from './helpers';
import {VideoSyncManager} from '@core/sync/VideoSyncManager'; // Correct import for the centralized video sync manager
import {ConnectionMonitor, BroadcastConnectionStatus} from '@core/sync/ConnectionMonitor'; // Correct import for the broadcast connection monitor

/**
 * Configuration for the `useVideoBroadcast` hook.
 */
interface UseVideoBroadcastConfig {
    sessionId: string | null; // The ID of the current game session.
    mode: VideoSyncMode; // The operational mode of the video player (master, host, independent).
    videoRef: React.RefObject<HTMLVideoElement>; // Ref to the video element.
    lastCommandTimeRef: React.MutableRefObject<number>; // Ref to track the last time a command was sent.
    allowHostAudio: boolean; // Whether the host's video should have audio when a presentation is not connected.
    onExecuteCommand: (action: 'play' | 'pause' | 'seek', value?: number) => Promise<boolean>; // Callback to execute video commands.
    onConnectionChange: (connected: boolean) => void; // Callback for when connection status to presentation changes.
    onSyncCorrection: (remoteState: VideoState) => void; // Callback for applying video sync corrections.
    onInitialSync: (remoteState: VideoState, shouldPauseBoth?: boolean) => void; // Callback for handling initial video sync.
}

/**
 * `useVideoBroadcast` is a React hook that handles the communication layer for video synchronization.
 * It subscribes to and broadcasts video-related messages using `VideoSyncManager` and monitors
 * connection status using `ConnectionMonitor`. This hook is typically used by `useVideoSync`.
 */
export const useVideoBroadcast = ({
                                      sessionId,
                                      mode,
                                      videoRef,
                                      lastCommandTimeRef,
                                      allowHostAudio,
                                      onExecuteCommand,
                                      onConnectionChange,
                                      onSyncCorrection,
                                      onInitialSync
                                  }: UseVideoBroadcastConfig) => {
    // Get singleton instances of the `VideoSyncManager` and `ConnectionMonitor` for the current session.
    // The `mode` for `ConnectionMonitor` is set based on the `VideoSyncMode` (master -> 'presentation', host -> 'host').
    const videoSyncManager = sessionId ? VideoSyncManager.getInstance(sessionId) : null;
    const connectionMonitor = sessionId ? ConnectionMonitor.getInstance(sessionId, mode === 'master' ? 'presentation' : 'host') : null;

    // Effect hook to set up broadcast listeners and manage connection.
    useEffect(() => {
        // Ensure both managers are initialized before setting up listeners.
        if (!videoSyncManager || !connectionMonitor) return;

        console.log('[VideoBroadcast] Setting up broadcast listeners');

        const subscriptions: Array<() => void> = [];

        // Logic specific to the 'master' (presentation display) mode.
        if (mode === 'master') {
            // Master listens for `VIDEO_CONTROL` commands from the host.
            subscriptions.push(
                videoSyncManager.subscribe('VIDEO_CONTROL', async (message) => {
                    const {action, value} = message;
                    console.log('[VideoBroadcast] Master received command:', action, value);
                    // Execute the command with a small delay to ensure smoother synchronization.
                    setTimeout(async () => {
                        await onExecuteCommand(action as any, value);
                    }, 50);
                })
            );

            // Master listens for `COORDINATED_AUTOPLAY` commands to start video playback.
            subscriptions.push(
                videoSyncManager.subscribe('COORDINATED_AUTOPLAY', async () => {
                    console.log('[VideoBroadcast] Master received coordinated auto-play');
                    setTimeout(async () => {
                        await onExecuteCommand('play', 0); // Start playing from the beginning.
                    }, 100);
                })
            );

            // The master display announces its readiness shortly after initialization.
            console.log('[VideoBroadcast] Master announcing presentation ready');
            setTimeout(() => {
                videoSyncManager.announcePresentationReady();
            }, 100);
        }

        // Logic specific to the 'host' mode.
        if (mode === 'host') {
            let connectionCheckTimeout: NodeJS.Timeout | null = null; // Local timeout for initial host connection check.
            let currentIsConnectedToPresentation = false; // Internal flag to track presentation connection status.

            // Host monitors connection status changes reported by the `ConnectionMonitor`.
            subscriptions.push(
                connectionMonitor.addStatusListener((status: BroadcastConnectionStatus) => {
                    const nowConnected = status.isConnected && status.connectionType === 'presentation'; // Check if connected to a presentation display.

                    console.log(`[VideoBroadcast] Host: Connection status from monitor - was: ${currentIsConnectedToPresentation}, now: ${nowConnected}, type: ${status.connectionType}`);

                    onConnectionChange(nowConnected); // Update the parent component's connection state.
                    currentIsConnectedToPresentation = nowConnected; // Update internal tracking.

                    // Clear any initial connection timeout if a presentation is now connected.
                    if (nowConnected && connectionCheckTimeout) {
                        clearTimeout(connectionCheckTimeout);
                        connectionCheckTimeout = null;
                    }

                    // Manage host video audio based on presentation connection.
                    const video = videoRef.current;
                    if (video) {
                        if (nowConnected) {
                            // If just connected to a presentation, mute the host's video if it wasn't already.
                            if (!video.muted) {
                                video.muted = true;
                                console.log('[VideoBroadcast] Host: Presentation connected, muting host audio');

                                // Send the host's current video state to the newly connected presentation.
                                const currentState = getVideoState(video);
                                if (currentState) {
                                    console.log('[VideoBroadcast] Host: Sending initial state to presentation');
                                    // REQUIREMENT: When presentation opens, both videos should pause.
                                    if (currentState.playing) {
                                        console.log('[VideoBroadcast] Host: Pausing host video for presentation sync');
                                        onExecuteCommand('pause', currentState.currentTime); // Pause host's video.
                                    }
                                    // Send the initial state, forcing a pause on the presentation after a delay.
                                    setTimeout(() => {
                                        if (videoSyncManager) {
                                            videoSyncManager.sendInitialVideoState({
                                                ...currentState,
                                                playing: false // Force both to pause initially.
                                            });
                                        }
                                    }, 500);
                                }
                            }
                        } else {
                            // If disconnected from a presentation, restore host audio if `allowHostAudio` is true.
                            if (video.muted && allowHostAudio) {
                                video.muted = false;
                                console.log('[VideoBroadcast] Host: Presentation disconnected, restoring host audio');
                            }
                        }
                    }
                })
            );

            // Host listens for video state updates from the presentation for sync correction.
            subscriptions.push(
                videoSyncManager.subscribe('VIDEO_STATE_UPDATE', (message) => {
                    if (message.videoState) {
                        const remoteState = message.videoState;
                        const timeSinceCommand = Date.now() - lastCommandTimeRef.current;

                        // Only apply sync correction if no command has been sent recently by the host
                        // to avoid fighting with manual controls or intentional desyncs.
                        if (timeSinceCommand > 2000) { // Increased threshold for stability.
                            console.log('[VideoBroadcast] Host: Syncing with presentation state');
                            onSyncCorrection(remoteState);
                        } else {
                            console.log('[VideoBroadcast] Host: Skipping sync - recent command sent');
                        }
                    }
                })
            );

            // Host listens for initial video state from the presentation.
            subscriptions.push(
                videoSyncManager.subscribe('INITIAL_VIDEO_STATE', (message) => {
                    if (message.videoState) {
                        console.log('[VideoBroadcast] Host: Received initial state from presentation');
                        onInitialSync(message.videoState, true); // Always pause both initially.
                    }
                })
            );

            // Set up an initial connection timeout detection for the host.
            // This is a one-time check when the host loads to see if a presentation is already open.
            connectionCheckTimeout = setTimeout(() => {
                if (!currentIsConnectedToPresentation) { // If still not connected after timeout.
                    console.log('[VideoBroadcast] Host: Initial connection timeout - no presentation detected');
                    onConnectionChange(false); // Update connection state.
                }
            }, 5000); // Wait 5 seconds for initial connection.

            // Cleanup for the timeout on unmount.
            subscriptions.push(() => {
                if (connectionCheckTimeout) {
                    clearTimeout(connectionCheckTimeout);
                }
            });
        }

        // Return a cleanup function that unsubscribes all listeners when the component unmounts.
        return () => {
            subscriptions.forEach(unsubscribe => unsubscribe());
        };
    }, [
        sessionId, // Dependency: Session ID (for manager instances).
        videoSyncManager, // Dependency: VideoSyncManager instance.
        connectionMonitor, // Dependency: ConnectionMonitor instance.
        mode, // Dependency: Player mode.
        videoRef, // Dependency: Video element ref.
        lastCommandTimeRef, // Dependency: Last command time ref.
        allowHostAudio, // Dependency: Audio permission.
        onExecuteCommand, // Dependency: Command execution callback.
        onConnectionChange, // Dependency: Connection change callback.
        onSyncCorrection, // Dependency: Sync correction callback.
        onInitialSync // Dependency: Initial sync callback.
    ]);

    /**
     * Sends a `COORDINATED_AUTOPLAY` command to the presentation display.
     * This is a special command to trigger synchronized video playback.
     */
    const sendCoordinatedAutoPlay = useCallback(() => {
        if (mode === 'host' && videoSyncManager && connectionMonitor?.getStatus().isConnected && connectionMonitor.getStatus().connectionType === 'presentation') { // Only send if host and connected.
            console.log('[VideoBroadcast] Host: Sending coordinated auto-play');
            videoSyncManager.sendVideoControl('COORDINATED_AUTOPLAY');
        }
    }, [mode, videoSyncManager, connectionMonitor]);

    return {
        sendCoordinatedAutoPlay
    };
};
