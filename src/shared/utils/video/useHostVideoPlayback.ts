// useHostVideoPlayback.ts - Pure video playback control for host
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

interface UseHostVideoPlaybackProps {
    sourceUrl: string | null;
}

export interface UseHostVideoPlaybackReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    state: VideoPlaybackState;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seek: (time: number) => Promise<void>;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
}

export const useHostVideoPlayback = ({ sourceUrl }: UseHostVideoPlaybackProps): UseHostVideoPlaybackReturn => {
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
            videoSyncLogger.log('Loading new source', { data: { sourceUrl } });
            
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
            videoSyncLogger.log('Video ready', { data: { sourceUrl } });
        };
        
        const handleTimeUpdate = () => {
            setState(prev => ({ 
                ...prev,
                currentTime: video.currentTime,
                duration: video.duration || 0
            }));
        };
        
        const handlePlay = () => {
            videoSyncLogger.log('Video play event', { 
                data: { 
                    currentTime: video.currentTime,
                    timestamp: new Date().toISOString()
                } 
            });
            setState(prev => ({ ...prev, isPlaying: true }));
        };
        
        const handlePause = () => {
            videoSyncLogger.log('Video pause event', { 
                data: { 
                    currentTime: video.currentTime,
                    timestamp: new Date().toISOString()
                } 
            });
            setState(prev => ({ ...prev, isPlaying: false }));
        };
        
        const handleEnded = () => {
            videoSyncLogger.log('Video ended', { 
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
    const play = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !state.isReady) {
            videoSyncLogger.warn('Cannot play - video not ready');
            return;
        }
        
        try {
            await video.play();
        } catch (error) {
            videoSyncLogger.error('Play failed', { error });
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
    
    const setVolume = useCallback((volume: number) => {
        const video = videoRef.current;
        if (!video) return;
        
        video.volume = Math.max(0, Math.min(1, volume));
    }, []);
    
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        
        video.muted = !video.muted;
    }, []);
    
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