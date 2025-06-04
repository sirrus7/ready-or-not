// src/shared/utils/video/useHostVideo.ts - Firefox tab-switching autoplay fix
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

    // Firefox-specific tab switching fix
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const userInitiatedPlayRef = useRef(false);
    const tabBecameVisibleAtRef = useRef(0);
    const preventAutoplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPageLoadingRef = useRef(true);

    // Track legitimate play intentions
    const legitPlayAttemptRef = useRef(false);

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

    // Firefox tab visibility handling
    useEffect(() => {
        if (!isFirefox) return;

        const handleVisibilityChange = () => {
            const isNowVisible = !document.hidden;

            if (isNowVisible) {
                // Tab became visible - this is when Firefox might autoplay
                tabBecameVisibleAtRef.current = Date.now();
                console.log('[useHostVideo] Firefox tab became visible - setting up autoplay prevention');

                const video = videoRef.current;
                if (video) {
                    // Immediately pause if playing and not user-initiated
                    if (!video.paused && !userInitiatedPlayRef.current) {
                        console.log('[useHostVideo] Firefox autoplay detected on tab switch - forcing pause');
                        video.pause();
                        video.currentTime = video.currentTime; // Force time update
                    }

                    // Set up monitoring for the next few seconds
                    if (preventAutoplayTimeoutRef.current) {
                        clearTimeout(preventAutoplayTimeoutRef.current);
                    }

                    preventAutoplayTimeoutRef.current = setTimeout(() => {
                        userInitiatedPlayRef.current = false;
                        console.log('[useHostVideo] Firefox autoplay prevention period ended');
                    }, 3000);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (preventAutoplayTimeoutRef.current) {
                clearTimeout(preventAutoplayTimeoutRef.current);
            }
        };
    }, [isFirefox]);

    // Enhanced video event handling with Firefox-specific fixes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = (event: Event) => {
            console.log('[useHostVideo] Play event fired', {
                userInitiated: userInitiatedPlayRef.current,
                legitPlay: legitPlayAttemptRef.current,
                timeSinceTabVisible: Date.now() - tabBecameVisibleAtRef.current,
                isFirefox
            });

            // Firefox-specific autoplay detection
            if (isFirefox) {
                const timeSinceTabVisible = Date.now() - tabBecameVisibleAtRef.current;
                const isLikelyAutoplay = timeSinceTabVisible < 2000 &&
                    !userInitiatedPlayRef.current &&
                    !legitPlayAttemptRef.current;

                if (isLikelyAutoplay) {
                    console.log('[useHostVideo] Firefox autoplay detected - preventing');
                    event.preventDefault();
                    video.pause();
                    return;
                }
            }

            hasEndedRef.current = false;
            legitPlayAttemptRef.current = false; // Reset after successful play
        };

        const handlePause = () => {
            // Reset user-initiated flag when video pauses
            userInitiatedPlayRef.current = false;
            legitPlayAttemptRef.current = false;
        };

        const handleSeeked = () => {
            if (video.currentTime < video.duration - 1) {
                hasEndedRef.current = false;
            }
        };

        const handleLoadStart = () => {
            console.log('[useHostVideo] Video load start');
            hasEndedRef.current = false;

            // Track source changes more reliably
            const newSrc = video.src || video.currentSrc;
            if (newSrc && newSrc !== currentVideoSrcRef.current &&
                newSrc !== 'about:blank' && newSrc !== '') {

                console.log('[useHostVideo] New video source detected:', newSrc);
                currentVideoSrcRef.current = newSrc;

                // Reset positioning after load
                setTimeout(() => {
                    if (video.currentTime !== 0) {
                        video.currentTime = 0;
                        console.log('[useHostVideo] Reset currentTime to 0 for new video');
                    }
                }, 100);
            }
        };

        const handleLoadedData = () => {
            if (video.currentTime !== 0) {
                console.log('[useHostVideo] Video loaded with non-zero time, resetting to 0');
                video.currentTime = 0;
            }
        };

        // Firefox-specific: Monitor for unexpected play attempts
        const handleCanPlay = () => {
            if (isFirefox && !userInitiatedPlayRef.current && !legitPlayAttemptRef.current) {
                const timeSinceTabVisible = Date.now() - tabBecameVisibleAtRef.current;
                if (timeSinceTabVisible < 2000) {
                    console.log('[useHostVideo] Firefox canplay during vulnerable period - preventing autoplay');
                    // Don't call play() - this might be triggered by tab switch
                }
            }
        };

        video.addEventListener('play', handlePlay, true); // Use capture phase
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('play', handlePlay, true);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [isFirefox]);

    // Page load completion tracking
    useEffect(() => {
        const handleLoad = () => {
            isPageLoadingRef.current = false;
            console.log('[useHostVideo] Page load completed');
        };

        if (document.readyState === 'complete') {
            isPageLoadingRef.current = false;
        } else {
            window.addEventListener('load', handleLoad);
            return () => window.removeEventListener('load', handleLoad);
        }
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
                    // Mark as legitimate user-initiated play
                    userInitiatedPlayRef.current = true;
                    legitPlayAttemptRef.current = true;

                    if (time !== undefined && Math.abs(video.currentTime - time) > 0.5) {
                        video.currentTime = time;
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    await video.play();
                    console.log(`[useHostVideo] Local play executed at time: ${time || video.currentTime}`);
                    break;

                case 'pause':
                    userInitiatedPlayRef.current = false;
                    legitPlayAttemptRef.current = false;

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
            console.log('[useHostVideo] Reset called');

            // Clear user-initiated flags
            userInitiatedPlayRef.current = false;
            legitPlayAttemptRef.current = false;

            video.pause();
            video.currentTime = 0;
            hasEndedRef.current = false;

            // Force UI updates
            video.dispatchEvent(new Event('timeupdate'));
            video.dispatchEvent(new Event('loadedmetadata'));

            console.log('[useHostVideo] Reset completed');

            // Verification with delay
            setTimeout(() => {
                if (video.currentTime !== 0) {
                    console.warn('[useHostVideo] Reset verification failed, forcing again');
                    video.currentTime = 0;
                    video.dispatchEvent(new Event('timeupdate'));
                }
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
            autoPlay: false, // Always false
            muted: isConnectedToPresentation,
            preload: 'auto' as const,
            className: 'pointer-events-none',
            style: {
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
            },
            onEnded: onVideoEnd ? () => {
                if (!hasEndedRef.current) {
                    console.log('[useHostVideo] Video ended, triggering callback');
                    onVideoEnd();
                    hasEndedRef.current = true;
                }
            } : undefined,
            onLoadedData: () => {
                const video = videoRef.current;
                if (video && video.currentTime !== 0) {
                    console.log('[useHostVideo] onLoadedData: Resetting video to start');
                    video.currentTime = 0;
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
