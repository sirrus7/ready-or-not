// Simple video sync hook - single source of truth for video state
import { useRef, useState, useCallback, useEffect } from 'react';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';

interface VideoSyncState {
    // Playback state
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    
    // Audio state (single source for both host and presentation)
    volume: number;
    isMuted: boolean;
    
    // Ready states
    hostReady: boolean;
    presentationReady: boolean;
    
    // Connection state
    presentationConnected: boolean;
}

interface UseSimpleVideoSyncProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

interface UseSimpleVideoSyncReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    state: VideoSyncState;
    controls: {
        play: () => Promise<void>;
        pause: () => Promise<void>;
        seek: (time: number) => Promise<void>;
        setVolume: (volume: number) => void;
        toggleMute: () => void;
    };
    audioTarget: 'host' | 'presentation';
}

export const useSimpleVideoSync = ({ sessionId, sourceUrl, isEnabled }: UseSimpleVideoSyncProps): UseSimpleVideoSyncReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Single state object for everything
    const [state, setState] = useState<VideoSyncState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        hostReady: false,
        presentationReady: false,
        presentationConnected: false
    });
    
    // Sync manager for communication
    const { isConnected, sendCommand, onConnectionChange, onVideoReady } = useVideoSyncManager({
        sessionId: isEnabled ? sessionId : null,
        role: 'host'
    });
    
    // Update helper
    const updateState = useCallback((updates: Partial<VideoSyncState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);
    
    // Monitor connection status
    useEffect(() => {
        const unsubscribe = onConnectionChange((connected) => {
            console.log('[VideoSync] Connection status changed:', connected);
            updateState({ presentationConnected: connected });
            
            // Reset presentation ready state when disconnected
            if (!connected) {
                updateState({ presentationReady: false });
            }
        });
        return unsubscribe;
    }, [onConnectionChange, updateState]);
    
    // Monitor presentation ready state
    useEffect(() => {
        const unsubscribe = onVideoReady((ready) => {
            console.log('[VideoSync] Presentation ready status:', ready);
            updateState({ presentationReady: ready });
        });
        return unsubscribe;
    }, [onVideoReady, updateState]);
    
    // Setup video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isEnabled || !sourceUrl) return;
        
        // Load new source
        if (video.src !== sourceUrl) {
            video.src = sourceUrl;
            video.load();
            // Apply current volume settings to the new video
            video.volume = state.volume;
            video.muted = state.presentationConnected ? true : state.isMuted;
            updateState({ 
                hostReady: false, 
                presentationReady: false,
                currentTime: 0,
                duration: 0
            });
        }
        
        // Event handlers
        const handleCanPlay = () => updateState({ hostReady: true });
        const handleTimeUpdate = () => updateState({ 
            currentTime: video.currentTime,
            duration: video.duration || 0
        });
        const handlePlay = () => updateState({ isPlaying: true });
        const handlePause = () => updateState({ isPlaying: false });
        
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        
        // Set initial state
        updateState({
            hostReady: video.readyState >= 3,
            currentTime: video.currentTime,
            duration: video.duration || 0,
            isPlaying: !video.paused
        });
        
        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [sourceUrl, isEnabled, updateState, state.volume, state.isMuted, state.presentationConnected]);
    
    // Apply audio routing
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        
        // Host is ALWAYS muted when presentation is connected
        if (state.presentationConnected) {
            video.muted = true;
            console.log('[VideoSync] Host muted (presentation connected)');
        } else {
            // When not connected, apply the mute state to host
            video.muted = state.isMuted;
            video.volume = state.volume;
            console.log('[VideoSync] Host audio settings:', { muted: state.isMuted, volume: state.volume });
        }
    }, [state.presentationConnected, state.volume, state.isMuted]);
    
    // Control functions
    const play = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        
        // For now, just wait for host video to be ready
        // The presentation will catch up when it's ready
        if (!state.hostReady) {
            console.log('[VideoSync] Cannot play - host video not ready');
            return;
        }
        
        // Log if presentation is connected but not ready
        if (state.presentationConnected && !state.presentationReady) {
            console.log('[VideoSync] Warning: Playing without presentation ready', {
                hostReady: state.hostReady,
                presentationReady: state.presentationReady,
                presentationConnected: state.presentationConnected
            });
        }
        
        // Play host video
        await video.play();
        
        // Send play command to presentation if connected
        if (state.presentationConnected) {
            sendCommand('play', {
                time: video.currentTime,
                volume: state.volume,
                muted: state.isMuted
            });
        }
    }, [state, sendCommand]);
    
    const pause = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        
        // Pause host video
        video.pause();
        
        // Send pause command to presentation if connected
        if (state.presentationConnected) {
            sendCommand('pause', { time: video.currentTime });
        }
    }, [state.presentationConnected, sendCommand]);
    
    const seek = useCallback(async (time: number) => {
        const video = videoRef.current;
        if (!video) return;
        
        // Seek host video
        video.currentTime = time;
        
        // Send seek command to presentation if connected
        if (state.presentationConnected) {
            sendCommand('seek', { time });
        }
    }, [state.presentationConnected, sendCommand]);
    
    const setVolume = useCallback((volume: number) => {
        updateState({ volume });
        
        const video = videoRef.current;
        if (!video) return;
        
        // Apply to host if not connected
        if (!state.presentationConnected) {
            video.volume = volume;
        } else {
            // Send to presentation - only send volume, not muted state
            sendCommand('volume', { volume });
        }
    }, [state.presentationConnected, sendCommand, updateState]);
    
    const toggleMute = useCallback(() => {
        const newMuted = !state.isMuted;
        updateState({ isMuted: newMuted });
        
        if (state.presentationConnected) {
            // Send to presentation
            sendCommand('volume', { volume: state.volume, muted: newMuted });
        }
    }, [state.isMuted, state.volume, state.presentationConnected, sendCommand, updateState]);
    
    // Simple sync loop when playing
    useEffect(() => {
        if (!state.isPlaying || !state.presentationConnected) return;
        
        const interval = setInterval(() => {
            const video = videoRef.current;
            if (video && !video.paused) {
                sendCommand('sync', { time: video.currentTime });
            }
        }, 1000); // Sync every second
        
        return () => clearInterval(interval);
    }, [state.isPlaying, state.presentationConnected, sendCommand]);
    
    return {
        videoRef,
        state,
        controls: {
            play,
            pause,
            seek,
            setVolume,
            toggleMute
        },
        audioTarget: state.presentationConnected ? 'presentation' : 'host'
    };
};