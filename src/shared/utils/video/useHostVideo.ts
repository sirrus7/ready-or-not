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
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UseHostVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const useHostVideo = ({ sessionId, sourceUrl, isEnabled }: UseHostVideoProps): UseHostVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [presentationMuted, setPresentationMuted] = useState(() => {
        const stored = localStorage.getItem('presentationMuted');
        return stored === 'true';
    });
    const [localIsConnected, setLocalIsConnected] = useState(false);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const previousSourceUrl = useRef<string | null>(null);
    
    // Get persisted volume from localStorage
    const getPersistedVolume = () => {
        const stored = localStorage.getItem('hostVideoVolume');
        return stored ? parseFloat(stored) : 1;
    };
    
    const persistVolume = (volume: number) => {
        localStorage.setItem('hostVideoVolume', volume.toString());
    };
    
    const persistMuteState = (muted: boolean) => {
        localStorage.setItem('presentationMuted', muted.toString());
    };

    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    // Initialize video volume from persisted value on mount
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            const persistedVolume = getPersistedVolume();
            console.log('[HOST] Initializing video volume to persisted value:', persistedVolume);
            video.volume = persistedVolume;
        }
    }, []);

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
                const syncData = {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: video.volume || getPersistedVolume(), // Use persisted volume as fallback
                    muted: presentationMuted,
                };
                console.log('[HOST] Sending sync command with volume:', syncData.volume);
                sendCommand('sync', syncData);
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
                // Mute host and pause when presentation connects
                video.muted = true;
                video.pause();
                stopSyncInterval();

                // Send initial state to presentation
                const initialState = {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: video.volume || getPersistedVolume(), // Use persisted volume as fallback
                    muted: presentationMuted,
                };
                console.log('[HOST] Sending initial state to presentation with volume:', initialState.volume);
                sendCommand('pause', initialState);
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
                const playCommand = {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: video.volume || getPersistedVolume(), // Use persisted volume as fallback
                    muted: presentationMuted,
                };
                console.log('[HOST] Sending play command with volume:', playCommand.volume, playCommand);
                sendCommand('play', playCommand);
                
                // Start sync interval after a small delay to ensure presentation is ready
                setTimeout(() => {
                    startSyncInterval();
                }, 100);
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
            const pauseCommand = {
                time: video.currentTime,
            };
            console.log('[HOST] Sending pause command:', pauseCommand);
            sendCommand('pause', pauseCommand);
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

        // Always persist volume preference
        persistVolume(volume);

        if (isConnected) {
            // Store the volume value on the video element even when connected
            // This ensures we have the correct volume value for sync commands
            video.volume = volume;
            
            // Don't change host volume audibly (it's muted), just send to presentation
            const volumeCommand = {
                volume,
                muted: presentationMuted,
            };
            console.log('[HOST] Sending volume command:', volumeCommand);
            sendCommand('volume', volumeCommand);
        } else {
            // Change host volume when not connected
            console.log('[HOST] Setting local volume:', volume);
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
            persistMuteState(newMuted); // Persist mute state
            const muteCommand = {
                volume: video.volume,
                muted: newMuted,
            };
            console.log('[HOST] Sending mute toggle command:', muteCommand);
            sendCommand('volume', muteCommand);
        } else {
            // Toggle host mute when not connected
            console.log('[HOST] Toggling local mute:', !video.muted);
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
                video.src = sourceUrl;
                video.load();
                
                // Restore persisted volume when loading new video
                const persistedVolume = getPersistedVolume();
                video.volume = persistedVolume;
                console.log('[HOST] Restored persisted volume for new video:', persistedVolume);

                // Auto-play on slide change for new videos
                if (isNewVideo) {
                    console.log('[useHostVideo] New video detected, will autoplay after load');

                    const handleCanPlay = async () => {
                        try {
                            // Wait a bit for presentation to be ready
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                            await play(0); // Start from beginning
                            console.log('[useHostVideo] Autoplay started successfully');

                            // Send current audio state when playing new video
                            if (isConnected) {
                                console.log('[useHostVideo] Sending audio state for new video, muted:', presentationMuted);
                                
                                // Send audio command with delay to ensure presentation is ready
                                setTimeout(() => {
                                    // Use the actual volume value from the video element
                                    // which should have been set by the volume control
                                    const currentVolume = video.volume || getPersistedVolume();
                                    const newVideoCommand = {
                                        time: video.currentTime,
                                        volume: currentVolume,
                                        muted: presentationMuted, // Use persisted mute state
                                    };
                                    console.log('[HOST] Sending new video audio command with volume:', currentVolume, 'muted:', presentationMuted, newVideoCommand);
                                    sendCommand('volume', newVideoCommand);
                                }, 200);
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
        getVideoProps,
    };
};