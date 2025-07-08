// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';

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
    presentationVolume: number;
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
    const [presentationVolume, setPresentationVolume] = useState(1);
    const [localIsConnected, setLocalIsConnected] = useState(false);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const previousSourceUrl = useRef<string | null>(null);

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use sync manager for communication only
    const { isConnected, sendCommand, onConnectionChange } = useVideoSyncManager({
        sessionId,
        role: 'host'
    });


    // Sync interval management
    const startSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) return;

        syncIntervalRef.current = setInterval(() => {
            const video = videoRef.current;
            if (video && !video.paused && isConnected) {
                sendCommand('sync', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                });
            }
        }, 1000);
    }, [isConnected, sendCommand]);

    const stopSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // Handle connection changes
    useEffect(() => {
        const unsubscribe = onConnectionChange((connected) => {
            setLocalIsConnected(connected);
            const video = videoRef.current;
            if (!video) return;

            if (connected) {
                // Mute host when presentation connects
                video.muted = true;
                
                console.log('[useHostVideo] 📡 Presentation connected, sending current state');
                
                // Send current state to presentation (but don't pause the host video)
                const wasPlaying = !video.paused;
                if (wasPlaying && video.readyState >= 3) {
                    console.log('[useHostVideo] 🎬 Sending play command to presentation');
                    sendCommand('play', {
                        time: video.currentTime,
                        playbackRate: video.playbackRate,
                        volume: presentationVolume,
                        muted: presentationMuted,
                    });
                    startSyncInterval();
                } else {
                    console.log('[useHostVideo] ⏸️ Sending pause command to presentation');
                    sendCommand('pause', {
                        time: video.currentTime,
                        playbackRate: video.playbackRate,
                    });
                }
                
                // Always send volume state when connecting
                console.log('[useHostVideo] 🔊 Sending volume state to presentation:', {
                    volume: presentationVolume,
                    muted: presentationMuted
                });
                sendCommand('volume', {
                    volume: presentationVolume,
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

            // Update local video
            await video.play();

            // Send command if connected
            if (isConnected) {
                sendCommand('play', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: persistentVolumeRef.current,
                    muted: persistentMutedRef.current,
                });
                startSyncInterval();
            }
        } catch (error) {
            console.error('[useHostVideo] Play failed:', error);
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

        // Update presentation volume state
        setPresentationVolume(volume);

        if (isConnected) {
            // Don't change host volume, just send to presentation
            console.log('[useHostVideo] Sending volume command:', { volume });
            sendCommand('volume', {
                volume,
                muted: presentationMuted,
            });
        } else {
            // Change host volume when not connected
            video.volume = volume;
        }
    }, [isConnected, sendCommand]);

    // Mute control (for presentation when connected)
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isConnected) {
            // Toggle presentation mute state
            const newMuted = !presentationMuted;
            setPresentationMuted(newMuted);
            sendCommand('volume', {
                volume: presentationVolume,
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

        if (isEnabled && sourceUrl) {
            // Check if this is a new video (slide change)
            const isNewVideo = video.currentSrc !== sourceUrl && previousSourceUrl.current !== sourceUrl;

            if (video.currentSrc !== sourceUrl) {
                // Use persistent volume state for new video
                if (isNewVideo) {
                    console.log('[useHostVideo] New video detected, keeping volume state:', {
                        volume: presentationVolume,
                        muted: presentationMuted
                    });
                }
                
                video.src = sourceUrl;
                video.load();

                // Auto-play on slide change
                console.log('[useHostVideo] Video source changed, will autoplay after load');

                const handleCanPlay = async () => {
                    try {
                        await play(0); // Start from beginning
                        console.log('[useHostVideo] Autoplay started successfully');

                        // Always send persistent volume settings when video loads
                        if (isConnected) {
                            console.log('[useHostVideo] Applying volume settings:', {
                                volume: presentationVolume,
                                muted: presentationMuted,
                                isNewVideo
                            });
                            sendCommand('volume', {
                                volume: presentationVolume,
                                muted: presentationMuted,
                            });
                        }
                    } catch (error) {
                        console.error('[useHostVideo] Autoplay failed:', error);
                    }
                    video.removeEventListener('canplay', handleCanPlay);
                };

                video.addEventListener('canplay', handleCanPlay);
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

        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled, stopSyncInterval, play]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSyncInterval();
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
        presentationVolume,
        getVideoProps,
    };
};