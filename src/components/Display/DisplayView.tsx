// src/components/Display/DisplayView.tsx - Fixed State Transfer and Sync Mode
import React, { useEffect, useRef, useState, useCallback } from 'react';
import SlideRenderer from './SlideRenderer';
import { Slide } from '../../types';
import { Hourglass, Monitor } from 'lucide-react';

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

const DisplayView: React.FC<DisplayViewProps> = ({ slide }) => {
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
    const lastCommandTimeRef = useRef<number>(0);
    const slideChangeTimeRef = useRef<number>(0);

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

    // Track slide changes to handle auto-play properly
    useEffect(() => {
        if (slide) {
            slideChangeTimeRef.current = Date.now();
            console.log('[DisplayView] Slide changed to:', slide.id);
        }
    }, [slide?.id]);

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
                        // Only update if this is newer and not from our own command
                        const timeSinceCommand = now - lastCommandTimeRef.current;
                        if (newState.lastUpdate > syncState.lastUpdate && timeSinceCommand > 100) {
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
                    if (event.data.sessionId === sessionId && event.data.command) {
                        console.log('[DisplayView] Command acknowledged:', event.data.command);
                        // Don't update state here - let normal video events handle it
                    }
                    break;

                case 'PONG':
                    if (event.data.sessionId === sessionId) {
                        setIsConnectedToPresentationDisplay(true);
                        if (event.data.videoState && event.data.videoState.lastUpdate > syncState.lastUpdate) {
                            const timeSinceCommand = now - lastCommandTimeRef.current;
                            if (timeSinceCommand > 100) {
                                setSyncState(prev => ({
                                    ...prev,
                                    ...event.data.videoState,
                                    lastUpdate: now
                                }));
                            }
                        }
                    }
                    break;

                case 'PRESENTATION_READY':
                    if (event.data.sessionId === sessionId) {
                        setIsConnectedToPresentationDisplay(true);
                        console.log('[DisplayView] Presentation display connected');

                        // IMMEDIATELY pause host video when presentation connects
                        if (videoRef.current && !videoRef.current.paused) {
                            videoRef.current.pause();
                            console.log('[DisplayView] Paused host video due to presentation connection');
                        }

                        // FIXED: Wait for video readiness before sending state - SINGLE SEND
                        if (videoRef.current && isVideoSlide) {
                            const sendStateOnce = () => {
                                const video = videoRef.current!;

                                // Always send current state, regardless of readyState
                                const currentState = {
                                    playing: false, // Always start paused when presentation connects
                                    currentTime: video.currentTime,
                                    duration: video.duration || 0,
                                    volume: video.volume,
                                    lastUpdate: now
                                };

                                console.log('[DisplayView] Sending initial state:', currentState);
                                setSyncState(currentState);

                                // Send immediately, no delay
                                if (channelRef.current) {
                                    channelRef.current.postMessage({
                                        type: 'INITIAL_VIDEO_STATE',
                                        sessionId,
                                        videoState: currentState,
                                        timestamp: now
                                    });
                                    console.log('[DisplayView] Sent initial state (once) - time:', currentState.currentTime);
                                }
                            };

                            sendStateOnce();
                        }
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

                // IMMEDIATELY pause video when presentation disconnects
                if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    console.log('[DisplayView] Paused host video due to presentation disconnect');
                }
            }
        }, 1000);

        return () => {
            clearInterval(pingInterval);
            clearInterval(connectionCheck);
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, [sessionId, slide?.id, syncState.lastUpdate, isConnectedToPresentationDisplay, isVideoSlide]);

    // Handle host video click for maintaining sync
    const handleHostVideoClick = useCallback((shouldPlay: boolean) => {
        if (!sessionId || !videoRef.current) {
            console.warn('[DisplayView] No session ID or video ref for video command');
            return;
        }

        const timestamp = Date.now();
        lastCommandTimeRef.current = timestamp;
        const command = shouldPlay ? 'play' : 'pause';
        const currentTime = videoRef.current.currentTime;

        console.log(`[DisplayView] Host click - command: ${command}, time: ${currentTime}, connected: ${isConnectedToPresentationDisplay}`);

        // Update local state immediately
        const newState = {
            playing: shouldPlay,
            currentTime: currentTime,
            duration: videoRef.current.duration || 0,
            volume: videoRef.current.volume,
            lastUpdate: timestamp
        };
        setSyncState(newState);

        // Control local video immediately
        if (shouldPlay) {
            videoRef.current.play().catch(console.error);
        } else {
            videoRef.current.pause();
        }

        // Send command to presentation display if connected
        if (isConnectedToPresentationDisplay && channelRef.current) {
            channelRef.current.postMessage({
                type: 'VIDEO_CONTROL',
                sessionId,
                action: command,
                value: currentTime, // Include current time for seeking
                timestamp,
                expectAck: true
            });
        }
    }, [sessionId, isConnectedToPresentationDisplay]);

    const handleHostVideoPlay = useCallback(() => {
        if (videoRef.current) {
            const now = Date.now();
            console.log('[DisplayView] Host video play event');
            setSyncState(prev => ({
                ...prev,
                playing: true,
                currentTime: videoRef.current!.currentTime,
                lastUpdate: now
            }));
        }
    }, []);

    const handleHostVideoPause = useCallback(() => {
        if (videoRef.current) {
            const now = Date.now();
            console.log('[DisplayView] Host video pause event');
            setSyncState(prev => ({
                ...prev,
                playing: false,
                currentTime: videoRef.current!.currentTime,
                lastUpdate: now
            }));
        }
    }, []);

    const handleHostVideoTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            const now = Date.now();
            // INCREASED throttle to prevent excessive updates (was 500ms, now 1000ms)
            if (now - syncState.lastUpdate > 1000) {
                setSyncState(prev => ({
                    ...prev,
                    currentTime: videoRef.current!.currentTime,
                    duration: videoRef.current!.duration || 0,
                    lastUpdate: now
                }));
            }
        }
    }, [syncState.lastUpdate]);

    const handleHostVideoVolumeChange = useCallback(() => {
        if (videoRef.current) {
            setSyncState(prev => ({
                ...prev,
                volume: videoRef.current!.volume,
                lastUpdate: Date.now()
            }));
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            console.log('[DisplayView] Video metadata loaded');
            const newState = {
                duration: videoRef.current.duration,
                currentTime: videoRef.current.currentTime,
                volume: videoRef.current.volume,
                lastUpdate: Date.now()
            };

            setSyncState(prev => ({
                ...prev,
                ...newState
            }));

            if (isConnectedToPresentationDisplay && isVideoSlide) {
                const timeSinceSlideChange = Date.now() - slideChangeTimeRef.current;
                if (timeSinceSlideChange < 2000) {
                    console.log('[DisplayView] Auto-playing for connected presentation display');
                    setTimeout(() => {
                        if (videoRef.current && channelRef.current) {
                            videoRef.current.play().catch(console.error);

                            const playState = {
                                playing: true,
                                currentTime: 0,
                                duration: videoRef.current.duration || 0,
                                volume: videoRef.current.volume,
                                lastUpdate: Date.now()
                            };

                            setSyncState(playState);
                            lastCommandTimeRef.current = Date.now();

                            // Send play command to presentation
                            channelRef.current.postMessage({
                                type: 'VIDEO_CONTROL',
                                sessionId,
                                action: 'play',
                                value: 0,
                                timestamp: Date.now(),
                                expectAck: true
                            });
                        }
                    }, 100);
                }
            }
        }
    }, [isConnectedToPresentationDisplay, isVideoSlide, sessionId]);

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
            {/* Connection status indicator for development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                    <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        <span>
                            {isConnectedToPresentationDisplay ? 'Presentation Connected' : 'Host Preview Mode'}
                        </span>
                        <div className="ml-2 text-xs opacity-75">
                            Playing: {syncState.playing ? 'Yes' : 'No'} | Time: {Math.floor(syncState.currentTime)}s
                        </div>
                    </div>
                </div>
            )}

            {/* SlideRenderer with FIXED sync mode logic */}
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
                syncMode={isConnectedToPresentationDisplay} // FIXED: Properly set sync mode
                hostMode={true}
                onHostVideoClick={handleHostVideoClick}
                allowHostAudio={!isConnectedToPresentationDisplay} // FIXED: Audio when not connected
            />

            {/* DEBUG INFO - Show sync mode status */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-20 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                    <div>Connected to Presentation: {isConnectedToPresentationDisplay ? 'YES' : 'NO'}</div>
                    <div>Sync Mode: {isConnectedToPresentationDisplay ? 'ENABLED' : 'DISABLED'}</div>
                    <div>Audio Allowed: {!isConnectedToPresentationDisplay ? 'YES' : 'NO'}</div>
                </div>
            )}
        </div>
    );
};

export default DisplayView;