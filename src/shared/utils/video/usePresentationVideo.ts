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

    // DEBUG LOGGING
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const logVideoState = () => {
            const state = {
                mode: 'PRESENTATION',
                currentTime: video.currentTime.toFixed(2),
                duration: video.duration.toFixed(2),
                paused: video.paused,
                muted: video.muted,
                volume: video.volume.toFixed(2),
                readyState: video.readyState,
                networkState: video.networkState,
                isConnected: localIsConnected,
                buffered: video.buffered.length > 0
                    ? `${video.buffered.start(0).toFixed(2)}-${video.buffered.end(0).toFixed(2)}`
                    : 'none',
                src: video.currentSrc ? 'loaded' : 'no-src'
            };

            console.log(
                `[PRESENTATION VIDEO] ${state.paused ? '⏸️' : '▶️'} ` +
                `Time: ${state.currentTime}/${state.duration} | ` +
                `Vol: ${state.volume} ${state.muted ? '🔇' : '🔊'} | ` +
                `Connected: ${state.isConnected ? '✅' : '❌'} | ` +
                `Buffered: ${state.buffered}`,
                state
            );
        };

        // Initial log
        logVideoState();

        // Log every 200ms
        const interval = setInterval(logVideoState, 200);

        // Also log on key events
        const events = ['play', 'pause', 'volumechange', 'seeked', 'loadedmetadata', 'waiting', 'canplay'];
        events.forEach(event => {
            video.addEventListener(event, () => {
                console.log(`[PRESENTATION VIDEO] Event: ${event}`);
                logVideoState();
            });
        });

        return () => {
            clearInterval(interval);
            events.forEach(event => {
                video.removeEventListener(event, logVideoState);
            });
        };
    }, [localIsConnected]);

    // DEBUG - Direct video element state polling
    useEffect(() => {
        console.log("videoRef!!!!!", videoRef);
        if (!videoRef.current) return;

        const pollVideoState = () => {
            const video = videoRef.current;
            if (!video) return;

            // Get the ACTUAL state from the video element
            const actualState = {
                // Basic state
                paused: video.paused,
                muted: video.muted,
                volume: video.volume,
                currentTime: video.currentTime,
                duration: video.duration || 0,

                // Ready states
                readyState: video.readyState,
                networkState: video.networkState,

                // Source info
                currentSrc: video.currentSrc,
                src: video.src,

                // Error state
                error: video.error,

                // Playback info
                playbackRate: video.playbackRate,
                ended: video.ended,
                seeking: video.seeking,

                // Buffer info
                bufferedRanges: [],

                // Audio/Video tracks
                audioTracks: video.audioTracks?.length || 'N/A',
                videoTracks: video.videoTracks?.length || 'N/A',
            };

            // Get buffered ranges
            for (let i = 0; i < video.buffered.length; i++) {
                actualState.bufferedRanges.push({
                    start: video.buffered.start(i),
                    end: video.buffered.end(i)
                });
            }

            // Create a visual status line
            const statusLine = [
                `[PRESENTATION ACTUAL]`,
                actualState.paused ? '⏸️ PAUSED' : '▶️ PLAYING',
                `Time: ${actualState.currentTime.toFixed(1)}/${actualState.duration.toFixed(1)}`,
                `Vol: ${actualState.volume.toFixed(2)}`,
                actualState.muted ? '🔇 MUTED' : '🔊 UNMUTED',
                `Ready: ${actualState.readyState}`,
                localIsConnected ? '📡 CONNECTED' : '📵 DISCONNECTED'
            ].join(' | ');

            console.log(statusLine);

            // Log detailed state every second (less noisy)
            if (Date.now() % 1000 < 200) {
                console.log('[PRESENTATION ACTUAL] Detailed state:', actualState);
            }
        };

        // Start polling immediately
        pollVideoState();

        // Poll every 200ms
        const interval = setInterval(pollVideoState, 200);

        return () => clearInterval(interval);
    }, [localIsConnected]);

    // DEBUG Also add a global debug helper
    useEffect(() => {
        if (typeof window !== 'undefined' && videoRef.current) {
            (window as any).debugPresentationVideo = () => {
                const video = videoRef.current;
                if (!video) return console.log('No presentation video element');

                console.log('=== PRESENTATION VIDEO ELEMENT STATE ===');
                console.log('Paused:', video.paused);
                console.log('Muted:', video.muted);
                console.log('Volume:', video.volume);
                console.log('Current Time:', video.currentTime);
                console.log('Duration:', video.duration);
                console.log('Ready State:', video.readyState);
                console.log('Src:', video.currentSrc || video.src);
                console.log('Error:', video.error);
                console.log('========================================');
                return video;
            };
        }
    }, []);

    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        return createVideoProps({
            videoRef,
            muted: false, // Always unmuted for presentation
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