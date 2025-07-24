// src/shared/utils/video/videoProps.ts
import { RefObject, useEffect } from 'react';

/**
 * Detect Windows platform for video optimizations
 */
const isWindows = (): boolean => {
    return navigator.platform.toLowerCase().includes('win') || 
           navigator.userAgent.toLowerCase().includes('windows');
};

/**
 * Detect Chromium-based browsers (Chrome, Brave, Edge)
 */
const isChromiumBrowser = (): boolean => {
    return navigator.userAgent.includes('Chrome') || 
           navigator.userAgent.includes('Chromium') ||
           navigator.userAgent.includes('Brave');
};

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
    autoPlay?: boolean; // Make autoPlay configurable
}

/**
 * Shared video props generator with Chrome/Supabase optimizations
 * Consolidates all video element properties in one place to prevent inconsistencies
 */
export const createVideoProps = (config: VideoPropsConfig): VideoElementProps => {
    const { videoRef, muted, onVideoEnd, onError, autoPlay = false } = config;

    // Store callbacks for event handlers
    if (onVideoEnd && videoRef.current) {
        (videoRef.current as any)._onEnded = onVideoEnd;
    }
    if (onError && videoRef.current) {
        (videoRef.current as any)._onError = onError;
    }

    const isChrome = isChromiumBrowser();
    const isWindowsPlatform = isWindows();
    
    // Windows Chrome/Brave specific optimizations
    const needsWindowsFix = isWindowsPlatform && isChrome;

    return {
        ref: videoRef,
        playsInline: true,
        controls: false,
        autoPlay,
        muted,
        // Windows + Chrome specific preload strategy
        preload: needsWindowsFix ? 'auto' : (isChrome ? 'metadata' : 'auto'),
        crossOrigin: 'anonymous',
        style: {
            width: '100%',
            height: '100%',
            objectFit: 'contain' as const,
            // Force hardware acceleration on Windows Chrome
            ...(needsWindowsFix && {
                transform: 'translateZ(0)',
                willChange: 'transform',
                WebkitTransform: 'translateZ(0)',
                WebkitBackfaceVisibility: 'hidden',
                WebkitPerspective: '1000px'
            })
        },
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

        const isChrome = isChromiumBrowser();
        const isWindowsPlatform = isWindows();
        const needsWindowsFix = isWindowsPlatform && isChrome;
        
        if (!isChrome) return;

        const applyOptimizations = () => {
            if (needsWindowsFix) {
                // Windows Chrome specific fixes
                video.preload = 'auto'; // Force full preload on Windows
                video.setAttribute('preload', 'auto');
                
                // Force hardware acceleration attributes
                video.style.transform = 'translateZ(0)';
                video.style.willChange = 'transform';
                video.style.webkitTransform = 'translateZ(0)';
                video.style.webkitBackfaceVisibility = 'hidden';
                
                // Additional Windows fixes
                video.setAttribute('webkit-playsinline', 'true');
                video.setAttribute('x5-playsinline', 'true');
                
                // Force video to redraw after a brief delay (Windows fix)
                setTimeout(() => {
                    if (video.videoWidth > 0 && video.videoHeight > 0 && video.paused === false) {
                        const currentTransform = video.style.transform;
                        video.style.transform = 'translateZ(1px)';
                        requestAnimationFrame(() => {
                            video.style.transform = currentTransform;
                        });
                    }
                }, 100);
            } else {
                // Standard Chrome optimizations
                video.preload = 'metadata';
                video.setAttribute('preload', 'metadata');
            }
        };

        applyOptimizations();
        
        // Reapply on source changes
        video.addEventListener('loadstart', applyOptimizations);
        
        // Windows-specific: Add additional event listener to force refresh
        if (needsWindowsFix) {
            const handleLoadedData = () => {
                // Force a refresh when video data is loaded but no visual
                setTimeout(() => {
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        // Trigger a repaint by temporarily changing opacity
                        const originalOpacity = video.style.opacity;
                        video.style.opacity = '0.99';
                        requestAnimationFrame(() => {
                            video.style.opacity = originalOpacity || '1';
                        });
                    }
                }, 50);
            };
            
            video.addEventListener('loadeddata', handleLoadedData);
            
            return () => {
                video.removeEventListener('loadstart', applyOptimizations);
                video.removeEventListener('loadeddata', handleLoadedData);
            };
        }

        return () => {
            video.removeEventListener('loadstart', applyOptimizations);
        };
    }, [videoRef, sourceUrl]);
};