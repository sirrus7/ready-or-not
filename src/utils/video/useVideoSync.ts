// src/utils/video/useVideoSync.ts - Enhanced main orchestrator
import { useRef, useCallback, useEffect, useState } from 'react';
import { useBroadcastManager } from '../broadcastManager';
import { VideoSyncConfig, VideoSyncReturn, VideoState } from './types';
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
        onStateChange: () => updateVideoState({})
    });

    // Enhanced auto-play wrapper
    const triggerAutoPlay = useCallback(async () => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate auto-play
            console.log('[useVideoSync] Host coordinating auto-play with presentation');

            // Send coordinated auto-play command to presentation
            broadcastManager.sendVideoControl('play', 0);

            // Also play host video
            await handleAutoPlay(hasAutoPlayedRef, mode, isConnectedToPresentation);
        } else {
            // Host-only or master mode - direct auto-play
            await handleAutoPlay(hasAutoPlayedRef, mode, isConnectedToPresentation);
        }
    }, [mode, isConnectedToPresentation, broadcastManager, handleAutoPlay]);

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

    // Broadcast integration with enhanced handlers
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

            // Handle audio switching based on connection changes
            const video = videoRef.current;
            if (video && mode === 'host') {
                if (!wasConnected && connected) {
                    // Just connected to presentation - mute host
                    video.muted = true;
                    console.log('[useVideoSync] Host muted due to presentation connection');
                } else if (wasConnected && !connected) {
                    // Just disconnected from presentation - restore host audio
                    video.muted = !allowHostAudio;
                    console.log('[useVideoSync] Host audio restored after presentation disconnect');
                }
            }
        },
        onSyncCorrection: (remoteState) => correctSync(remoteState, mode),
        onInitialSync: handleInitialSync
    });

    // Enhanced control functions
    const play = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate play command
            console.log('[useVideoSync] Host sending coordinated play command');
            broadcastManager.sendVideoControl('play', currentTime);

            // Also execute locally for immediate feedback
            return executeCommand('play', currentTime);
        }

        return executeCommand('play', currentTime);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand]);

    const pause = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate pause command
            console.log('[useVideoSync] Host sending coordinated pause command');
            broadcastManager.sendVideoControl('pause', currentTime);

            // Also execute locally for immediate feedback
            return executeCommand('pause', currentTime);
        }

        return executeCommand('pause', currentTime);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand]);

    const seek = useCallback(async (time: number): Promise<boolean> => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            // REQUIREMENT: Host with presentation - coordinate seek command
            console.log('[useVideoSync] Host sending coordinated seek command');
            broadcastManager.sendVideoControl('seek', time);

            // Also execute locally
            return executeCommand('seek', time);
        }

        return executeCommand('seek', time);
    }, [mode, isConnectedToPresentation, broadcastManager, executeCommand]);

    // Handle video clicks for host mode
    const handleVideoClick = useCallback(async () => {
        if (mode === 'host' && onHostVideoClick && !enableNativeControls) {
            const willPlay = !videoState.playing;
            onHostVideoClick(willPlay);

            if (willPlay) {
                await play();
            } else {
                await pause();
            }
        }
    }, [mode, onHostVideoClick, enableNativeControls, videoState.playing, play, pause]);

    // Reset state when video URL changes
    useEffect(() => {
        if (videoUrl !== lastVideoUrlRef.current) {
            console.log('[useVideoSync] Video URL changed, resetting state');
            lastVideoUrlRef.current = videoUrl;
            hasAutoPlayedRef.current = false;
            updateVideoState(createInitialVideoState());
            clearSyncTimeout();
        }
    }, [videoUrl, updateVideoState, clearSyncTimeout]);

    // Handle presentation auto-play coordination
    useEffect(() => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager && videoUrl && !hasAutoPlayedRef.current) {
            const video = videoRef.current;
            if (video && isVideoReady(video)) {
                console.log('[useVideoSync] Triggering coordinated auto-play for new video');
                setTimeout(() => {
                    if (sendCoordinatedAutoPlay) {
                        sendCoordinatedAutoPlay(broadcastManager);
                    }
                    triggerAutoPlay();
                }, 200);
            }
        }
    }, [mode, isConnectedToPresentation, broadcastManager, videoUrl, triggerAutoPlay, sendCoordinatedAutoPlay]);

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
