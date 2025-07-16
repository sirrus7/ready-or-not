// usePresentationVideoSync.ts - Handles presentation-side video sync
import { useEffect, useMemo } from 'react';
import { SimpleBroadcastManager } from '@core/sync/SimpleBroadcastManager';
import { videoSyncLogger } from './videoLogger';
import { UsePresentationVideoPlaybackReturn } from './usePresentationVideoPlayback';

interface UsePresentationVideoSyncProps {
    sessionId: string | null;
    playback: UsePresentationVideoPlaybackReturn;
}

interface UsePresentationVideoSyncReturn {
    // Presentation sync is mostly passive, receiving commands
}

export const usePresentationVideoSync = ({ 
    sessionId, 
    playback 
}: UsePresentationVideoSyncProps): UsePresentationVideoSyncReturn => {
    // Broadcast manager for presentation
    const broadcastManager = useMemo(() => {
        if (!sessionId) return null;
        return SimpleBroadcastManager.getInstance(sessionId, 'presentation');
    }, [sessionId]);
    
    // Report video ready status to host
    useEffect(() => {
        if (!broadcastManager) return;
        
        // Report ready status when it changes
        broadcastManager.reportVideoReady(playback.state.isReady);
        
    }, [broadcastManager, playback.state.isReady]);
    
    // Listen for commands from host
    useEffect(() => {
        if (!broadcastManager) return;
        
        const unsubscribe = broadcastManager.onVideoCommand(async (command, data) => {
            videoSyncLogger.log('[Presentation] Received command', { command, data });
            
            switch (command) {
                case 'play':
                    await playback.play(data?.time);
                    if (data?.volume !== undefined || data?.muted !== undefined) {
                        playback.setVolume(data.volume ?? 1, data.muted ?? false);
                    }
                    break;
                    
                case 'pause':
                    await playback.pause();
                    if (data?.time !== undefined) {
                        await playback.seek(data.time);
                    }
                    break;
                    
                case 'seek':
                    await playback.seek(data?.time ?? 0);
                    break;
                    
                case 'volume':
                    playback.setVolume(data?.volume ?? 1, data?.muted);
                    break;
                    
                case 'sync':
                    // Sync current time if we're too far off
                    const video = playback.videoRef.current;
                    if (video && data?.time !== undefined) {
                        const drift = Math.abs(video.currentTime - data.time);
                        if (drift > 0.5) { // More than 0.5 seconds drift
                            videoSyncLogger.log('[Presentation] Syncing time', { 
                                data: { 
                                    hostTime: data.time, 
                                    ourTime: video.currentTime, 
                                    drift 
                                } 
                            });
                            await playback.seek(data.time);
                        }
                    }
                    break;
            }
        });
        
        return unsubscribe;
    }, [broadcastManager, playback]);
    
    return {
        // Presentation sync is mostly passive
    };
};