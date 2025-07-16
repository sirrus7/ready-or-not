// Presentation video hook wrapper
import { useCallback } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { usePresentationVideoSync } from './usePresentationVideoSync';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    muted: boolean;
    preload: string;
    crossOrigin?: string;
    style: React.CSSProperties;
}

interface UsePresentationVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    isVideoReady: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UsePresentationVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const usePresentationVideo = ({ sessionId, sourceUrl, isEnabled }: UsePresentationVideoProps): UsePresentationVideoReturn => {
    // Use the new presentation video sync hook
    const { videoRef, state } = usePresentationVideoSync({
        sessionId: isEnabled ? sessionId : null,
        sourceUrl: isEnabled ? sourceUrl : null
    });
    
    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);
    
    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        return createVideoProps({
            videoRef,
            muted: state.isMuted,
            onVideoEnd,
            onError
        });
    }, [videoRef, state.isMuted]);
    
    return {
        videoRef,
        isVideoReady: state.isReady,
        getVideoProps
    };
};