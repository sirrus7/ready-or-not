// src/utils/video/sync.ts - Enhanced sync logic with better tolerance and stability
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

    // Enhanced sync correction logic with better stability
    const correctSync = useCallback((remoteState: VideoState, mode: 'master' | 'host' | 'independent' = 'host') => {
        const video = videoRef.current;
        if (!video || ignoreEventsRef.current) {
            console.log(`[VideoSync] Sync correction skipped - video: ${!!video}, ignoreEvents: ${ignoreEventsRef.current}`);
            return;
        }

        const currentState = getVideoState(video);
        if (!currentState) {
            console.log(`[VideoSync] Sync correction skipped - could not get current state`);
            return;
        }

        // Enhanced sync tolerance - more lenient for smoother playback
        const { timeDiff, playStateDiff } = needsSync(currentState, remoteState, 2.0); // 2 second tolerance
        const now = Date.now();

        // Throttle sync corrections to prevent aggressive seeking
        if (now - lastSyncTimeRef.current < 1500) {
            console.log('[VideoSync] Throttling sync correction');
            return;
        }

        // Only sync if difference is significant and enough time has passed
        if (timeDiff || playStateDiff) {
            const timeDifference = Math.abs(currentState.currentTime - remoteState.currentTime);
            console.log(`[VideoSync] [${mode}] Correcting sync - time diff: ${timeDiff} (${timeDifference.toFixed(2)}s), play diff: ${playStateDiff}`);
            console.log(`[VideoSync] Local: playing=${currentState.playing}, time=${currentState.currentTime.toFixed(2)}s`);
            console.log(`[VideoSync] Remote: playing=${remoteState.playing}, time=${remoteState.currentTime.toFixed(2)}s`);

            lastSyncTimeRef.current = now;
            ignoreEventsRef.current = true;

            // Correct time if needed (but be less aggressive)
            if (timeDiff && timeDifference > 3.0) { // Only seek for larger differences
                console.log('[VideoSync] Performing time correction');
                video.currentTime = remoteState.currentTime;
            } else if (timeDiff) {
                console.log('[VideoSync] Skipping time correction - difference too small for seeking');
            }

            // Correct play state
            if (playStateDiff) {
                console.log('[VideoSync] Correcting play state');
                if (remoteState.playing && video.paused) {
                    video.play().catch(error => {
                        console.error('[VideoSync] Play failed during sync:', error);
                    });
                } else if (!remoteState.playing && !video.paused) {
                    video.pause();
                }
            }

            // Shorter timeout for less disruption
            setTimeout(() => {
                ignoreEventsRef.current = false;
            }, 400);

            onStateUpdate(remoteState);
        } else {
            console.log(`[VideoSync] [${mode}] Videos are in sync - no correction needed`);
        }
    }, [videoRef, ignoreEventsRef, onStateUpdate]);

    // Handle initial sync when presentation connects
    const handleInitialSync = useCallback((remoteState: VideoState, shouldPauseBoth: boolean = true) => {
        const video = videoRef.current;
        if (!video || ignoreEventsRef.current) {
            console.log(`[VideoSync] Initial sync skipped - video: ${!!video}, ignoreEvents: ${ignoreEventsRef.current}`);
            return;
        }

        console.log('[VideoSync] Performing initial sync with presentation');
        console.log('[VideoSync] Remote state:', remoteState);
        console.log('[VideoSync] Should pause both:', shouldPauseBoth);

        ignoreEventsRef.current = true;

        // Set time position
        const timeDifference = Math.abs(video.currentTime - remoteState.currentTime);
        if (timeDifference > 1.0) {
            console.log(`[VideoSync] Setting initial time position: ${remoteState.currentTime}`);
            video.currentTime = remoteState.currentTime;
        }

        // Handle play state based on requirement
        if (shouldPauseBoth) {
            // Requirement: When presentation opens, pause both videos
            console.log('[VideoSync] Pausing for initial sync');
            video.pause();
            onStateUpdate({
                ...remoteState,
                playing: false
            });
        } else {
            // Normal sync
            console.log('[VideoSync] Normal initial sync');
            if (remoteState.playing && video.paused) {
                video.play().catch(error => {
                    console.error('[VideoSync] Play failed during initial sync:', error);
                });
            } else if (!remoteState.playing && !video.paused) {
                video.pause();
            }
            onStateUpdate(remoteState);
        }

        setTimeout(() => {
            ignoreEventsRef.current = false;
        }, 600);
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
