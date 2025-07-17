// src/shared/utils/video/usePresentationVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { PresentationBroadcastManager } from '@core/sync/PresentationBroadcastManager';
import { HostCommand } from '@core/sync/types';
import { PresentationSyncManager } from '@core/sync/PresentationSyncManager';

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

type UsePresentationVideoReturn ={
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToHost: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
    sendCommand: (action: string, data?: any) => Promise<void>;
}

interface UsePresentationVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const usePresentationVideo = ({ sessionId, sourceUrl, isEnabled }: UsePresentationVideoProps): UsePresentationVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [localIsConnected, setLocalIsConnected] = useState(false);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const isBufferingRef = useRef(false);
    const previousSourceUrl = useRef<string | null>(null);

    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    const broadcastManager = sessionId && isEnabled ? PresentationBroadcastManager.getInstance(sessionId) : null;
    const syncManager = sessionId && isEnabled ? PresentationSyncManager.getInstance(sessionId) : null;

    // Listen for commands from host
    const onCommand = useCallback((callback: (command: HostCommand) => void) => {
        if (!broadcastManager) return () => {};
        return broadcastManager.onHostCommand(callback);
    }, [broadcastManager]);

    // Track connection status (based on receiving commands)
    useEffect(() => {
        if (!broadcastManager) return;
        let timeout: NodeJS.Timeout | null = null;
        const resetTimeout = () => {
            if (timeout) clearTimeout(timeout);
            setLocalIsConnected(true);
            timeout = setTimeout(() => setLocalIsConnected(false), 10000);
        };
        const unsubscribe = broadcastManager.onHostCommand(() => {
            resetTimeout();
        });
        resetTimeout();
        return () => {
            if (timeout) clearTimeout(timeout);
            unsubscribe();
        };
    }, [broadcastManager]);

    // Send ready status and periodic pongs
    useEffect(() => {
        if (!broadcastManager) return;
        broadcastManager.sendStatus('ready');
        const interval = setInterval(() => {
            broadcastManager.sendStatus('pong');
        }, 3000);
        return () => clearInterval(interval);
    }, [broadcastManager]);

    // Imperative video control API for parent components (used by SlideRenderer)
    const sendCommand = useCallback(async (action: string, data?: any) => {
        const video = videoRef.current;
        console.log('[usePresentationVideo] sendCommand called:', { 
            action, 
            data, 
            hasVideo: !!video, 
            isEnabled, 
            videoRef: videoRef.current,
            videoReadyState: video?.readyState,
            videoSrc: video?.src,
            videoCurrentSrc: video?.currentSrc
        });
        
        if (!video || !isEnabled) {
            console.log('[usePresentationVideo] sendCommand failed - no video or not enabled:', { 
                hasVideo: !!video, 
                isEnabled,
                videoRef: videoRef.current,
                videoReadyState: video?.readyState,
                videoSrc: video?.src,
                videoCurrentSrc: video?.currentSrc
            });
            return;
        }

        console.log('[usePresentationVideo] sendCommand', action, data, {
            videoReadyState: video.readyState,
            videoPaused: video.paused,
            videoCurrentTime: video.currentTime,
            videoDuration: video.duration,
            videoSrc: video.src,
            videoCurrentSrc: video.currentSrc
        });
        
        try {
            switch (action) {
                case 'play':
                    if (data?.time !== undefined) {
                        const timeDiff = Math.abs(video.currentTime - data.time);
                        if (timeDiff > 0.2) {
                            video.currentTime = data.time;
                        }
                    }
                    if (data?.volume !== undefined) video.volume = data.volume;
                    if (data?.muted !== undefined) video.muted = data.muted;
                    if (video.readyState < 2) {
                        console.log('[usePresentationVideo] Video not ready, waiting for canplay...');
                        await new Promise<void>((resolve) => {
                            const onCanPlay = () => {
                                video.removeEventListener('canplay', onCanPlay);
                                console.log('[usePresentationVideo] Video ready, proceeding with play');
                                resolve();
                            };
                            video.addEventListener('canplay', onCanPlay);
                        });
                    }
                    console.log('[usePresentationVideo] Attempting to play video');
                    await video.play();
                    console.log('[usePresentationVideo] Play command completed');
                    break;
                case 'pause':
                    video.pause();
                    if (data?.time !== undefined) video.currentTime = data.time;
                    break;
                case 'seek':
                    if (data?.time !== undefined) video.currentTime = data.time;
                    break;
                case 'volume':
                    if (data?.volume !== undefined) video.volume = data.volume;
                    if (data?.muted !== undefined) video.muted = data.muted;
                    break;
                case 'reset':
                    video.pause();
                    video.currentTime = 0;
                    break;
                case 'close_presentation':
                    window.close();
                    break;
            }
        } catch (error) {
            console.error('[usePresentationVideo] sendCommand failed:', error);
        }
    }, [isEnabled, videoRef]);

    // Video event listeners and props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;
        return createVideoProps({
            videoRef,
            muted: false,
            autoPlay: false,
            onVideoEnd,
            onError
        });
    }, []);

    // Handle video source changes, buffering, and logging (optional, can be added as needed)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const logVideoState = (eventType: string) => {
            console.log(`[Presentation] 🎥 VIDEO EVENT: ${eventType}`, {
                currentTime: video.currentTime,
                duration: video.duration,
                paused: video.paused,
                ended: video.ended,
                muted: video.muted,
                volume: video.volume,
                readyState: video.readyState,
                networkState: video.networkState,
                buffered: video.buffered.length > 0 ? `${video.buffered.start(0)}-${video.buffered.end(0)}` : 'none',
                src: video.src,
                currentSrc: video.currentSrc,
                error: video.error ? `${video.error.code}: ${video.error.message}` : null
            });
        };

        const handleWaiting = () => {
            isBufferingRef.current = true;
            logVideoState('WAITING (buffering)');
        };

        const handleCanPlay = () => {
            console.log('[usePresentationVideo] handleCanPlay');
            isBufferingRef.current = false;
            logVideoState('CANPLAY (ready to play)');
        };

        // ALL VIDEO EVENTS
        const handleLoadStart = () => logVideoState('LOADSTART');
        const handleLoadedMetadata = () => logVideoState('LOADEDMETADATA');
        const handleLoadedData = () => logVideoState('LOADEDDATA');
        const handleCanPlayThrough = () => logVideoState('CANPLAYTHROUGH');
        const handlePlay = () => logVideoState('PLAY');
        const handlePlaying = () => logVideoState('PLAYING');
        const handlePause = () => logVideoState('PAUSE');
        const handleSeeked = () => logVideoState('SEEKED');
        const handleSeeking = () => logVideoState('SEEKING');
        const handleTimeUpdate = () => logVideoState('TIMEUPDATE');
        const handleEnded = () => logVideoState('ENDED');
        const handleError = (e: Event) => {
            logVideoState('ERROR');
            console.error('[Presentation] 🚨 VIDEO ERROR EVENT:', e);
        };
        const handleAbort = () => logVideoState('ABORT');
        const handleEmptied = () => logVideoState('EMPTIED');
        const handleStalled = () => logVideoState('STALLED');
        const handleSuspend = () => logVideoState('SUSPEND');
        const handleVolumeChange = () => logVideoState('VOLUMECHANGE');
        const handleRateChange = () => logVideoState('RATECHANGE');
        const handleProgress = () => logVideoState('PROGRESS');

        // Add all event listeners
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.addEventListener('play', handlePlay);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('seeking', handleSeeking);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);
        video.addEventListener('abort', handleAbort);
        video.addEventListener('emptied', handleEmptied);
        video.addEventListener('stalled', handleStalled);
        video.addEventListener('suspend', handleSuspend);
        video.addEventListener('volumechange', handleVolumeChange);
        video.addEventListener('ratechange', handleRateChange);
        video.addEventListener('progress', handleProgress);
        video.addEventListener('waiting', handleWaiting);

        // Log initial state
        logVideoState('INITIAL_STATE');

        return () => {
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('seeking', handleSeeking);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
            video.removeEventListener('abort', handleAbort);
            video.removeEventListener('emptied', handleEmptied);
            video.removeEventListener('stalled', handleStalled);
            video.removeEventListener('suspend', handleSuspend);
            video.removeEventListener('volumechange', handleVolumeChange);
            video.removeEventListener('ratechange', handleRateChange);
            video.removeEventListener('progress', handleProgress);
            video.removeEventListener('waiting', handleWaiting);
        };
    }, [videoRef]);

    // Load video source
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            onEndedRef.current?.();
        };

        const handleError = (e: Event) => {
            console.error('[Presentation] Video error event:', e);
            if (video.error) {
                console.error('[Presentation] Video error details:', video.error);
            }
            onErrorRef.current?.();
        };

        if (sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                video.src = sourceUrl;
                video.load();
                
                // Listen for canplay event to notify host that video is ready
                const handleCanPlay = () => {
                    if (syncManager) {
                        syncManager.sendPresentationVideoReady();
                    }
                    video.removeEventListener('canplay', handleCanPlay);
                };
                video.addEventListener('canplay', handleCanPlay);
                
                // Don't pause here - let the host control playback
                // The host will send a play command when the slide changes
            }
            previousSourceUrl.current = sourceUrl;
        } else {
            previousSourceUrl.current = null;
            // Not a video slide or URL is loading, ensure it's paused
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
    }, [sourceUrl, syncManager]);

    return {
        videoRef,
        isConnectedToHost: localIsConnected,
        getVideoProps,
        sendCommand,
    };
};