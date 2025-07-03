// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
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

interface UseHostVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    play: (time?: number) => Promise<void>;
    pause: (time?: number) => Promise<void>;
    seek: (time: number) => Promise<void>;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    isConnectedToPresentation: boolean;
    presentationMuted: boolean;
    bufferStatus: { ready: boolean; message?: string };
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UseHostVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const useHostVideo = ({ sessionId, sourceUrl, isEnabled }: UseHostVideoProps): UseHostVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [presentationMuted, setPresentationMuted] = useState(false);
    const [localIsConnected, setLocalIsConnected] = useState(false);
    const [bufferStatus, setBufferStatus] = useState<{ ready: boolean; message?: string }>({ ready: true });
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const previousSourceUrl = useRef<string | null>(null);
    const isBufferingRef = useRef(false);
    const lastSyncTimeRef = useRef<number | null>(null);
    const bufferCoordinatorRef = useRef<BufferCoordinator | null>(null);
    const pendingPlayRef = useRef<{ time?: number; resolve: () => void; reject: (err: any) => void } | null>(null);
    const networkMonitorRef = useRef<NetworkQualityMonitor | null>(null);

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use sync manager for communication only
    const { isConnected, sendCommand, onConnectionChange } = useVideoSyncManager({
        sessionId,
        role: 'host'
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

    // Initialize buffer coordinator when connected
    useEffect(() => {
        if (isConnected && sessionId && !bufferCoordinatorRef.current) {
            // Get adaptive settings based on network quality
            const networkSettings = networkMonitorRef.current?.getRecommendedSettings() || {
                minBufferSeconds: 3,
                syncInterval: 500,
                bufferWaitTimeout: 15000
            };

            bufferCoordinatorRef.current = new BufferCoordinator(sessionId, 'host', networkSettings);

            bufferCoordinatorRef.current.onBufferReady(() => {
                setBufferStatus({ ready: true });
                // If we have a pending play command, execute it now
                if (pendingPlayRef.current) {
                    const { resolve } = pendingPlayRef.current;
                    pendingPlayRef.current = null;
                    resolve();
                }
            });

            bufferCoordinatorRef.current.onBufferWait((reason) => {
                console.log(`[useHostVideo] ${reason}`);
                setBufferStatus({ ready: false });
            });

            // Start monitoring if video exists
            const video = videoRef.current;
            if (video) {
                bufferCoordinatorRef.current.startMonitoring(video);
            }
        } else if (!isConnected && bufferCoordinatorRef.current) {
            bufferCoordinatorRef.current.destroy();
            bufferCoordinatorRef.current = null;
            setBufferStatus({ ready: true });
        }
    }, [isConnected, sessionId]);

    // Monitor network quality changes and update buffer settings
    useEffect(() => {
        if (!networkMonitorRef.current || !bufferCoordinatorRef.current) return;

        const unsubscribe = networkMonitorRef.current.onQualityChange((quality) => {
            console.log('[useHostVideo] Network quality changed:', quality);
            
            // Update buffer coordinator settings based on new network quality
            const newSettings = networkMonitorRef.current!.getRecommendedSettings();
            bufferCoordinatorRef.current?.updateConfig(newSettings);
            
            // Log poor connection warning
            if (networkMonitorRef.current!.isPoorConnection()) {
                console.warn('[useHostVideo] Poor connection detected, using conservative buffer settings');
            }
        });

        return unsubscribe;
    }, [isConnected]);

    // Sync interval management
    const startSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) return;

        syncIntervalRef.current = setInterval(() => {
            const video = videoRef.current;
            if (video && !video.paused && isConnected && !isBufferingRef.current) {
                // Only send sync if time has actually changed
                if (lastSyncTimeRef.current === null || Math.abs(video.currentTime - lastSyncTimeRef.current) > 0.1) {
                    sendCommand('sync', {
                        time: video.currentTime,
                        playbackRate: video.playbackRate,
                    });
                    lastSyncTimeRef.current = video.currentTime;
                }
            }
        }, 1000);
    }, [isConnected, sendCommand]);

    const stopSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
            lastSyncTimeRef.current = null;
        }
    }, []);

    // Handle connection changes
    useEffect(() => {
        const unsubscribe = onConnectionChange((connected) => {
            setLocalIsConnected(connected);
            const video = videoRef.current;
            if (!video) return;

            if (connected) {
                // Mute host and pause when presentation connects
                video.muted = true;
                video.pause();
                stopSyncInterval();

                // Send initial state to presentation
                sendCommand('pause', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: video.volume,
                    muted: presentationMuted,
                });
            } else {
                // Unmute host when presentation disconnects
                video.muted = false;
                stopSyncInterval();
            }
        });

        return unsubscribe;
    }, [onConnectionChange, sendCommand, presentationMuted, stopSyncInterval]);

    // Play command
    const play = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) return;

        try {
            if (time !== undefined) {
                video.currentTime = time;
            }

            // If connected and using buffer coordination, wait for buffers to be ready
            if (isConnected && bufferCoordinatorRef.current) {
                const status = bufferCoordinatorRef.current.getBufferStatus();
                if (!status.ready) {
                    console.log('[useHostVideo] Waiting for buffers to be ready...');
                    
                    // Send pause command to presentation to prepare for coordinated play
                    sendCommand('pause', {
                        time: video.currentTime,
                        waitingForBuffer: true
                    });

                    // Create a promise that resolves when buffers are ready
                    await new Promise<void>((resolve, reject) => {
                        pendingPlayRef.current = { time, resolve, reject };
                        
                        // Set a timeout in case buffer never becomes ready
                        setTimeout(() => {
                            if (pendingPlayRef.current) {
                                console.warn('[useHostVideo] Buffer wait timeout, proceeding with play');
                                pendingPlayRef.current = null;
                                resolve();
                            }
                        }, 20000); // 20 second timeout
                    });
                }
            }

            // Update local video
            await video.play();

            // Send command if connected
            if (isConnected) {
                sendCommand('play', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: video.volume,
                    muted: presentationMuted,
                });
                startSyncInterval();
            }
        } catch (error) {
            console.error('[useHostVideo] Play failed:', error);
            pendingPlayRef.current = null;
            throw error;
        }
    }, [isConnected, sendCommand, presentationMuted, startSyncInterval]);

    // Pause command
    const pause = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) return;

        // Update local video
        video.pause();
        if (time !== undefined) {
            video.currentTime = time;
        }

        // Stop syncing
        stopSyncInterval();

        // Send command if connected
        if (isConnected) {
            sendCommand('pause', {
                time: video.currentTime,
            });
        }
    }, [isConnected, sendCommand, stopSyncInterval]);

    // Seek command
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) return;

        // Update local video
        video.currentTime = time;

        // Send command if connected
        if (isConnected) {
            sendCommand('seek', { time });
        }
    }, [isConnected, sendCommand]);

    // Volume control (for presentation when connected)
    const setVolume = useCallback((volume: number) => {
        const video = videoRef.current;
        if (!video) return;

        if (isConnected) {
            // Don't change host volume, just send to presentation
            sendCommand('volume', {
                volume,
                muted: presentationMuted,
            });
        } else {
            // Change host volume when not connected
            video.volume = volume;
        }
    }, [isConnected, sendCommand, presentationMuted]);

    // Mute control (for presentation when connected)
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isConnected) {
            // Toggle presentation mute state
            const newMuted = !presentationMuted;
            setPresentationMuted(newMuted);
            sendCommand('volume', {
                volume: video.volume,
                muted: newMuted,
            });
        } else {
            // Toggle host mute when not connected
            video.muted = !video.muted;
        }
    }, [isConnected, sendCommand, presentationMuted]);

    // Keep host muted when connected
    useEffect(() => {
        if (!isConnected) return;

        const video = videoRef.current;
        if (!video) return;

        // Force initial mute
        video.muted = true;

        const interval = setInterval(() => {
            if (!video.muted) {
                console.warn('[useHostVideo] Host video was unmuted while connected, forcing mute');
                video.muted = true;
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isConnected]);

    // Handle video source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            console.log('[useHostVideo] Video ended, calling onEnded callback');
            stopSyncInterval();
            onEndedRef.current?.();
        };

        const handleError = (e: Event) => {
            console.error('[useHostVideo] Video error:', e);
            if (video.error) {
                console.error('[useHostVideo] Video error details:', video.error);
            }
            onErrorRef.current?.();
        };

        const handleWaiting = () => {
            isBufferingRef.current = true;
            console.log('[useHostVideo] Video buffering...');
        };

        const handleCanPlay = () => {
            isBufferingRef.current = false;
            console.log('[useHostVideo] Video ready to play');
        };

        const handlePlaying = () => {
            isBufferingRef.current = false;
            console.log('[useHostVideo] Video playing');
        };

        // Update buffer coordinator monitoring
        if (bufferCoordinatorRef.current && video) {
            bufferCoordinatorRef.current.startMonitoring(video);
        }

        if (isEnabled && sourceUrl) {
            // Check if this is a new video (slide change)
            const isNewVideo = video.currentSrc !== sourceUrl && previousSourceUrl.current !== sourceUrl;

            if (video.currentSrc !== sourceUrl) {
                video.src = sourceUrl;
                video.load();

                // Auto-play on slide change for new videos
                if (isNewVideo) {
                    console.log('[useHostVideo] New video detected, will autoplay after load');

                    const handleCanPlay = async () => {
                        try {
                            await play(0); // Start from beginning
                            console.log('[useHostVideo] Autoplay started successfully');

                            // Ensure presentation audio is enabled when playing new video
                            if (isConnected && presentationMuted) {
                                console.log('[useHostVideo] Unmuting presentation for new video');
                                setPresentationMuted(false);
                                sendCommand('volume', {
                                    time: Date.now(),
                                    volume: video.volume || 1, // Default to full volume if not set
                                    muted: false, // Ensure audio plays
                                });
                            }
                        } catch (error) {
                            console.error('[useHostVideo] Autoplay failed:', error);
                        }
                        video.removeEventListener('canplay', handleCanPlay);
                    };

                    video.addEventListener('canplay', handleCanPlay);
                }
            }

            // Update previous source URL
            previousSourceUrl.current = sourceUrl;
        } else {
            if (!video.paused) {
                video.pause();
                stopSyncInterval();
            }
            previousSourceUrl.current = null;
        }

        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('playing', handlePlaying);

        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('playing', handlePlaying);
        };
    }, [sourceUrl, isEnabled, stopSyncInterval, play]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSyncInterval();
            if (bufferCoordinatorRef.current) {
                bufferCoordinatorRef.current.destroy();
                bufferCoordinatorRef.current = null;
            }
        };
    }, [stopSyncInterval]);

    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        return createVideoProps({
            videoRef,
            muted: localIsConnected, // Host always muted when connected
            autoPlay: false,
            onVideoEnd,
            onError
        });
    }, [localIsConnected]);

    return {
        videoRef,
        play,
        pause,
        seek,
        setVolume,
        toggleMute,
        isConnectedToPresentation: localIsConnected,
        presentationMuted,
        bufferStatus,
        getVideoProps,
    };
};