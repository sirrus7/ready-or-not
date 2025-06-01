// src/utils/video/commands.ts - Enhanced with improved auto-play logic
import { useCallback, useRef } from 'react';

interface UseVideoCommandsConfig {
    videoRef: React.RefObject<HTMLVideoElement>;
    onStateChange?: () => void;
}

export const useVideoCommands = ({ videoRef, onStateChange }: UseVideoCommandsConfig) => {
    const lastCommandTimeRef = useRef<number>(0);
    const ignoreEventsRef = useRef<boolean>(false);

    // Execute video command with proper event handling
    const executeCommand = useCallback(async (
        action: 'play' | 'pause' | 'seek',
        value?: number
    ): Promise<boolean> => {
        const video = videoRef.current;
        if (!video) {
            console.warn(`[VideoCommands] Video element not available for ${action}`);
            return false;
        }

        console.log(`[VideoCommands] Executing ${action} with value:`, value);

        lastCommandTimeRef.current = Date.now();
        ignoreEventsRef.current = true;

        try {
            switch (action) {
                case 'play':
                    if (value !== undefined && Math.abs(video.currentTime - value) > 1.0) {
                        console.log(`[VideoCommands] Seeking to ${value} before play`);
                        video.currentTime = value;
                    }

                    // Check if video is ready to play
                    if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                        const playPromise = video.play();
                        if (playPromise) {
                            await playPromise;
                        }
                        console.log(`[VideoCommands] Play successful`);
                    } else {
                        console.warn(`[VideoCommands] Video not ready for play (readyState: ${video.readyState})`);
                        return false;
                    }
                    return true;

                case 'pause':
                    if (value !== undefined && Math.abs(video.currentTime - value) > 1.0) {
                        console.log(`[VideoCommands] Seeking to ${value} before pause`);
                        video.currentTime = value;
                    }
                    video.pause();
                    console.log(`[VideoCommands] Pause successful`);
                    return true;

                case 'seek':
                    if (value !== undefined) {
                        console.log(`[VideoCommands] Seeking to ${value}`);
                        video.currentTime = value;
                        return true;
                    }
                    return false;
            }
        } catch (error) {
            console.error(`[VideoCommands] Command ${action} failed:`, error);
            return false;
        } finally {
            // Restore event handling after a delay
            setTimeout(() => {
                ignoreEventsRef.current = false;
                onStateChange?.();
            }, 300);
        }
    }, [videoRef, onStateChange]);

    // Enhanced auto-play logic for new videos
    const handleAutoPlay = useCallback(async (
        hasAutoPlayedRef: React.MutableRefObject<boolean>,
        mode: 'master' | 'host' | 'independent',
        isConnectedToPresentation: boolean
    ) => {
        if (hasAutoPlayedRef.current || !videoRef.current) {
            console.log(`[VideoCommands] Auto-play skipped - already played: ${hasAutoPlayedRef.current}, video available: ${!!videoRef.current}`);
            return;
        }

        const video = videoRef.current;

        // Check video readiness more thoroughly
        if (video.readyState < 2) {
            console.log(`[VideoCommands] Auto-play skipped - video not ready (readyState: ${video.readyState})`);
            return;
        }

        // Check if video has duration
        if (!video.duration || isNaN(video.duration)) {
            console.log(`[VideoCommands] Auto-play skipped - video duration not available`);
            return;
        }

        hasAutoPlayedRef.current = true;
        console.log(`[VideoCommands] Auto-play triggered - mode: ${mode}, connected: ${isConnectedToPresentation}`);

        try {
            // Auto-play behavior based on mode and connection status
            if (mode === 'master') {
                // Presentation display always auto-plays
                console.log('[VideoCommands] Master mode auto-play');
                await video.play();
                console.log('[VideoCommands] Master auto-play successful');
            } else if (mode === 'host') {
                if (isConnectedToPresentation) {
                    // Host with presentation: let the broadcast system handle coordination
                    console.log('[VideoCommands] Host with presentation - coordinated auto-play');
                    // The broadcast manager will handle the coordination
                    // Just play the host video as well
                    await video.play();
                    console.log('[VideoCommands] Host coordinated auto-play successful');
                } else {
                    // Host only: auto-play directly
                    console.log('[VideoCommands] Host-only auto-play');
                    await video.play();
                    console.log('[VideoCommands] Host-only auto-play successful');
                }
            } else {
                // Independent mode: auto-play directly
                console.log('[VideoCommands] Independent mode auto-play');
                await video.play();
                console.log('[VideoCommands] Independent auto-play successful');
            }
        } catch (error) {
            console.warn('[VideoCommands] Auto-play failed:', error);
            // Reset the flag so it can be tried again
            hasAutoPlayedRef.current = false;
        }
    }, [videoRef]);

    return {
        executeCommand,
        handleAutoPlay,
        lastCommandTimeRef,
        ignoreEventsRef
    };
};
