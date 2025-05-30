// src/utils/videoUtils.ts - Fixed Unified Video System
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
    videoUrl?: string; // Add video URL to detect changes
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
        onHostVideoClick,
        videoUrl
    } = config;

    // State and refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoState, setVideoState] = useState<VideoState>(createInitialVideoState);
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const lastCommandTimeRef = useRef<number>(0);
    const ignoreEventsRef = useRef<boolean>(false);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

    // Execute video command with proper event handling
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
                    if (value !== undefined && Math.abs(video.currentTime - value) > 0.5) {
                        video.currentTime = value;
                    }
                    await video.play();
                    return true;
                case 'pause':
                    if (value !== undefined && Math.abs(video.currentTime - value) > 0.5) {
                        video.currentTime = value;
                    }
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

    // Auto-play logic for new videos
    const handleAutoPlay = useCallback(async () => {
        if (hasAutoPlayedRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            hasAutoPlayedRef.current = true;

            try {
                if (mode === 'host' && isConnectedToPresentation) {
                    // In dual mode, send play command to both
                    broadcastManager?.sendVideoControl('play', 0);
                } else {
                    // Host only mode or master mode
                    await video.play();
                }
            } catch (error) {
                console.warn('[VideoSync] Auto-play failed:', error);
            }
        }
    }, [mode, isConnectedToPresentation, broadcastManager]);

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

            // Execute the action
            if (willPlay) {
                await play();
            } else {
                await pause();
            }
        }
    }, [mode, onHostVideoClick, enableNativeControls, videoState.playing, play, pause]);

    // Sync correction logic
    const correctSync = useCallback((remoteState: VideoState) => {
        const video = videoRef.current;
        if (!video || ignoreEventsRef.current) return;

        const timeDiff = Math.abs(video.currentTime - remoteState.currentTime);
        const playStateDiff = (!video.paused) !== remoteState.playing;

        // Only sync if difference is significant (> 1 second) or play state differs
        if (timeDiff > 1.0 || playStateDiff) {
            console.log('[VideoSync] Correcting sync - time diff:', timeDiff, 'play diff:', playStateDiff);

            ignoreEventsRef.current = true;

            // Correct time if needed
            if (timeDiff > 1.0) {
                video.currentTime = remoteState.currentTime;
            }

            // Correct play state
            if (playStateDiff) {
                if (remoteState.playing && video.paused) {
                    video.play().catch(console.error);
                } else if (!remoteState.playing && !video.paused) {
                    video.pause();
                }
            }

            setTimeout(() => {
                ignoreEventsRef.current = false;
            }, 500);

            updateVideoState(remoteState);
        }
    }, [updateVideoState]);

    // Reset state when video URL changes
    useEffect(() => {
        if (videoUrl !== lastVideoUrlRef.current) {
            console.log('[VideoSync] Video URL changed, resetting state');
            lastVideoUrlRef.current = videoUrl;
            hasAutoPlayedRef.current = false;
            updateVideoState(createInitialVideoState());

            // Clear any pending sync operations
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
        }
    }, [videoUrl, updateVideoState]);

    // Setup video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            if (ignoreEventsRef.current) return;
            console.log('[VideoSync] Video play event');
            updateVideoState({ playing: true });
            if (mode === 'master' && broadcastManager) {
                const state = getCurrentState();
                if (state) broadcastManager.sendVideoState(state);
            }
        };

        const handlePause = () => {
            if (ignoreEventsRef.current) return;
            console.log('[VideoSync] Video pause event');
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
            console.log('[VideoSync] Video metadata loaded');
            updateVideoState({
                duration: video.duration || 0,
                currentTime: video.currentTime,
                volume: video.volume
            });

            // Trigger auto-play check
            setTimeout(handleAutoPlay, 100);
        };

        const handleCanPlay = () => {
            console.log('[VideoSync] Video can play');
            // Additional auto-play opportunity
            setTimeout(handleAutoPlay, 50);
        };

        // Add listeners
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [mode, broadcastManager, updateVideoState, getCurrentState, videoState.lastUpdate, handleAutoPlay]);

    // Setup broadcast listeners
    useEffect(() => {
        if (!broadcastManager) return;

        const subscriptions: Array<() => void> = [];

        if (mode === 'master') {
            // Listen for video commands from host
            subscriptions.push(
                broadcastManager.subscribe('VIDEO_CONTROL', async (message) => {
                    const { action, value } = message;
                    console.log('[VideoSync] Master received command:', action, value);
                    await executeCommand(action as any, value);
                })
            );

            // Announce presentation ready
            broadcastManager.announcePresentation();
        }

        if (mode === 'host') {
            // Listen for presentation connection
            subscriptions.push(
                broadcastManager.subscribe('PRESENTATION_READY', () => {
                    console.log('[VideoSync] Presentation display connected');
                    setIsConnectedToPresentation(true);

                    // Send initial state to presentation
                    const currentState = getCurrentState();
                    if (currentState) {
                        // Pause both videos when presentation connects
                        if (currentState.playing) {
                            executeCommand('pause', currentState.currentTime);
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

                    setIsConnectedToPresentation(nowConnected);

                    // Handle disconnection - restore host audio
                    if (wasConnected && !nowConnected) {
                        console.log('[VideoSync] Presentation disconnected, restoring host audio');
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
                            correctSync(remoteState);
                        }
                    }
                })
            );
        }

        return () => {
            subscriptions.forEach(unsubscribe => unsubscribe());
        };
    }, [broadcastManager, mode, executeCommand, getCurrentState, isConnectedToPresentation, correctSync, allowHostAudio]);

    // Generate video props with proper audio handling
    const getVideoProps = useCallback(() => {
        const shouldHaveAudio = mode === 'master' ||
            (mode === 'host' && allowHostAudio && !isConnectedToPresentation);

        return {
            ref: videoRef,
            playsInline: true,
            controls: enableNativeControls,
            autoPlay: false, // We handle auto-play manually
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
