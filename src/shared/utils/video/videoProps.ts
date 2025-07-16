// src/shared/utils/video/videoProps.ts
import { RefObject, useEffect } from 'react';

export interface VideoElementProps {
    ref: RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    muted: boolean;
    preload: string;
    crossOrigin: string;
    style: React.CSSProperties;
    onEnded?: () => void;
    onError?: () => void;
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
    const { videoRef, muted, onVideoEnd, onError } = config; // Default to false

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
        muted,
        // Chrome + Supabase optimizations
        preload: isChrome ? 'metadata' : 'auto',
        crossOrigin: 'anonymous',
        style: {
            width: '100%',
            height: '100%',
            objectFit: 'contain' as const,
        },
        onEnded: onVideoEnd,
        onError: onError,
    };
};

/**
 * Hook to apply Chrome/Supabase-specific optimizations to video elements
 * This helps prevent video loading issues in Chrome when using Supabase-hosted videos
 */
export const useChromeSupabaseOptimizations = (
    videoRef: RefObject<HTMLVideoElement>,
    sourceUrl: string | null
) => {
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !sourceUrl) return;

        // Only apply optimizations for Chrome
        const isChrome = navigator.userAgent.includes('Chrome');
        if (!isChrome) return;

        // Chrome-specific optimizations for Supabase videos
        const applyOptimizations = () => {
            // Force metadata preload to prevent aggressive buffering
            video.preload = 'metadata';

            // Set a reasonable buffer size hint (if supported)
            if ('buffered' in video) {
                video.setAttribute('preload', 'metadata');
            }
        };

        applyOptimizations();

        // Reapply on source changes
        video.addEventListener('loadstart', applyOptimizations);

        return () => {
            video.removeEventListener('loadstart', applyOptimizations);
        };
    }, [videoRef, sourceUrl]);
};