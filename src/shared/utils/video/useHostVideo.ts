// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { HostSyncManager } from '@core/sync/HostSyncManager';
import { videoDebug } from './debug';

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
    isPresentationVideoReady: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
    sendCommand: (action: string, data?: any) => Promise<void>;
    resetConnectionState: () => void;
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
    const [presentationIsConnected, setLocalIsConnected] = useState(false);
    const [isPresentationVideoReady, setIsPresentationVideoReady] = useState(false);
    const [shouldResetConnection, setShouldResetConnection] = useState(false);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();
    const previousSourceUrl = useRef<string | null>(null);

    useChromeSupabaseOptimizations(videoRef, sourceUrl);

    const hostSyncManager = sessionId && isEnabled ? HostSyncManager.getInstance(sessionId) : null;

    // Sync interval management
    const startSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) return;
        syncIntervalRef.current = setInterval(() => {
            const video = videoRef.current;
            if (video && !video.paused && presentationIsConnected && hostSyncManager) {
                hostSyncManager.sendCommand('sync', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: presentationVolume,
                    muted: presentationMuted,
                });
            }
        }, 1000);
    }, [presentationIsConnected, hostSyncManager, presentationVolume, presentationMuted]);

    const stopSyncInterval = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

        // Handle connection changes
    useEffect(() => {
        if (!hostSyncManager) return;
        const unsubscribe = hostSyncManager.onPresentationStatus((status) => {
            const wasConnected = presentationIsConnected && !shouldResetConnection;
            setLocalIsConnected(status === 'connected');
            
            // Reset the reset flag when we get a new connection status
            if (shouldResetConnection) {
                setShouldResetConnection(false);
            }
            
            const video = videoRef.current;
            if (!video) return;
            
            if (status === 'connected') {
                video.muted = true;
                // Send initial volume settings
                hostSyncManager.sendCommand('volume', {
                    time: video.currentTime,
                    volume: presentationVolume,
                    muted: presentationMuted,
                    playbackRate: video.playbackRate,
                });
            } else {
                video.muted = false;
                stopSyncInterval();
                // Only pause host video when presentation disconnects if we were previously connected
                // This prevents pausing in host-only mode when there's no presentation
                if (!video.paused && wasConnected) {
                    videoDebug.videoLog('useHostVideo', 'Presentation disconnected - pausing host video');
                    video.pause();
                }
            }
        });
        return unsubscribe;
    }, [hostSyncManager, presentationMuted, presentationVolume, stopSyncInterval, presentationIsConnected, shouldResetConnection]);

    // Handle presentation video ready events
    useEffect(() => {
        if (!hostSyncManager) return;
        hostSyncManager.onPresentationVideoReady(() => {
            videoDebug.videoLog('useHostVideo', 'Presentation video ready event received');
            setIsPresentationVideoReady(true);
        });
    }, [hostSyncManager]);

    // Play command
    const play = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) return;
        
        // If video is already playing, just send command to presentation
        if (!video.paused) {
            videoDebug.videoLog('useHostVideo', 'Video already playing, sending command to presentation only');
            if (presentationIsConnected && hostSyncManager) {
                hostSyncManager.sendCommand('play', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: presentationVolume,
                    muted: presentationMuted,
                });
            }
            // Manually dispatch play event to update UI since video.play() won't fire one
            // video.dispatchEvent(new Event('play'));
            return;
        }
        
        try {
            if (time !== undefined) {
                video.currentTime = time;
            }
            
            // If connected to presentation but not ready, poll for status
            if (presentationIsConnected && hostSyncManager && !isPresentationVideoReady) {
                videoDebug.videoLog('useHostVideo', 'Polling presentation for video status...');
                
                // Keep polling up to 5000ms
                const maxWaitTime = 5000;
                const pollInterval = 200; // Poll every 200ms
                const startTime = Date.now();
                
                while (!isPresentationVideoReady && (Date.now() - startTime) < maxWaitTime) {
                    // Send poll
                    hostSyncManager.sendVideoStatusPoll();
                    
                    // Wait for response or next poll interval
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                }
                
                if (!isPresentationVideoReady) {
                    videoDebug.videoLog('useHostVideo', 'Presentation not ready after 5 seconds, proceeding anyway');
                } else {
                    videoDebug.videoLog('useHostVideo', 'Presentation is ready');
                }
            }
            
            // Play the host video
            videoDebug.videoLog('useHostVideo', 'Playing host video');
            await video.play();
            
            // Manually dispatch play event to update UI
            video.dispatchEvent(new Event('play'));
            
            // Send play command to presentation if connected
            if (presentationIsConnected && hostSyncManager) {
                videoDebug.videoLog('useHostVideo', 'Sending play command to presentation');
                hostSyncManager.sendCommand('play', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: presentationVolume,
                    muted: presentationMuted,
                });
                startSyncInterval();
            }
            
        } catch (error) {
            console.error('[useHostVideo] Play failed:', error);
            // Don't re-throw for auto-play scenarios, but do for manual play
            if (time !== undefined) {
                throw error;
            }
        }
    }, [presentationIsConnected, hostSyncManager, presentationMuted, presentationVolume, startSyncInterval, isPresentationVideoReady]);

    // Pause command
    const pause = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        if (time !== undefined) {
            video.currentTime = time;
        }
        stopSyncInterval();
        if (presentationIsConnected && hostSyncManager && isPresentationVideoReady) {
            hostSyncManager.sendCommand('pause', {
                time: video.currentTime,
                playbackRate: video.playbackRate,
                volume: presentationVolume,
                muted: presentationMuted,
            });
        }
    }, [presentationIsConnected, hostSyncManager, stopSyncInterval, presentationMuted, presentationVolume, isPresentationVideoReady]);

    // Seek command
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = time;
        if (presentationIsConnected && hostSyncManager && isPresentationVideoReady) {
            hostSyncManager.sendCommand('seek', {
                time: video.currentTime,
                playbackRate: video.playbackRate,
                volume: presentationVolume,
                muted: presentationMuted,
            });
        }
    }, [presentationIsConnected, hostSyncManager, presentationMuted, presentationVolume, isPresentationVideoReady]);

    // Volume control (for presentation when connected)
    const setVolume = useCallback((volume: number) => {
        const video = videoRef.current;
        if (!video) return;
        setPresentationVolume(volume);
        if (presentationIsConnected && hostSyncManager && isPresentationVideoReady) {
            hostSyncManager.sendCommand('volume', {
                time: video.currentTime,
                volume,
                muted: presentationMuted,
                playbackRate: video.playbackRate,
            });
        } else {
            video.volume = volume;
        }
    }, [presentationIsConnected, hostSyncManager, presentationMuted, isPresentationVideoReady]);

    // Mute control (for presentation when connected)
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (presentationIsConnected && hostSyncManager && isPresentationVideoReady) {
            const newMuted = !presentationMuted;
            setPresentationMuted(newMuted);
            hostSyncManager.sendCommand('volume', {
                time: video.currentTime,
                volume: presentationVolume,
                muted: newMuted,
                playbackRate: video.playbackRate,
            });
        } else {
            video.muted = !video.muted;
        }
    }, [presentationIsConnected, hostSyncManager, presentationMuted, presentationVolume, isPresentationVideoReady]);

    // Store current state in refs to avoid dependency issues
    const stateRef = useRef({
        presentationIsConnected,
        hostSyncManager,
        isPresentationVideoReady,
        presentationVolume,
        presentationMuted,
        startSyncInterval
    });
    
    // Update refs when state changes - use individual effects to avoid dependency issues
    useEffect(() => {
        stateRef.current.presentationIsConnected = presentationIsConnected;
    }, [presentationIsConnected]);
    
    useEffect(() => {
        stateRef.current.hostSyncManager = hostSyncManager;
    }, [hostSyncManager]);
    
    useEffect(() => {
        stateRef.current.isPresentationVideoReady = isPresentationVideoReady;
    }, [isPresentationVideoReady]);
    
    useEffect(() => {
        stateRef.current.presentationVolume = presentationVolume;
    }, [presentationVolume]);
    
    useEffect(() => {
        stateRef.current.presentationMuted = presentationMuted;
    }, [presentationMuted]);
    
    useEffect(() => {
        stateRef.current.startSyncInterval = startSyncInterval;
    }, [startSyncInterval]);

    // Keep host muted when connected
    useEffect(() => {
        if (!presentationIsConnected) return;
        const video = videoRef.current;
        if (!video) return;
        video.muted = true;
        const interval = setInterval(() => {
            if (!video.muted) {
                video.muted = true;
            }
        }, 100);
        return () => clearInterval(interval);
    }, [presentationIsConnected]);

    // Handle video source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        
        const handleEnded = () => {
            stopSyncInterval();
            onEndedRef.current?.();
        };
        const handleError = (e: Event) => {
            onErrorRef.current?.();
        };
        
        if (isEnabled && sourceUrl) {
            const isNewVideo = video.currentSrc !== sourceUrl && previousSourceUrl.current !== sourceUrl;
            if (video.currentSrc !== sourceUrl) {
                // Only reset presentation video ready state if it's a completely new video
                if (isNewVideo) {
                    videoDebug.videoLog('useHostVideo', 'New video detected, resetting presentation ready state');
                    setIsPresentationVideoReady(false);
                }
                video.src = sourceUrl;
                video.load();
                
                // Auto-play when video is ready (for slide advances)
                const handleCanPlay = async () => {
                    // Remove event listener immediately to prevent multiple calls
                    video.removeEventListener('canplay', handleCanPlay);
                    
                    // Don't auto-play if video is already playing
                    if (!video.paused) {
                        videoDebug.videoLog('useHostVideo', 'Video already playing, skipping auto-play');
                        return;
                    }
                    
                    // Don't auto-play if video is not ready
                    if (video.readyState < 2) {
                        videoDebug.videoLog('useHostVideo', 'Video not ready, skipping auto-play');
                        return;
                    }
                    
                    try {
                        // Auto-play logic using current state from ref
                        video.currentTime = 0; // Start from beginning
                        
                        const state = stateRef.current;
                        
                        // If connected to presentation but not ready, poll for status
                        if (state.presentationIsConnected && state.hostSyncManager && !state.isPresentationVideoReady) {
                            videoDebug.videoLog('useHostVideo', 'Auto-play: Polling presentation for video status...');
                            
                            // Keep polling up to 5000ms
                            const maxWaitTime = 5000;
                            const pollInterval = 200; // Poll every 200ms
                            const startTime = Date.now();
                            
                            while (!state.isPresentationVideoReady && (Date.now() - startTime) < maxWaitTime) {
                                // Send poll
                                state.hostSyncManager.sendVideoStatusPoll();
                                
                                // Wait for response or next poll interval
                                await new Promise(resolve => setTimeout(resolve, pollInterval));
                            }
                            
                            if (!state.isPresentationVideoReady) {
                                videoDebug.videoLog('useHostVideo', 'Auto-play: Presentation not ready after 5 seconds, proceeding anyway');
                            } else {
                                videoDebug.videoLog('useHostVideo', 'Auto-play: Presentation is ready');
                            }
                        }
                        
                        // Play the host video
                        videoDebug.videoLog('useHostVideo', 'Auto-playing host video');
                        await video.play();
                        
                        // Manually dispatch play event to update UI
                        video.dispatchEvent(new Event('play'));
                        
                        // Send play command to presentation if connected
                        if (state.presentationIsConnected && state.hostSyncManager) {
                            videoDebug.videoLog('useHostVideo', 'Auto-play: Sending play command to presentation');
                            state.hostSyncManager.sendCommand('play', {
                                time: video.currentTime,
                                playbackRate: video.playbackRate,
                                volume: state.presentationVolume,
                                muted: state.presentationMuted,
                            });
                            state.startSyncInterval();
                        }
                    } catch (error) {
                        console.error('[useHostVideo] Auto-play failed:', error);
                        // Don't re-throw - just log the error
                    }
                };
                video.addEventListener('canplay', handleCanPlay);
            }
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
    }, [sourceUrl, isEnabled, stopSyncInterval]);

    // Pause videos on page unload/refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            const video = videoRef.current;
            if (video && !video.paused) {
                videoDebug.videoLog('useHostVideo', 'Page unloading - pausing video');
                video.pause();
            }
            // Send pause command to presentation if connected
            if (presentationIsConnected && hostSyncManager) {
                hostSyncManager.sendCommand('pause', {
                    time: video?.currentTime || 0,
                    playbackRate: video?.playbackRate || 1,
                    volume: presentationVolume,
                    muted: presentationMuted,
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [presentationIsConnected, hostSyncManager, presentationVolume, presentationMuted]);

    useEffect(() => {
        return () => {
            stopSyncInterval();
        };
    }, [stopSyncInterval]);

    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;
        return createVideoProps({
            videoRef,
            muted: presentationIsConnected,
            autoPlay: false, // We control when to play, not the browser
            onVideoEnd,
            onError
        });
    }, [presentationIsConnected]);

    // Imperative video control API for parent components (used by SlideRenderer)
    const sendCommand = useCallback(async (action: string, data?: any) => {
        const video = videoRef.current;
        if (!video || !isEnabled) return;
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
                        await new Promise<void>((resolve) => {
                            const onCanPlay = () => {
                                video.removeEventListener('canplay', onCanPlay);
                                resolve();
                            };
                            video.addEventListener('canplay', onCanPlay);
                        });
                    }
                    await video.play();
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
            videoDebug.error('[useHostVideo] videoSendCommand failed:', error);
        }
    }, [isEnabled]);

    return {
        videoRef,
        isConnectedToPresentation: presentationIsConnected,
        presentationMuted,
        presentationVolume,
        play,
        pause,
        seek,
        setVolume,
        toggleMute,
        isPresentationVideoReady,
        getVideoProps,
        sendCommand,
        resetConnectionState: () => setShouldResetConnection(true),
    };
};