// src/shared/utils/video/useHostVideo.ts - Fixed to preserve onEnded callback
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

    // Reset ended flag and handle video source changes - BUT preserve onEnded callback
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            hasEndedRef.current = false;
        };

        const handleSeeked = () => {
            if (video.currentTime < video.duration - 1) {
                hasEndedRef.current = false;
            }
        };

        const handleLoadStart = () => {
            console.log('[useHostVideo] Video load start - resetting state');
            // DON'T reset hasEndedRef here - let it be managed by the onEnded callback

            const newSrc = video.src || video.currentSrc;
            if (newSrc && newSrc !== currentVideoSrcRef.current) {
                console.log('[useHostVideo] New video source detected, forcing reset');
                currentVideoSrcRef.current = newSrc;
                // Only reset hasEndedRef for truly new videos
                hasEndedRef.current = false;

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

        video.addEventListener('play', handlePlay);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadeddata', handleLoadedData);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadeddata', handleLoadedData);
        };
    }, []);

    // Add this useEffect temporarily for debugging
    useEffect(() => {
        const handleVisibilityChange = () => {
            // 🔴 BREAKPOINT HERE
            console.log('[DEBUG] Visibility change:', {
                visibilityState: document.visibilityState,
                hidden: document.hidden,
                focused: document.hasFocus(),
                videoState: videoRef.current ? {
                    paused: videoRef.current.paused,
                    currentTime: videoRef.current.currentTime,
                    muted: videoRef.current.muted
                } : null
            });
        };

        const handleFocus = () => {
            // 🔴 BREAKPOINT HERE
            console.log('[DEBUG] Window focus event');
        };

        const handleBlur = () => {
            // 🔴 BREAKPOINT HERE
            console.log('[DEBUG] Window blur event');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
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
            hasEndedRef.current = false; // Reset ended flag on manual reset

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
                console.log('[useHostVideo] Video ended event fired, hasEnded:', hasEndedRef.current);
                // Always call the callback - let the caller decide what to do
                console.log('[useHostVideo] Video ended, triggering callback');
                onVideoEnd();
                // Set the flag AFTER calling the callback
                hasEndedRef.current = true;
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
