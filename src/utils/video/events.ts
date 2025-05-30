// src/utils/video/events.ts - Video event handling
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
    onAutoPlay: () => void;
    onStateUpdate: (updates: Partial<VideoState>) => void;
}

export const useVideoEvents = ({
                                   videoRef,
                                   mode,
                                   broadcastManager,
                                   ignoreEventsRef,
                                   videoState,
                                   onAutoPlay,
                                   onStateUpdate
                               }: UseVideoEventsConfig) => {
    // Setup video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            if (ignoreEventsRef.current) return;
            console.log('[VideoEvents] Video play event');
            onStateUpdate({ playing: true });
            if (mode === 'master' && broadcastManager) {
                const state = getVideoState(video);
                if (state) broadcastManager.sendVideoState(state);
            }
        };

        const handlePause = () => {
            if (ignoreEventsRef.current) return;
            console.log('[VideoEvents] Video pause event');
            onStateUpdate({ playing: false });
            if (mode === 'master' && broadcastManager) {
                const state = getVideoState(video);
                if (state) broadcastManager.sendVideoState(state);
            }
        };

        const handleTimeUpdate = () => {
            if (ignoreEventsRef.current) return;
            onStateUpdate({ currentTime: video.currentTime });

            // Throttled broadcast for master
            if (mode === 'master' && broadcastManager) {
                if (!shouldThrottleUpdate(videoState.lastUpdate)) {
                    const state = getVideoState(video);
                    if (state) broadcastManager.sendVideoState(state);
                }
            }
        };

        const handleLoadedMetadata = () => {
            console.log('[VideoEvents] Video metadata loaded');
            onStateUpdate({
                duration: video.duration || 0,
                currentTime: video.currentTime,
                volume: video.volume
            });

            // Trigger auto-play check
            setTimeout(onAutoPlay, 100);
        };

        const handleCanPlay = () => {
            console.log('[VideoEvents] Video can play');
            // Additional auto-play opportunity
            setTimeout(onAutoPlay, 50);
        };

        // Add listeners
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [
        videoRef,
        mode,
        broadcastManager,
        ignoreEventsRef,
        videoState.lastUpdate,
        onAutoPlay,
        onStateUpdate
    ]);
};
