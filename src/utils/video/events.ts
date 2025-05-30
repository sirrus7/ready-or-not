// src/utils/video/events.ts - Enhanced video event handling
import { useEffect } from 'react';
import { VideoSyncMode, VideoState } from './types';
import { getVideoState, shouldThrottleUpdate } from './helpers';
import { SessionBroadcastManager } from '../broadcastManager';

interface UseVideoEventsConfig {
    videoRef: React.RefObject<HTMLVideoElement>;
    mode: VideoSyncMode;
    broadcastManager: SessionBroadcastManager | null;
    ignoreEventsRef: React.MutableRefObject<boolean>;
    videoState: VideoState;
    isConnectedToPresentation: boolean;
    onAutoPlay: () => void;
    onStateUpdate: (updates: Partial<VideoState>) => void;
}

export const useVideoEvents = ({
                                   videoRef,
                                   mode,
                                   broadcastManager,
                                   ignoreEventsRef,
                                   videoState,
                                   isConnectedToPresentation,
                                   onAutoPlay,
                                   onStateUpdate
                               }: UseVideoEventsConfig) => {
    // Setup video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            if (ignoreEventsRef.current) return;
            console.log(`[VideoEvents] [${mode}] Video play event`);
            onStateUpdate({ playing: true });

            // Broadcast state update for master mode
            if (mode === 'master' && broadcastManager) {
                const state = getVideoState(video);
                if (state) {
                    console.log('[VideoEvents] Master broadcasting play state');
                    broadcastManager.sendVideoState(state);
                }
            }
        };

        const handlePause = () => {
            if (ignoreEventsRef.current) return;
            console.log(`[VideoEvents] [${mode}] Video pause event`);
            onStateUpdate({ playing: false });

            // Broadcast state update for master mode
            if (mode === 'master' && broadcastManager) {
                const state = getVideoState(video);
                if (state) {
                    console.log('[VideoEvents] Master broadcasting pause state');
                    broadcastManager.sendVideoState(state);
                }
            }
        };

        const handleTimeUpdate = () => {
            if (ignoreEventsRef.current) return;
            onStateUpdate({ currentTime: video.currentTime });

            // Throttled broadcast for master mode
            if (mode === 'master' && broadcastManager) {
                if (!shouldThrottleUpdate(videoState.lastUpdate, 1000, !video.paused)) {
                    const state = getVideoState(video);
                    if (state) {
                        broadcastManager.sendVideoState(state);
                    }
                }
            }
        };

        const handleLoadedMetadata = () => {
            console.log(`[VideoEvents] [${mode}] Video metadata loaded`);
            onStateUpdate({
                duration: video.duration || 0,
                currentTime: video.currentTime,
                volume: video.volume
            });

            // Set audio state based on mode and connection
            if (mode === 'host' && isConnectedToPresentation) {
                video.muted = true; // Host muted when presentation connected
                console.log('[VideoEvents] Host video muted (presentation connected)');
            } else if (mode === 'master') {
                video.muted = false; // Presentation always has audio
                console.log('[VideoEvents] Master video audio enabled');
            } else {
                video.muted = false; // Host-only has audio
                console.log('[VideoEvents] Host-only video audio enabled');
            }

            // Trigger auto-play check after metadata loads
            setTimeout(onAutoPlay, 100);
        };

        const handleCanPlay = () => {
            console.log(`[VideoEvents] [${mode}] Video can play`);
            // Additional auto-play opportunity
            setTimeout(onAutoPlay, 50);
        };

        const handleLoadStart = () => {
            console.log(`[VideoEvents] [${mode}] Video load started`);
        };

        const handleWaiting = () => {
            console.log(`[VideoEvents] [${mode}] Video waiting for data`);
        };

        const handlePlaying = () => {
            console.log(`[VideoEvents] [${mode}] Video playing (after buffering)`);
        };

        const handleSeeked = () => {
            if (ignoreEventsRef.current) return;
            console.log(`[VideoEvents] [${mode}] Video seeked to: ${video.currentTime.toFixed(2)}s`);
            onStateUpdate({ currentTime: video.currentTime });
        };

        // Add all event listeners
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('seeked', handleSeeked);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('seeked', handleSeeked);
        };
    }, [
        videoRef,
        mode,
        broadcastManager,
        ignoreEventsRef,
        videoState.lastUpdate,
        isConnectedToPresentation,
        onAutoPlay,
        onStateUpdate
    ]);
};
