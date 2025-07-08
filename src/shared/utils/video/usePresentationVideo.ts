// src/shared/utils/video/usePresentationVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import { HostCommand } from '@core/sync/types';

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
    const { isConnected, onCommand, onConnectionChange } = useVideoSyncManager({
        sessionId,
        role: 'presentation'
    });

    // Track connection status
    useEffect(() => {
        const unsubscribe = onConnectionChange(setLocalIsConnected);
        return unsubscribe;
    }, [onConnectionChange]);

    // TEMPORARY: Force play when video becomes ready
    useEffect(() => {
        if (!isEnabled || !sourceUrl || !videoRef.current) return;
        
        const video = videoRef.current;
        
        const forcePlay = async () => {
            console.log('[Presentation] 🚨 FORCE PLAY - Video ready, attempting to play...');
            console.log('[Presentation] 🚨 FORCE PLAY - Current state:', {
                paused: video.paused,
                readyState: video.readyState,
                muted: video.muted,
                volume: video.volume,
                currentTime: video.currentTime,
                src: video.src
            });
            
            try {
                // Force unmute and full volume
                video.muted = false;
                video.volume = 1.0;
                
                // CRITICAL: Ensure we start from the very beginning
                video.currentTime = 0;
                console.log('[Presentation] 🚨 FORCE PLAY - Reset to beginning, currentTime:', video.currentTime);
                
                // Wait for canplaythrough to ensure ALL audio is loaded
                if (video.readyState < 4) {
                    console.log('[Presentation] 🚨 FORCE PLAY - Waiting for canplaythrough...');
                    await new Promise<void>((resolve) => {
                        const handleCanPlayThrough = () => {
                            video.removeEventListener('canplaythrough', handleCanPlayThrough);
                            console.log('[Presentation] 🚨 FORCE PLAY - canplaythrough received');
                            resolve();
                        };
                        video.addEventListener('canplaythrough', handleCanPlayThrough);
                    });
                }
                
                // Double-check we're still at the beginning
                if (video.currentTime !== 0) {
                    console.log('[Presentation] 🚨 FORCE PLAY - Resetting to 0 again, was at:', video.currentTime);
                    video.currentTime = 0;
                }
                
                // Try to play
                await video.play();
                console.log('[Presentation] 🚨 FORCE PLAY - SUCCESS! Playing from:', video.currentTime);
            } catch (e) {
                console.error('[Presentation] 🚨 FORCE PLAY - FAILED:', e);
            }
        };
        
        // Always wait for canplaythrough for complete audio loading
        const handleCanPlayThrough = () => {
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            forcePlay();
        };
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        
        // If already at canplaythrough, trigger immediately
        if (video.readyState >= 4) {
            forcePlay();
        }
        
        return () => {
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
        };
    }, [isEnabled, sourceUrl]);

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
            console.log('[Presentation] 📊 Video state before command:', {
                currentTime: video.currentTime,
                paused: video.paused,
                muted: video.muted,
                volume: video.volume,
                readyState: video.readyState,
                src: video.src
            });

            try {
                // Update playback rate if provided
                if (command.data?.playbackRate && video.playbackRate !== command.data.playbackRate) {
                    console.log('[Presentation] 🎭 Changing playback rate:', video.playbackRate, '->', command.data.playbackRate);
                    video.playbackRate = command.data.playbackRate;
                }

                switch (command.action) {
                    case 'play':
                        console.log('[Presentation] 🎬 PLAY command processing...');
                        if (command.data?.time !== undefined) {
                            const timeDiff = Math.abs(video.currentTime - command.data.time);
                            console.log('[Presentation] 🕐 Time sync check:', {
                                commandTime: command.data.time,
                                currentTime: video.currentTime,
                                timeDiff,
                                willSeek: timeDiff > 0.2
                            });
                            if (timeDiff > 0.2) {
                                video.currentTime = command.data.time;
                                console.log('[Presentation] 🎯 Seeked to:', video.currentTime);
                            }
                        }
                        
                        // TEMPORARY: Always force full volume and unmuted
                        console.log('[Presentation] 🔊 TEMP: Forcing volume=1.0, muted=false');
                        video.volume = 1.0;
                        video.muted = false;
                        
                        // Wait for video to be ready before playing
                        if (video.readyState < 2) {
                            console.log('[Presentation] ⏳ Video not ready (readyState=' + video.readyState + '), waiting for canplay...');
                            await new Promise<void>((resolve) => {
                                const onCanPlay = () => {
                                    console.log('[Presentation] ✅ Video ready after wait');
                                    video.removeEventListener('canplay', onCanPlay);
                                    resolve();
                                };
                                video.addEventListener('canplay', onCanPlay);
                            });
                        } else {
                            console.log('[Presentation] ✅ Video already ready (readyState=' + video.readyState + ')');
                        }
                        
                        console.log('[Presentation] 🎵 About to call video.play()...');
                        try {
                            await video.play();
                            console.log('[Presentation] ✅ video.play() SUCCESS');
                        } catch (playError) {
                            console.error('[Presentation] 🚨 video.play() FAILED:', playError);
                            throw playError;
                        }
                        break;

                    case 'pause':
                        video.pause();
                        if (command.data?.time !== undefined) {
                            video.currentTime = command.data.time;
                        }
                        // TEMPORARY: Always force full volume and unmuted
                        video.volume = 1.0;
                        video.muted = false;
                        break;

                    case 'seek':
                        if (command.data?.time !== undefined) {
                            video.currentTime = command.data.time;
                        }
                        break;

                    case 'volume':
                        // TEMPORARY: Always force full volume and unmuted
                        video.volume = 1.0;
                        video.muted = false;
                        break;

                    case 'sync':
                        // Handle periodic sync to prevent drift
                        if (command.data?.time !== undefined && !video.paused && !isBufferingRef.current) {
                            // IMPORTANT: Don't sync during the first 3 seconds to prevent audio cutout
                            if (video.currentTime < 3.0) {
                                console.log(`[Presentation] 🎵 Ignoring sync during first 3 seconds to preserve audio (currentTime: ${video.currentTime.toFixed(2)})`);
                                break;
                            }
                            
                            const timeDiff = Math.abs(video.currentTime - command.data.time);
                            if (timeDiff > 0.2) {
                                console.log(`[Presentation] Adjusting drift: ${timeDiff.toFixed(2)}s`);
                                video.currentTime = command.data.time;
                            }
                        }
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
                console.error('[Presentation] Command execution failed:', error);
            }
        });

        return unsubscribe;
    }, [onCommand, isEnabled]);

    // Handle buffering states AND COMPREHENSIVE VIDEO LOGGING
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
                
                // TEMPORARY: Force volume settings after loading
                video.volume = 1.0;
                video.muted = false;
                console.log('[Presentation] 🔊 TEMP: Forced volume=1.0, muted=false after load');
                
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