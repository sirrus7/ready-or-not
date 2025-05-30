// src/utils/video/helpers.ts - Enhanced helper functions
import { VideoState } from './types';

// Simple video detection
export const isVideo = (url?: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes(".mp4") ||
        lowerUrl.includes(".webm") ||
        lowerUrl.includes(".ogg") ||
        lowerUrl.includes(".mov");
};

// Create initial video state
export const createInitialVideoState = (): VideoState => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    lastUpdate: Date.now()
});

// Get current state from video element
export const getVideoState = (video: HTMLVideoElement | null): VideoState | null => {
    if (!video) return null;

    return {
        playing: !video.paused,
        currentTime: video.currentTime,
        duration: video.duration || 0,
        volume: video.volume,
        lastUpdate: Date.now()
    };
};

// Enhanced sync checking with configurable tolerance
export const needsSync = (
    localState: VideoState,
    remoteState: VideoState,
    tolerance: number = 1.5 // Increased default tolerance
): { timeDiff: boolean; playStateDiff: boolean } => {
    const timeDiff = Math.abs(localState.currentTime - remoteState.currentTime) > tolerance;
    const playStateDiff = localState.playing !== remoteState.playing;

    return { timeDiff, playStateDiff };
};

// Enhanced throttle function with adaptive timing
export const shouldThrottleUpdate = (
    lastUpdate: number,
    throttleMs: number = 1000,
    isPlaying: boolean = false
): boolean => {
    // More frequent updates when playing for better sync
    const adaptiveThrottle = isPlaying ? throttleMs * 0.5 : throttleMs;
    return (Date.now() - lastUpdate) < adaptiveThrottle;
};

// Calculate optimal sync timing
export const calculateSyncTiming = (
    localTime: number,
    remoteTime: number,
    tolerance: number = 1.5
): 'immediate' | 'gradual' | 'none' => {
    const difference = Math.abs(localTime - remoteTime);

    if (difference > tolerance * 2) {
        return 'immediate'; // Large difference, sync immediately
    } else if (difference > tolerance) {
        return 'gradual'; // Medium difference, sync gradually
    } else {
        return 'none'; // Small difference, no sync needed
    }
};

// Video readiness check
export const isVideoReady = (video: HTMLVideoElement | null): boolean => {
    if (!video) return false;
    return video.readyState >= 2; // HAVE_CURRENT_DATA or higher
};

// Safe video operation wrapper
export const safeVideoOperation = async (
    operation: () => Promise<void>,
    context: string = 'video operation'
): Promise<boolean> => {
    try {
        await operation();
        return true;
    } catch (error) {
        console.warn(`[VideoHelpers] ${context} failed:`, error);
        return false;
    }
};
