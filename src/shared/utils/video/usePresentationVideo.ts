// Simple presentation video hook
import { useRef, useState, useCallback, useEffect } from 'react';
import { createVideoProps } from '@shared/utils/video/videoProps';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import { HostCommand } from '@core/sync/types';
import { presentationVideoLogger } from './videoLogger';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    muted: boolean;
    preload: string;
    crossOrigin?: string;
    style: React.CSSProperties;
}

interface VideoPresentationState {
    isReady: boolean;
    volume: number;
    isMuted: boolean;
}

interface UsePresentationVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

interface UsePresentationVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToHost: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

export const usePresentationVideo = ({ 
    sessionId, 
    sourceUrl, 
    isEnabled,
}: UsePresentationVideoProps): UsePresentationVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [state, setState] = useState<VideoPresentationState>({
        isReady: false,
        volume: 1,
        isMuted: false
    });
    
    // Sync manager for receiving commands
    const { onCommand, onConnectionChange, sendVideoReady } = useVideoSyncManager({
        sessionId: isEnabled ? sessionId : null,
        role: 'presentation'
    });
    
    // Track connection status
    useEffect(() => {
        const unsubscribe = onConnectionChange(setIsConnected);
        return unsubscribe;
    }, [onConnectionChange]);
    
    // Setup video element
    useEffect(() => {
        const video = videoRef.current;
        presentationVideoLogger.log('Video setup effect', { data: { hasVideo: !!video, isEnabled, sourceUrl } });
        if (!video || !isEnabled || !sourceUrl) return;
        
        // Load new source
        if (video.src !== sourceUrl) {
            presentationVideoLogger.log('Loading new video source', { data: { sourceUrl } });
            video.src = sourceUrl;
            video.load();
            // Apply current volume settings to the new video
            video.volume = state.volume;
            video.muted = state.isMuted;
            presentationVideoLogger.log('Applied volume settings to new video', { data: { volume: state.volume, muted: state.isMuted } });
            setState(prev => ({ ...prev, isReady: false }));
            sendVideoReady(false);
        } else {
            presentationVideoLogger.log('Video source unchanged, skipping load');
        }
        
        // Event handlers
        const handleCanPlay = () => {
            presentationVideoLogger.log('Video can play, sending ready status');
            setState(prev => ({ ...prev, isReady: true }));
            sendVideoReady(true);
        };
        
        const handleError = (e: Event) => {
            presentationVideoLogger.error('Video error', { data: e });
            if (video.error) {
                presentationVideoLogger.error('Video error details', { data: video.error });
            }
        };
        
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
        
        // Check if already ready
        if (video.readyState >= 3) {
            presentationVideoLogger.log(`Video already ready (readyState: ${video.readyState})`);
            setState(prev => ({ ...prev, isReady: true }));
            sendVideoReady(true);
        }
        
        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            sendVideoReady(false);
        };
    }, [sourceUrl, isEnabled, sendVideoReady, state.volume, state.isMuted]);
    
    // Listen for commands from host
    useEffect(() => {
        const unsubscribe = onCommand(async (command: HostCommand) => {
            const video = videoRef.current;
            presentationVideoLogger.log(`Received command: ${command.action}`, { data: { hasVideo: !!video, isReady: state.isReady } });
            if (!video) return;
            
            // Volume commands should work even if video isn't ready yet
            if (command.action === 'volume') {
                presentationVideoLogger.log('Processing volume command regardless of ready state');
            } else if (!state.isReady) {
                presentationVideoLogger.log('Skipping non-volume command - video not ready');
                return;
            }
            
            switch (command.action) {
                case 'play':
                    if (command.data?.time !== undefined) {
                        video.currentTime = command.data.time;
                    }
                    // Apply volume settings that may have come with play command
                    if (command.data?.volume !== undefined) {
                        video.volume = command.data.volume;
                        setState(prev => ({ ...prev, volume: command.data.volume }));
                    }
                    if (command.data?.muted !== undefined) {
                        video.muted = command.data.muted;
                        setState(prev => ({ ...prev, isMuted: command.data.muted }));
                    }
                    await video.play();
                    break;
                    
                case 'pause':
                    video.pause();
                    if (command.data?.time !== undefined) {
                        video.currentTime = command.data.time;
                    }
                    break;
                    
                case 'seek':
                    if (command.data?.time !== undefined) {
                        video.currentTime = command.data.time;
                    }
                    break;
                    
                case 'sync':
                    // Simple sync: if we're more than 1 second off, adjust
                    if (command.data?.time !== undefined && !video.paused) {
                        const diff = Math.abs(video.currentTime - command.data.time);
                        if (diff > 1) {
                            video.currentTime = command.data.time;
                        }
                    }
                    break;
                    
                case 'volume':
                    presentationVideoLogger.log('Applying volume command', { data: command.data });
                    const volumeData = command.data as { volume?: number; muted?: boolean };
                    if (volumeData?.volume !== undefined) {
                        video.volume = volumeData.volume;
                        setState(prev => ({ ...prev, volume: volumeData.volume! }));
                    }
                    // Only update muted state if explicitly provided
                    if (volumeData?.muted !== undefined) {
                        video.muted = volumeData.muted;
                        setState(prev => ({ ...prev, isMuted: volumeData.muted! }));
                        presentationVideoLogger.log(`Set muted to: ${volumeData.muted}, actual: ${video.muted}`);
                    }
                    presentationVideoLogger.log('Video state after volume command', {
                        data: {
                            paused: video.paused,
                            currentTime: video.currentTime,
                            duration: video.duration,
                            volume: video.volume,
                            muted: video.muted,
                            readyState: video.readyState
                        }
                    });
                    break;
            }
        });
        
        return unsubscribe;
    }, [onCommand, state.isReady]);
    
    // Create video props
    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        return createVideoProps({
            videoRef,
            muted: state.isMuted,
            onVideoEnd,
            onError
        });
    }, [state.isMuted]);
    
    return {
        videoRef,
        isConnectedToHost: isConnected,
        getVideoProps
    };
};