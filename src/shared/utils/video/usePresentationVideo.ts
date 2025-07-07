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

    // Listen for commands from host
    useEffect(() => {
        const unsubscribe = onCommand(async (command: HostCommand) => {
            const video = videoRef.current;
            if (!video || !isEnabled) return;

            console.log('[Presentation] Received command:', command.action, command.data);

            try {
                // Update playback rate if provided
                if (command.data?.playbackRate && video.playbackRate !== command.data.playbackRate) {
                    video.playbackRate = command.data.playbackRate;
                }

                switch (command.action) {
                    case 'play':
                        // Wait for video to be ready before playing
                        if (video.readyState < 2) {
                            console.log('[Presentation] Video not ready, waiting for canplay...');
                            const waitForReady = () => {
                                return new Promise<void>((resolve) => {
                                    if (video.readyState >= 2) {
                                        resolve();
                                        return;
                                    }
                                    const handleCanPlay = () => {
                                        video.removeEventListener('canplay', handleCanPlay);
                                        resolve();
                                    };
                                    video.addEventListener('canplay', handleCanPlay);
                                });
                            };
                            await waitForReady();
                        }
                        
                        if (command.data?.time !== undefined) {
                            const timeDiff = Math.abs(video.currentTime - command.data.time);
                            if (timeDiff > 0.2) {
                                video.currentTime = command.data.time;
                            }
                        }
                        // Apply volume/mute from command
                        if (command.data?.volume !== undefined) {
                            console.log('[PRESENTATION] Setting volume from play command:', command.data.volume);
                            video.volume = command.data.volume;
                        }
                        if (command.data?.muted !== undefined) {
                            console.log('[PRESENTATION] Setting muted from play command:', command.data.muted);
                            video.muted = command.data.muted;
                        }
                        await video.play();
                        break;

                    case 'pause':
                        video.pause();
                        if (command.data?.time !== undefined) {
                            video.currentTime = command.data.time;
                        }
                        // Apply volume/mute from command
                        if (command.data?.volume !== undefined) {
                            console.log('[PRESENTATION] Setting volume from play command:', command.data.volume);
                            video.volume = command.data.volume;
                        }
                        if (command.data?.muted !== undefined) {
                            console.log('[PRESENTATION] Setting muted from play command:', command.data.muted);
                            video.muted = command.data.muted;
                        }
                        break;

                    case 'seek':
                        if (command.data?.time !== undefined) {
                            video.currentTime = command.data.time;
                        }
                        break;

                    case 'volume':
                        if (command.data?.volume !== undefined) {
                            console.log('[PRESENTATION] Setting volume from volume command:', command.data.volume);
                            video.volume = command.data.volume;
                        }
                        if (command.data?.muted !== undefined) {
                            console.log('[PRESENTATION] Setting muted from volume command:', command.data.muted);
                            video.muted = command.data.muted;
                        }
                        break;

                    case 'sync':
                        // Handle periodic sync to prevent drift
                        if (command.data?.time !== undefined && !video.paused && !isBufferingRef.current) {
                            const timeDiff = Math.abs(video.currentTime - command.data.time);
                            if (timeDiff > 0.2) {
                                console.log(`[Presentation] Adjusting drift: ${timeDiff.toFixed(2)}s`);
                                video.currentTime = command.data.time;
                            }
                        }
                        if (command.data?.volume !== undefined) {
                            console.log('[PRESENTATION] Setting volume from sync command:', command.data.volume);
                            video.volume = command.data.volume;
                        }
                        // Don't apply mute state from sync commands - only from explicit volume commands
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

    // Handle buffering states
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleWaiting = () => {
            isBufferingRef.current = true;
            console.log('[Presentation] Video buffering...');
        };

        const handleCanPlay = () => {
            isBufferingRef.current = false;
            console.log('[Presentation] Video ready to play');
        };

        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('canplay', handleCanPlay);
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

        const handleCanPlayThrough = () => {
            console.log('[Presentation] Video can play through - ready for commands');
            isBufferingRef.current = false;
        };

        if (isEnabled && sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                console.log('[Presentation] Loading new video source:', sourceUrl);
                isBufferingRef.current = true; // Mark as buffering while loading
                video.src = sourceUrl;
                video.load();
                // Don't pause here - let the host control playback
                // The host will send a play command when the slide changes
            }
            previousSourceUrl.current = sourceUrl;
        } else {
            previousSourceUrl.current = null;
            // Not a video slide, ensure it's paused
            if (!video.paused) {
                video.pause();
            }
        }

        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);
        video.addEventListener('canplaythrough', handleCanPlayThrough);

        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
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