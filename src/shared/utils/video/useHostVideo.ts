// src/shared/utils/video/useHostVideo.ts - Fixed with proper video reset on slide change
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
    onLoadedData?: () => void; // Add this for reset handling
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

/**
 * Enhanced host video control hook with proper reset on slide changes
 */
export const useHostVideo = (sessionId: string | null): UseHostVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'host') : null;
    const hasEndedRef = useRef(false);
    const currentVideoSrcRef = useRef<string | undefined>(undefined); // Track current video source

    // Connection status monitoring
    useEffect(() => {
        if (!broadcastManager) return;

        const unsubscribe = broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            const wasConnected = isConnectedToPresentation;
            const nowConnected = status === 'connected';

            setIsConnectedToPresentation(nowConnected);

            // Audio management based on connection status
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

    // Reset ended flag and handle video source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            hasEndedRef.current = false;
        };

        const handleSeeked = () => {
            // Reset ended flag if user seeks backwards from end
            if (video.currentTime < video.duration - 1) {
                hasEndedRef.current = false;
            }
        };

        const handleLoadStart = () => {
            console.log('[useHostVideo] Video load start - resetting state');
            hasEndedRef.current = false;

            // Check if this is a new video source
            const newSrc = video.src || video.currentSrc;
            if (newSrc && newSrc !== currentVideoSrcRef.current) {
                console.log('[useHostVideo] New video source detected, forcing reset');
                currentVideoSrcRef.current = newSrc;

                // Force reset the video position after a brief delay to ensure load
                setTimeout(() => {
                    if (video.currentTime !== 0) {
                        video.currentTime = 0;
                        console.log('[useHostVideo] Reset currentTime to 0 for new video');
                    }
                }, 100);
            }
        };

        const handleLoadedData = () => {
            // Ensure video starts from beginning when new data is loaded
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

        // Execute locally first for immediate feedback
        await executeLocalCommand('play', currentTime);

        // Send command to presentation if connected
        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('play', currentTime);
        }

        console.log(`[useHostVideo] Play command executed (time: ${currentTime}, synced: ${isConnectedToPresentation})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const pause = useCallback(async (time?: number): Promise<void> => {
        const currentTime = time ?? videoRef.current?.currentTime ?? 0;

        // Execute locally first for immediate feedback
        await executeLocalCommand('pause', currentTime);

        // Send command to presentation if connected
        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('pause', currentTime);
        }

        console.log(`[useHostVideo] Pause command executed (time: ${currentTime}, synced: ${isConnectedToPresentation})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const seek = useCallback(async (time: number): Promise<void> => {
        // Execute locally first for immediate feedback
        await executeLocalCommand('seek', time);

        // Send command to presentation if connected
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

            // Force pause first
            video.pause();

            // Force currentTime to 0
            video.currentTime = 0;
            hasEndedRef.current = false;

            // Force all the events that should update the UI
            video.dispatchEvent(new Event('timeupdate'));
            video.dispatchEvent(new Event('loadedmetadata')); // This should update duration
            video.dispatchEvent(new Event('loadeddata'));
            video.dispatchEvent(new Event('durationchange'));

            console.log('[useHostVideo] RESET COMPLETED - After reset:', {
                currentTime: video.currentTime,
                duration: video.duration,
                src: video.src,
                paused: video.paused
            });

            // Double-check the reset worked after a small delay
            setTimeout(() => {
                if (video.currentTime !== 0) {
                    console.warn('[useHostVideo] Reset failed, forcing again');
                    video.currentTime = 0;
                    video.dispatchEvent(new Event('timeupdate'));
                    video.dispatchEvent(new Event('loadedmetadata'));
                }

                console.log('[useHostVideo] Final check after reset:', {
                    currentTime: video.currentTime,
                    duration: video.duration
                });
            }, 100);
        }
    }, []);

    const sendReset = useCallback(() => {
        // Reset local video first
        reset();

        // Send reset command to presentation if connected
        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('reset', 0);
        }

        console.log(`[useHostVideo] Reset command sent (synced: ${isConnectedToPresentation})`);
    }, [broadcastManager, isConnectedToPresentation, reset]);

    // Enhanced getVideoProps with onLoadedData callback for proper reset
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
                // Prevent multiple triggers of the same video end
                if (!hasEndedRef.current) {
                    hasEndedRef.current = true;
                    console.log('[useHostVideo] Video ended, triggering callback');
                    onVideoEnd();
                }
            } : undefined,
            onLoadedData: () => {
                // Ensure video always starts from beginning when loaded
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
