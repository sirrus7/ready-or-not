// src/shared/utils/video/useHostVideo.ts
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    autoPlay: boolean;
    muted: boolean;
    preload: string;
    onClick?: () => void;
    className?: string;
    style: {
        maxWidth: string;
        maxHeight: string;
        objectFit: string;
    };
}

interface UseHostVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    play: (time?: number) => Promise<void>;
    pause: (time?: number) => Promise<void>;
    seek: (time: number) => Promise<void>;
    isConnectedToPresentation: boolean;
    getVideoProps: () => VideoElementProps;
}

/**
 * Host video control hook that manages local video playback and commands to presentation
 * Audio Management: muted when presentation connected, audio when alone
 */
export const useHostVideo = (sessionId: string | null): UseHostVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'host') : null;

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
                    // Presentation just connected - mute host
                    video.muted = true;
                    console.log('[useHostVideo] Presentation connected, muting host audio');
                } else if (!nowConnected && wasConnected) {
                    // Presentation disconnected - enable host audio
                    video.muted = false;
                    console.log('[useHostVideo] Presentation disconnected, enabling host audio');
                }
            }
        });

        return unsubscribe;
    }, [broadcastManager, isConnectedToPresentation]);

    // Video event handlers for local state tracking
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, []);

    const executeLocalCommand = useCallback(async (action: 'play' | 'pause' | 'seek', time?: number): Promise<void> => {
        const video = videoRef.current;
        if (!video) return;

        try {
            switch (action) {
                case 'play':
                    if (time !== undefined && Math.abs(video.currentTime - time) > 0.5) {
                        video.currentTime = time;
                    }
                    await video.play();
                    break;

                case 'pause':
                    if (time !== undefined && Math.abs(video.currentTime - time) > 0.5) {
                        video.currentTime = time;
                    }
                    video.pause();
                    break;

                case 'seek':
                    if (time !== undefined) {
                        video.currentTime = time;
                    }
                    break;
            }
        } catch (error) {
            console.error(`[useHostVideo] Local ${action} command failed:`, error);
        }
    }, []);

    const play = useCallback(async (time?: number): Promise<void> => {
        const currentTime = time ?? videoRef.current?.currentTime ?? 0;

        // Execute locally immediately for responsive UI
        await executeLocalCommand('play', currentTime);

        // Send command to presentation if connected
        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('play', currentTime);
        }

        console.log(`[useHostVideo] Play command executed (time: ${currentTime})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const pause = useCallback(async (time?: number): Promise<void> => {
        const currentTime = time ?? videoRef.current?.currentTime ?? 0;

        // Execute locally immediately for responsive UI
        await executeLocalCommand('pause', currentTime);

        // Send command to presentation if connected
        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('pause', currentTime);
        }

        console.log(`[useHostVideo] Pause command executed (time: ${currentTime})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const seek = useCallback(async (time: number): Promise<void> => {
        // Execute locally immediately for responsive UI
        await executeLocalCommand('seek', time);

        // Send command to presentation if connected
        if (broadcastManager && isConnectedToPresentation) {
            broadcastManager.sendCommand('seek', time);
        }

        console.log(`[useHostVideo] Seek command executed (time: ${time})`);
    }, [broadcastManager, isConnectedToPresentation, executeLocalCommand]);

    const handleVideoClick = useCallback(async () => {
        if (isPlaying) {
            await pause();
        } else {
            await play();
        }
    }, [isPlaying, play, pause]);

    const getVideoProps = useCallback((): VideoElementProps => {
        return {
            ref: videoRef,
            playsInline: true,
            controls: false, // Host uses custom controls
            autoPlay: false, // Manual control
            muted: isConnectedToPresentation, // Dynamic audio management
            preload: 'auto' as const,
            onClick: handleVideoClick,
            className: 'cursor-pointer',
            style: {
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
            }
        };
    }, [isConnectedToPresentation, handleVideoClick]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (broadcastManager) {
                broadcastManager.destroy();
            }
        };
    }, [broadcastManager]);

    return {
        videoRef,
        play,
        pause,
        seek,
        isConnectedToPresentation,
        getVideoProps
    };
};
