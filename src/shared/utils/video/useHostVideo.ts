// src/shared/utils/video/useHostVideo.ts - FINAL: Corrected state management for reliable playback
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    autoPlay: boolean;
    muted: boolean;
    preload: string;
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

    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const isManuallyPaused = useRef(false);

    useEffect(() => {
        if (!broadcastManager) return;
        const unsubscribe = broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            setIsConnectedToPresentation(status === 'connected');
            if (videoRef.current) videoRef.current.muted = status === 'connected';
        });
        return unsubscribe;
    }, [broadcastManager]);

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
                isManuallyPaused.current = true; // Seeking implies a manual pause
                video.pause();
                if (time !== undefined) video.currentTime = time;
            }
            if (broadcastManager?.getConnectionStatus() === 'connected') {
                // For seek, send a single 'pause' command with the new time. The presentation will pause and seek.
                if (action === 'seek') {
                    broadcastManager.sendCommand('pause', time);
                } else {
                    broadcastManager.sendCommand(action, video.currentTime);
                }
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                console.warn('[useHostVideo] Autoplay was prevented by the browser. User must click play.');
                isManuallyPaused.current = true; // Prevent retry loops
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

    const seek = useCallback((time: number) => executeCommand('seek', time), [executeCommand]);

    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;
        return {
            ref: videoRef,
            playsInline: true,
            controls: false,
            autoPlay: true,
            muted: isConnectedToPresentation,
            preload: 'auto',
            style: {width: '100%', height: '100%', objectFit: 'contain'}
        };
    }, [isConnectedToPresentation]);

    return {videoRef, play, pause, seek, isConnectedToPresentation, getVideoProps};
};
