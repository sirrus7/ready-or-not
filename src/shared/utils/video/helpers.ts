// src/shared/utils/video/helpers.ts - Simplified basic utilities only

/**
 * Simple video detection based on URL
 */
export const isVideo = (url?: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes(".mp4") ||
        lowerUrl.includes(".webm") ||
        lowerUrl.includes(".ogg") ||
        lowerUrl.includes(".mov");
};

/**
 * Get basic video state information
 */
export const getVideoInfo = (video: HTMLVideoElement | null) => {
    if (!video) return null;

    return {
        currentTime: video.currentTime,
        duration: video.duration || 0,
        playing: !video.paused,
        volume: video.volume,
        muted: video.muted,
        readyState: video.readyState
    };
};

/**
 * Check if video is ready to play
 */
export const isVideoReady = (video: HTMLVideoElement | null): boolean => {
    if (!video) return false;
    return video.readyState >= 2; // HAVE_CURRENT_DATA or higher
};

/**
 * Format time in MM:SS format
 */
export const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
