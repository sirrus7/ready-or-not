// Presentation-specific video sync hook - receives commands and plays video
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SimpleBroadcastManager } from '@core/sync/SimpleBroadcastManager';
import { HostCommand } from '@core/sync/types';
import { videoSyncLogger } from './videoLogger';

interface PresentationVideoState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isReady: boolean;
    isConnected: boolean;
}

interface UsePresentationVideoSyncProps {
    sessionId: string | null;
    sourceUrl: string | null;
}

interface UsePresentationVideoSyncReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    state: PresentationVideoState;
}

export const usePresentationVideoSync = ({ sessionId, sourceUrl }: UsePresentationVideoSyncProps): UsePresentationVideoSyncReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const [state, setState] = useState<PresentationVideoState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        isReady: false,
        isConnected: false
    });
    
    // Broadcast manager for presentation
    const broadcastManager = useMemo(() => {
        if (!sessionId) return null;
        return SimpleBroadcastManager.getInstance(sessionId, 'presentation');
    }, [sessionId]);
    
    // Monitor connection status
    useEffect(() => {
        if (!broadcastManager) return;
        
        let connectionTimeout: NodeJS.Timeout;
        let connected = false;
        
        const resetTimeout = () => {
            clearTimeout(connectionTimeout);
            connectionTimeout = setTimeout(() => {
                if (connected) {
                    connected = false;
                    setState(prev => ({ ...prev, isConnected: false }));
                }
            }, 3000);
            
            if (!connected) {
                connected = true;
                setState(prev => ({ ...prev, isConnected: true }));
            }
        };
        
        // Any command indicates we're connected
        const unsubscribe = broadcastManager.onHostCommand(() => {
            resetTimeout();
        });
        
        resetTimeout();
        
        // Send periodic status updates
        const interval = setInterval(() => {
            if (broadcastManager) {
                const video = videoRef.current;
                const videoLoaded = video ? video.readyState >= 3 : false;
                broadcastManager.sendPresentationStatus(videoLoaded);
            }
        }, 1000);
        
        return () => {
            clearTimeout(connectionTimeout);
            clearInterval(interval);
            unsubscribe();
        };
    }, [broadcastManager]);
    
    // Setup video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !sourceUrl) return;
        
        if (video.src !== sourceUrl) {
            videoSyncLogger.log('Loading new video source', { data: { sourceUrl } });
            
            video.src = sourceUrl;
            video.load();
            video.volume = state.volume;
            video.muted = state.isMuted;
            
            setState(prev => ({ 
                ...prev,
                isReady: false,
                currentTime: 0,
                duration: 0,
                isPlaying: false
            }));
            
            videoSyncLogger.log('Applied volume settings to new video', { 
                data: { volume: state.volume, muted: state.isMuted }
            });
        }
        
        // Event handlers
        const handleCanPlay = () => {
            setState(prev => ({ ...prev, isReady: true }));
            videoSyncLogger.log('Video can play, sending ready status');
        };
        
        const handleTimeUpdate = () => setState(prev => ({ 
            ...prev,
            currentTime: video.currentTime,
            duration: video.duration || 0
        }));
        
        const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
        const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));
        
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        
        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [sourceUrl, state.volume, state.isMuted]);
    
    // Listen for commands from host
    useEffect(() => {
        if (!broadcastManager) return;
        
        const unsubscribe = broadcastManager.onHostCommand((command: HostCommand) => {
            const video = videoRef.current;
            if (!video) return;
            
            videoSyncLogger.log(`Received command: ${command.action}`, {
                data: {
                    hasVideo: !!video,
                    isReady: video.readyState >= 3
                }
            });
            
            switch (command.action) {
                case 'play':
                    if (command.data?.time !== undefined) {
                        video.currentTime = command.data.time;
                    }
                    video.play().catch(err => {
                        videoSyncLogger.error('Play failed', { data: { error: err } });
                    });
                    break;
                    
                case 'pause':
                    video.pause();
                    if (command.data?.time !== undefined) {
                        video.currentTime = command.data.time;
                    }
                    break;
                    
                case 'seek':
                    if (command.data?.time !== undefined) {
                        video.currentTime = command.data.time;
                    }
                    break;
                    
                case 'sync':
                    if (command.data?.time !== undefined) {
                        const timeDiff = Math.abs(video.currentTime - command.data.time);
                        if (timeDiff > 0.5) {
                            video.currentTime = command.data.time;
                        }
                    }
                    break;
                    
                case 'volume':
                    if (command.data?.volume !== undefined) {
                        video.volume = command.data.volume;
                        setState(prev => ({ ...prev, volume: command.data.volume }));
                    }
                    if (command.data?.muted !== undefined) {
                        video.muted = command.data.muted;
                        setState(prev => ({ ...prev, isMuted: command.data.muted }));
                    }
                    break;
            }
            
            // Acknowledge command
            broadcastManager.sendAck(command.id);
        });
        
        return unsubscribe;
    }, [broadcastManager]);
    
    return {
        videoRef,
        state
    };
};