// src/shared/utils/video/useHostVideo.ts - FINAL: Corrected state management for reliable playback
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';
import {createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';

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

export const useHostVideo = ({sessionId, sourceUrl, isEnabled}: UseHostVideoProps): UseHostVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToPresentation, setIsConnectedToPresentation] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'host') : null;

    // Store callback refs for the shared props function
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const isManuallyPaused = useRef(false);

    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    useEffect(() => {
        if (!broadcastManager) return;

        const unsubscribe = broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            setIsConnectedToPresentation(status === 'connected');

            if (status === 'connected' && videoRef.current) {
                const video = videoRef.current;

                // When presentation connects, mute host and send current state
                video.muted = true;

                // Send current video state to newly connected presentation
                setTimeout(() => {
                    const commandData = {
                        time: video.currentTime,
                        playbackRate: video.playbackRate
                    };

                    if (!video.paused) {
                        broadcastManager.sendCommand('play', commandData);
                    } else {
                        broadcastManager.sendCommand('pause', commandData);
                    }
                }, 100);

            } else if (status === 'disconnected' && videoRef.current) {
                // Unmute host when presentation disconnects
                videoRef.current.muted = false;
            }
        });

        return unsubscribe;
    }, [broadcastManager]);

    // Add periodic sync interval during playback
    useEffect(() => {
        if (!broadcastManager || !videoRef.current) return;

        let syncInterval: NodeJS.Timeout;

        const startSyncInterval = () => {
            syncInterval = setInterval(() => {
                const video = videoRef.current;
                if (video && !video.paused && isConnectedToPresentation) {
                    // Send sync command with current time and playback rate
                    broadcastManager.sendCommand('sync', {
                        time: video.currentTime,
                        playbackRate: video.playbackRate
                    });
                }
            }, 500); // Sync every 500ms
        };

        const video = videoRef.current;

        const handlePlay = () => startSyncInterval();
        const handlePause = () => clearInterval(syncInterval);
        const handleRateChange = () => {
            if (!video.paused && isConnectedToPresentation) {
                broadcastManager.sendCommand('sync', video.currentTime, {
                    playbackRate: video.playbackRate
                });
            }
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ratechange', handleRateChange);

        // Start interval if video is already playing
        if (!video.paused) {
            startSyncInterval();
        }

        return () => {
            clearInterval(syncInterval);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ratechange', handleRateChange);
        };
    }, [broadcastManager, isConnectedToPresentation]);

    const executeCommand = useCallback(async (action: 'play' | 'pause' | 'seek', time?: number) => {
        const video = videoRef.current;
        if (!video) return;

        try {
            if (action === 'play') {
                isManuallyPaused.current = false;
                if (time !== undefined) video.currentTime = time;
                await video.play();
            } else if (action === 'pause') {
                isManuallyPaused.current = true;
                video.pause();
                if (time !== undefined) video.currentTime = time;
            } else if (action === 'seek') {
                if (time !== undefined) video.currentTime = time;
            }

            if (broadcastManager?.getConnectionStatus() === 'connected') {
                // Properly structure the command data
                const commandData = {
                    time: time !== undefined ? time : video.currentTime,
                    playbackRate: video.playbackRate
                };

                broadcastManager.sendCommand(action, commandData);
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                console.warn('[useHostVideo] Autoplay was prevented by the browser. User must click play.');
                isManuallyPaused.current = true;
            } else {
                console.error(`[useHostVideo] Local ${action} failed:`, error);
                onErrorRef.current?.();
            }
        }
    }, [broadcastManager]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleCanPlay = () => {
            if (isEnabled && !isManuallyPaused.current && video.paused) {
                executeCommand('play', video.currentTime);
            }
        };
        const handleEnded = () => onEndedRef.current?.();
        const handleError = (e: Event) => {
            console.error('[useHostVideo] Video error event:', e);
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
            // Not a video slide, just ensure it's paused. Do NOT remove src.
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

    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        // Use shared props function
        return createVideoProps({
            videoRef,
            muted: isConnectedToPresentation, // Host is muted when connected to presentation
            onVideoEnd,
            onError
        });
    }, [isConnectedToPresentation]);

    return {videoRef, play, pause, seek, isConnectedToPresentation, getVideoProps};
};