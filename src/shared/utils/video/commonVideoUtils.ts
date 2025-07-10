// src/shared/utils/video/commonVideoUtils.ts
// Common utilities and interfaces shared between host and presentation

// Types
export interface VideoSyncState {
    time: number;
    playbackRate: number;
    volume?: number;
    muted?: boolean;
}

export interface VideoCommandData {
    time?: number;
    playbackRate?: number;
    volume?: number;
    muted?: boolean;
}

// Constants
export const SYNC_INTERVAL_MS = 200;
export const TIME_DRIFT_THRESHOLD = 0.5; // seconds
export const AUDIO_PROTECTION_DURATION = 3.0; // seconds

// Video state utilities
export const getVideoState = (video: HTMLVideoElement): VideoSyncState => ({
    time: video.currentTime,
    playbackRate: video.playbackRate,
    volume: video.volume,
    muted: video.muted,
});

// Video ready state checks
export const isVideoReady = (video: HTMLVideoElement): boolean => {
    return video.readyState >= 3; // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
};

export const isVideoFullyLoaded = (video: HTMLVideoElement): boolean => {
    return video.readyState >= 4; // HAVE_ENOUGH_DATA
};

// Time sync utilities
export const shouldSyncTime = (currentTime: number, targetTime: number): boolean => {
    return Math.abs(currentTime - targetTime) > TIME_DRIFT_THRESHOLD;
};

export const shouldProtectAudio = (currentTime: number): boolean => {
    return currentTime < AUDIO_PROTECTION_DURATION;
};

// Video loading utilities
export const waitForVideoReady = (video: HTMLVideoElement): Promise<void> => {
    return new Promise<void>((resolve) => {
        if (isVideoReady(video)) {
            resolve();
            return;
        }

        const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay);
            resolve();
        };
        video.addEventListener('canplay', handleCanPlay);
    });
};

export const waitForVideoFullyLoaded = (video: HTMLVideoElement): Promise<void> => {
    return new Promise<void>((resolve) => {
        if (isVideoFullyLoaded(video)) {
            resolve();
            return;
        }

        const handleCanPlayThrough = () => {
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            resolve();
        };
        video.addEventListener('canplaythrough', handleCanPlayThrough);
    });
};