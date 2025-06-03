// src/shared/utils/video/usePresentationVideo.ts
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';
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
}

interface UsePresentationVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToHost: boolean;
    getVideoProps: () => VideoElementProps;
}

/**
 * Presentation video hook that receives and executes commands from host
 * Pure slave mode - never initiates commands, only receives and executes
 * Always keeps audio enabled (muted: false)
 */
export const usePresentationVideo = (sessionId: string | null): UsePresentationVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'presentation') : null;

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

    // Command execution
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
                    }
                    await video.play();
                    console.log(`[usePresentationVideo] Executed play command at time: ${command.time}`);
                    break;

                case 'pause':
                    if (command.time !== undefined && Math.abs(video.currentTime - command.time) > 0.5) {
                        video.currentTime = command.time;
                    }
                    video.pause();
                    console.log(`[usePresentationVideo] Executed pause command at time: ${command.time}`);
                    break;

                case 'seek':
                    if (command.time !== undefined) {
                        video.currentTime = command.time;
                    }
                    console.log(`[usePresentationVideo] Executed seek command to time: ${command.time}`);
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

    // Video element properties - always have audio enabled
    const getVideoProps = useCallback((): VideoElementProps => {
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
            }
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
        getVideoProps
    };
};
