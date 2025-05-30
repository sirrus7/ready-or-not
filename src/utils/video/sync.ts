// src/utils/video/sync.ts - Enhanced sync logic with better tolerance
import { useCallback, useRef } from 'react';
import { VideoState } from './types';
import { needsSync, getVideoState } from './helpers';

interface UseVideoSyncLogicConfig {
    videoRef: React.RefObject<HTMLVideoElement>;
    ignoreEventsRef: React.MutableRefObject<boolean>;
    onStateUpdate: (updates: Partial<VideoState>) => void;
}

export const useVideoSyncLogic = ({
                                      videoRef,
                                      ignoreEventsRef,
                                      onStateUpdate
                                  }: UseVideoSyncLogicConfig) => {
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSyncTimeRef = useRef<number>(0);

    // Enhanced sync correction logic
    const correctSync = useCallback((remoteState: VideoState, mode: 'master' | 'host' | 'independent' = 'host') => {
        const video = videoRef.current;
        if (!video || ignoreEventsRef.current) return;

        const currentState = getVideoState(video);
        if (!currentState) return;

        // Enhanced sync tolerance - more lenient for smoother playback
        const { timeDiff, playStateDiff } = needsSync(currentState, remoteState, 1.5); // 1.5 second tolerance
        const now = Date.now();

        // Throttle sync corrections to prevent aggressive seeking
        if (now - lastSyncTimeRef.current < 1000) {
            console.log('[VideoSync] Throttling sync correction');
            return;
        }

        // Only sync if difference is significant and enough time has passed
        if (timeDiff || playStateDiff) {
            console.log(`[VideoSync] [${mode}] Correcting sync - time diff: ${timeDiff}, play diff: ${playStateDiff}`);
            console.log(`[VideoSync] Local time: ${currentState.currentTime.toFixed(2)}s, Remote time: ${remoteState.currentTime.toFixed(2)}s`);

            lastSyncTimeRef.current = now;
            ignoreEventsRef.current = true;

            // Correct time if needed (but be less aggressive)
            if (timeDiff) {
                const timeDifference = Math.abs(currentState.currentTime - remoteState.currentTime);
                if (timeDifference > 2.0) { // Only seek for larger differences
                    console.log('[VideoSync] Performing time correction');
                    video.currentTime = remoteState.currentTime;
                } else {
                    console.log('[VideoSync] Skipping time correction - difference too small');
                }
            }

            // Correct play state
            if (playStateDiff) {
                console.log('[VideoSync] Correcting play state');
                if (remoteState.playing && video.paused) {
                    video.play().catch(console.error);
                } else if (!remoteState.playing && !video.paused) {
                    video.pause();
                }
            }

            // Shorter timeout for less disruption
            setTimeout(() => {
                ignoreEventsRef.current = false;
            }, 300);

            onStateUpdate(remoteState);
        }
    }, [videoRef, ignoreEventsRef, onStateUpdate]);

    // Handle initial sync when presentation connects
    const handleInitialSync = useCallback((remoteState: VideoState, shouldPauseBoth: boolean = true) => {
        const video = videoRef.current;
        if (!video || ignoreEventsRef.current) return;

        console.log('[VideoSync] Performing initial sync with presentation');
        console.log('[VideoSync] Remote state:', remoteState);
        console.log('[VideoSync] Should pause both:', shouldPauseBoth);

        ignoreEventsRef.current = true;

        // Set time position
        video.currentTime = remoteState.currentTime;

        // Handle play state based on requirement
        if (shouldPauseBoth) {
            // Requirement: When presentation opens, pause both videos
            video.pause();
            onStateUpdate({
                ...remoteState,
                playing: false
            });
        } else {
            // Normal sync
            if (remoteState.playing && video.paused) {
                video.play().catch(console.error);
            } else if (!remoteState.playing && !video.paused) {
                video.pause();
            }
            onStateUpdate(remoteState);
        }

        setTimeout(() => {
            ignoreEventsRef.current = false;
        }, 500);
    }, [videoRef, ignoreEventsRef, onStateUpdate]);

    // Clear sync timeout
    const clearSyncTimeout = useCallback(() => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
    }, []);

    return {
        correctSync,
        handleInitialSync,
        clearSyncTimeout,
        syncTimeoutRef
    };
};
