// src/components/Display/DisplayView.tsx - Native Video Controls for Host Preview
import React, { useEffect, useRef, useState, useCallback } from 'react';
import SlideRenderer from './SlideRenderer';
import { Slide } from '../../types';
import { Hourglass, Monitor, Info } from 'lucide-react';

interface DisplayViewProps {
    slide: Slide | null;
    isPlayingTarget?: boolean;
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
}

interface VideoSyncState {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    lastUpdate: number;
}

const DisplayView: React.FC<DisplayViewProps> = ({
                                                     slide,
                                                     isPlayingTarget = false,
                                                     videoTimeTarget = 0,
                                                     triggerSeekEvent = false,
                                                 }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const [syncState, setSyncState] = useState<VideoSyncState>({
        playing: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        lastUpdate: 0
    });
    const [isConnectedToPresentationDisplay, setIsConnectedToPresentationDisplay] = useState(false);
    const lastCommandRef = useRef<string>('');
    const commandTimeoutRef = useRef<NodeJS.Timeout>();

    // Get session ID from current URL or context
    const sessionId = window.location.pathname.includes('/classroom/')
        ? window.location.pathname.split('/classroom/')[1]
        : null;

    // Check if current slide is a video
    const isVideoSlide = slide && (
        slide.type === 'video' ||
        (slide.type === 'interactive_invest' && slide.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
        ((slide.type === 'consequence_reveal' || slide.type === 'payoff_reveal') &&
            slide.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

    // Initialize BroadcastChannel for cross-tab sync
    useEffect(() => {
        if (!sessionId || !slide) return;

        const channelName = `game-session-${sessionId}`;
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        const handleMessage = (event: MessageEvent) => {
            const now = Date.now();

            switch (event.data.type) {
                case 'VIDEO_STATE_UPDATE':
                    if (event.data.sessionId === sessionId && event.data.videoState) {
                        const newState = event.data.videoState;
                        // Only update if this is newer than our last update
                        if (newState.lastUpdate > syncState.lastUpdate) {
                            console.log('[DisplayView] Received video state update:', newState);
                            setSyncState(prev => ({
                                ...prev,
                                ...newState,
                                lastUpdate: now
                            }));
                            setIsConnectedToPresentationDisplay(true);
                        }
                    }
                    break;

                case 'VIDEO_COMMAND_ACK':
                    // Presentation display acknowledging our command
                    if (event.data.sessionId === sessionId && event.data.command) {
                        console.log('[DisplayView] Command acknowledged:', event.data.command);
                        const isPlaying = event.data.command === 'play';
                        setSyncState(prev => ({
                            ...prev,
                            playing: isPlaying,
                            lastUpdate: now
                        }));
                        // Reset command tracking after successful acknowledgment
                        lastCommandRef.current = '';
                    }
                    break;

                case 'PONG':
                    if (event.data.sessionId === sessionId) {
                        setIsConnectedToPresentationDisplay(true);
                        if (event.data.videoState) {
                            setSyncState(prev => ({
                                ...prev,
                                ...event.data.videoState,
                                lastUpdate: now
                            }));
                        }
                    }
                    break;

                case 'PRESENTATION_READY':
                    if (event.data.sessionId === sessionId) {
                        setIsConnectedToPresentationDisplay(true);
                        console.log('[DisplayView] Presentation display connected');
                    }
                    break;
            }
        };

        channel.addEventListener('message', handleMessage);

        // Send ping to check for presentation display
        const pingInterval = setInterval(() => {
            channel.postMessage({
                type: 'PING',
                sessionId,
                timestamp: Date.now()
            });
        }, 2000);

        // Connection timeout check
        const connectionCheck = setInterval(() => {
            const timeSinceLastUpdate = Date.now() - syncState.lastUpdate;
            if (timeSinceLastUpdate > 5000 && isConnectedToPresentationDisplay) {
                console.log('[DisplayView] Connection timeout - marking as disconnected');
                setIsConnectedToPresentationDisplay(false);
            }
        }, 1000);

        return () => {
            clearInterval(pingInterval);
            clearInterval(connectionCheck);
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, [sessionId, slide?.id, syncState.lastUpdate, isConnectedToPresentationDisplay]);

    // Handle host video click for maintaining sync
    const handleHostVideoClick = useCallback((shouldPlay: boolean) => {
        if (!channelRef.current || !sessionId) {
            console.warn('[DisplayView] No channel or session ID for video command');
            return;
        }

        const timestamp = Date.now();
        const command = shouldPlay ? 'play' : 'pause';

        console.log(`[DisplayView] Handling video click - shouldPlay: ${shouldPlay}, command: ${command}`);

        if (isConnectedToPresentationDisplay) {
            // Send video command to presentation display
            console.log(`[DisplayView] Sending command to presentation display:`, {
                type: 'VIDEO_CONTROL',
                sessionId,
                action: command,
                timestamp,
                expectAck: true
            });

            channelRef.current.postMessage({
                type: 'VIDEO_CONTROL',
                sessionId,
                action: command,
                timestamp,
                expectAck: true
            });

            // Optimistically update local state for immediate UI feedback
            setSyncState(prev => ({
                ...prev,
                playing: shouldPlay,
                lastUpdate: timestamp
            }));
        } else {
            // No presentation display - control local video directly
            if (videoRef.current) {
                if (shouldPlay) {
                    videoRef.current.play().catch(console.error);
                } else {
                    videoRef.current.pause();
                }

                setSyncState(prev => ({
                    ...prev,
                    playing: shouldPlay,
                    lastUpdate: timestamp
                }));
            }
        }
    }, [sessionId, isConnectedToPresentationDisplay]);

    // Handle direct video events when no presentation display
    const handleHostVideoPlay = useCallback(() => {
        if (!isConnectedToPresentationDisplay && videoRef.current) {
            setSyncState(prev => ({
                ...prev,
                playing: true,
                lastUpdate: Date.now()
            }));
        }
    }, [isConnectedToPresentationDisplay]);

    const handleHostVideoPause = useCallback(() => {
        if (!isConnectedToPresentationDisplay && videoRef.current) {
            setSyncState(prev => ({
                ...prev,
                playing: false,
                lastUpdate: Date.now()
            }));
        }
    }, [isConnectedToPresentationDisplay]);

    const handleHostVideoTimeUpdate = useCallback(() => {
        if (!isConnectedToPresentationDisplay && videoRef.current) {
            const now = Date.now();
            // Throttle updates
            if (now - syncState.lastUpdate > 200) {
                setSyncState(prev => ({
                    ...prev,
                    currentTime: videoRef.current!.currentTime,
                    duration: videoRef.current!.duration || 0,
                    lastUpdate: now
                }));
            }
        }
    }, [isConnectedToPresentationDisplay, syncState.lastUpdate]);

    const handleHostVideoVolumeChange = useCallback(() => {
        if (!isConnectedToPresentationDisplay && videoRef.current) {
            setSyncState(prev => ({
                ...prev,
                volume: videoRef.current!.volume,
                lastUpdate: Date.now()
            }));
        }
    }, [isConnectedToPresentationDisplay]);

    const handleLoadedMetadata = useCallback(() => {
        if (!isConnectedToPresentationDisplay && videoRef.current) {
            console.log('[DisplayView] Video metadata loaded');
            setSyncState(prev => ({
                ...prev,
                duration: videoRef.current!.duration,
                currentTime: videoRef.current!.currentTime,
                volume: videoRef.current!.volume,
                lastUpdate: Date.now()
            }));
        }
    }, [isConnectedToPresentationDisplay]);

    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                <p className="text-xl">Waiting for game content...</p>
                <p className="text-sm text-gray-400 mt-2">(Host Preview)</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden relative">
            {/* Connection status indicator for development - REMOVED DUPLICATE PRESENTATION BUTTON */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                    <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        <span>
                            {isConnectedToPresentationDisplay ? 'Presentation Connected' : 'Host Preview Mode'}
                        </span>
                        <div className="ml-2 text-xs opacity-75">
                            Playing: {syncState.playing ? 'Yes' : 'No'}
                        </div>
                    </div>
                </div>
            )}

            {/* SlideRenderer with sync maintained for host preview */}
            <SlideRenderer
                slide={slide}
                isPlayingTarget={syncState.playing}
                videoTimeTarget={syncState.currentTime}
                triggerSeekEvent={false}
                videoRef={videoRef}
                onVideoPlay={handleHostVideoPlay}
                onVideoPause={handleHostVideoPause}
                onVideoTimeUpdate={handleHostVideoTimeUpdate}
                onVolumeChange={handleHostVideoVolumeChange}
                onLoadedMetadata={handleLoadedMetadata}
                masterVideoMode={false}
                syncMode={isConnectedToPresentationDisplay}
                hostMode={true}
                onHostVideoClick={handleHostVideoClick}
                allowHostAudio={!isConnectedToPresentationDisplay}
            />
        </div>
    );
};

export default DisplayView;