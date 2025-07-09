// src/shared/utils/video/usePresentationVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import { HostCommand } from '@core/sync/types';
import {
    applyVideoCommand,
    isVideoFullyLoaded,
    createVideoEventLogger
} from '@shared/utils/video/videoSyncUtils';

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
    const [localIsConnected, setLocalIsConnected] = useState(false);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const isBufferingRef = useRef(false);
    const previousSourceUrl = useRef<string | null>(null);

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use sync manager for communication only
    const { onCommand, onConnectionChange, sendVideoReady } = useVideoSyncManager({
        sessionId,
        role: 'presentation'
    });

    // Track connection status
    useEffect(() => {
        const unsubscribe = onConnectionChange(setLocalIsConnected);
        return unsubscribe;
    }, [onConnectionChange]);

    // Send video ready status when video is loaded
    useEffect(() => {
        if (!isEnabled || !sourceUrl || !videoRef.current) return;
        
        const video = videoRef.current;
        
        // Always wait for canplaythrough for complete audio loading
        const handleCanPlayThrough = () => {
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            console.log('[Presentation] Video is ready, sending ready status');
            sendVideoReady(true);
        };
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        
        // If already at canplaythrough, trigger immediately
        if (isVideoFullyLoaded(video)) {
            console.log('[Presentation] Video already ready, sending ready status');
            sendVideoReady(true);
        }
        
        return () => {
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            // Send not ready when unmounting or source changes
            sendVideoReady(false);
        };
    }, [isEnabled, sourceUrl, sendVideoReady]);

    // Listen for commands from host
    useEffect(() => {
        const unsubscribe = onCommand(async (command: HostCommand) => {
            const video = videoRef.current;
            if (!video || !isEnabled) {
                console.log('[Presentation] 🚫 Command ignored - video not available or not enabled:', {
                    hasVideo: !!video,
                    isEnabled,
                    command: command.action
                });
                return;
            }

            console.log('[Presentation] 📨 Received command:', command.action, command.data);
            const logVideoState = createVideoEventLogger('Presentation');
            logVideoState('Before command', video);

            try {
                await applyVideoCommand(video, command, isBufferingRef.current);
            } catch (error) {
                console.error('[Presentation] Command execution failed:', error);
            }
        });

        return unsubscribe;
    }, [onCommand, isEnabled]);

    // Handle buffering states AND COMPREHENSIVE VIDEO LOGGING
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const logVideoState = createVideoEventLogger('Presentation');

        const handleWaiting = () => {
            isBufferingRef.current = true;
            logVideoState('WAITING (buffering)', video);
        };

        const handleCanPlay = () => {
            isBufferingRef.current = false;
            logVideoState('CANPLAY (ready to play)', video);
        };

        // ALL VIDEO EVENTS
        // YEA this is kind of insane but desperate times
        const handleLoadStart = () => logVideoState('LOADSTART', video);
        const handleLoadedMetadata = () => logVideoState('LOADEDMETADATA', video);
        const handleLoadedData = () => logVideoState('LOADEDDATA', video);
        const handleCanPlayThrough = () => logVideoState('CANPLAYTHROUGH', video);
        const handlePlay = () => logVideoState('PLAY', video);
        const handlePlaying = () => logVideoState('PLAYING', video);
        const handlePause = () => logVideoState('PAUSE', video);
        const handleSeeked = () => logVideoState('SEEKED', video);
        const handleSeeking = () => logVideoState('SEEKING', video);
        const handleTimeUpdate = () => logVideoState('TIMEUPDATE', video);
        const handleEnded = () => logVideoState('ENDED', video);
        const handleError = (e: Event) => {
            logVideoState('ERROR', video);
            console.error('[Presentation] 🚨 VIDEO ERROR EVENT:', e);
        };
        const handleAbort = () => logVideoState('ABORT', video);
        const handleEmptied = () => logVideoState('EMPTIED', video);
        const handleStalled = () => logVideoState('STALLED', video);
        const handleSuspend = () => logVideoState('SUSPEND', video);
        const handleVolumeChange = () => logVideoState('VOLUMECHANGE', video);
        const handleRateChange = () => logVideoState('RATECHANGE', video);
        const handleProgress = () => logVideoState('PROGRESS', video);

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
        logVideoState('INITIAL_STATE', video);

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
    }, []);

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

        if (isEnabled && sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                console.log('[Presentation] 📼 Loading new video source:', {
                    newUrl: sourceUrl,
                    oldUrl: video.currentSrc,
                    previousSourceUrl: previousSourceUrl.current
                });
                
                console.log('[Presentation] 📊 Video state before loading:', {
                    currentTime: video.currentTime,
                    paused: video.paused,
                    muted: video.muted,
                    volume: video.volume,
                    readyState: video.readyState,
                    networkState: video.networkState
                });
                
                video.src = sourceUrl;
                console.log('[Presentation] 📥 Set video.src, about to call video.load()...');
                video.load();
                console.log('[Presentation] 🔄 video.load() called');
                
                // Don't set default volume - let the host control it
                console.log('[Presentation] 🔊 Waiting for volume settings from host');
                
                // Don't pause here - let the host control playback
                // The host will send a play command when the slide changes
            } else {
                console.log('[Presentation] 🔄 Video source unchanged, skipping load');
            }
            previousSourceUrl.current = sourceUrl;
        } else {
            console.log('[Presentation] 🚫 Video disabled or no source URL:', {
                isEnabled,
                sourceUrl
            });
            previousSourceUrl.current = null;
            // Not a video slide, ensure it's paused
            if (!video.paused) {
                console.log('[Presentation] ⏸️ Pausing video for non-video slide');
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

    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        return createVideoProps({
            videoRef,
            muted: false, // Presentation handles audio
            autoPlay: false, // Never autoplay - wait for commands
            onVideoEnd,
            onError
        });
    }, []);

    return {
        videoRef,
        isConnectedToHost: localIsConnected,
        getVideoProps,
    };
};