// src/shared/utils/video/useHostVideo.ts - Fixed tab-switching autoplay issue
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    autoPlay: boolean;
    muted: boolean;
    preload: string;
    className?: string;
    style: {
        maxWidth: string;
        maxHeight: string;
        objectFit: string;
    };
    onEnded?: () => void;
    onLoadedData?: () => void;
}

interface UseHostVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    play: (time?: number) => Promise<void>;
    pause: (time?: number) => Promise<void>;
    seek: (time: number) => Promise<void>;
    reset: () => void;
    sendReset: () => void;
    isConnectedToPresentation: boolean;
    getVideoProps: (onVideoEnd?: () => void) => VideoElementProps;
}

export const useHostVideo = (sessionId: string | null): UseHostVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'host') : null;
    const hasEndedRef = useRef(false);
    const currentVideoSrcRef = useRef<string | undefined>(undefined);

    // NEW: Add tracking for tab visibility and event throttling
    const isTabVisibleRef = useRef(true);
    const lastEventTimeRef = useRef(0);
    const EVENT_THROTTLE_MS = 1000; // Throttle events to prevent rapid-fire triggers

    // Connection status monitoring
    useEffect(() => {
        if (!broadcastManager) return;

        const unsubscribe = broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            const wasConnected = isConnectedToPresentation;
            const nowConnected = status === 'connected';

            setIsConnectedToPresentation(nowConnected);

            const video = videoRef.current;
            if (video) {
                if (nowConnected && !wasConnected) {
                    video.muted = true;
                    console.log('[useHostVideo] Presentation connected, muting host audio');
                } else if (!nowConnected && wasConnected) {
                    video.muted = false;
                    console.log('[useHostVideo] Presentation disconnected, enabling host audio');
                }
            }
        });

        return unsubscribe;
    }, [broadcastManager, isConnectedToPresentation]);

    // NEW: Track tab visibility to prevent autoplay on tab switches
    useEffect(() => {
        const handleVisibilityChange = () => {
            const wasVisible = isTabVisibleRef.current;
            const nowVisible = !document.hidden;
            isTabVisibleRef.current = nowVisible;

            console.log(`[useHostVideo] Tab visibility changed: ${wasVisible} -> ${nowVisible}`);

            // When tab becomes visible, explicitly prevent autoplay
            if (!wasVisible && nowVisible) {
                const video = videoRef.current;
                if (video) {
                    console.log('[useHostVideo] Tab became visible - enforcing autoplay prevention');
                    video.autoplay = false;

                    // If video is somehow playing, pause it (unless we explicitly started it)
                    if (!video.paused && hasEndedRef.current === false) {
                        console.log('[useHostVideo] Pausing unexpected autoplay on tab visibility');
                        video.pause();
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Enhanced video event handling with autoplay prevention
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Helper function to check if we should throttle events
        const shouldThrottleEvent = (): boolean => {
            const now = Date.now();
            if (now - lastEventTimeRef.current < EVENT_THROTTLE_MS) {
                return true;
            }
            lastEventTimeRef.current = now;
            return false;
        };

        const handlePlay = () => {
            hasEndedRef.current = false;
        };

        const handleSeeked = () => {
            if (video.currentTime < video.duration - 1) {
                hasEndedRef.current = false;
            }
        };

        const handleLoadStart = () => {
            // FIXED: Add throttling and better source detection
            if (shouldThrottleEvent()) {
                console.log('[useHostVideo] Load start event throttled');
                return;
            }

            console.log('[useHostVideo] Video load start - checking for actual source change');

            // FIXED: More robust source comparison
            const newSrc = video.src || video.currentSrc;
            const currentSrc = currentVideoSrcRef.current;

            // Only proceed if we have a meaningful source change
            if (newSrc && newSrc !== currentSrc && newSrc !== 'about:blank' && newSrc !== '') {
                console.log('[useHostVideo] Genuine new video source detected:', newSrc);
                currentVideoSrcRef.current = newSrc;
                hasEndedRef.current = false;

                // FIXED: Explicit autoplay prevention during source changes
                video.autoplay = false;

                setTimeout(() => {
                    if (video.currentTime !== 0) {
                        video.currentTime = 0;
                        console.log('[useHostVideo] Reset currentTime to 0 for new video');
                    }
                    // FIXED: Double-check autoplay prevention after reset
                    video.autoplay = false;
                }, 100);
            } else {
                console.log('[useHostVideo] Same video source, ignoring load start event');
            }
        };

        const handleLoadedData = () => {
            // FIXED: Add autoplay prevention on data load
            video.autoplay = false;

            if (video.currentTime !== 0) {
                console.log('[useHostVideo] Video loaded with non-zero time, resetting to 0');
                video.currentTime = 0;
            }
        };

        // FIXED: Add explicit autoplay prevention on any video events
        const handleCanPlay = () => {
            video.autoplay = false;
        };

        const handleLoadedMetadata = () => {
            video.autoplay = false;
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    const executeLocalCommand = useCallback(async (action: 'play' | 'pause' | 'seek', time?: number): Promise<void> => {
        const video = videoRef.current;
        if (!video) {
            console.warn('[useHostVideo] No video element for command:', action);
            return;
        }

        try {
            switch (action) {
                case 'play':
                    if (time !== undefined && Math.abs(video.currentTime - time) > 0.5) {
                        video.currentTime = time;
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    await video.play();
                    console.log(`[useHostVideo] Local play executed at time: ${time || video.currentTime}`);
                    break;

                case 'pause':
                    if (time !== undefined && Math.abs(video.currentTime - time) > 0.5) {
                        video.currentTime = time;
                    }
                    video.pause();
                    console.log(`[useHostVideo] Local pause executed at time: ${time || video.currentTime}`);
                    break;

                case 'seek':
                    if (time !== undefined) {
                        video.currentTime = time;
                        console.log(`[useHostVideo] Local seek executed to time: ${time}`);
                    }
                    break;
            }
        } catch (error) {
            console.error(`[useHostVideo] Local ${action} command failed:`, error);
        }
    }, []);

    const play = useCallback(async (time?: number): Promise<void> => {
        const currentTime = time ?? videoRef.current?.currentTime ?? 0;

        await executeLocalCommand('play', currentTime);

        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('play', currentTime);
        }

        console.log(`[useHostVideo] Play command executed (time: ${currentTime}, synced: ${isConnectedToPresentation})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const pause = useCallback(async (time?: number): Promise<void> => {
        const currentTime = time ?? videoRef.current?.currentTime ?? 0;

        await executeLocalCommand('pause', currentTime);

        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('pause', currentTime);
        }

        console.log(`[useHostVideo] Pause command executed (time: ${currentTime}, synced: ${isConnectedToPresentation})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const seek = useCallback(async (time: number): Promise<void> => {
        await executeLocalCommand('seek', time);

        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('seek', time);
        }

        console.log(`[useHostVideo] Seek command executed (time: ${time}, synced: ${isConnectedToPresentation})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const reset = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            console.log('[useHostVideo] RESET CALLED - Before reset:', {
                currentTime: video.currentTime,
                duration: video.duration,
                src: video.src,
                paused: video.paused
            });

            video.pause();
            video.currentTime = 0;
            hasEndedRef.current = false;

            // FIXED: Explicit autoplay prevention during reset
            video.autoplay = false;

            video.dispatchEvent(new Event('timeupdate'));
            video.dispatchEvent(new Event('loadedmetadata'));
            video.dispatchEvent(new Event('loadeddata'));
            video.dispatchEvent(new Event('durationchange'));

            console.log('[useHostVideo] RESET COMPLETED');

            setTimeout(() => {
                if (video.currentTime !== 0) {
                    console.warn('[useHostVideo] Reset failed, forcing again');
                    video.currentTime = 0;
                    video.dispatchEvent(new Event('timeupdate'));
                    video.dispatchEvent(new Event('loadedmetadata'));
                }
                // FIXED: Ensure autoplay stays disabled
                video.autoplay = false;
            }, 100);
        }
    }, []);

    const sendReset = useCallback(() => {
        reset();

        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('reset', 0);
        }

        console.log(`[useHostVideo] Reset command sent (synced: ${isConnectedToPresentation})`);
    }, [broadcastManager, isConnectedToPresentation, reset]);

    const getVideoProps = useCallback((onVideoEnd?: () => void): VideoElementProps => {
        return {
            ref: videoRef,
            playsInline: true,
            controls: false,
            autoPlay: false, // FIXED: Ensure this is always false
            muted: isConnectedToPresentation,
            preload: 'auto' as const,
            className: 'pointer-events-none',
            style: {
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
            },
            onEnded: onVideoEnd ? () => {
                console.log('[useHostVideo] Video ended event fired, hasEnded:', hasEndedRef.current);
                console.log('[useHostVideo] Video ended, triggering callback');
                onVideoEnd();
                hasEndedRef.current = true;
            } : undefined,
            onLoadedData: () => {
                const video = videoRef.current;
                if (video) {
                    // FIXED: Prevent autoplay on data load
                    video.autoplay = false;

                    if (video.currentTime !== 0) {
                        console.log('[useHostVideo] onLoadedData: Resetting video to start');
                        video.currentTime = 0;
                    }
                }
            }
        };
    }, [isConnectedToPresentation]);

    return {
        videoRef,
        play,
        pause,
        seek,
        reset,
        sendReset,
        isConnectedToPresentation,
        getVideoProps
    };
};
