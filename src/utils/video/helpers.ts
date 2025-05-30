// src/utils/video/helpers.ts - Pure helper functions
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

// Check if two video states need syncing
export const needsSync = (
    localState: VideoState,
    remoteState: VideoState,
    tolerance: number = 1.0
): { timeDiff: boolean; playStateDiff: boolean } => {
    const timeDiff = Math.abs(localState.currentTime - remoteState.currentTime) > tolerance;
    const playStateDiff = localState.playing !== remoteState.playing;

    return { timeDiff, playStateDiff };
};

// Throttle function for video state updates
export const shouldThrottleUpdate = (
    lastUpdate: number,
    throttleMs: number = 1000
): boolean => {
    return (Date.now() - lastUpdate) < throttleMs;
};
