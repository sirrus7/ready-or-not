// src/shared/utils/video/usePresentationVideo.ts - Enhanced with auto-advance functionality
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';
import {HostCommand} from '@core/sync/types';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    autoPlay: boolean;
    muted: boolean;
    preload: string;
    style: {
        maxWidth: string;
        maxHeight: string;
        objectFit: string;
    };
    onEnded?: () => void; // Add onEnded callback
}

interface UsePresentationVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToHost: boolean;
    reset: () => void; // Add reset function
    getVideoProps: (onVideoEnd?: () => void) => VideoElementProps; // Enhanced to accept callback
}

/**
 * Enhanced presentation video hook with auto-advance functionality
 * Pure slave mode - never initiates commands, only receives and executes
 * Always keeps audio enabled (muted: false)
 * Enhanced with better sync handling for pause-first seeking
 */
export const usePresentationVideo = (sessionId: string | null): UsePresentationVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'presentation') : null;
    const hasEndedRef = useRef(false); // Track if video has ended to prevent multiple triggers

    // Connection status monitoring
    useEffect(() => {
        if (!broadcastManager) return;

        // Monitor our own connection status (though we don't have a direct way to track host)
        // We'll assume connected when we receive commands
        const connectionTimeout = setTimeout(() => {
            if (!isConnectedToHost) {
                setIsConnectedToHost(false);
            }
        }, 15000); // 15 second timeout

        return () => clearTimeout(connectionTimeout);
    }, [broadcastManager, isConnectedToHost]);

    // Reset ended flag when video starts playing
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            hasEndedRef.current = false;
        };

        const handleSeeked = () => {
            // Reset ended flag if user seeks backwards from end
            if (video.currentTime < video.duration - 1) {
                hasEndedRef.current = false;
            }
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('seeked', handleSeeked);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('seeked', handleSeeked);
        };
    }, []);

    // Command execution with enhanced sync handling
    const executeCommand = useCallback(async (command: HostCommand): Promise<void> => {
        const video = videoRef.current;
        if (!video) {
            console.warn('[usePresentationVideo] No video element available for command:', command.action);
            return;
        }

        // Mark as connected when receiving commands
        setIsConnectedToHost(true);

        try {
            switch (command.action) {
                case 'play':
                    if (command.time !== undefined && Math.abs(video.currentTime - command.time) > 0.5) {
                        video.currentTime = command.time;
                        // Small delay to ensure seek completes before play
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    await video.play();
                    console.log(`[usePresentationVideo] Executed play command at time: ${command.time}`);
                    break;

                case 'pause':
                    // Always pause first, then seek if needed
                    video.pause();
                    if (command.time !== undefined && Math.abs(video.currentTime - command.time) > 0.5) {
                        video.currentTime = command.time;
                    }
                    console.log(`[usePresentationVideo] Executed pause command at time: ${command.time}`);
                    break;

                case 'seek':
                    // Ensure video is paused before seeking for better sync
                    if (!video.paused) {
                        video.pause();
                        // Small delay to ensure pause is processed
                        await new Promise(resolve => setTimeout(resolve, 25));
                    }
                    if (command.time !== undefined) {
                        video.currentTime = command.time;
                    }
                    console.log(`[usePresentationVideo] Executed seek command to time: ${command.time}`);
                    break;

                case 'reset':
                    video.pause();
                    video.currentTime = 0;
                    hasEndedRef.current = false;
                    console.log(`[usePresentationVideo] Executed reset command - video reset to beginning, currentTime: ${video.currentTime}`);

                    // Double-check the reset worked after a small delay
                    setTimeout(() => {
                        if (video.currentTime !== 0) {
                            console.warn('[usePresentationVideo] Reset command failed, forcing again');
                            video.currentTime = 0;
                        }
                    }, 50);
                    break;

                default:
                    console.warn('[usePresentationVideo] Unknown command action:', command.action);
            }
        } catch (error) {
            console.error(`[usePresentationVideo] Failed to execute ${command.action} command:`, error);
        }
    }, []);

    // Listen for host commands
    useEffect(() => {
        if (!broadcastManager) return;

        const unsubscribeCommands = broadcastManager.onHostCommand(executeCommand);

        return unsubscribeCommands;
    }, [broadcastManager, executeCommand]);

    const reset = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            // Force pause first
            video.pause();
            // Force currentTime to 0
            video.currentTime = 0;
            hasEndedRef.current = false;
            console.log('[usePresentationVideo] Video reset to beginning - currentTime:', video.currentTime);

            // Double-check the reset worked after a small delay
            setTimeout(() => {
                if (video.currentTime !== 0) {
                    console.warn('[usePresentationVideo] Reset failed, forcing again');
                    video.currentTime = 0;
                }
            }, 50);
        }
    }, []);

    // Enhanced getVideoProps with onEnded callback support
    const getVideoProps = useCallback((onVideoEnd?: () => void): VideoElementProps => {
        return {
            ref: videoRef,
            playsInline: true,
            controls: false, // No user controls on presentation
            autoPlay: false, // Controlled by host commands
            muted: false, // Always have audio enabled for room playback
            preload: 'auto' as const,
            style: {
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
            },
            onEnded: onVideoEnd ? () => {
                // Prevent multiple triggers of the same video end
                if (!hasEndedRef.current) {
                    hasEndedRef.current = true;
                    console.log('[usePresentationVideo] Video ended, triggering callback');
                    onVideoEnd();
                }
            } : undefined
        };
    }, []);

    // Status reporting - send pings to host
    useEffect(() => {
        if (!broadcastManager) return;

        // Send initial ready status
        broadcastManager.sendStatus('ready');

        // The SimpleBroadcastManager handles ping/pong automatically
        console.log('[usePresentationVideo] Presentation video initialized and ready');
    }, [broadcastManager]);

    // Cleanup on unmount - but don't destroy the manager as it's shared
    useEffect(() => {
        return () => {
            // Don't destroy the broadcast manager here - it's a singleton
            // and may be used by other components
            console.log('[usePresentationVideo] Component unmounting, but keeping broadcast manager alive');
        };
    }, []);

    return {
        videoRef,
        isConnectedToHost,
        reset,
        getVideoProps
    };
};
