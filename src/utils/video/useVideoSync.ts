// src/utils/video/useVideoSync.ts - Main video sync hook (orchestrator)
import { useRef, useCallback, useEffect, useState } from 'react';
import { useBroadcastManager } from '../broadcastManager';
import { VideoSyncConfig, VideoSyncReturn, VideoState } from './types';
import { createInitialVideoState } from './helpers';
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

    // Auto-play wrapper
    const triggerAutoPlay = useCallback(async () => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            broadcastManager.sendVideoControl('play', 0);
        } else {
            await handleAutoPlay(hasAutoPlayedRef);
        }
    }, [mode, isConnectedToPresentation, broadcastManager, handleAutoPlay]);

    // Sync logic
    const { correctSync, clearSyncTimeout } = useVideoSyncLogic({
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
        onAutoPlay: triggerAutoPlay,
        onStateUpdate: updateVideoState
    });

    // Broadcast integration
    useVideoBroadcast({
        broadcastManager,
        mode,
        videoRef,
        isConnectedToPresentation,
        lastCommandTimeRef,
        allowHostAudio: allowHostAudio || false,
        onExecuteCommand: executeCommand,
        onConnectionChange: setIsConnectedToPresentation,
        onSyncCorrection: correctSync
    });

    // Control functions
    const play = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            broadcastManager.sendVideoControl('play', currentTime);
            return true;
        }
        return executeCommand('play', currentTime);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand]);

    const pause = useCallback(async (time?: number): Promise<boolean> => {
        const currentTime = time ?? videoState.currentTime;

        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            broadcastManager.sendVideoControl('pause', currentTime);
            return true;
        }
        return executeCommand('pause', currentTime);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand]);

    const seek = useCallback(async (time: number): Promise<boolean> => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            broadcastManager.sendVideoControl('seek', time);
            return true;
        }
        return executeCommand('seek', time);
    }, [mode, isConnectedToPresentation, broadcastManager, executeCommand]);

    // Handle video clicks
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

    // Generate video props
    const getVideoProps = useCallback(() => {
        const shouldHaveAudio = mode === 'master' ||
            (mode === 'host' && allowHostAudio && !isConnectedToPresentation);

        return {
            ref: videoRef,
            playsInline: true,
            controls: enableNativeControls,
            autoPlay: false,
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
    }, [mode, allowHostAudio, isConnectedToPresentation, enableNativeControls, handleVideoClick]);

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
