// src/shared/utils/video/videoSyncUtils.ts
import { HostCommand } from '@core/sync/types';

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
export const HOST_MUTE_CHECK_INTERVAL = 100; // ms

// Sync interval management
export const createSyncInterval = (
    videoRef: React.RefObject<HTMLVideoElement>,
    isConnected: boolean,
    sendCommand: (action: string, data?: any) => void
): NodeJS.Timeout | null => {
    if (!isConnected) return null;

    return setInterval(() => {
        const video = videoRef.current;
        if (video && !video.paused) {
            sendCommand('sync', {
                time: video.currentTime,
                playbackRate: video.playbackRate,
            });
        }
    }, SYNC_INTERVAL_MS);
};

// Video state utilities
export const getVideoState = (video: HTMLVideoElement): VideoSyncState => ({
    time: video.currentTime,
    playbackRate: video.playbackRate,
    volume: video.volume,
    muted: video.muted,
});

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

// Command handling utilities
export const applyVideoCommand = async (
    video: HTMLVideoElement,
    command: HostCommand,
    isBuffering: boolean = false
): Promise<void> => {
    // Update playback rate if provided
    if (command.data?.playbackRate && video.playbackRate !== command.data.playbackRate) {
        video.playbackRate = command.data.playbackRate;
    }

    switch (command.action) {
        case 'play':
            await handlePlayCommand(video, command.data);
            break;

        case 'pause':
            handlePauseCommand(video, command.data);
            break;

        case 'seek':
            handleSeekCommand(video, command.data);
            break;

        case 'volume':
            handleVolumeCommand(video, command.data);
            break;

        case 'sync':
            handleSyncCommand(video, command.data, isBuffering);
            break;

        case 'reset':
            handleResetCommand(video);
            break;

        case 'close_presentation':
            window.close();
            break;
    }
};

// Individual command handlers
export const handlePlayCommand = async (
    video: HTMLVideoElement,
    data?: VideoCommandData
): Promise<void> => {
    // Apply time if provided
    if (data?.time !== undefined && shouldSyncTime(video.currentTime, data.time)) {
        video.currentTime = data.time;
    }

    // Apply volume settings if provided
    if (data?.volume !== undefined) {
        video.volume = data.volume;
    }
    if (data?.muted !== undefined) {
        video.muted = data.muted;
    }

    // Wait for video to be ready before playing
    if (!isVideoReady(video)) {
        await waitForVideoReady(video);
    }

    await video.play();
};

export const handlePauseCommand = (
    video: HTMLVideoElement,
    data?: VideoCommandData
): void => {
    video.pause();
    if (data?.time !== undefined) {
        video.currentTime = data.time;
    }
};

export const handleSeekCommand = (
    video: HTMLVideoElement,
    data?: VideoCommandData
): void => {
    if (data?.time !== undefined) {
        video.currentTime = data.time;
    }
};

export const handleVolumeCommand = (
    video: HTMLVideoElement,
    data?: VideoCommandData
): void => {
    if (data?.volume !== undefined) {
        video.volume = data.volume;
    }
    if (data?.muted !== undefined) {
        video.muted = data.muted;
    }
};

export const handleSyncCommand = (
    video: HTMLVideoElement,
    data?: VideoCommandData,
    isBuffering: boolean = false
): void => {
    if (data?.time === undefined || video.paused || isBuffering) {
        return;
    }

    // DO NOT SYNC EVER

    // // Don't sync during the first few seconds to prevent audio cutout
    // if (shouldProtectAudio(video.currentTime)) {
    //     return;
    // }
    //
    // if (shouldSyncTime(video.currentTime, data.time)) {
    //     video.currentTime = data.time;
    // }
};

export const handleResetCommand = (video: HTMLVideoElement): void => {
    video.pause();
    video.currentTime = 0;
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

// Source change detection
export const isNewVideoSource = (
    currentSrc: string,
    newSrc: string | null,
    previousSrc: string | null
): boolean => {
    return currentSrc !== newSrc && previousSrc !== newSrc;
};

// Host connection handling
export const handleHostConnection = (
    video: HTMLVideoElement,
    isConnected: boolean,
    presentationVolume: number,
    presentationMuted: boolean,
    sendCommand: (action: string, data?: any) => void
): (() => void) | null => {
    if (!isConnected) {
        video.muted = false;
        return null;
    }

    // Mute host when presentation connects
    video.muted = true;

    // Send current state to presentation
    const wasPlaying = !video.paused;
    if (wasPlaying && isVideoReady(video)) {
        sendCommand('play', {
            time: video.currentTime,
            playbackRate: video.playbackRate,
            volume: presentationVolume,
            muted: presentationMuted,
        });
    } else {
        sendCommand('pause', {
            time: video.currentTime,
            playbackRate: video.playbackRate,
        });
    }

    // Always send volume state when connecting
    sendCommand('volume', {
        volume: presentationVolume,
        muted: presentationMuted,
    });

    // Return cleanup function for mute enforcement
    const interval = setInterval(() => {
        if (!video.muted) {
            video.muted = true;
        }
    }, HOST_MUTE_CHECK_INTERVAL);

    return () => clearInterval(interval);
};

// Autoplay handling
export const setupAutoplay = async (
    video: HTMLVideoElement,
    sourceUrl: string,
    play: (time?: number) => Promise<void>,
    isConnected: boolean,
    presentationVolume: number,
    presentationMuted: boolean,
    sendCommand: (action: string, data?: any) => void
): Promise<void> => {
    video.src = sourceUrl;
    video.load();

    await waitForVideoReady(video);
    
    try {
        await play(0); // Start from beginning

        // Apply volume settings when video loads
        if (isConnected) {
            sendCommand('volume', {
                volume: presentationVolume,
                muted: presentationMuted,
            });
        }
    } catch (error) {
        console.error('[VideoSync] Autoplay failed:', error);
        throw error;
    }
};

// Video event logging
export const createVideoEventLogger = (prefix: string) => {
    return (eventType: string, video: HTMLVideoElement) => {
        console.log(`[${prefix}] 🎥 VIDEO EVENT: ${eventType}`, {
            currentTime: video.currentTime,
            duration: video.duration,
            paused: video.paused,
            ended: video.ended,
            muted: video.muted,
            volume: video.volume,
            readyState: video.readyState,
            networkState: video.networkState,
            buffered: video.buffered.length > 0 
                ? `${video.buffered.start(0)}-${video.buffered.end(0)}` 
                : 'none',
            src: video.src,
            currentSrc: video.currentSrc,
            error: video.error 
                ? `${video.error.code}: ${video.error.message}` 
                : null
        });
    };
};

// Force play utility for presentation
export const forcePlayFromBeginning = async (video: HTMLVideoElement): Promise<void> => {
    console.log('[VideoSync] Force play - attempting to play from beginning...');
    
    try {
        // Ensure we start from the very beginning
        video.currentTime = 0;
        
        // Wait for full loading to ensure audio is ready
        if (!isVideoFullyLoaded(video)) {
            await waitForVideoFullyLoaded(video);
        }
        
        // Double-check we're still at the beginning
        if (video.currentTime !== 0) {
            video.currentTime = 0;
        }
        
        await video.play();
        console.log('[VideoSync] Force play - SUCCESS!');
    } catch (error) {
        console.error('[VideoSync] Force play - FAILED:', error);
        throw error;
    }
};