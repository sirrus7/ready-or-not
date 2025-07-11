// src/shared/utils/video/hostVideoUtils.ts
// Host-specific video utilities with extensive logging

import { SyncAction } from '@shared/types';
import { isVideoReady, SYNC_INTERVAL_MS } from './commonVideoUtils';
import { HostCommand } from '@core/sync';

// Constants
export const HOST_MUTE_CHECK_INTERVAL = 100; // ms

// Logging utilities
export const logHostVideoState = (context: string, video: HTMLVideoElement | null, extra?: Record<string, any>) => {
    if (!video) {
        console.log(`[Host] 🎥 ${context} - No video element`, extra);
        return;
    }
    
    console.log(`[Host] 🎥 ${context}`, {
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
    });
};

// Sync interval management with logging
export const createSyncInterval = (
    videoRef: React.RefObject<HTMLVideoElement>,
    isConnected: boolean,
    sendCommand: (action: SyncAction, data?: HostCommand['data']) => void
): NodeJS.Timeout | null => {
    if (!isConnected) {
        console.log('[Host] 🔄 Sync interval NOT created - not connected');
        return null;
    }

    console.log('[Host] 🔄 Creating sync interval');
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
                console.log(`[Host] 📡 Sync #${syncCount}`, syncData);
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
    
    console.log('[Host] 🔍 Source change detection:', {
        currentSrc: currentSrc?.substring(currentSrc.lastIndexOf('/') + 1) || 'none',
        newSrc: newSrc?.substring(newSrc.lastIndexOf('/') + 1) || 'none', 
        previousSrc: previousSrc?.substring(previousSrc.lastIndexOf('/') + 1) || 'none',
        isNewVideo: isNew
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
    console.log('[Host] 🔌 Connection handler called:', { isConnected });
    
    if (!isConnected) {
        console.log('[Host] 🔇 Unmuting host - presentation disconnected');
        video.muted = false;
        logHostVideoState('After unmuting', video);
        return null;
    }

    // Mute host when presentation connects
    console.log('[Host] 🔇 Muting host - presentation connected');
    video.muted = true;
    logHostVideoState('After muting', video);

    // Send current state to presentation
    const wasPlaying = !video.paused;
    console.log('[Host] 📤 Sending initial state to presentation:', {
        wasPlaying,
        isReady: isVideoReady(video),
        presentationVolume,
        presentationMuted
    });
    
    if (wasPlaying && isVideoReady(video)) {
        const playData = {
            time: video.currentTime,
            playbackRate: video.playbackRate,
            volume: presentationVolume,
            muted: presentationMuted,
        };
        console.log('[Host] ▶️ Sending play command:', playData);
        sendCommand('play', playData);
    } else {
        const pauseData = {
            time: video.currentTime,
            playbackRate: video.playbackRate,
        };
        console.log('[Host] ⏸️ Sending pause command:', pauseData);
        sendCommand('pause', pauseData);
    }

    // Always send volume state when connecting
    const volumeData = {
        volume: presentationVolume,
        muted: presentationMuted,
    };
    console.log('[Host] 🔊 Sending volume state:', volumeData);
    sendCommand('volume', volumeData);

    // Return cleanup function for mute enforcement
    console.log('[Host] 🛡️ Starting mute enforcement interval');
    let muteCheckCount = 0;
    
    const interval = setInterval(() => {
        if (!video.muted) {
            muteCheckCount++;
            console.warn(`[Host] ⚠️ Host unmuted while connected! Re-muting (occurrence #${muteCheckCount})`);
            video.muted = true;
        }
    }, HOST_MUTE_CHECK_INTERVAL);

    return () => {
        console.log('[Host] 🛑 Stopping mute enforcement interval');
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
    console.log('[Host] ▶️ Executing play command:', { time, isConnected });
    logHostVideoState('Before play', video);
    
    try {
        if (time !== undefined) {
            console.log(`[Host] ⏩ Seeking to time: ${time}`);
            video.currentTime = time;
        }

        // Update local video
        await video.play();
        console.log('[Host] ✅ Play successful');
        logHostVideoState('After play', video);

        // Send command if connected
        if (isConnected) {
            const playData = {
                time: video.currentTime,
                playbackRate: video.playbackRate,
            };
            console.log('[Host] 📤 Sending play command to presentation:', playData);
            sendCommand('play', playData);
        }
    } catch (error) {
        console.error('[Host] ❌ Play failed:', error);
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
    console.log('[Host] ⏸️ Executing pause command:', { time, isConnected });
    logHostVideoState('Before pause', video);
    
    // Update local video
    video.pause();
    if (time !== undefined) {
        console.log(`[Host] ⏩ Seeking to time: ${time}`);
        video.currentTime = time;
    }
    
    logHostVideoState('After pause', video);

    // Send command if connected
    if (isConnected) {
        const pauseData = {
            time: video.currentTime,
        };
        console.log('[Host] 📤 Sending pause command to presentation:', pauseData);
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
    console.log('[Host] ⏩ Executing seek command:', { time, isConnected });
    logHostVideoState('Before seek', video);
    
    // Update local video
    video.currentTime = time;
    
    logHostVideoState('After seek', video);

    // Send command if connected
    if (isConnected) {
        console.log('[Host] 📤 Sending seek command to presentation:', { time });
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
    console.log('[Host] 🔊 Executing volume change:', { 
        volume, 
        presentationMuted, 
        isConnected,
        hostCurrentVolume: video.volume,
        hostCurrentMuted: video.muted
    });
    
    if (isConnected) {
        // Don't change host volume, just send to presentation
        const volumeData = {
            volume,
            muted: presentationMuted,
        };
        console.log('[Host] 📤 Sending volume command to presentation:', volumeData);
        sendCommand('volume', volumeData);
    } else {
        // Change host volume when not connected
        console.log('[Host] 🔊 Setting host volume:', volume);
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
    console.log('[Host] 🔇 Executing mute toggle:', { 
        presentationMuted, 
        isConnected,
        hostCurrentMuted: video.muted
    });
    
    if (isConnected) {
        // Toggle presentation mute state
        const newMuted = !presentationMuted;
        const volumeData = {
            volume: presentationVolume,
            muted: newMuted,
        };
        console.log('[Host] 📤 Sending mute toggle to presentation:', volumeData);
        sendCommand('volume', volumeData);
        return newMuted;
    } else {
        // Toggle host mute when not connected
        const newMuted = !video.muted;
        console.log('[Host] 🔇 Toggling host mute:', newMuted);
        video.muted = newMuted;
        logHostVideoState('After mute toggle', video);
        return newMuted;
    }
};