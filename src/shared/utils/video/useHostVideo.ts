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
    const tabVisibilityChangeTimeRef = useRef(0);
    const EVENT_THROTTLE_MS = 1000; // Throttle events to prevent rapid-fire triggers
    const TAB_VISIBILITY_COOLDOWN_MS = 3000; // Block video resets for 3 seconds after tab changes

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

            // Record the time of visibility change
            tabVisibilityChangeTimeRef.current = Date.now();

            console.log(`[useHostVideo] Tab visibility changed: ${wasVisible} -> ${nowVisible} (cooldown activated)`);

            // When tab becomes visible, aggressively prevent autoplay
            if (!wasVisible && nowVisible) {
                const video = videoRef.current;
                if (video) {
                    console.log('[useHostVideo] Tab became visible - AGGRESSIVE autoplay prevention');

                    // Multiple layers of autoplay prevention
                    video.autoplay = false;
                    video.removeAttribute('autoplay');

                    // Force pause if playing and we didn't start it intentionally
                    if (!video.paused) {
                        console.log('[useHostVideo] FORCE PAUSING unexpected autoplay on tab visibility');
                        video.pause();
                        video.currentTime = video.currentTime; // Force time update
                    }

                    // Set up additional autoplay prevention with delays
                    const preventAutoplay = () => {
                        if (video.autoplay) {
                            video.autoplay = false;
                            video.removeAttribute('autoplay');
                        }
                    };

                    // Multiple prevention attempts
                    setTimeout(preventAutoplay, 50);
                    setTimeout(preventAutoplay, 100);
                    setTimeout(preventAutoplay, 250);
                    setTimeout(preventAutoplay, 500);
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
            // FIXED: Add throttling and complete blocking during tab visibility changes
            if (shouldThrottleEvent()) {
                console.log('[useHostVideo] Load start event throttled');
                return;
            }

            // CRITICAL FIX: Block ALL video source detection during tab visibility cooldown
            const timeSinceTabChange = Date.now() - tabVisibilityChangeTimeRef.current;
            if (timeSinceTabChange < TAB_VISIBILITY_COOLDOWN_MS) {
                console.log(`[useHostVideo] BLOCKING loadstart - tab visibility cooldown active (${timeSinceTabChange}ms ago)`);

                // Still prevent autoplay even if we're blocking the reset
                const video = videoRef.current;
                if (video) {
                    video.autoplay = false;
                    video.removeAttribute('autoplay');
                }
                return;
            }

            console.log('[useHostVideo] Video load start - checking for actual source change');

            // FIXED: More robust source comparison with additional checks
            const newSrc = video.src || video.currentSrc;
            const currentSrc = currentVideoSrcRef.current;

            // Additional checks to prevent false positives
            const isValidNewSource = newSrc &&
                newSrc !== currentSrc &&
                newSrc !== 'about:blank' &&
                newSrc !== '' &&
                !newSrc.includes('blob:') || newSrc !== currentSrc; // Handle blob URLs properly

            if (isValidNewSource) {
                console.log('[useHostVideo] Genuine new video source detected:', newSrc);
                currentVideoSrcRef.current = newSrc;
                hasEndedRef.current = false;

                // FIXED: Multiple layers of autoplay prevention
                video.autoplay = false;
                video.removeAttribute('autoplay');

                setTimeout(() => {
                    if (video.currentTime !== 0) {
                        video.currentTime = 0;
                        console.log('[useHostVideo] Reset currentTime to 0 for new video');
                    }
                    // FIXED: Aggressive autoplay prevention after reset
                    video.autoplay = false;
                    video.removeAttribute('autoplay');

                    // Additional prevention with delay
                    setTimeout(() => {
                        video.autoplay = false;
                        video.removeAttribute('autoplay');
                    }, 50);
                }, 100);
            } else {
                console.log('[useHostVideo] Same video source or invalid source, ignoring load start event');
                // Still prevent autoplay even on same source
                video.autoplay = false;
                video.removeAttribute('autoplay');
            }
        };

        const handleLoadedData = () => {
            // FIXED: Aggressive autoplay prevention on data load
            video.autoplay = false;
            video.removeAttribute('autoplay');

            if (video.currentTime !== 0) {
                console.log('[useHostVideo] Video loaded with non-zero time, resetting to 0');
                video.currentTime = 0;
            }

            // Additional autoplay prevention with delay
            setTimeout(() => {
                video.autoplay = false;
                video.removeAttribute('autoplay');
            }, 50);
        };

        // FIXED: Enhanced autoplay prevention on all video events
        const handleCanPlay = () => {
            video.autoplay = false;
            video.removeAttribute('autoplay');
        };

        const handleLoadedMetadata = () => {
            video.autoplay = false;
            video.removeAttribute('autoplay');
        };

        // NEW: Additional events that might trigger autoplay
        const handleCanPlayThrough = () => {
            video.autoplay = false;
            video.removeAttribute('autoplay');
        };

        const handleProgress = () => {
            video.autoplay = false;
            video.removeAttribute('autoplay');
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.addEventListener('progress', handleProgress);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            video.removeEventListener('progress', handleProgress);
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

            // FIXED: Aggressive autoplay prevention during reset
            video.autoplay = false;
            video.removeAttribute('autoplay');

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
                // FIXED: Aggressive autoplay prevention
                video.autoplay = false;
                video.removeAttribute('autoplay');
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
                    // FIXED: Aggressive autoplay prevention on data load
                    video.autoplay = false;
                    video.removeAttribute('autoplay');

                    if (video.currentTime !== 0) {
                        console.log('[useHostVideo] onLoadedData: Resetting video to start');
                        video.currentTime = 0;
                    }

                    // Additional prevention with delay
                    setTimeout(() => {
                        video.autoplay = false;
                        video.removeAttribute('autoplay');
                    }, 50);
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
