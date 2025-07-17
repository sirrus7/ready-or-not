// src/shared/utils/video/useHostVideo.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { HostSyncManager } from '@core/sync/HostSyncManager';

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
    const [isPresentationVideoReady, setIsPresentationVideoReady] = useState(false);
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
            if (video && !video.paused && localIsConnected && hostSyncManager) {
                hostSyncManager.sendCommand('sync', {
                    time: video.currentTime,
                    playbackRate: video.playbackRate,
                    volume: presentationVolume,
                    muted: presentationMuted,
                });
            }
        }, 1000);
    }, [localIsConnected, hostSyncManager, presentationVolume, presentationMuted]);

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
            setLocalIsConnected(status === 'connected');
            const video = videoRef.current;
            if (!video) return;
            if (status === 'connected') {
                video.muted = true;
                hostSyncManager.sendCommand('volume', {
                    time: video.currentTime,
                    volume: presentationVolume,
                    muted: presentationMuted,
                    playbackRate: video.playbackRate,
                });
                if (video.readyState >= 3) {
                    if (video.paused) {
                        video.play().catch(console.error);
                    }
                    hostSyncManager.sendCommand('play', {
                        time: video.currentTime,
                        playbackRate: video.playbackRate,
                        volume: presentationVolume,
                        muted: presentationMuted,
                    });
                    startSyncInterval();
                }
            } else {
                video.muted = false;
                stopSyncInterval();
                // Pause host video when presentation disconnects
                if (!video.paused) {
                    console.log('[useHostVideo] Presentation disconnected - pausing host video');
                    video.pause();
                }
            }
        });
        return unsubscribe;
    }, [hostSyncManager, presentationMuted, presentationVolume, startSyncInterval, stopSyncInterval]);

    // Handle presentation video ready events
    useEffect(() => {
        if (!hostSyncManager) return;
        hostSyncManager.onPresentationVideoReady(() => {
            setIsPresentationVideoReady(true);
        });
    }, [hostSyncManager]);

    // Play command
    const play = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (time !== undefined) {
                video.currentTime = time;
            }
            await video.play();
            if (localIsConnected && hostSyncManager && isPresentationVideoReady) {
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
            throw error;
        }
    }, [localIsConnected, hostSyncManager, presentationMuted, presentationVolume, startSyncInterval, isPresentationVideoReady]);

    // Pause command
    const pause = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        if (time !== undefined) {
            video.currentTime = time;
        }
        stopSyncInterval();
        if (localIsConnected && hostSyncManager && isPresentationVideoReady) {
            hostSyncManager.sendCommand('pause', {
                time: video.currentTime,
                playbackRate: video.playbackRate,
                volume: presentationVolume,
                muted: presentationMuted,
            });
        }
    }, [localIsConnected, hostSyncManager, stopSyncInterval, presentationMuted, presentationVolume, isPresentationVideoReady]);

    // Seek command
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = time;
        if (localIsConnected && hostSyncManager && isPresentationVideoReady) {
            hostSyncManager.sendCommand('seek', {
                time: video.currentTime,
                playbackRate: video.playbackRate,
                volume: presentationVolume,
                muted: presentationMuted,
            });
        }
    }, [localIsConnected, hostSyncManager, presentationMuted, presentationVolume, isPresentationVideoReady]);

    // Volume control (for presentation when connected)
    const setVolume = useCallback((volume: number) => {
        const video = videoRef.current;
        if (!video) return;
        setPresentationVolume(volume);
        if (localIsConnected && hostSyncManager && isPresentationVideoReady) {
            hostSyncManager.sendCommand('volume', {
                time: video.currentTime,
                volume,
                muted: presentationMuted,
                playbackRate: video.playbackRate,
            });
        } else {
            video.volume = volume;
        }
    }, [localIsConnected, hostSyncManager, presentationMuted, isPresentationVideoReady]);

    // Mute control (for presentation when connected)
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (localIsConnected && hostSyncManager && isPresentationVideoReady) {
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
    }, [localIsConnected, hostSyncManager, presentationMuted, presentationVolume, isPresentationVideoReady]);

    // Keep host muted when connected
    useEffect(() => {
        if (!localIsConnected) return;
        const video = videoRef.current;
        if (!video) return;
        video.muted = true;
        const interval = setInterval(() => {
            if (!video.muted) {
                video.muted = true;
            }
        }, 100);
        return () => clearInterval(interval);
    }, [localIsConnected]);

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
                // Reset presentation video ready state for new video
                setIsPresentationVideoReady(false);
                
                if (isNewVideo) {
                    // Keep volume state
                }
                video.src = sourceUrl;
                video.load();
                const handleCanPlay = async () => {
                    try {
                        await play(0);
                        // Send play command to presentation when host video starts
                        if (localIsConnected && hostSyncManager) {
                            hostSyncManager.sendCommand('play', {
                                time: video.currentTime,
                                playbackRate: video.playbackRate,
                                volume: presentationVolume,
                                muted: presentationMuted,
                            });
                        }
                    } catch (error) {}
                    video.removeEventListener('canplay', handleCanPlay);
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
    }, [sourceUrl, isEnabled, stopSyncInterval, play, localIsConnected, hostSyncManager, presentationMuted, presentationVolume]);

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
            muted: localIsConnected,
            autoPlay: false,
            onVideoEnd,
            onError
        });
    }, [localIsConnected]);

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
            console.error('[useHostVideo] videoSendCommand failed:', error);
        }
    }, [isEnabled]);

    return {
        videoRef,
        isConnectedToPresentation: localIsConnected,
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
    };
};