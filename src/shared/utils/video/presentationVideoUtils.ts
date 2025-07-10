// src/shared/utils/video/presentationVideoUtils.ts
// Presentation-specific video utilities

import { HostCommand } from '@core/sync/types';
import { 
    VideoCommandData, 
    isVideoReady, 
    isVideoFullyLoaded,
    shouldSyncTime,
    waitForVideoReady,
    waitForVideoFullyLoaded
} from './commonVideoUtils';

// Command handling
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
const handlePlayCommand = async (
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

const handlePauseCommand = (
    video: HTMLVideoElement,
    data?: VideoCommandData
): void => {
    video.pause();
    if (data?.time !== undefined) {
        video.currentTime = data.time;
    }
};

const handleSeekCommand = (
    video: HTMLVideoElement,
    data?: VideoCommandData
): void => {
    if (data?.time !== undefined) {
        video.currentTime = data.time;
    }
};

const handleVolumeCommand = (
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

const handleSyncCommand = (
    video: HTMLVideoElement,
    data?: VideoCommandData,
    isBuffering: boolean = false
): void => {
    if (data?.time === undefined || video.paused || isBuffering) {
        return;
    }

    // DO NOT SYNC EVER - sync is disabled to prevent audio issues
    // The sync logic is commented out but preserved for reference
    
    // // Don't sync during the first few seconds to prevent audio cutout
    // if (shouldProtectAudio(video.currentTime)) {
    //     return;
    // }
    //
    // if (shouldSyncTime(video.currentTime, data.time)) {
    //     video.currentTime = data.time;
    // }
};

const handleResetCommand = (video: HTMLVideoElement): void => {
    video.pause();
    video.currentTime = 0;
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
    console.log('[Presentation] Force play - attempting to play from beginning...');
    
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
        console.log('[Presentation] Force play - SUCCESS!');
    } catch (error) {
        console.error('[Presentation] Force play - FAILED:', error);
        throw error;
    }
};