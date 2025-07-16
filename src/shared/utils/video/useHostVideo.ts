// Simplified host video hook
import { useCallback, useEffect, useRef } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useSimpleVideoSync } from './useSimpleVideoSync';
import { hostVideoLogger } from './videoLogger';

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
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UseHostVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const useHostVideo = ({ sessionId, sourceUrl, isEnabled }: UseHostVideoProps): UseHostVideoReturn => {
    // Use the simplified sync hook
    const { videoRef, state, controls, audioTarget } = useSimpleVideoSync({
        sessionId,
        sourceUrl,
        isEnabled
    });
    
    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);
    
    // Wrapped control functions that handle the time parameter
    const play = useCallback(async (time?: number) => {
        if (time !== undefined) {
            await controls.seek(time);
        }
        await controls.play();
    }, [controls]);
    
    const pause = useCallback(async (time?: number) => {
        if (time !== undefined) {
            await controls.seek(time);
        }
        await controls.pause();
    }, [controls]);
    
    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        return createVideoProps({
            videoRef,
            muted: audioTarget === 'presentation', // Host muted when presentation is active
            onVideoEnd,
            onError
        });
    }, [videoRef, audioTarget]);
    
    return {
        videoRef,
        play,
        pause,
        seek: controls.seek,
        setVolume: controls.setVolume,
        toggleMute: controls.toggleMute,
        isConnectedToPresentation: state.presentationConnected,
        presentationMuted: state.isMuted,
        presentationVolume: state.volume,
        getVideoProps
    };
};