// Host video hook wrapper
import { useCallback } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useHostVideoSync } from './useHostVideoSync';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
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
    isVideoReady: boolean;
    isPresentationReady: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UseHostVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const useHostVideo = ({ sessionId, sourceUrl, isEnabled }: UseHostVideoProps): UseHostVideoReturn => {
    // Use the new host video sync hook
    const { videoRef, state, play: playVideo, pause: pauseVideo, seek, setVolume, toggleMute } = useHostVideoSync({
        sessionId: isEnabled ? sessionId : null,
        sourceUrl: isEnabled ? sourceUrl : null
    });
    
    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);
    
    // Wrapped control functions that handle the time parameter
    const play = useCallback(async (time?: number) => {
        if (time !== undefined) {
            await seek(time);
        }
        await playVideo();
    }, [playVideo, seek]);
    
    const pause = useCallback(async (time?: number) => {
        if (time !== undefined) {
            await seek(time);
        }
        await pauseVideo();
    }, [pauseVideo, seek]);
    
    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        return createVideoProps({
            videoRef,
            muted: state.presentationConnected, // Host muted when presentation is active
            onVideoEnd,
            onError
        });
    }, [videoRef, state.presentationConnected]);
    
    return {
        videoRef,
        play,
        pause,
        seek,
        setVolume,
        toggleMute,
        isConnectedToPresentation: state.presentationConnected,
        presentationMuted: state.isMuted,
        presentationVolume: state.volume,
        isVideoReady: state.hostReady,
        isPresentationReady: state.presentationReady,
        getVideoProps
    };
};