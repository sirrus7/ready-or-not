// Host-specific video sync hook - manages host video and coordinates with presentation
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SimpleBroadcastManager } from '@core/sync/SimpleBroadcastManager';
import { videoSyncLogger } from './videoLogger';

interface HostVideoState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    hostReady: boolean;
    presentationReady: boolean;
    presentationConnected: boolean;
    presentationShouldBeConnected: boolean;
}

interface UseHostVideoSyncProps {
    sessionId: string | null;
    sourceUrl: string | null;
}

interface UseHostVideoSyncReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    state: HostVideoState;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seek: (time: number) => Promise<void>;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
}

export const useHostVideoSync = ({ sessionId, sourceUrl }: UseHostVideoSyncProps): UseHostVideoSyncReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const [state, setState] = useState<HostVideoState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        hostReady: false,
        presentationReady: false,
        presentationConnected: false,
        presentationShouldBeConnected: false
    });
    
    // Broadcast manager for host
    const broadcastManager = useMemo(() => {
        if (!sessionId) return null;
        return SimpleBroadcastManager.getInstance(sessionId, 'host');
    }, [sessionId]);
    
    // Send command helper
    const sendCommand = useCallback((action: string, data?: any) => {
        if (broadcastManager) {
            videoSyncLogger.log(`Sending command: ${action}`, data);
            broadcastManager.sendCommand(action, data);
        }
    }, [broadcastManager]);
    
    // Monitor presentation connection and ready state
    useEffect(() => {
        if (!broadcastManager) return;
        
        let disconnectTimeout: NodeJS.Timeout | null = null;
        
        const unsubStatus = broadcastManager.onPresentationStatus((status) => {
            const connected = status === 'connected';
            videoSyncLogger.log('Presentation status changed', { 
                data: { 
                    status, 
                    connected,
                    timestamp: new Date().toISOString()
                } 
            });
            
            if (!connected) {
                if (!disconnectTimeout) {
                    disconnectTimeout = setTimeout(() => {
                        setState(prev => {
                            // Only pause if presentation SHOULD be connected but isn't
                            if (prev.presentationShouldBeConnected) {
                                const video = videoRef.current;
                                if (video && !video.paused) {
                                    videoSyncLogger.log('Pausing video - presentation disconnected after timeout', { 
                                        data: { 
                                            currentTime: video.currentTime,
                                            timestamp: new Date().toISOString(),
                                            shouldBeConnected: true
                                        } 
                                    });
                                    video.pause();
                                }
                            }
                            return { ...prev, presentationConnected: false, presentationReady: false };
                        });
                    }, 1000);
                }
            } else {
                if (disconnectTimeout) {
                    clearTimeout(disconnectTimeout);
                    disconnectTimeout = null;
                }
                setState(prev => ({ 
                    ...prev, 
                    presentationConnected: true,
                    presentationShouldBeConnected: true  // Mark that presentation should stay connected
                }));
                
                // Pause when presentation first connects (to sync both videos)
                const video = videoRef.current;
                if (video && !video.paused) {
                    videoSyncLogger.log('Pausing video - presentation connected', { 
                        data: { 
                            currentTime: video.currentTime,
                            timestamp: new Date().toISOString()
                        } 
                    });
                    video.pause();
                }
            }
        });
        
        const unsubReady = broadcastManager.onVideoReady((ready) => {
            videoSyncLogger.log('Presentation ready status', { data: { ready } });
            setState(prev => ({ ...prev, presentationReady: ready }));
        });
        
        return () => {
            unsubStatus();
            unsubReady();
            if (disconnectTimeout) clearTimeout(disconnectTimeout);
        };
    }, [broadcastManager]);
    
    // Setup video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !sourceUrl) return;
        
        if (video.src !== sourceUrl) {
            videoSyncLogger.log('Loading new source', { data: { sourceUrl } });
            
            // Pause current playback
            if (!video.paused) {
                video.pause();
                if (state.presentationConnected) {
                    sendCommand('pause', { time: 0 });
                }
            }
            
            video.src = sourceUrl;
            video.load();
            
            // Reset ready states
            setState(prev => ({ 
                ...prev,
                hostReady: false, 
                presentationReady: false,
                currentTime: 0,
                duration: 0,
                isPlaying: false
            }));
        }
        
        // Event handlers
        const handleCanPlay = () => setState(prev => ({ ...prev, hostReady: true }));
        const handleTimeUpdate = () => setState(prev => ({ 
            ...prev,
            currentTime: video.currentTime,
            duration: video.duration || 0
        }));
        const handlePlay = () => {
            videoSyncLogger.log('Video play event', { 
                data: { 
                    currentTime: video.currentTime,
                    timestamp: new Date().toISOString(),
                    readyState: video.readyState,
                    paused: video.paused
                } 
            });
            setState(prev => ({ ...prev, isPlaying: true }));
        };
        const handlePause = () => {
            videoSyncLogger.log('Video pause event', { 
                data: { 
                    currentTime: video.currentTime,
                    timestamp: new Date().toISOString(),
                    readyState: video.readyState,
                    stack: new Error().stack
                } 
            });
            setState(prev => ({ ...prev, isPlaying: false }));
        };
        const handleEnded = () => {
            videoSyncLogger.log('Video ended event', { 
                data: { 
                    currentTime: video.currentTime, 
                    duration: video.duration,
                    timestamp: new Date().toISOString()
                } 
            });
        };
        
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);
        
        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [sourceUrl, state.presentationConnected, sendCommand]);
    
    // Apply audio routing - host muted when presentation connected
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        
        // Only mute host if presentation is actually connected (not just should be)
        video.muted = state.presentationConnected;
        if (!state.presentationConnected) {
            video.volume = state.volume;
        }
    }, [state.presentationConnected, state.volume]);
    
    // Control functions
    const play = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !state.hostReady) return;
        
        // Only wait for presentation if it should be connected
        if (state.presentationShouldBeConnected && state.presentationConnected && !state.presentationReady) {
            videoSyncLogger.warn('Waiting for presentation to be ready');
            return;
        }
        
        videoSyncLogger.log('Calling video.play()', { 
            data: { 
                timestamp: new Date().toISOString(),
                currentTime: video.currentTime,
                paused: video.paused
            } 
        });
        
        await video.play();
        
        if (state.presentationConnected) {
            sendCommand('play', {
                time: video.currentTime,
                volume: state.volume,
                muted: state.isMuted
            });
        }
    }, [state, sendCommand]);
    
    const pause = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        
        video.pause();
        
        if (state.presentationConnected) {
            sendCommand('pause', { time: video.currentTime });
        }
    }, [state.presentationConnected, sendCommand]);
    
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) return;
        
        video.currentTime = time;
        
        if (state.presentationConnected) {
            sendCommand('seek', { time });
        }
    }, [state.presentationConnected, sendCommand]);
    
    const setVolume = useCallback((volume: number) => {
        setState(prev => ({ ...prev, volume }));
        
        const video = videoRef.current;
        if (video && !state.presentationConnected) {
            video.volume = volume;
        }
        
        if (state.presentationConnected) {
            sendCommand('volume', { volume });
        }
    }, [state.presentationConnected, sendCommand]);
    
    const toggleMute = useCallback(() => {
        setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
        
        if (state.presentationConnected) {
            sendCommand('volume', { 
                volume: state.volume, 
                muted: !state.isMuted 
            });
        }
    }, [state.presentationConnected, state.volume, state.isMuted, sendCommand]);
    
    // Sync loop
    useEffect(() => {
        if (!state.isPlaying || !state.presentationConnected) return;
        
        const interval = setInterval(() => {
            const video = videoRef.current;
            if (video && !video.paused) {
                sendCommand('sync', { time: video.currentTime });
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [state.isPlaying, state.presentationConnected, sendCommand]);
    
    return {
        videoRef,
        state,
        play,
        pause,
        seek,
        setVolume,
        toggleMute
    };
};