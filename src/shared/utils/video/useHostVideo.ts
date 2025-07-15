// Simplified host video hook
import { useCallback, useEffect, useRef } from 'react';
import { createVideoProps, useChromeSupabaseOptimizations } from '@shared/utils/video/videoProps';
import { useSimpleVideoSync } from './useSimpleVideoSync';
import { hostVideoLogger } from './videoLogger';

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
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UseHostVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
    autoPlay?: boolean;
}

export const useHostVideo = ({ sessionId, sourceUrl, isEnabled, autoPlay = false }: UseHostVideoProps): UseHostVideoReturn => {
    // Use the simplified sync hook
    const { videoRef, state, controls, audioTarget } = useSimpleVideoSync({
        sessionId,
        sourceUrl,
        isEnabled
    });
    
    // Track if we've auto-played this source
    const autoPlayedRef = useRef<string | null>(null);
    
    // Use Chrome/Supabase optimizations
    useChromeSupabaseOptimizations(videoRef, sourceUrl);
    
    // Auto-play when video is ready
    useEffect(() => {
        if (autoPlay && state.hostReady && sourceUrl && autoPlayedRef.current !== sourceUrl) {
            // Wait for both videos to be ready if presentation is connected
            if (state.presentationConnected && !state.presentationReady) {
                hostVideoLogger.log('Waiting for presentation to be ready before auto-play');
                return;
            }
            
            hostVideoLogger.log('Auto-playing video', {
                data: {
                    hostReady: state.hostReady,
                    presentationReady: state.presentationReady,
                    presentationConnected: state.presentationConnected
                }
            });
            autoPlayedRef.current = sourceUrl;
            controls.play();
        }
    }, [autoPlay, state.hostReady, state.presentationReady, state.presentationConnected, sourceUrl, controls]);
    
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
            autoPlay,
            onVideoEnd,
            onError
        });
    }, [videoRef, audioTarget, autoPlay]);
    
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