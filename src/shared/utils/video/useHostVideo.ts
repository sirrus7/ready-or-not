// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import { isVideoReady } from '@shared/utils/video/commonVideoUtils';
import {
    createSyncInterval,
    isNewVideoSource,
    handleHostConnection,
    logHostVideoState,
    executePlay,
    executePause,
    executeSeek,
    executeVolumeChange,
    executeMuteToggle,
    HOST_MUTE_CHECK_INTERVAL
} from '@shared/utils/video/hostVideoUtils';

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

    console.log('[Host] 🚀 useHostVideo initialized:', {
        sessionId,
        sourceUrl: sourceUrl?.substring(sourceUrl.lastIndexOf('/') + 1) || 'none',
        isEnabled
    });

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Use sync manager for communication only
    const { isConnected, sendCommand, onConnectionChange, onVideoReady } = useVideoSyncManager({
        sessionId,
        role: 'host'
    });


    // Sync interval management
    const startSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            console.log('[Host] ⚠️ Sync interval already exists, skipping');
            return;
        }
        console.log('[Host] 🔄 Starting sync interval');
        syncIntervalRef.current = createSyncInterval(videoRef, isConnected, sendCommand);
    }, [isConnected, sendCommand]);

    const stopSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            console.log('[Host] 🛑 Stopping sync interval');
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // Handle connection changes
    useEffect(() => {
        const unsubscribe = onConnectionChange((connected) => {
            console.log('[Host] 🔌 Connection status changed:', { connected });
            setLocalIsConnected(connected);
            const video = videoRef.current;
            if (!video) {
                console.log('[Host] ⚠️ No video element during connection change');
                return;
            }

            logHostVideoState('Connection change', video, { connected });

            if (connected) {
                console.log('[Host] 📡 Presentation connected, handling connection...');
                const cleanup = handleHostConnection(
                    video,
                    connected,
                    presentationVolume,
                    presentationMuted,
                    sendCommand
                );
                
                // Always send volume state when presentation connects
                console.log('[Host] 🔊 Sending additional volume state on connection');
                sendCommand('volume', {
                    volume: presentationVolume,
                    muted: presentationMuted,
                });
                
                if (!video.paused) {
                    console.log('[Host] ▶️ Video is playing, starting sync interval');
                    startSyncInterval();
                }
            } else {
                console.log('[Host] 📴 Presentation disconnected');
                // Unmute host when presentation disconnects
                video.muted = false;
                stopSyncInterval();
                // Reset presentation video ready state
                setPresentationVideoReady(false);
                logHostVideoState('After disconnection', video);
            }
        });

        return unsubscribe;
    }, [onConnectionChange, sendCommand, presentationMuted, presentationVolume, startSyncInterval, stopSyncInterval]);

    // Listen for presentation video ready status
    useEffect(() => {
        const unsubscribe = onVideoReady((ready) => {
            console.log('[Host] 🎬 Presentation video ready status:', ready);
            const volumeData = {
                volume: presentationVolume,
                muted: presentationMuted,
                timestamp: Date.now(),
            };
            console.log('[Host] 🔊 Sending volume on presentation ready:', volumeData);
            sendCommand('volume', volumeData);
            setPresentationVideoReady(ready);
        });
        return unsubscribe;
    }, [onVideoReady, sendCommand, presentationVolume, presentationMuted]);

    // Play command
    const play = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ Play called but no video element');
            return;
        }

        try {
            await executePlay(video, time, isConnected, sendCommand);
            if (isConnected) {
                startSyncInterval();
            }
        } catch (error) {
            console.error('[Host] ❌ Play command failed:', error);
            throw error;
        }
    }, [isConnected, sendCommand, startSyncInterval]);

    // Check if both videos are ready and play if pending
    useEffect(() => {
        if (pendingAutoplayRef.current && hostVideoReady && (!localIsConnected || presentationVideoReady)) {
            console.log('[Host] 🎯 Autoplay conditions met:', {
                pendingAutoplay: pendingAutoplayRef.current,
                hostVideoReady,
                presentationVideoReady,
                localIsConnected
            });
            pendingAutoplayRef.current = false;
            
            // Execute autoplay directly instead of using the play callback
            const video = videoRef.current;
            if (video) {
                logHostVideoState('Before autoplay', video);
                video.currentTime = 0;
                video.play().then(() => {
                    console.log('[Host] ✅ Autoplay successful');
                    logHostVideoState('After autoplay', video);
                    if (localIsConnected) {
                        const playData = {
                            time: 0,
                            playbackRate: video.playbackRate,
                        };
                        console.log('[Host] 📤 Sending autoplay command to presentation:', playData);
                        sendCommand('play', playData);
                        startSyncInterval();
                    }
                }).catch(error => {
                    console.error('[Host] ❌ Autoplay failed:', error);
                    logHostVideoState('After autoplay error', video);
                });
            }
        }
    }, [hostVideoReady, presentationVideoReady, localIsConnected, sendCommand, startSyncInterval]);

    // Pause command
    const pause = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ Pause called but no video element');
            return;
        }

        executePause(video, time, isConnected, sendCommand);
        stopSyncInterval();
    }, [isConnected, sendCommand, stopSyncInterval]);

    // Seek command
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ Seek called but no video element');
            return;
        }

        executeSeek(video, time, isConnected, sendCommand);
    }, [isConnected, sendCommand]);

    // Volume control (for presentation when connected)
    const setVolume = useCallback((volume: number) => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ setVolume called but no video element');
            return;
        }

        console.log('[Host] 🔊 Volume change requested:', { 
            newVolume: volume,
            currentPresentationVolume: presentationVolume 
        });
        
        // Update presentation volume state
        setPresentationVolume(volume);
        executeVolumeChange(video, volume, presentationMuted, isConnected, sendCommand);
    }, [isConnected, sendCommand, presentationMuted]);

    // Mute control (for presentation when connected)
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) {
            console.error('[Host] ❌ toggleMute called but no video element');
            return;
        }

        console.log('[Host] 🔇 Mute toggle requested:', { 
            currentPresentationMuted: presentationMuted,
            isConnected 
        });

        const newMuted = executeMuteToggle(
            video, 
            presentationMuted, 
            presentationVolume, 
            isConnected, 
            sendCommand
        );
        
        if (isConnected) {
            setPresentationMuted(newMuted);
        }
    }, [isConnected, sendCommand, presentationMuted, presentationVolume]);

    // Keep host muted when connected
    useEffect(() => {
        if (!isConnected) {
            console.log('[Host] 🔊 Not connected, host can unmute');
            return;
        }

        const video = videoRef.current;
        if (!video) {
            console.log('[Host] ⚠️ No video element for mute enforcement');
            return;
        }

        // Force initial mute
        console.log('[Host] 🔇 Enforcing host mute while connected');
        video.muted = true;
        logHostVideoState('Mute enforcement started', video);

        let muteViolations = 0;
        const interval = setInterval(() => {
            if (!video.muted) {
                muteViolations++;
                console.warn(`[Host] ⚠️ Mute violation #${muteViolations} - Host unmuted while connected!`);
                video.muted = true;
            }
        }, HOST_MUTE_CHECK_INTERVAL);

        return () => {
            console.log('[Host] 🔊 Stopping mute enforcement, violations:', muteViolations);
            clearInterval(interval);
        };
    }, [isConnected]);

    // Handle video source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            console.log('[Host] 🏁 Video ended');
            logHostVideoState('Video ended', video);
            stopSyncInterval();
            onEndedRef.current?.();
        };

        const handleError = (e: Event) => {
            console.error('[Host] ❌ Video error event:', e);
            logHostVideoState('Video error', video);
            if (video.error) {
                console.error('[Host] ❌ Video error details:', {
                    code: video.error.code,
                    message: video.error.message,
                    MEDIA_ERR_ABORTED: video.error.code === 1,
                    MEDIA_ERR_NETWORK: video.error.code === 2,
                    MEDIA_ERR_DECODE: video.error.code === 3,
                    MEDIA_ERR_SRC_NOT_SUPPORTED: video.error.code === 4
                });
            }
            onErrorRef.current?.();
        };

        if (isEnabled && sourceUrl) {
            // Check if this is a new video (slide change)
            const isNewVideo = isNewVideoSource(video.currentSrc, sourceUrl, previousSourceUrl.current);

            if (video.currentSrc !== sourceUrl) {
                // Use persistent volume state for new video
                if (isNewVideo) {
                    console.log('[Host] 🎬 New video detected, preserving volume state:', {
                        volume: presentationVolume,
                        muted: presentationMuted
                    });
                }

                // Setup video for autoplay
                console.log('[Host] 📼 Loading new video source');
                logHostVideoState('Before source change', video);
                video.src = sourceUrl;
                video.load();
                logHostVideoState('After source change', video);
                
                // Reset ready states
                setHostVideoReady(false);
                setPresentationVideoReady(false);
                pendingAutoplayRef.current = true;
                
                // Wait for host video to be ready
                const handleCanPlay = () => {
                    video.removeEventListener('canplay', handleCanPlay);
                    console.log('[Host] ✅ Video can play');
                    logHostVideoState('Can play', video);
                    setHostVideoReady(true);
                };
                video.addEventListener('canplay', handleCanPlay);
                
                // If already ready, trigger immediately
                if (isVideoReady(video)) {
                    console.log('[Host] ✅ Video already ready');
                    logHostVideoState('Already ready', video);
                    setHostVideoReady(true);
                }
            }

            // Update previous source URL
            previousSourceUrl.current = sourceUrl;
        } else {
            if (!video.paused) {
                console.log('[Host] ⏸️ Pausing video - source disabled');
                video.pause();
                stopSyncInterval();
            }
            previousSourceUrl.current = null;
            // Reset states when video is disabled
            console.log('[Host] 🔄 Resetting video states - disabled');
            setHostVideoReady(false);
            setPresentationVideoReady(false);
            pendingAutoplayRef.current = false;
            logHostVideoState('Video disabled', video);
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
            console.log('[Host] 🧹 Cleaning up useHostVideo');
            stopSyncInterval();
        };
    }, [stopSyncInterval]);

    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;

        const props = createVideoProps({
            videoRef,
            muted: localIsConnected, // Host always muted when connected
            autoPlay: false,
            onVideoEnd,
            onError
        });
        
        console.log('[Host] 📋 Creating video props:', {
            muted: props.muted,
            autoPlay: props.autoPlay,
            localIsConnected
        });
        
        return props;
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