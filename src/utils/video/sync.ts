// src/utils/video/sync.ts - Video synchronization logic
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

    // Sync correction logic
    const correctSync = useCallback((remoteState: VideoState) => {
        const video = videoRef.current;
        if (!video || ignoreEventsRef.current) return;

        const currentState = getVideoState(video);
        if (!currentState) return;

        const { timeDiff, playStateDiff } = needsSync(currentState, remoteState);

        // Only sync if difference is significant
        if (timeDiff || playStateDiff) {
            console.log('[VideoSync] Correcting sync - time diff:', timeDiff, 'play diff:', playStateDiff);

            ignoreEventsRef.current = true;

            // Correct time if needed
            if (timeDiff) {
                video.currentTime = remoteState.currentTime;
            }

            // Correct play state
            if (playStateDiff) {
                if (remoteState.playing && video.paused) {
                    video.play().catch(console.error);
                } else if (!remoteState.playing && !video.paused) {
                    video.pause();
                }
            }

            setTimeout(() => {
                ignoreEventsRef.current = false;
            }, 500);

            onStateUpdate(remoteState);
        }
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
        clearSyncTimeout,
        syncTimeoutRef
    };
};
