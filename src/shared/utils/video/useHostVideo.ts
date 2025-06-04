// src/shared/utils/video/useHostVideo.ts - Enhanced Firefox tab-switching autoplay fix
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

    // Firefox-specific autoplay prevention
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const intentionalPlayRef = useRef(false);
    const tabSwitchTimeRef = useRef(0);
    const autoplayBlockerRef = useRef<NodeJS.Timeout | null>(null);
    const playBlockingActiveRef = useRef(false);

    console.log('[useHostVideo] Browser detection:', {isFirefox, userAgent: navigator.userAgent});

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

    // Enhanced tab visibility handling for Firefox
    useEffect(() => {
        const handleVisibilityChange = () => {
            const wasVisible = !document.hidden;

            if (wasVisible) {
                // Tab became visible
                tabSwitchTimeRef.current = Date.now();
                console.log('[useHostVideo] Tab became visible - activating Firefox autoplay prevention');

                if (isFirefox) {
                    // Activate aggressive autoplay blocking for Firefox
                    playBlockingActiveRef.current = true;

                    // Clear any existing timeout
                    if (autoplayBlockerRef.current) {
                        clearTimeout(autoplayBlockerRef.current);
                    }

                    // Block autoplay for 3 seconds after tab becomes visible
                    autoplayBlockerRef.current = setTimeout(() => {
                        playBlockingActiveRef.current = false;
                        console.log('[useHostVideo] Firefox autoplay blocking period ended');
                    }, 3000);

                    // Immediate video check and pause if needed
                    const video = videoRef.current;
                    if (video && !video.paused && !intentionalPlayRef.current) {
                        console.log('[useHostVideo] Firefox: Pausing video on tab switch');
                        video.pause();
                        // Force time update to ensure UI reflects pause state
                        video.dispatchEvent(new Event('timeupdate'));
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Also listen for focus events as additional protection
        const handleWindowFocus = () => {
            if (isFirefox) {
                tabSwitchTimeRef.current = Date.now();
                playBlockingActiveRef.current = true;

                const video = videoRef.current;
                if (video && !video.paused && !intentionalPlayRef.current) {
                    console.log('[useHostVideo] Firefox: Pausing video on window focus');
                    video.pause();
                }

                setTimeout(() => {
                    playBlockingActiveRef.current = false;
                }, 2000);
            }
        };

        window.addEventListener('focus', handleWindowFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleWindowFocus);
            if (autoplayBlockerRef.current) {
                clearTimeout(autoplayBlockerRef.current);
            }
        };
    }, [isFirefox]);

    // Comprehensive video event handling
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Override the play method directly for Firefox
        if (isFirefox && video.play) {
            const originalPlay = video.play.bind(video);

            video.play = function () {
                const timeSinceTabSwitch = Date.now() - tabSwitchTimeRef.current;

                console.log('[useHostVideo] Firefox play() called', {
                    intentional: intentionalPlayRef.current,
                    blockingActive: playBlockingActiveRef.current,
                    timeSinceTabSwitch
                });

                // Block play if it's within the vulnerable window and not intentional
                if (playBlockingActiveRef.current && !intentionalPlayRef.current && timeSinceTabSwitch < 3000) {
                    console.log('[useHostVideo] Firefox: Blocking unauthorized play() call');
                    return Promise.reject(new DOMException('Play blocked by autoplay prevention', 'NotAllowedError'));
                }

                return originalPlay();
            };
        }

        const handlePlay = (event: Event) => {
            console.log('[useHostVideo] Play event fired', {
                intentional: intentionalPlayRef.current,
                blockingActive: playBlockingActiveRef.current,
                isFirefox,
                timeSinceTabSwitch: Date.now() - tabSwitchTimeRef.current
            });

            // Firefox-specific autoplay prevention
            if (isFirefox && playBlockingActiveRef.current && !intentionalPlayRef.current) {
                console.log('[useHostVideo] Firefox: Preventing autoplay event');
                event.preventDefault();
                event.stopImmediatePropagation();

                // Force pause
                setTimeout(() => {
                    if (video && !video.paused) {
                        video.pause();
                        console.log('[useHostVideo] Firefox: Force-paused after event prevention');
                    }
                }, 0);

                return false;
            }

            hasEndedRef.current = false;
            // Reset intentional flag after successful play
            setTimeout(() => {
                intentionalPlayRef.current = false;
            }, 100);
        };

        const handlePause = () => {
            intentionalPlayRef.current = false;
        };

        const handleSeeked = () => {
            if (video.currentTime < video.duration - 1) {
                hasEndedRef.current = false;
            }
        };

        const handleLoadStart = () => {
            console.log('[useHostVideo] Video load start');
            hasEndedRef.current = false;

            const newSrc = video.src || video.currentSrc;
            if (newSrc && newSrc !== currentVideoSrcRef.current &&
                newSrc !== 'about:blank' && newSrc !== '') {

                console.log('[useHostVideo] New video source detected:', newSrc);
                currentVideoSrcRef.current = newSrc;

                // Reset video position after load
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

        // Use capture phase for play events to intercept early
        video.addEventListener('play', handlePlay, {capture: true, passive: false});
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadeddata', handleLoadedData);

        // Additional Firefox-specific event monitoring
        if (isFirefox) {
            const handleCanPlay = () => {
                if (playBlockingActiveRef.current && !intentionalPlayRef.current) {
                    console.log('[useHostVideo] Firefox: canplay event during blocking period');
                }
            };

            const handlePlaying = (event: Event) => {
                if (playBlockingActiveRef.current && !intentionalPlayRef.current) {
                    console.log('[useHostVideo] Firefox: Stopping unauthorized playing event');
                    event.preventDefault();
                    video.pause();
                }
            };

            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('playing', handlePlaying, {capture: true, passive: false});

            return () => {
                video.removeEventListener('play', handlePlay, {capture: true});
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('seeked', handleSeeked);
                video.removeEventListener('loadstart', handleLoadStart);
                video.removeEventListener('loadeddata', handleLoadedData);
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('playing', handlePlaying, {capture: true});
            };
        }

        return () => {
            video.removeEventListener('play', handlePlay, {capture: true});
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadeddata', handleLoadedData);
        };
    }, [isFirefox]);

    const executeLocalCommand = useCallback(async (action: 'play' | 'pause' | 'seek', time?: number): Promise<void> => {
        const video = videoRef.current;
        if (!video) {
            console.warn('[useHostVideo] No video element for command:', action);
            return;
        }

        try {
            switch (action) {
                case 'play':
                    // Mark as intentional play BEFORE calling play()
                    intentionalPlayRef.current = true;
                    console.log('[useHostVideo] Executing intentional play command');

                    if (time !== undefined && Math.abs(video.currentTime - time) > 0.5) {
                        video.currentTime = time;
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }

                    await video.play();
                    console.log(`[useHostVideo] Local play executed at time: ${time || video.currentTime}`);
                    break;

                case 'pause':
                    intentionalPlayRef.current = false;

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
            if (action === 'play') {
                intentionalPlayRef.current = false; // Reset on failure
            }
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

            // Clear intentional play flag
            intentionalPlayRef.current = false;

            video.pause();
            video.currentTime = 0;
            hasEndedRef.current = false;

            // Force UI updates
            video.dispatchEvent(new Event('timeupdate'));
            video.dispatchEvent(new Event('loadedmetadata'));

            console.log('[useHostVideo] Reset completed');

            // Verification
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
            autoPlay: false,
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
