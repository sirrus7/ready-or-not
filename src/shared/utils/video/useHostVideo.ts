// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager.ts';

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
    isConnectedToPresentation: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UseHostVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const useHostVideo = ({ sessionId, sourceUrl, isEnabled }: UseHostVideoProps): UseHostVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const isManuallyPaused = useRef(false);
    const [localIsConnected, setLocalIsConnected] = useState(false);

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use the video sync manager
    const { isConnected, sendCommand, setupVideoSync, broadcastManager } = useVideoSyncManager({
        sessionId,
        role: 'host',
        videoRef,
        onConnectionChange: setLocalIsConnected,
    });

    // Execute command helper (maintains existing pattern)
    const executeCommand = useCallback(async (action: 'play' | 'pause' | 'seek', time?: number) => {
        const video = videoRef.current;
        if (!video) return;

        try {
            switch (action) {
                case 'play':
                    if (time !== undefined) {
                        video.currentTime = time;
                    }
                    await video.play();
                    break;

                case 'pause':
                    video.pause();
                    if (time !== undefined) {
                        video.currentTime = time;
                    }
                    break;

                case 'seek':
                    if (time !== undefined) {
                        video.currentTime = time;
                    }
                    break;
            }
        } catch (error) {
            console.error(`[useHostVideo] Error executing ${action}:`, error);
            throw error;
        }
    }, []);

    // Set up video sync when enabled
    useEffect(() => {
        if (isEnabled && sourceUrl && broadcastManager) {
            const cleanup = setupVideoSync();
            return cleanup;
        }
    }, [isEnabled, sourceUrl, broadcastManager, setupVideoSync]);

    // Handle video source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleCanPlay = async () => {
            if (!isManuallyPaused.current && isEnabled) {
                try {
                    await video.play();
                } catch (error) {
                    console.log('[useHostVideo] Auto-play blocked or failed:', error);
                }
            }
        };

        const handleEnded = () => {
            onEndedRef.current?.();
        };

        const handleError = (e: Event) => {
            console.error('[useHostVideo] Video error:', e);
            if (video.error) {
                console.error('[useHostVideo] Video error details:', video.error);
            }
            onErrorRef.current?.();
        };

        if (isEnabled && sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                isManuallyPaused.current = false; // Reset pause state for new video
                video.src = sourceUrl;
                video.load();
            }
        } else {
            // Not a video slide, just ensure it's paused
            if (!video.paused) {
                video.pause();
            }
        }

        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled, executeCommand]);

    // Public API methods
    const play = useCallback(async (time?: number) => {
        isManuallyPaused.current = false;
        await executeCommand('play', time);
    }, [executeCommand]);

    const pause = useCallback(async (time?: number) => {
        isManuallyPaused.current = true;
        await executeCommand('pause', time);
    }, [executeCommand]);

    const seek = useCallback(async (time: number) => {
        await executeCommand('seek', time);
    }, [executeCommand]);

    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        return createVideoProps({
            videoRef,
            muted: localIsConnected, // Host is muted when connected to presentation
            onVideoEnd,
            onError
        });
    }, [localIsConnected]);

    return {
        videoRef,
        play,
        pause,
        seek,
        isConnectedToPresentation: localIsConnected,
        getVideoProps
    };
};