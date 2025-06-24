// File: src/shared/utils/video/videoProps.ts
import { RefObject, useEffect } from 'react';

export interface VideoElementProps {
    ref: RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    autoPlay: boolean;
    muted: boolean;
    preload: string;
    crossOrigin: string;
    style: React.CSSProperties;
}

export interface VideoPropsConfig {
    videoRef: RefObject<HTMLVideoElement>;
    muted: boolean;
    onVideoEnd?: () => void;
    onError?: () => void;
}

/**
 * Shared video props generator with Chrome/Supabase optimizations
 * Consolidates all video element properties in one place to prevent inconsistencies
 */
export const createVideoProps = (config: VideoPropsConfig): VideoElementProps => {
    const { videoRef, muted, onVideoEnd, onError } = config;

    // Store callbacks for event handlers (if your hooks need this pattern)
    if (onVideoEnd && videoRef.current) {
        (videoRef.current as any)._onEnded = onVideoEnd;
    }
    if (onError && videoRef.current) {
        (videoRef.current as any)._onError = onError;
    }

    // Chrome detection for optimizations
    const isChrome = navigator.userAgent.includes('Chrome');

    return {
        ref: videoRef,
        playsInline: true,
        controls: false,
        autoPlay: true,
        muted,
        // Chrome + Supabase optimizations
        preload: isChrome ? 'auto' : 'metadata',
        crossOrigin: 'anonymous',
        style: {
            width: '100%',
            height: '100%',
            objectFit: 'contain' as const
        }
    };
};

/**
 * Chrome-specific buffer stall detection hook
 * Call this in both video hooks to prevent Chrome + Supabase stalling
 */
export const useChromeSupabaseOptimizations = (
    videoRef: RefObject<HTMLVideoElement>,
    sourceUrl: string | null
) => {

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !sourceUrl) return;

        const isChrome = navigator.userAgent.includes('Chrome');
        if (!isChrome) return;

        // Pre-connect to Supabase domain for better connection handling
        const handleLoadStart = () => {
            try {
                const supabaseUrl = new URL(sourceUrl);
                const existingLink = document.querySelector(`link[href="${supabaseUrl.origin}"]`);

                if (!existingLink) {
                    const link = document.createElement('link');
                    link.rel = 'preconnect';
                    link.href = supabaseUrl.origin;
                    document.head.appendChild(link);
                }
            } catch (error) {
                console.warn('[Video] Failed to preconnect to video URL:', error);
            }
        };

        // Chrome stall detection for Supabase
        let stallCount = 0;
        let lastBufferedEnd = 0;

        const checkBufferHealth = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);

                // If buffer hasn't grown and we're not at the end
                if (bufferedEnd === lastBufferedEnd &&
                    video.currentTime < video.duration - 1 &&
                    !video.paused &&
                    video.readyState < 3) { // Not enough data

                    stallCount++;

                    if (stallCount > 2) { // 2 seconds of no buffer growth
                        console.log('[Chrome+Supabase Fix] Buffer stall detected, nudging playback');
                        // Gentle nudge - seek to current position to trigger new range request
                        const currentTime = video.currentTime;
                        video.currentTime = currentTime + 0.01;
                        video.currentTime = currentTime;
                        stallCount = 0;
                    }
                } else {
                    stallCount = 0;
                }

                lastBufferedEnd = bufferedEnd;
            }
        };

        video.addEventListener('loadstart', handleLoadStart);
        const healthCheckInterval = setInterval(checkBufferHealth, 1000);

        return () => {
            video.removeEventListener('loadstart', handleLoadStart);
            clearInterval(healthCheckInterval);
        };
    }, [sourceUrl]);
};