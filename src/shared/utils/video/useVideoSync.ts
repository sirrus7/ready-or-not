// src/utils/video/useVideoSync.ts - Enhanced with proper state management
import { useRef, useCallback, useEffect, useState } from 'react';
import { useBroadcastManager } from '@core/sync/BroadcastChannel.ts';
import { VideoSyncConfig, VideoSyncReturn, VideoState } from '@shared/types/video';
import { createInitialVideoState, isVideoReady } from './helpers';
import { useVideoCommands } from './commands';
import { useVideoSyncLogic } from './sync';
import { useVideoEvents } from './events';
import { useVideoBroadcast } from './broadcast';

export const useVideoSync = (config: VideoSyncConfig): VideoSyncReturn => {
    const {
        sessionId,
        mode,
        allowHostAudio = false,
        enableNativeControls = false,
        onHostVideoClick,
        videoUrl
    } = config;

    // State and refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoState, setVideoState] = useState<VideoState>(createInitialVideoState);
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const lastVideoUrlRef = useRef<string | undefined>(undefined);
    const hasAutoPlayedRef = useRef<boolean>(false);
    const connectionEstablishedRef = useRef<boolean>(false);

    // Broadcast manager
    const broadcastManager = useBroadcastManager(
        sessionId,
        mode === 'master' ? 'presentation' : 'host'
    );

    // Update video state helper
    const updateVideoState = useCallback((updates: Partial<VideoState>) => {
        setVideoState(prev => ({
            ...prev,
            ...updates,
            lastUpdate: Date.now()
        }));
    }, []);

    // Video commands
    const { executeCommand, handleAutoPlay, lastCommandTimeRef, ignoreEventsRef } = useVideoCommands({
        videoRef,
        onStateChange: () => {
            // Actually read the current video state and update
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

    // Enhanced auto-play wrapper with better coordination
    const triggerAutoPlay = useCallback(async () => {
        console.log(`[useVideoSync] [${mode}] Auto-play triggered, connected: ${isConnectedToPresentation}`);

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate auto-play
            console.log('[useVideoSync] Host coordinating auto-play with presentation');

            // Wait a moment for presentation to be ready
            setTimeout(() => {
                broadcastManager.sendVideoControl('COORDINATED_AUTOPLAY');
                // Also play host video
                executeCommand('play', 0);
            }, 200);
        } else {
            // Host-only or master mode - direct auto-play
            await handleAutoPlay(hasAutoPlayedRef, mode, isConnectedToPresentation);
        }
    }, [mode, isConnectedToPresentation, broadcastManager, handleAutoPlay, executeCommand]);

    // Sync logic
    const { correctSync, handleInitialSync, clearSyncTimeout } = useVideoSyncLogic({
        videoRef,
        ignoreEventsRef,
        onStateUpdate: updateVideoState
    });

    // Event handling
    useVideoEvents({
        videoRef,
        mode,
        broadcastManager,
        ignoreEventsRef,
        videoState,
        isConnectedToPresentation,
        onAutoPlay: triggerAutoPlay,
        onStateUpdate: updateVideoState
    });

    // Enhanced broadcast integration
    const { sendCoordinatedAutoPlay } = useVideoBroadcast({
        broadcastManager,
        mode,
        videoRef,
        isConnectedToPresentation,
        lastCommandTimeRef,
        allowHostAudio: allowHostAudio || false,
        onExecuteCommand: executeCommand,
        onConnectionChange: (connected) => {
            const wasConnected = isConnectedToPresentation;
            setIsConnectedToPresentation(connected);

            console.log(`[useVideoSync] [${mode}] Connection changed: ${wasConnected} -> ${connected}`);

            // Handle audio switching based on connection changes
            const video = videoRef.current;
            if (video && mode === 'host') {
                if (!wasConnected && connected) {
                    // Just connected to presentation - mute host and send current state
                    video.muted = true;
                    connectionEstablishedRef.current = true;
                    console.log('[useVideoSync] Host muted due to presentation connection');

                    // Send current video state to presentation for initial sync
                    const currentState = {
                        playing: !video.paused,
                        currentTime: video.currentTime,
                        duration: video.duration || 0,
                        volume: video.volume,
                        lastUpdate: Date.now()
                    };

                    setTimeout(() => {
                        if (broadcastManager) {
                            broadcastManager.sendInitialVideoState(currentState);
                        }
                    }, 300);
                } else if (wasConnected && !connected) {
                    // Just disconnected from presentation - restore host audio
                    video.muted = !allowHostAudio;
                    connectionEstablishedRef.current = false;
                    console.log('[useVideoSync] Host audio restored after presentation disconnect');
                }
            }
        },
        onSyncCorrection: (remoteState) => correctSync(remoteState, mode),
        onInitialSync: (remoteState, shouldPauseBoth = true) => {
            console.log(`[useVideoSync] [${mode}] Initial sync requested, pause both: ${shouldPauseBoth}`);
            handleInitialSync(remoteState, shouldPauseBoth);
        }
    });

    // Enhanced control functions with better coordination
    const play = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;
        console.log(`[useVideoSync] [${mode}] Play requested at time: ${currentTime}`);

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate play command
            console.log('[useVideoSync] Host sending coordinated play command');
            lastCommandTimeRef.current = Date.now();
            broadcastManager.sendVideoControl('play', currentTime);

            // Also execute locally for immediate feedback
            return executeCommand('play', currentTime);
        }

        return executeCommand('play', currentTime);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand, lastCommandTimeRef]);

    const pause = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;
        console.log(`[useVideoSync] [${mode}] Pause requested at time: ${currentTime}`);

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate pause command
            console.log('[useVideoSync] Host sending coordinated pause command');
            lastCommandTimeRef.current = Date.now();
            broadcastManager.sendVideoControl('pause', currentTime);

            // Also execute locally for immediate feedback
            return executeCommand('pause', currentTime);
        }

        return executeCommand('pause', currentTime);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand, lastCommandTimeRef]);

    const seek = useCallback(async (time: number): Promise<boolean> => {
        console.log(`[useVideoSync] [${mode}] Seek requested to time: ${time}`);

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate seek command
            console.log('[useVideoSync] Host sending coordinated seek command');
            lastCommandTimeRef.current = Date.now();
            broadcastManager.sendVideoControl('seek', time);

            // Also execute locally
            return executeCommand('seek', time);
        }

        return executeCommand('seek', time);
    }, [mode, isConnectedToPresentation, broadcastManager, executeCommand, lastCommandTimeRef]);

    // Handle video clicks for host mode
    const handleVideoClick = useCallback(async () => {
        if (mode === 'host' && !enableNativeControls) {
            const willPlay = !videoState.playing;
            console.log(`[useVideoSync] Host video clicked, will play: ${willPlay}`);

            // Show visual feedback if callback provided (optional)
            if (onHostVideoClick) {
                onHostVideoClick(willPlay);
            }

            try {
                if (willPlay) {
                    await play();
                } else {
                    await pause();
                }
            } catch (error) {
                console.error(`[useVideoSync] Click command failed:`, error);
            }
        }
    }, [mode, enableNativeControls, videoState.playing, play, pause, onHostVideoClick]);

    // Reset state when video URL changes
    useEffect(() => {
        if (videoUrl !== lastVideoUrlRef.current) {
            console.log('[useVideoSync] Video URL changed, resetting state');
            lastVideoUrlRef.current = videoUrl;
            hasAutoPlayedRef.current = false;
            connectionEstablishedRef.current = false;
            updateVideoState(createInitialVideoState());
            clearSyncTimeout();
        }
    }, [videoUrl, updateVideoState, clearSyncTimeout]);

    // Handle auto-play coordination when video becomes ready
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoUrl || hasAutoPlayedRef.current) return;

        const handleCanPlay = () => {
            if (hasAutoPlayedRef.current) return;

            console.log(`[useVideoSync] [${mode}] Video can play, checking auto-play conditions`);

            // Small delay to ensure everything is ready
            setTimeout(() => {
                if (mode === 'host' && isConnectedToPresentation) {
                    // Coordinate with presentation
                    triggerAutoPlay();
                } else if (mode === 'master') {
                    // Presentation auto-plays immediately
                    triggerAutoPlay();
                } else {
                    // Host-only mode
                    triggerAutoPlay();
                }
            }, 100);
        };

        video.addEventListener('canplay', handleCanPlay);

        // Check if already ready
        if (isVideoReady(video)) {
            handleCanPlay();
        }

        return () => {
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [mode, isConnectedToPresentation, videoUrl, triggerAutoPlay]);

    // Generate video props with correct audio settings
    const getVideoProps = useCallback(() => {
        // REQUIREMENT: Audio settings based on mode and connection
        let shouldHaveAudio = false;

        if (mode === 'master') {
            // Presentation display always has audio
            shouldHaveAudio = true;
        } else if (mode === 'host') {
            if (isConnectedToPresentation) {
                // Host muted when presentation connected
                shouldHaveAudio = false;
            } else {
                // Host-only mode - audio based on allowHostAudio
                shouldHaveAudio = allowHostAudio;
            }
        } else {
            // Independent mode
            shouldHaveAudio = true;
        }

        return {
            ref: videoRef,
            playsInline: true,
            controls: enableNativeControls,
            autoPlay: false, // We handle auto-play manually
            muted: !shouldHaveAudio,
            preload: 'auto' as const,
            onClick: mode === 'host' && !enableNativeControls ? handleVideoClick : undefined,
            className: mode === 'host' && !enableNativeControls ? 'cursor-pointer' : '',
            style: {
                maxWidth: '100%' as const,
                maxHeight: '100%' as const,
                objectFit: 'contain' as const
            }
        };
    }, [mode, isConnectedToPresentation, allowHostAudio, enableNativeControls, handleVideoClick]);

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
