// src/utils/video/commands.ts - Video command execution logic
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
        if (!video) return false;

        lastCommandTimeRef.current = Date.now();
        ignoreEventsRef.current = true;

        try {
            switch (action) {
                case 'play':
                    if (value !== undefined && Math.abs(video.currentTime - value) > 0.5) {
                        video.currentTime = value;
                    }
                    await video.play();
                    return true;
                case 'pause':
                    if (value !== undefined && Math.abs(video.currentTime - value) > 0.5) {
                        video.currentTime = value;
                    }
                    video.pause();
                    return true;
                case 'seek':
                    if (value !== undefined) video.currentTime = value;
                    return true;
            }
        } catch (error) {
            console.error('[VideoCommands] Command failed:', error);
            return false;
        } finally {
            setTimeout(() => {
                ignoreEventsRef.current = false;
                onStateChange?.();
            }, 300);
        }
    }, [videoRef, onStateChange]);

    // Auto-play logic for new videos
    const handleAutoPlay = useCallback(async (hasAutoPlayedRef: React.MutableRefObject<boolean>) => {
        if (hasAutoPlayedRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            hasAutoPlayedRef.current = true;

            try {
                await video.play();
            } catch (error) {
                console.warn('[VideoCommands] Auto-play failed:', error);
            }
        }
    }, [videoRef]);

    return {
        executeCommand,
        handleAutoPlay,
        lastCommandTimeRef,
        ignoreEventsRef
    };
};
