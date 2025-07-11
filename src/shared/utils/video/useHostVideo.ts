// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import { isVideoReady } from '@shared/utils/video/commonVideoUtils';
import {
    createSyncInterval,
    isNewVideoSource,
    handleHostConnection,
    logHostVideoState,
    executePlay,
    executePause,
    executeSeek,
    HOST_MUTE_CHECK_INTERVAL
} from '@shared/utils/video/hostVideoUtils';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    autoPlay: boolean;
    muted: boolean;
    preload: string;
    crossOrigin?: string;
    style: React.CSSProperties;
}

interface UseHostVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    play: (time?: number) => Promise<void>;
    pause: (time?: number) => Promise<void>;
    seek: (time: number) => Promise<void>;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    isConnectedToPresentation: boolean;
    presentationMuted: boolean;
    presentationVolume: number;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UseHostVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

interface VideoState {
    muted: boolean;
    volume: 1;
    presentationVideoReady: boolean;
    hostVideoReady: boolean;
    pendingAutoplay: boolean;
}

export const useHostVideo = ({ sessionId, sourceUrl, isEnabled }: UseHostVideoProps): UseHostVideoReturn => {
    // Core refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousSourceUrl = useRef<string | null>(null);
    
    // Callback refs
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    
    // State management
    const [videoState, setVideoState] = useState<VideoState>({
        muted: false,
        volume: 1,
        presentationVideoReady: false,
        hostVideoReady: false,
        pendingAutoplay: false
    });

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use sync manager for communication only when enabled
    const { isConnected, sendCommand, onConnectionChange, onVideoReady } = useVideoSyncManager({
        sessionId: isEnabled ? sessionId : null,
        role: 'host'
    });

    // Helper function to update video state
    const updateVideoState = useCallback((updates: Partial<typeof videoState>) => {
        setVideoState(prev => ({ ...prev, ...updates }));
    }, []);


    // Sync interval management
    const startSyncInterval = useCallback(() => {
        if (syncIntervalRef.current || !isConnected) return;
        syncIntervalRef.current = createSyncInterval(videoRef, isConnected, sendCommand);
    }, [isConnected, sendCommand]);

    const stopSyncInterval = useCallback(() => {
        if (!syncIntervalRef.current) return;
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
    }, []);

    // Handle connection changes
    useEffect(() => {
            console.log('[Host] 🔌 Connection status changed:', { isConnected });
            // Connection state is managed by sync manager
            const video = videoRef.current;
            if (!video) {
                console.log('[Host] ⚠️ No video element during connection change');
                return;
            }

            logHostVideoState('Connection change', video, { isConnected });

            if (isConnected) {
                const cleanup = handleHostConnection(
                    video,
                    isConnected,
                    videoState.volume,
                    videoState.muted,
                    sendCommand,
                );
                
                // Always send volume state when presentation connects
                sendCommand('volume', {
                    volume: videoState.volume,
                    muted: videoState.muted,
                    time: Date.now(),
                });
                
                if (!video.paused) {
                    console.log('[Host] ▶️ Video is playing, starting sync interval');
                    startSyncInterval();
                }

                return cleanup
            } else {
                // Unmute host when presentation disconnects
                video.muted = false;
                video.dispatchEvent(new Event('volumechange'));
                
                // Reset states
                updateVideoState({
                    muted: false,
                    presentationVideoReady: false
                });
                
                stopSyncInterval();
            }
    }, [isConnected, onConnectionChange, sendCommand, videoState.muted, videoState.volume, startSyncInterval, stopSyncInterval, updateVideoState]);

    // Listen for presentation video ready status
    useEffect(() => {
        const unsubscribe = onVideoReady((ready) => {
            console.log('')
            sendCommand('volume', {
                volume: videoState.volume,
                muted: videoState.muted,
                time: Date.now(),
            });
            updateVideoState({ presentationVideoReady: ready });
        });
        return unsubscribe;
    }, [onVideoReady, sendCommand, videoState.volume, videoState.muted, updateVideoState]);

    // Play command
    const play = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ Play called but no video element');
            return;
        }

        try {
            await executePlay(video, time, isConnected, sendCommand);
            if (isConnected) {
                startSyncInterval();
            }
        } catch (error) {
            console.error('[Host] ❌ Play command failed:', error);
            throw error;
        }
    }, [isConnected, sendCommand, startSyncInterval]);

    // Handle autoplay when conditions are met
    useEffect(() => {
        const { pendingAutoplay, hostVideoReady, presentationVideoReady } = videoState;
        const shouldAutoplay = pendingAutoplay && hostVideoReady && (!isConnected || presentationVideoReady);
        
        if (!shouldAutoplay || !videoRef.current) return;
        
        const video = videoRef.current;
        updateVideoState({ pendingAutoplay: false });
        
        video.currentTime = 0;
        video.play().then(() => {
            if (isConnected) {
                sendCommand('play', {
                    time: 0,
                    playbackRate: video.playbackRate,
                });
                startSyncInterval();
            }
        }).catch(error => {
            console.error('[Host] Autoplay failed:', error);
        });
    }, [videoState, isConnected, sendCommand, startSyncInterval, updateVideoState]);

    // Pause command
    const pause = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ Pause called but no video element');
            return;
        }

        executePause(video, time, isConnected, sendCommand);
        stopSyncInterval();
    }, [isConnected, sendCommand, stopSyncInterval]);

    // Seek command
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ Seek called but no video element');
            return;
        }

        executeSeek(video, time, isConnected, sendCommand);
    }, [isConnected, sendCommand]);

    // Volume control (for presentation when connected)
    const setVolume = useCallback((volume: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ setVolume called but no video element');
            return;
        }

        updateVideoState({ presentationVolume: volume });
        
        if (isConnected) {
            sendCommand('volume', {
                volume: volume,
                muted: videoState.presentationMuted,
            });
        } else {
            video.volume = volume;
        }
    }, [isConnected, sendCommand, videoState.presentationMuted, updateVideoState]);

    // Mute control (for presentation when connected)
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ toggleMute called but no video element');
            return;
        }

        if (isConnected) {
            const newMuted = !videoState.presentationMuted;
            updateVideoState({ presentationMuted: newMuted });
            
            sendCommand('volume', {
                volume: videoState.presentationVolume,
                muted: newMuted,
            });
        } else {
            video.muted = !video.muted;
            video.dispatchEvent(new Event('volumechange'));
        }
    }, [isConnected, sendCommand, videoState.presentationMuted, videoState.presentationVolume, updateVideoState]);

    // Enforce host mute state based on connection status
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (!isConnected) {
            // Unmute host when not connected (with small delay to avoid conflicts)
            const timeout = setTimeout(() => {
                if (videoRef.current && !isConnected) {
                    videoRef.current.muted = false;
                    videoRef.current.dispatchEvent(new Event('volumechange'));
                }
            }, 10);
            return () => clearTimeout(timeout);
        }

        // Mute host when connected and enforce it
        video.muted = true;
        video.dispatchEvent(new Event('volumechange'));

        const interval = setInterval(() => {
            if (video.muted === false && isConnected) {
                video.muted = true;
            }
        }, HOST_MUTE_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [isConnected]);

    // Handle video source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            console.log('[Host] 🏁 Video ended');
            logHostVideoState('Video ended', video);
            stopSyncInterval();
            onEndedRef.current?.();
        };

        const handleError = (e: Event) => {
            console.error('[Host] ❌ Video error event:', e);
            logHostVideoState('Video error', video);
            if (video.error) {
                console.error('[Host] ❌ Video error details:', {
                    code: video.error.code,
                    message: video.error.message,
                    MEDIA_ERR_ABORTED: video.error.code === 1,
                    MEDIA_ERR_NETWORK: video.error.code === 2,
                    MEDIA_ERR_DECODE: video.error.code === 3,
                    MEDIA_ERR_SRC_NOT_SUPPORTED: video.error.code === 4
                });
            }
            onErrorRef.current?.();
        };

        if (isEnabled && sourceUrl) {
            // Check if this is a new video (slide change)
            const isNewVideo = isNewVideoSource(video.currentSrc, sourceUrl, previousSourceUrl.current);

            if (video.currentSrc !== sourceUrl) {
                // Use persistent volume state for new video
                if (isNewVideo) {
                }

                // Setup video for autoplay
                video.src = sourceUrl;
                video.load();
                
                // Ensure proper mute state based on connection
                if (!isConnected) {
                    video.muted = false;
                }
                
                // Reset states for new video
                updateVideoState({
                    hostVideoReady: false,
                    presentationVideoReady: false,
                    pendingAutoplay: true
                });
                
                // Wait for host video to be ready
                const handleCanPlay = () => {
                    video.removeEventListener('canplay', handleCanPlay);
                    console.log('[Host] ✅ Video can play');
                    logHostVideoState('Can play', video);
                    updateVideoState({ hostVideoReady: true });
                };
                video.addEventListener('canplay', handleCanPlay);
                
                // If already ready, trigger immediately
                if (isVideoReady(video)) {
                    console.log('[Host] ✅ Video already ready');
                    logHostVideoState('Already ready', video);
                    updateVideoState({ hostVideoReady: true });
                }
            }

            // Update previous source URL
            previousSourceUrl.current = sourceUrl;
        } else {
            if (!video.paused) {
                console.log('[Host] ⏸️ Pausing video - source disabled');
                video.pause();
                stopSyncInterval();
            }
            previousSourceUrl.current = null;
            // Reset states when video is disabled
            updateVideoState({
                hostVideoReady: false,
                presentationVideoReady: false,
                pendingAutoplay: false
            });
        }

        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled, stopSyncInterval, isConnected, sendCommand, updateVideoState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('[Host] 🧹 Cleaning up useHostVideo');
            stopSyncInterval();
        };
    }, [stopSyncInterval]);

    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        const props = createVideoProps({
            videoRef,
            muted: isConnected, // Host always muted when connected
            autoPlay: false,
            onVideoEnd,
            onError
        });
        
        console.log('[Host] 📋 Creating video props:', {
            muted: props.muted,
            autoPlay: props.autoPlay,
            isConnected
        });
        
        return props;
    }, [isConnected]);

    return {
        videoRef,
        play,
        pause,
        seek,
        setVolume,
        toggleMute,
        isConnectedToPresentation: isConnected,
        presentationMuted: videoState.presentationMuted,
        presentationVolume: videoState.presentationVolume,
        getVideoProps,
    };
};