// src/utils/videoUtils.ts - Simplified Unified Video System
import { useRef, useCallback, useEffect, useState } from 'react';
import { useBroadcastManager } from './broadcastManager';

// Core video state
export interface VideoState {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    lastUpdate: number;
}

// Video sync modes
export type VideoSyncMode =
    | 'master'      // Controls video and broadcasts state (presentation display)
    | 'host'        // Can control video, syncs with presentation if available
    | 'independent' // No sync, local control only

// Hook configuration
export interface UseVideoSyncConfig {
    sessionId: string | null;
    mode: VideoSyncMode;
    allowHostAudio?: boolean;
    enableNativeControls?: boolean;
    onHostVideoClick?: (willPlay: boolean) => void;
}

// Simple video detection
export const isVideo = (url?: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes(".mp4") ||
        lowerUrl.includes(".webm") ||
        lowerUrl.includes(".ogg") ||
        lowerUrl.includes(".mov");
};

// Create initial video state
const createInitialVideoState = (): VideoState => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    lastUpdate: Date.now()
});

// Main video sync hook - handles everything
export const useVideoSync = (config: UseVideoSyncConfig) => {
    const {
        sessionId,
        mode,
        allowHostAudio = false,
        enableNativeControls = false,
        onHostVideoClick
    } = config;

    // State and refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoState, setVideoState] = useState<VideoState>(createInitialVideoState);
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const lastCommandTimeRef = useRef<number>(0);
    const ignoreEventsRef = useRef<boolean>(false);

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

    // Get current state from video element
    const getCurrentState = useCallback((): VideoState | null => {
        const video = videoRef.current;
        if (!video) return null;

        return {
            playing: !video.paused,
            currentTime: video.currentTime,
            duration: video.duration || 0,
            volume: video.volume,
            lastUpdate: Date.now()
        };
    }, []);

    // Execute video command
    const executeCommand = useCallback(async (
        action: 'play' | 'pause' | 'seek',
        value?: number
    ): Promise<boolean> => {
        const video = videoRef.current;
        if (!video) return false;

        lastCommandTimeRef.current = Date.now();
        ignoreEventsRef.current = true;

        try {
            switch (action) {
                case 'play':
                    if (value !== undefined) video.currentTime = value;
                    await video.play();
                    return true;
                case 'pause':
                    if (value !== undefined) video.currentTime = value;
                    video.pause();
                    return true;
                case 'seek':
                    if (value !== undefined) video.currentTime = value;
                    return true;
            }
        } catch (error) {
            console.error('[VideoSync] Command failed:', error);
            return false;
        } finally {
            setTimeout(() => {
                ignoreEventsRef.current = false;
            }, 300);
        }
    }, []);

    // Control functions
    const play = useCallback(async (time?: number): Promise<boolean> => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            broadcastManager.sendVideoControl('play', time || videoState.currentTime);
            return true;
        }
        return executeCommand('play', time);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand]);

    const pause = useCallback(async (time?: number): Promise<boolean> => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            broadcastManager.sendVideoControl('pause', time || videoState.currentTime);
            return true;
        }
        return executeCommand('pause', time);
    }, [mode, isConnectedToPresentation, broadcastManager, videoState.currentTime, executeCommand]);

    const seek = useCallback(async (time: number): Promise<boolean> => {
        if (mode === 'host' && isConnectedToPresentation && broadcastManager) {
            broadcastManager.sendVideoControl('seek', time);
            return true;
        }
        return executeCommand('seek', time);
    }, [mode, isConnectedToPresentation, broadcastManager, executeCommand]);

    // Handle video clicks
    const handleVideoClick = useCallback(() => {
        if (mode === 'host' && onHostVideoClick && !enableNativeControls) {
            const willPlay = !videoState.playing;
            onHostVideoClick(willPlay);
        }
    }, [mode, onHostVideoClick, enableNativeControls, videoState.playing]);

    // Setup video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            if (ignoreEventsRef.current) return;
            updateVideoState({ playing: true });
            if (mode === 'master' && broadcastManager) {
                const state = getCurrentState();
                if (state) broadcastManager.sendVideoState(state);
            }
        };

        const handlePause = () => {
            if (ignoreEventsRef.current) return;
            updateVideoState({ playing: false });
            if (mode === 'master' && broadcastManager) {
                const state = getCurrentState();
                if (state) broadcastManager.sendVideoState(state);
            }
        };

        const handleTimeUpdate = () => {
            if (ignoreEventsRef.current) return;
            updateVideoState({ currentTime: video.currentTime });

            // Throttled broadcast for master
            if (mode === 'master' && broadcastManager) {
                const now = Date.now();
                if (now - videoState.lastUpdate > 1000) {
                    const state = getCurrentState();
                    if (state) broadcastManager.sendVideoState(state);
                }
            }
        };

        const handleLoadedMetadata = () => {
            updateVideoState({
                duration: video.duration || 0,
                currentTime: video.currentTime,
                volume: video.volume
            });
            if (mode === 'master' && broadcastManager) {
                const state = getCurrentState();
                if (state) broadcastManager.sendVideoState(state);
            }
        };

        // Add listeners
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [mode, broadcastManager, updateVideoState, getCurrentState, videoState.lastUpdate]);

    // Setup broadcast listeners
    useEffect(() => {
        if (!broadcastManager) return;

        const subscriptions: Array<() => void> = [];

        if (mode === 'master') {
            // Listen for video commands
            subscriptions.push(
                broadcastManager.subscribe('VIDEO_CONTROL', async (message) => {
                    const { action, value } = message;
                    await executeCommand(action as any, value);
                })
            );
            broadcastManager.announcePresentation();
        }

        if (mode === 'host') {
            // Listen for presentation connection
            subscriptions.push(
                broadcastManager.subscribe('PRESENTATION_READY', () => {
                    setIsConnectedToPresentation(true);
                    const state = getCurrentState();
                    if (state) {
                        setTimeout(() => broadcastManager.sendInitialVideoState(state), 300);
                    }
                })
            );

            // Monitor connection
            subscriptions.push(
                broadcastManager.onConnectionChange((status) => {
                    setIsConnectedToPresentation(
                        status.isConnected && status.connectionType === 'presentation'
                    );
                })
            );

            // Listen for video state updates
            subscriptions.push(
                broadcastManager.subscribe('VIDEO_STATE_UPDATE', (message) => {
                    if (message.videoState && mode === 'host') {
                        const remoteState = message.videoState;
                        const timeSinceCommand = Date.now() - lastCommandTimeRef.current;

                        // Sync if we haven't sent a command recently
                        if (timeSinceCommand > 1000 && videoRef.current) {
                            const video = videoRef.current;
                            const timeDiff = Math.abs(video.currentTime - remoteState.currentTime);

                            // Sync time if needed
                            if (timeDiff > 0.5) {
                                video.currentTime = remoteState.currentTime;
                            }

                            // Sync play state
                            if (remoteState.playing && video.paused) {
                                video.play().catch(console.error);
                            } else if (!remoteState.playing && !video.paused) {
                                video.pause();
                            }

                            updateVideoState(remoteState);
                        }
                    }
                })
            );
        }

        return () => {
            subscriptions.forEach(unsubscribe => unsubscribe());
        };
    }, [broadcastManager, mode, executeCommand, getCurrentState, updateVideoState]);

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
            preload: 'auto',
            onClick: mode === 'host' && !enableNativeControls ? handleVideoClick : undefined,
            className: mode === 'host' && !enableNativeControls ? 'cursor-pointer' : '',
            style: {
                maxWidth: '100%',
                maxHeight: '100%',
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