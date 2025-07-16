// usePresentationVideoPlayback.ts - Pure video playback control for presentation
import { useRef, useState, useCallback, useEffect } from 'react';
import { videoSyncLogger } from './videoLogger';

interface VideoPlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isReady: boolean;
}

interface UsePresentationVideoPlaybackProps {
    sourceUrl: string | null;
}

export interface UsePresentationVideoPlaybackReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    state: VideoPlaybackState;
    play: (time?: number) => Promise<void>;
    pause: () => Promise<void>;
    seek: (time: number) => Promise<void>;
    setVolume: (volume: number, muted?: boolean) => void;
}

export const usePresentationVideoPlayback = ({ sourceUrl }: UsePresentationVideoPlaybackProps): UsePresentationVideoPlaybackReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const [state, setState] = useState<VideoPlaybackState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        isReady: false
    });
    
    // Setup video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !sourceUrl) return;
        
        if (video.src !== sourceUrl) {
            videoSyncLogger.log('[Presentation] Loading new source', { data: { sourceUrl } });
            
            // Pause current playback
            if (!video.paused) {
                video.pause();
            }
            
            video.src = sourceUrl;
            video.load();
            
            // Reset state
            setState(prev => ({ 
                ...prev,
                isReady: false,
                currentTime: 0,
                duration: 0,
                isPlaying: false
            }));
        }
        
        // Event handlers
        const handleCanPlay = () => {
            setState(prev => ({ ...prev, isReady: true }));
            videoSyncLogger.log('[Presentation] Video ready', { data: { sourceUrl } });
        };
        
        const handleTimeUpdate = () => {
            setState(prev => ({ 
                ...prev,
                currentTime: video.currentTime,
                duration: video.duration || 0
            }));
        };
        
        const handlePlay = () => {
            videoSyncLogger.log('[Presentation] Video play event', { 
                data: { 
                    currentTime: video.currentTime,
                    timestamp: new Date().toISOString()
                } 
            });
            setState(prev => ({ ...prev, isPlaying: true }));
        };
        
        const handlePause = () => {
            videoSyncLogger.log('[Presentation] Video pause event', { 
                data: { 
                    currentTime: video.currentTime,
                    timestamp: new Date().toISOString()
                } 
            });
            setState(prev => ({ ...prev, isPlaying: false }));
        };
        
        const handleEnded = () => {
            videoSyncLogger.log('[Presentation] Video ended', { 
                data: { 
                    currentTime: video.currentTime,
                    duration: video.duration
                } 
            });
            setState(prev => ({ ...prev, isPlaying: false }));
        };
        
        const handleVolumeChange = () => {
            setState(prev => ({ 
                ...prev, 
                volume: video.volume,
                isMuted: video.muted
            }));
        };
        
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('volumechange', handleVolumeChange);
        
        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('volumechange', handleVolumeChange);
        };
    }, [sourceUrl]);
    
    // Control functions
    const play = useCallback(async (time?: number) => {
        const video = videoRef.current;
        if (!video || !state.isReady) {
            videoSyncLogger.warn('[Presentation] Cannot play - video not ready');
            return;
        }
        
        try {
            if (time !== undefined) {
                video.currentTime = time;
            }
            await video.play();
        } catch (error) {
            videoSyncLogger.error('[Presentation] Play failed', { error });
            throw error;
        }
    }, [state.isReady]);
    
    const pause = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        
        video.pause();
    }, []);
    
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) return;
        
        video.currentTime = time;
    }, []);
    
    const setVolume = useCallback((volume: number, muted?: boolean) => {
        const video = videoRef.current;
        if (!video) return;
        
        video.volume = Math.max(0, Math.min(1, volume));
        if (muted !== undefined) {
            video.muted = muted;
        }
    }, []);
    
    return {
        videoRef,
        state,
        play,
        pause,
        seek,
        setVolume
    };
};