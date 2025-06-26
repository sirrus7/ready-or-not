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

    // DEBUG LOGGING
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const logVideoState = () => {
            const state = {
                mode: 'HOST',
                currentTime: video.currentTime.toFixed(2),
                duration: video.duration.toFixed(2),
                paused: video.paused,
                muted: video.muted,
                volume: video.volume.toFixed(2),
                readyState: video.readyState,
                networkState: video.networkState,
                isConnected: localIsConnected,
                src: video.currentSrc ? 'loaded' : 'no-src'
            };

            console.log(
                `[HOST VIDEO] ${state.paused ? '⏸️' : '▶️'} ` +
                `Time: ${state.currentTime}/${state.duration} | ` +
                `Vol: ${state.volume} ${state.muted ? '🔇' : '🔊'} | ` +
                `Connected: ${state.isConnected ? '✅' : '❌'} | ` +
                `Ready: ${state.readyState}`,
                state
            );
        };

        // Initial log
        logVideoState();

        // Log every 200ms
        const interval = setInterval(logVideoState, 200);

        // Also log on key events
        const events = ['play', 'pause', 'volumechange', 'seeked', 'loadedmetadata'];
        events.forEach(event => {
            video.addEventListener(event, () => {
                console.log(`[HOST VIDEO] Event: ${event}`);
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

    // DEBUG - Direct video element state polling - Add after other useEffects
    useEffect(() => {
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
                `[HOST ACTUAL]`,
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
                console.log('[HOST ACTUAL] Detailed state:', actualState);
            }
        };

        // Start polling immediately
        pollVideoState();

        // Poll every 200ms
        const interval = setInterval(pollVideoState, 200);

        return () => clearInterval(interval);
    }, [localIsConnected]);

    // DEBUG - Also add a global debug helper
    useEffect(() => {
        if (typeof window !== 'undefined' && videoRef.current) {
            (window as any).debugHostVideo = () => {
                const video = videoRef.current;
                if (!video) return console.log('No host video element');

                console.log('=== HOST VIDEO ELEMENT STATE ===');
                console.log('Paused:', video.paused);
                console.log('Muted:', video.muted);
                console.log('Volume:', video.volume);
                console.log('Current Time:', video.currentTime);
                console.log('Duration:', video.duration);
                console.log('Ready State:', video.readyState);
                console.log('Src:', video.currentSrc || video.src);
                console.log('Error:', video.error);
                console.log('================================');
                return video;
            };
        }
    }, []);

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