// src/shared/utils/video/hostVideoUtils.ts
// Host-specific video utilities with extensive logging

import { SyncAction } from '@shared/types';
import { isVideoReady, SYNC_INTERVAL_MS } from './commonVideoUtils';
import { HostCommand } from '@core/sync';
import { hostLogger } from './videoLogger';

// Constants
export const HOST_MUTE_CHECK_INTERVAL = 100; // ms

// Logging utilities
export const logHostVideoState = (context: string, video: HTMLVideoElement | null, extra?: Record<string, any>) => {
    if (!video) {
        hostLogger.log(`${context} - No video element`, { emoji: '🎥', data: extra });
        return;
    }
    
    hostLogger.log(context, {
        emoji: '🎥',
        data: {
        // Basic state
        currentTime: video.currentTime.toFixed(2),
        duration: video.duration.toFixed(2),
        paused: video.paused,
        ended: video.ended,
        
        // Audio state
        volume: video.volume.toFixed(2),
        muted: video.muted,
        
        // Ready states
        readyState: video.readyState,
        readyStateText: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][video.readyState],
        networkState: video.networkState,
        networkStateText: ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'][video.networkState],
        
        // Buffer state
        buffered: video.buffered.length > 0 
            ? `${video.buffered.start(0).toFixed(2)}-${video.buffered.end(0).toFixed(2)}` 
            : 'none',
        
        // Source info
        src: video.src?.substring(video.src.lastIndexOf('/') + 1) || 'none',
        currentSrc: video.currentSrc?.substring(video.currentSrc.lastIndexOf('/') + 1) || 'none',
        
        // Error state
        error: video.error ? `${video.error.code}: ${video.error.message}` : null,
        
        // Extra context
        ...extra
        }
    });
};

// Sync interval management with logging
export const createSyncInterval = (
    videoRef: React.RefObject<HTMLVideoElement>,
    isConnected: boolean,
    sendCommand: (action: SyncAction, data?: HostCommand['data']) => void
): NodeJS.Timeout | null => {
    if (!isConnected) {
        hostLogger.log('Sync interval NOT created - not connected', { emoji: '🔄' });
        return null;
    }

    hostLogger.log('Creating sync interval', { emoji: '🔄' });
    let syncCount = 0;
    
    return setInterval(() => {
        const video = videoRef.current;
        if (video && !video.paused) {
            syncCount++;
            const syncData = {
                time: video.currentTime,
                playbackRate: video.playbackRate,
            };
            
            // Log every 10th sync to reduce noise, or first 3 syncs
            if (syncCount <= 3 || syncCount % 10 === 0) {
                hostLogger.log(`Sync #${syncCount}`, { emoji: '📡', data: syncData });
            }
            
            sendCommand('sync', syncData);
        }
    }, SYNC_INTERVAL_MS);
};

// Source change detection with logging
export const isNewVideoSource = (
    currentSrc: string,
    newSrc: string | null,
    previousSrc: string | null
): boolean => {
    const isNew = currentSrc !== newSrc && previousSrc !== newSrc;
    
    hostLogger.log('Source change detection', {
        emoji: '🔍',
        data: {
            currentSrc: currentSrc?.substring(currentSrc.lastIndexOf('/') + 1) || 'none',
            newSrc: newSrc?.substring(newSrc.lastIndexOf('/') + 1) || 'none', 
            previousSrc: previousSrc?.substring(previousSrc.lastIndexOf('/') + 1) || 'none',
            isNewVideo: isNew
        }
    });
    
    return isNew;
};

// Host connection handling with logging
export const handleHostConnection = (
    video: HTMLVideoElement,
    isConnected: boolean,
    presentationVolume: number,
    presentationMuted: boolean,
    sendCommand: (action: string, data?: Record<string, any>) => void
): (() => void) | null => {
    hostLogger.log('Connection handler called', { emoji: '🔌', data: { isConnected } });
    
    if (!isConnected) {
        hostLogger.log('Unmuting host - presentation disconnected', { emoji: '🔇' });
        video.muted = false;
        logHostVideoState('After unmuting', video);
        return null;
    }

    // Mute host when presentation connects
    hostLogger.log('Muting host - presentation connected', { emoji: '🔇' });
    video.muted = true;
    logHostVideoState('After muting', video);

    // Send current state to presentation
    const wasPlaying = !video.paused;
    hostLogger.log('Sending initial state to presentation', {
        emoji: '📤',
        data: {
            wasPlaying,
            isReady: isVideoReady(video),
            presentationVolume,
            presentationMuted
        }
    });
    
    if (wasPlaying && isVideoReady(video)) {
        const playData = {
            time: video.currentTime,
            playbackRate: video.playbackRate,
            volume: presentationVolume,
            muted: presentationMuted,
        };
        hostLogger.log('Sending play command', { emoji: '▶️', data: playData });
        sendCommand('play', playData);
    } else {
        const pauseData = {
            time: video.currentTime,
            playbackRate: video.playbackRate,
        };
        hostLogger.log('Sending pause command', { emoji: '⏸️', data: pauseData });
        sendCommand('pause', pauseData);
    }

    // Always send volume state when connecting
    const volumeData = {
        volume: presentationVolume,
        muted: presentationMuted,
    };
    hostLogger.log('Sending volume state', { emoji: '🔊', data: volumeData });
    sendCommand('volume', volumeData);

    // Return cleanup function for mute enforcement
    hostLogger.log('Starting mute enforcement interval', { emoji: '🛡️' });
    let muteCheckCount = 0;
    
    const interval = setInterval(() => {
        if (!video.muted) {
            muteCheckCount++;
            hostLogger.warn(`Host unmuted while connected! Re-muting (occurrence #${muteCheckCount})`, { emoji: '⚠️' });
            video.muted = true;
        }
    }, HOST_MUTE_CHECK_INTERVAL);

    return () => {
        hostLogger.log('Stopping mute enforcement interval', { emoji: '🛑' });
        clearInterval(interval);
    };
};

