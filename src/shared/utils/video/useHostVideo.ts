// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import {
    createSyncInterval,
    isVideoReady,
    isNewVideoSource,
    handleHostConnection,
    HOST_MUTE_CHECK_INTERVAL
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
    const [presentationVideoReady, setPresentationVideoReady] = useState(false);
    const [hostVideoReady, setHostVideoReady] = useState(false);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const previousSourceUrl = useRef<string | null>(null);
    const pendingAutoplayRef = useRef<boolean>(false);

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use sync manager for communication only
    const { isConnected, sendCommand, onConnectionChange, onVideoReady } = useVideoSyncManager({
        sessionId,
        role: 'host'
    });


    // Sync interval management
    const startSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) return;
        syncIntervalRef.current = createSyncInterval(videoRef, isConnected, sendCommand);
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
                console.log('[useHostVideo] 📡 Presentation connected, sending current state');
                const cleanup = handleHostConnection(
                    video,
                    connected,
                    presentationVolume,
                    presentationMuted,
                    sendCommand
                );
                
                // Always send volume state when presentation connects
                sendCommand('volume', {
                    volume: presentationVolume,
                    muted: presentationMuted,
                });
                
                if (!video.paused) {
                    startSyncInterval();
                }
            } else {
                // Unmute host when presentation disconnects
                video.muted = false;
                stopSyncInterval();
                // Reset presentation video ready state
                setPresentationVideoReady(false);
            }
        });

        return unsubscribe;
    }, [onConnectionChange, sendCommand, presentationMuted, presentationVolume, startSyncInterval, stopSyncInterval]);

    // Listen for presentation video ready status
    useEffect(() => {
        const unsubscribe = onVideoReady((ready) => {
            console.log('[useHostVideo] Presentation video ready status:', ready);
            sendCommand('volume', {
                volume: presentationVolume,
                muted: presentationMuted,
                time: Date.now(),
            });
            setPresentationVideoReady(ready);
        });
        return unsubscribe;
    }, [onVideoReady]);

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
                });
                startSyncInterval();
            }
        } catch (error) {
            console.error('[useHostVideo] Play failed:', error);
            throw error;
        }
    }, [isConnected, sendCommand, startSyncInterval]);

    // Check if both videos are ready and play if pending
    useEffect(() => {
        if (pendingAutoplayRef.current && hostVideoReady && (!localIsConnected || presentationVideoReady)) {
            console.log('[useHostVideo] Both videos ready, executing pending autoplay');
            pendingAutoplayRef.current = false;
            
            // Execute autoplay directly instead of using the play callback
            const video = videoRef.current;
            if (video) {
                video.currentTime = 0;
                video.play().then(() => {
                    if (localIsConnected) {
                        sendCommand('play', {
                            time: 0,
                            playbackRate: video.playbackRate,
                        });
                        startSyncInterval();
                    }
                }).catch(error => {
                    console.error('[useHostVideo] Autoplay failed:', error);
                });
            }
        }
    }, [hostVideoReady, presentationVideoReady, localIsConnected, sendCommand, startSyncInterval]);

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
        console.log('[useHostVideo] - sending volume command')
        if (isConnected) {
            // Don't change host volume, just send to presentation
            console.log('[useHostVideo] Sending volume command:', { volume });
            sendCommand('volume', {
                volume,
                muted: presentationMuted,
            });
        } else {
            // Change host volume when not connected
            console.log('[useHostVideo] Setting its own volume command:', { volume });
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
        }, HOST_MUTE_CHECK_INTERVAL);

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
            const isNewVideo = isNewVideoSource(video.currentSrc, sourceUrl, previousSourceUrl.current);

            if (video.currentSrc !== sourceUrl) {
                // Use persistent volume state for new video
                if (isNewVideo) {
                    console.log('[useHostVideo] New video detected, keeping volume state:', {
                        volume: presentationVolume,
                        muted: presentationMuted
                    });
                }

                // Setup video for autoplay
                console.log('[useHostVideo] Video source changed, preparing for autoplay');
                video.src = sourceUrl;
                video.load();
                
                // Reset ready states
                setHostVideoReady(false);
                setPresentationVideoReady(false);
                pendingAutoplayRef.current = true;
                
                // Wait for host video to be ready
                const handleCanPlay = () => {
                    video.removeEventListener('canplay', handleCanPlay);
                    console.log('[useHostVideo] Host video ready');
                    setHostVideoReady(true);
                };
                video.addEventListener('canplay', handleCanPlay);
                
                // If already ready, trigger immediately
                if (isVideoReady(video)) {
                    console.log('[useHostVideo] Host video already ready');
                    setHostVideoReady(true);
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
            // Reset states when video is disabled
            setHostVideoReady(false);
            setPresentationVideoReady(false);
            pendingAutoplayRef.current = false;
        }

        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled, stopSyncInterval, play, isConnected, presentationVolume, presentationMuted, sendCommand, localIsConnected]);

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