// src/shared/utils/video/usePresentationVideo.ts
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

interface UsePresentationVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToHost: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UsePresentationVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const usePresentationVideo = ({
                                         sessionId,
                                         sourceUrl,
                                         isEnabled
                                     }: UsePresentationVideoProps): UsePresentationVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const [localIsConnected, setLocalIsConnected] = useState(false);

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use the video sync manager
    const { isConnected, setupVideoSync, broadcastManager } = useVideoSyncManager({
        sessionId,
        role: 'presentation',
        videoRef,
        onConnectionChange: setLocalIsConnected,
    });

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

        const handleEnded = () => {
            onEndedRef.current?.();
        };

        const handleError = (e: Event) => {
            console.error('[usePresentationVideo] Video error event:', e);
            if (video.error) {
                console.error('[usePresentationVideo] Video error details:', video.error);
            }
            onErrorRef.current?.();
        };

        if (isEnabled && sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                video.src = sourceUrl;
                video.load();
            }
        } else {
            // Not a video slide, just ensure it's paused
            if (!video.paused) {
                video.pause();
            }
        }

        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled]);

    // Debug logging in development
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        const video = videoRef.current;
        if (!video) return;

        const logState = () => {
            if (!video.paused) {
                console.log('[Presentation] Video state:', {
                    currentTime: video.currentTime.toFixed(2),
                    paused: video.paused,
                    buffered: video.buffered.length > 0 ?
                        `${video.buffered.start(0).toFixed(2)}-${video.buffered.end(0).toFixed(2)}` : 'none',
                    readyState: video.readyState,
                    playbackRate: video.playbackRate
                });
            }
        };

        const interval = setInterval(logState, 2000);
        return () => clearInterval(interval);
    }, []);

    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        return createVideoProps({
            videoRef,
            muted: false, // IMPORTANT: Presentation videos should have audio
            onVideoEnd,
            onError
        });
    }, []);

    return {
        videoRef,
        isConnectedToHost: localIsConnected,
        getVideoProps
    };
};