// Play command with logging
export const executePlay = async (
    video: HTMLVideoElement,
    time: number | undefined,
    isConnected: boolean,
    sendCommand: (action: string, data?: Record<string, any>) => void
): Promise<void> => {
    hostLogger.log('Executing play command', { emoji: '▶️', data: { time, isConnected } });
    logHostVideoState('Before play', video);
    
    try {
        if (time !== undefined) {
            hostLogger.log(`Seeking to time: ${time}`, { emoji: '⏩' });
            video.currentTime = time;
        }

        // Update local video
        await video.play();
        hostLogger.log('Play successful', { emoji: '✅' });
        logHostVideoState('After play', video);

        // Send command if connected
        if (isConnected) {
            const playData = {
                time: video.currentTime,
                playbackRate: video.playbackRate,
            };
            hostLogger.log('Sending play command to presentation', { emoji: '📤', data: playData });
            sendCommand('play', playData);
        }
    } catch (error) {
        hostLogger.error('Play failed', { emoji: '❌', data: error });
        logHostVideoState('After play error', video);
        throw error;
    }
};

// Pause command with logging
export const executePause = (
    video: HTMLVideoElement,
    time: number | undefined,
    isConnected: boolean,
    sendCommand: (action: string, data?: Record<string, any>) => void
): void => {
    hostLogger.log('Executing pause command', { emoji: '⏸️', data: { time, isConnected } });
    logHostVideoState('Before pause', video);
    
    // Update local video
    video.pause();
    if (time !== undefined) {
        hostLogger.log(`Seeking to time: ${time}`, { emoji: '⏩' });
        video.currentTime = time;
    }
    
    logHostVideoState('After pause', video);

    // Send command if connected
    if (isConnected) {
        const pauseData = {
            time: video.currentTime,
        };
        hostLogger.log('Sending pause command to presentation', { emoji: '📤', data: pauseData });
        sendCommand('pause', pauseData);
    }
};

// Seek command with logging
export const executeSeek = (
    video: HTMLVideoElement,
    time: number,
    isConnected: boolean,
    sendCommand: (action: string, data?: Record<string, any>) => void
): void => {
    hostLogger.log('Executing seek command', { emoji: '⏩', data: { time, isConnected } });
    logHostVideoState('Before seek', video);
    
    // Update local video
    video.currentTime = time;
    
    logHostVideoState('After seek', video);

    // Send command if connected
    if (isConnected) {
        hostLogger.log('Sending seek command to presentation', { emoji: '📤', data: { time } });
        sendCommand('seek', { time });
    }
};

// Volume control with logging
export const executeVolumeChange = (
    video: HTMLVideoElement,
    volume: number,
    presentationMuted: boolean,
    isConnected: boolean,
    sendCommand: (action: string, data?: Record<string, any>) => void
): void => {
    hostLogger.log('Executing volume change', {
        emoji: '🔊',
        data: { 
            volume, 
            presentationMuted, 
            isConnected,
            hostCurrentVolume: video.volume,
            hostCurrentMuted: video.muted
        }
    });
    
    if (isConnected) {
        // Don't change host volume, just send to presentation
        const volumeData = {
            volume,
            muted: presentationMuted,
        };
        hostLogger.log('Sending volume command to presentation', { emoji: '📤', data: volumeData });
        sendCommand('volume', volumeData);
    } else {
        // Change host volume when not connected
        hostLogger.log(`Setting host volume: ${volume}`, { emoji: '🔊' });
        video.volume = volume;
        logHostVideoState('After volume change', video);
    }
};

// Mute toggle with logging
export const executeMuteToggle = (
    video: HTMLVideoElement,
    presentationMuted: boolean,
    presentationVolume: number,
    isConnected: boolean,
    sendCommand: (action: string, data?: Record<string, any>) => void
): boolean => {
    hostLogger.log('Executing mute toggle', {
        emoji: '🔇',
        data: { 
            presentationMuted, 
            isConnected,
            hostCurrentMuted: video.muted
        }
    });
    
    if (isConnected) {
        // Toggle presentation mute state
        const newMuted = !presentationMuted;
        const volumeData = {
            volume: presentationVolume,
            muted: newMuted,
        };
        hostLogger.log('Sending mute toggle to presentation', { emoji: '📤', data: volumeData });
        sendCommand('volume', volumeData);
        return newMuted;
    } else {
        // Toggle host mute when not connected
        const newMuted = !video.muted;
        hostLogger.log(`Toggling host mute: ${newMuted}`, { emoji: '🔇' });
        video.muted = newMuted;
        logHostVideoState('After mute toggle', video);
        return newMuted;
    }
};