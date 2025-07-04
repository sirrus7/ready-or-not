// src/shared/utils/video/usePresentationVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import { HostCommand } from '@core/sync/types';
import { BufferCoordinator } from '@shared/utils/video/bufferCoordinator';
import { NetworkQualityMonitor } from '@shared/utils/video/networkQuality';

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
    const bufferCoordinatorRef = useRef<BufferCoordinator | null>(null);
    const waitingForBufferRef = useRef(false);
    const networkMonitorRef = useRef<NetworkQualityMonitor | null>(null);

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use sync manager for communication only
    const { isConnected, onCommand, onConnectionChange } = useVideoSyncManager({
        sessionId,
        role: 'presentation'
    });

    // Initialize network monitor
    useEffect(() => {
        if (!networkMonitorRef.current) {
            networkMonitorRef.current = new NetworkQualityMonitor();
        }

        return () => {
            if (networkMonitorRef.current) {
                networkMonitorRef.current.destroy();
                networkMonitorRef.current = null;
            }
        };
    }, []);

    // Track connection status
    useEffect(() => {
        const unsubscribe = onConnectionChange((connected) => {
            setLocalIsConnected(connected);
            
            // Initialize/cleanup buffer coordinator
            if (connected && sessionId && !bufferCoordinatorRef.current) {
                // Get adaptive settings based on network quality
                const networkSettings = networkMonitorRef.current?.getRecommendedSettings() || {
                    minBufferSeconds: 3,
                    syncInterval: 500,
                    bufferWaitTimeout: 15000
                };

                bufferCoordinatorRef.current = new BufferCoordinator(sessionId, 'presentation', networkSettings);

                // Start monitoring if video exists
                const video = videoRef.current;
                if (video) {
                    bufferCoordinatorRef.current.startMonitoring(video);
                }
            } else if (!connected && bufferCoordinatorRef.current) {
                bufferCoordinatorRef.current.destroy();
                bufferCoordinatorRef.current = null;
            }
        });
        return unsubscribe;
    }, [onConnectionChange, sessionId]);

    // Monitor network quality changes and update buffer settings
    useEffect(() => {
        if (!networkMonitorRef.current || !bufferCoordinatorRef.current) return;

        const unsubscribe = networkMonitorRef.current.onQualityChange((quality) => {
            console.log('[usePresentationVideo] Network quality changed:', quality);
            
            // Update buffer coordinator settings based on new network quality
            const newSettings = networkMonitorRef.current!.getRecommendedSettings();
            bufferCoordinatorRef.current?.updateConfig(newSettings);
        });

        return unsubscribe;
    }, [localIsConnected]);

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
                        if (command.data?.time !== undefined) {
                            const timeDiff = Math.abs(video.currentTime - command.data.time);
                            if (timeDiff > 0.2) {
                                video.currentTime = command.data.time;
                            }
                        }
                        // Apply volume/mute from command
                        if (command.data?.volume !== undefined) {
                            video.volume = command.data.volume;
                        }
                        if (command.data?.muted !== undefined) {
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
                            video.volume = command.data.volume;
                        }
                        if (command.data?.muted !== undefined) {
                            video.muted = command.data.muted;
                        }
                        // Check if this is a buffer wait pause
                        if (command.data?.waitingForBuffer) {
                            waitingForBufferRef.current = true;
                            console.log('[Presentation] Pausing for buffer coordination');
                        }
                        break;

                    case 'seek':
                        if (command.data?.time !== undefined) {
                            video.currentTime = command.data.time;
                        }
                        break;

                    case 'volume':
                        if (command.data?.volume !== undefined) {
                            video.volume = command.data.volume;
                        }
                        if (command.data?.muted !== undefined) {
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

        // Update buffer coordinator monitoring  
        if (bufferCoordinatorRef.current && video) {
            bufferCoordinatorRef.current.startMonitoring(video);
        }

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

        if (isEnabled && sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                console.log('[Presentation] Loading new video source:', sourceUrl);
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

        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (bufferCoordinatorRef.current) {
                bufferCoordinatorRef.current.destroy();
                bufferCoordinatorRef.current = null;
            }
        };
    }, []);

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