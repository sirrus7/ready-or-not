// useHostVideoSync.ts - Handles synchronization between host and presentation videos
import { useEffect, useState, useCallback, useMemo } from 'react';
import { SimpleBroadcastManager } from '@core/sync/SimpleBroadcastManager';
import { videoSyncLogger } from './videoLogger';
import { UseHostVideoPlaybackReturn } from './useHostVideoPlayback';

interface VideoSyncState {
    presentationConnected: boolean;
    presentationReady: boolean;
}

interface UseHostVideoSyncProps {
    sessionId: string | null;
    playback: UseHostVideoPlaybackReturn;
    onPresentationConnect?: () => void;
    onPresentationDisconnect?: () => void;
    pauseOnPresentationConnect?: boolean;
}

interface UseHostVideoSyncReturn {
    state: VideoSyncState;
    canPlay: boolean; // Whether both videos are ready to play
    sendCommand: (action: string, data?: any) => void;
}

export const useHostVideoSync = ({ 
    sessionId, 
    playback,
    onPresentationConnect,
    onPresentationDisconnect,
    pauseOnPresentationConnect = true
}: UseHostVideoSyncProps): UseHostVideoSyncReturn => {
    const [state, setState] = useState<VideoSyncState>({
        presentationConnected: false,
        presentationReady: false
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
            videoSyncLogger.log('Presentation status changed', { data: { status, connected } });
            
            if (!connected) {
                if (!disconnectTimeout) {
                    disconnectTimeout = setTimeout(() => {
                        setState(prev => ({ 
                            ...prev, 
                            presentationConnected: false, 
                            presentationReady: false 
                        }));
                        onPresentationDisconnect?.();
                    }, 1000);
                }
            } else {
                if (disconnectTimeout) {
                    clearTimeout(disconnectTimeout);
                    disconnectTimeout = null;
                }
                setState(prev => ({ ...prev, presentationConnected: true }));
                
                // Pause video if requested
                if (pauseOnPresentationConnect && playback.state.isPlaying) {
                    playback.pause();
                }
                
                onPresentationConnect?.();
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
    }, [broadcastManager, onPresentationConnect, onPresentationDisconnect]);
    
    // Sync video commands with presentation
    useEffect(() => {
        if (!state.presentationConnected) return;
        
        // When host plays, tell presentation to play
        const handlePlay = () => {
            sendCommand('play', {
                time: playback.state.currentTime,
                volume: playback.state.volume,
                muted: playback.state.isMuted
            });
        };
        
        // When host pauses, tell presentation to pause
        const handlePause = () => {
            sendCommand('pause', { time: playback.state.currentTime });
        };
        
        // When host seeks, tell presentation to seek
        const handleSeek = () => {
            sendCommand('seek', { time: playback.state.currentTime });
        };
        
        // When host volume changes, tell presentation
        const handleVolumeChange = () => {
            sendCommand('volume', { 
                volume: playback.state.volume,
                muted: playback.state.isMuted 
            });
        };
        
        // React to playback state changes
        if (playback.state.isPlaying) {
            handlePlay();
        }
        
    }, [
        state.presentationConnected, 
        playback.state.isPlaying,
        playback.state.currentTime,
        playback.state.volume,
        playback.state.isMuted,
        sendCommand
    ]);
    
    // Sync loop - keep videos in sync while playing
    useEffect(() => {
        if (!playback.state.isPlaying || !state.presentationConnected) return;
        
        const interval = setInterval(() => {
            sendCommand('sync', { time: playback.state.currentTime });
        }, 1000);
        
        return () => clearInterval(interval);
    }, [playback.state.isPlaying, playback.state.currentTime, state.presentationConnected, sendCommand]);
    
    // Calculate if we can play (both videos ready or just host if no presentation)
    const canPlay = state.presentationConnected 
        ? (playback.state.isReady && state.presentationReady)
        : playback.state.isReady;
    
    return {
        state,
        canPlay,
        sendCommand
    };
};