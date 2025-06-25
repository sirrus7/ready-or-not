// src/shared/utils/video/usePresentationVideo.ts - FINAL: Syncs with host commands
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';
import {HostCommand} from '@core/sync/types';
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

interface UsePresentationVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToHost: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UsePresentationVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const usePresentationVideo = ({
                                         sessionId,
                                         sourceUrl,
                                         isEnabled
                                     }: UsePresentationVideoProps): UsePresentationVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'presentation') : null;

    // Store callback refs
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();

    // Use shared Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    const executeCommand = useCallback(async (command: HostCommand): Promise<void> => {
        const video = videoRef.current;
        if (!video) return;

        setIsConnectedToHost(true);

        try {
            // Handle playback rate if provided
            if (command.data?.playbackRate && video.playbackRate !== command.data.playbackRate) {
                video.playbackRate = command.data.playbackRate;
            }

            switch (command.action) {
                case 'play':
                    // Tighter sync tolerance: 0.2 seconds instead of 1 second
                    if (command.data?.time !== undefined && Math.abs(video.currentTime - command.data.time) > 0.2) {
                        video.currentTime = command.data.time;
                    }
                    await video.play();
                    break;

                case 'pause':
                    video.pause();
                    if (command.time !== undefined) {
                        video.currentTime = command.time;
                    }
                    break;

                case 'seek':
                    if (command.time !== undefined) {
                        video.currentTime = command.time;
                    }
                    break;

                case 'sync':
                    // New sync command for periodic updates during playback
                    if (command.time !== undefined && !video.paused && !isBuffering) {
                        const timeDiff = Math.abs(video.currentTime - command.time);
                        // Only adjust if drift is more than 0.2 seconds
                        if (timeDiff > 0.2) {
                            console.log(`[usePresentationVideo] Sync adjustment: ${timeDiff.toFixed(2)}s drift detected`);
                            video.currentTime = command.time;
                        }
                    }
                    break;

                case 'reset':
                    video.pause();
                    video.currentTime = 0;
                    break;
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                console.warn('[usePresentationVideo] Play command blocked by browser. Waiting for user interaction.');
            } else {
                console.error(`[usePresentationVideo] Failed to execute ${command.action}:`, error);
                onErrorRef.current?.();
            }
        }
    }, [isBuffering]);

    // Handle buffering state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleWaiting = () => {
            setIsBuffering(true);
            console.log('[usePresentationVideo] Video buffering...');
        };

        const handleCanPlay = () => {
            setIsBuffering(false);
            console.log('[usePresentationVideo] Video ready to play');
            // Re-sync when buffering ends
            if (broadcastManager && isConnectedToHost) {
                broadcastManager.sendStatus('ready');
            }
        };

        const handleSeeking = () => {
            console.log('[usePresentationVideo] Video seeking...');
        };

        const handleSeeked = () => {
            console.log('[usePresentationVideo] Video seek completed');
        };

        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('seeking', handleSeeking);
        video.addEventListener('seeked', handleSeeked);

        return () => {
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('seeking', handleSeeking);
            video.removeEventListener('seeked', handleSeeked);
        };
    }, [broadcastManager, isConnectedToHost]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => onEndedRef.current?.();
        const handleError = (e: Event) => {
            console.error('[usePresentationVideo] Video error event:', e);
            if (video.error) {
                console.error('[usePresentationVideo] Video error details:', video.error);
            }
            onErrorRef.current?.();
        };

        if (isEnabled && sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                video.src = sourceUrl;
                video.load();
            }
        } else {
            // Not a video slide, just ensure it's paused. Do NOT remove src.
            if (!video.paused) {
                video.pause();
            }
        }

        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);
        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled]);

    useEffect(() => {
        if (!broadcastManager) return;
        const unsubscribe = broadcastManager.onHostCommand(executeCommand);
        const unsubscribeStatus = broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            setIsConnectedToHost(status === 'connected');
        });
        return () => {
            unsubscribe();
            unsubscribeStatus();
        };
    }, [broadcastManager, executeCommand]);

    // Debug logging in development
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        const video = videoRef.current;
        if (!video) return;

        const logState = () => {
            if (!video.paused) {
                console.log('[Presentation] Video state:', {
                    currentTime: video.currentTime.toFixed(2),
                    paused: video.paused,
                    buffered: video.buffered.length > 0 ?
                        `${video.buffered.start(0).toFixed(2)}-${video.buffered.end(0).toFixed(2)}` : 'none',
                    readyState: video.readyState,
                    playbackRate: video.playbackRate
                });
            }
        };

        const interval = setInterval(logState, 2000);
        return () => clearInterval(interval);
    }, []);

    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        // Use shared props function
        return createVideoProps({
            videoRef,
            muted: false, // Presentation videos should have audio
            onVideoEnd,
            onError
        });
    }, []);

    return {videoRef, isConnectedToHost, getVideoProps};
};