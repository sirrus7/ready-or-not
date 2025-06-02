// src/shared/utils/video/useVideoSync.ts
import {useRef, useCallback, useEffect, useState} from 'react';
import {VideoSyncConfig, VideoSyncReturn, VideoState} from '@shared/types/video';
import {createInitialVideoState, isVideoReady} from './helpers';
import {useVideoCommands} from './commands';
import {useVideoSyncLogic} from './sync';
import {useVideoEvents} from './events';
import {useVideoBroadcast} from './broadcast';
import {VideoSyncManager} from '@core/sync/VideoSyncManager'; // Centralized video sync manager
import {ConnectionMonitor} from '@core/sync/ConnectionMonitor'; // Broadcast channel connection monitor

/**
 * `useVideoSync` is a comprehensive React hook that provides video playback control
 * and synchronization capabilities across multiple browser tabs (host, presentation, team).
 * It integrates various specialized hooks and managers to handle video commands,
 * events, broadcast communication, and connection monitoring.
 */
export const useVideoSync = (config: VideoSyncConfig): VideoSyncReturn => {
    const {
        sessionId,
        mode,
        allowHostAudio = false,
        enableNativeControls = false,
        onHostVideoClick,
        videoUrl
    } = config;

    // --- State and Refs ---
    const videoRef = useRef<HTMLVideoElement>(null); // Reference to the HTMLVideoElement.
    const [videoState, setVideoState] = useState<VideoState>(createInitialVideoState); // Current video playback state.
    // Connection status to the presentation display, managed by `ConnectionMonitor`.
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const lastVideoUrlRef = useRef<string | undefined>(undefined); // Tracks the previously loaded video URL for resets.
    const hasAutoPlayedRef = useRef<boolean>(false); // Flag to prevent multiple auto-play triggers per video.

    // --- Manager Instances ---
    // Obtain singleton instances of the VideoSyncManager and ConnectionMonitor.
    // These managers handle the actual broadcast communication and connection status.
    const videoSyncManager = sessionId ? VideoSyncManager.getInstance(sessionId) : null;
    const connectionMonitor = sessionId ? ConnectionMonitor.getInstance(sessionId, mode === 'master' ? 'presentation' : 'host') : null;

    // --- Callbacks for State Updates ---
    /**
     * Updates the local `videoState` and records the time of the update.
     * @param updates Partial `VideoState` object with changes.
     */
    const updateVideoState = useCallback((updates: Partial<VideoState>) => {
        setVideoState(prev => ({
            ...prev,
            ...updates,
            lastUpdate: Date.now() // Always update `lastUpdate` timestamp.
        }));
    }, []);

    // --- Video Commands and Auto-play Logic ---
    // `useVideoCommands` provides functions to programmatically control the video.
    const {executeCommand, handleAutoPlay, lastCommandTimeRef, ignoreEventsRef} = useVideoCommands({
        videoRef,
        onStateChange: () => {
            // When video state changes internally (e.g., due to user interaction or command execution),
            // read the actual state from the video element and update local state.
            const video = videoRef.current;
            if (video) {
                updateVideoState({
                    playing: !video.paused,
                    currentTime: video.currentTime,
                    duration: video.duration || 0,
                    volume: video.volume
                });
            }
        }
    });

    /**
     * Triggers the auto-play sequence, coordinating behavior based on the `mode`
     * and `isConnectedToPresentation` status.
     */
    const triggerAutoPlay = useCallback(async () => {
        console.log(`[useVideoSync] [${mode}] Auto-play triggered, connected: ${isConnectedToPresentation}`);

        // Master mode (Presentation Display) always auto-plays directly.
        if (mode === 'master') {
            await handleAutoPlay(hasAutoPlayedRef, mode, false); // `false` for isConnectedToPresentation as it auto-plays itself.
        } else if (mode === 'host' && isConnectedToPresentation) {
            // Host with an active presentation:
            // This case handles the coordinated auto-play. The `useVideoBroadcast` hook
            // (which this hook uses) will send the `COORDINATED_AUTOPLAY` command to the presentation.
            // Here, we just ensure the host's local video also starts playing.
            console.log('[useVideoSync] Host coordinating auto-play with presentation');
            await executeCommand('play', 0); // Play host video from beginning.
        } else {
            // Host-only mode (no presentation connected) or independent mode:
            // Auto-play directly without special coordination.
            await handleAutoPlay(hasAutoPlayedRef, mode, isConnectedToPresentation);
        }
    }, [mode, isConnectedToPresentation, handleAutoPlay, executeCommand]);

    // --- Video Synchronization Logic ---
    // `useVideoSyncLogic` provides functions for correcting video time and play state discrepancies.
    const {correctSync, handleInitialSync, clearSyncTimeout} = useVideoSyncLogic({
        videoRef,
        ignoreEventsRef,
        onStateUpdate: updateVideoState
    });

    // --- Video Events and Broadcast Integration ---
    // `useVideoEvents` attaches event listeners to the video element.
    useVideoEvents({
        videoRef,
        mode,
        videoSyncManager, // Pass the `VideoSyncManager` for broadcasting video events.
        ignoreEventsRef,
        videoState,
        isConnectedToPresentation,
        onAutoPlay: triggerAutoPlay,
        onStateUpdate: updateVideoState
    });

    // `useVideoBroadcast` handles receiving broadcast messages and updating connection status.
    useVideoBroadcast({
        sessionId,
        mode,
        videoRef,
        lastCommandTimeRef,
        allowHostAudio: allowHostAudio || false,
        onExecuteCommand: executeCommand,
        onConnectionChange: setIsConnectedToPresentation, // Update local connection state.
        onSyncCorrection: correctSync, // Callback to apply sync corrections.
        onInitialSync: handleInitialSync // Callback to handle initial sync.
    });

    // --- Public Control Functions ---
    /**
     * Plays the video. In 'host' mode with a connected 'presentation',
     * it coordinates the play command via `VideoSyncManager`.
     * @param time Optional: seek to this time before playing.
     * @returns Promise resolving to `true` if play was successful.
     */
    const play = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;
        console.log(`[useVideoSync] [${mode}] Play requested at time: ${currentTime}`);

        if (mode === 'host' && videoSyncManager && connectionMonitor?.getStatus().isConnected && connectionMonitor.getStatus().connectionType === 'presentation') {
            // If in host mode and connected to a presentation display, send a coordinated play command.
            console.log('[useVideoSync] Host sending coordinated play command');
            lastCommandTimeRef.current = Date.now(); // Record command timestamp.
            videoSyncManager.sendVideoControl('play', currentTime, 'host'); // Send command.
            // Also execute locally for immediate feedback to the host user.
            return executeCommand('play', currentTime);
        }
        // For other modes or if not connected, execute command directly.
        return executeCommand('play', currentTime);
    }, [mode, videoSyncManager, connectionMonitor, videoState.currentTime, executeCommand, lastCommandTimeRef]);

    /**
     * Pauses the video. In 'host' mode with a connected 'presentation',
     * it coordinates the pause command via `VideoSyncManager`.
     * @param time Optional: seek to this time before pausing.
     * @returns Promise resolving to `true` if pause was successful.
     */
    const pause = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;
        console.log(`[useVideoSync] [${mode}] Pause requested at time: ${currentTime}`);

        if (mode === 'host' && videoSyncManager && connectionMonitor?.getStatus().isConnected && connectionMonitor.getStatus().connectionType === 'presentation') {
            // If in host mode and connected, send a coordinated pause command.
            console.log('[useVideoSync] Host sending coordinated pause command');
            lastCommandTimeRef.current = Date.now();
            videoSyncManager.sendVideoControl('pause', currentTime, 'host');
            // Also execute locally.
            return executeCommand('pause', currentTime);
        }
        // For other modes or if not connected, execute command directly.
        return executeCommand('pause', currentTime);
    }, [mode, videoSyncManager, connectionMonitor, videoState.currentTime, executeCommand, lastCommandTimeRef]);

    /**
     * Seeks the video to a specific time. In 'host' mode with a connected 'presentation',
     * it coordinates the seek command via `VideoSyncManager`.
     * @param time The time (in seconds) to seek to.
     * @returns Promise resolving to `true` if seek was successful.
     */
    const seek = useCallback(async (time: number): Promise<boolean> => {
        console.log(`[useVideoSync] [${mode}] Seek requested to time: ${time}`);

        if (mode === 'host' && videoSyncManager && connectionMonitor?.getStatus().isConnected && connectionMonitor.getStatus().connectionType === 'presentation') {
            // If in host mode and connected, send a coordinated seek command.
            console.log('[useVideoSync] Host sending coordinated seek command');
            lastCommandTimeRef.current = Date.now();
            videoSyncManager.sendVideoControl('seek', time, 'host');
            // Also execute locally.
            return executeCommand('seek', time);
        }
        // For other modes or if not connected, execute command directly.
        return executeCommand('seek', time);
    }, [mode, videoSyncManager, connectionMonitor, executeCommand, lastCommandTimeRef]);

    /**
     * Handles clicks on the video element, primarily for host mode.
     * If `enableNativeControls` is false, this provides a custom play/pause toggle.
     */
    const handleVideoClick = useCallback(async () => {
        if (mode === 'host' && !enableNativeControls) {
            const willPlay = !videoState.playing; // Determine if the click should result in playing or pausing.
            console.log(`[useVideoSync] Host video clicked, will play: ${willPlay}`);

            // Optionally call an `onHostVideoClick` callback provided by the parent component.
            if (onHostVideoClick) {
                onHostVideoClick(willPlay);
            }

            try {
                if (willPlay) {
                    await play(); // Execute play command.
                } else {
                    await pause(); // Execute pause command.
                }
            } catch (error) {
                console.error(`[useVideoSync] Click command failed:`, error);
            }
        }
    }, [mode, enableNativeControls, videoState.playing, play, pause, onHostVideoClick]);

    // --- Effects for Lifecycle Management ---
    /**
     * Resets video state and auto-play flag when the `videoUrl` changes.
     * This ensures each new video starts from a clean slate.
     */
    useEffect(() => {
        if (videoUrl !== lastVideoUrlRef.current) {
            console.log('[useVideoSync] Video URL changed, resetting state');
            lastVideoUrlRef.current = videoUrl; // Update tracked URL.
            hasAutoPlayedRef.current = false; // Reset auto-play flag.
            updateVideoState(createInitialVideoState()); // Reset video state to initial.
            clearSyncTimeout(); // Clear any pending sync timeouts.
        }
    }, [videoUrl, updateVideoState, clearSyncTimeout]);

    /**
     * Handles auto-play coordination when the video element reports it's ready to play (`canplay` event).
     */
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoUrl || hasAutoPlayedRef.current) return; // Skip if no video, no URL, or already auto-played.

        const handleCanPlay = () => {
            if (hasAutoPlayedRef.current) return; // Double-check auto-play flag.

            console.log(`[useVideoSync] [${mode}] Video can play, checking auto-play conditions`);

            // Use a small delay to allow the browser to fully prepare the video
            // and ensure all components are ready for a synchronized start.
            setTimeout(() => {
                triggerAutoPlay(); // Trigger the auto-play sequence.
            }, 100);
        };

        // Attach `canplay` event listener.
        video.addEventListener('canplay', handleCanPlay);

        // If the video is already ready when the component mounts/updates, trigger `handleCanPlay` immediately.
        if (isVideoReady(video)) {
            handleCanPlay();
        }

        // Cleanup: remove event listener on unmount.
        return () => {
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [mode, videoUrl, triggerAutoPlay]); // Dependencies for this effect.

    /**
     * Provides the necessary props for the `<video>` HTML element,
     * including dynamic `muted` status based on `mode` and `isConnectedToPresentation`.
     */
    const getVideoProps = useCallback(() => {
        let shouldHaveAudio = false;

        if (mode === 'master') {
            shouldHaveAudio = true; // Presentation display always has audio.
        } else if (mode === 'host') {
            if (isConnectedToPresentation) {
                shouldHaveAudio = false; // Host muted when presentation connected.
            } else {
                shouldHaveAudio = allowHostAudio; // Host-only mode: audio based on `allowHostAudio` prop.
            }
        } else {
            shouldHaveAudio = true; // Independent mode always has audio.
        }

        return {
            ref: videoRef, // Pass the video element ref.
            playsInline: true, // Recommended for mobile web.
            controls: enableNativeControls, // Show native controls if enabled.
            autoPlay: false, // We manage auto-play manually via `executeCommand`.
            muted: !shouldHaveAudio, // Mute based on calculated `shouldHaveAudio`.
            preload: 'auto' as const, // Preload video metadata.
            onClick: mode === 'host' && !enableNativeControls ? handleVideoClick : undefined, // Custom click handler for host.
            className: mode === 'host' && !enableNativeControls ? 'cursor-pointer' : '', // Add cursor style for clickable host video.
            style: {
                maxWidth: '100%' as const,
                maxHeight: '100%' as const,
                objectFit: 'contain' as const // Ensure video fits within its container.
            }
        };
    }, [mode, isConnectedToPresentation, allowHostAudio, enableNativeControls, handleVideoClick]);

    // Return the public API of the hook.
    return {
        videoRef,
        videoState,
        play,
        pause,
        seek,
        isConnectedToPresentation,
        getVideoProps
    };
};
