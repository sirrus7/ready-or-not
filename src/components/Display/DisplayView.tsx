// src/components/Display/DisplayView.tsx - Refactored with BroadcastManager
import React, { useEffect, useRef, useState, useCallback } from 'react';
import SlideRenderer from './SlideRenderer';
import { Slide } from '../../types';
import { Hourglass, Monitor } from 'lucide-react';
import { isVideo } from "../../utils/videoUtils.ts";
import { useBroadcastManager, VideoState } from '../../utils/broadcastManager';

interface DisplayViewProps {
    slide: Slide | null;
    isPlayingTarget?: boolean;
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
}

const DisplayView: React.FC<DisplayViewProps> = ({ slide }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [syncState, setSyncState] = useState<VideoState>({
        playing: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        lastUpdate: 0
    });
    const [isConnectedToPresentationDisplay, setIsConnectedToPresentationDisplay] = useState(false);
    const lastCommandTimeRef = useRef<number>(0);
    const slideChangeTimeRef = useRef<number>(0);
    const ignoreVideoEventsRef = useRef<boolean>(false);

    // Get session ID from current URL or context
    const sessionId = window.location.pathname.includes('/classroom/')
        ? window.location.pathname.split('/classroom/')[1]
        : null;

    // Check if current slide has a video
    const isVideoSlide = isVideo(slide?.source_url);

    // Use broadcast manager
    const broadcastManager = useBroadcastManager(sessionId, 'host');

    // Track slide changes to handle auto-play properly
    useEffect(() => {
        if (slide) {
            slideChangeTimeRef.current = Date.now();
            console.log('[DisplayView] Slide changed to:', slide.id);
        }
    }, [slide?.id]);

    // Set up broadcast manager listeners
    useEffect(() => {
        if (!broadcastManager || !slide) return;

        // Handle video state updates from presentation
        const unsubscribeVideoState = broadcastManager.subscribe('VIDEO_STATE_UPDATE', (message) => {
            if (message.videoState) {
                const newState = message.videoState;
                const timeSinceCommand = Date.now() - lastCommandTimeRef.current;

                if (newState.lastUpdate > syncState.lastUpdate && timeSinceCommand > 100) {
                    console.log('[DisplayView] Received video state update:', newState);
                    setSyncState(prev => ({
                        ...prev,
                        ...newState,
                        lastUpdate: Date.now()
                    }));
                    setIsConnectedToPresentationDisplay(true);
                }
            }
        });

        // Handle command acknowledgments
        const unsubscribeCommandAck = broadcastManager.subscribe('VIDEO_COMMAND_ACK', (message) => {
            console.log('[DisplayView] Command acknowledged:', message.command);
        });

        // Handle pong messages (which include video state)
        const unsubscribePong = broadcastManager.subscribe('PONG', (message) => {
            const now = Date.now();
            const connectionType = message.connectionType;

            if (connectionType === 'presentation') {
                setIsConnectedToPresentationDisplay(true);

                if (message.videoState && message.videoState.lastUpdate > syncState.lastUpdate) {
                    const timeSinceCommand = now - lastCommandTimeRef.current;
                    if (timeSinceCommand > 100) {
                        setSyncState(prev => ({
                            ...prev,
                            ...message.videoState,
                            lastUpdate: now
                        }));
                    }
                }
            }
        });

        // Handle presentation ready
        const unsubscribeReady = broadcastManager.subscribe('PRESENTATION_READY', (message) => {
            setIsConnectedToPresentationDisplay(true);
            console.log('[DisplayView] Presentation display connected');

            // Send current state to presentation (preserve current playing state)
            if (videoRef.current && isVideoSlide) {
                const video = videoRef.current;
                const currentlyPlaying = !video.paused;

                const currentState: VideoState = {
                    playing: currentlyPlaying,
                    currentTime: video.currentTime,
                    duration: video.duration || 0,
                    volume: video.volume,
                    lastUpdate: Date.now()
                };

                console.log('[DisplayView] Sending current state (preserving playback):', currentState);
                setSyncState(currentState);

                // Send immediately to presentation
                setTimeout(() => {
                    broadcastManager.sendInitialVideoState(currentState);
                    console.log('[DisplayView] Sent current state to presentation');
                }, 300);
            }
        });

        // Connection monitoring
        const unsubscribeConnection = broadcastManager.onConnectionChange((status) => {
            const wasConnected = isConnectedToPresentationDisplay;
            const isPresentation = status.connectionType === 'presentation';
            const nowConnected = status.isConnected && isPresentation;

            setIsConnectedToPresentationDisplay(nowConnected);

            if (wasConnected && !nowConnected) {
                console.log('[DisplayView] Presentation disconnected - host video control restored');
            }
        });

        return () => {
            unsubscribeVideoState();
            unsubscribeCommandAck();
            unsubscribePong();
            unsubscribeReady();
            unsubscribeConnection();
        };
    }, [broadcastManager, slide?.id, syncState.lastUpdate, isConnectedToPresentationDisplay, isVideoSlide]);

    // Handle host video click - COMPLETELY OVERRIDE SYNC
    const handleHostVideoClick = useCallback((shouldPlay: boolean) => {
        if (!sessionId || !videoRef.current || !broadcastManager) {
            console.warn('[DisplayView] No session ID, video ref, or broadcast manager for video command');
            return;
        }

        const timestamp = Date.now();
        lastCommandTimeRef.current = timestamp;
        const command = shouldPlay ? 'play' : 'pause';
        const currentTime = videoRef.current.currentTime;

        console.log(`[DisplayView] ===== HOST CLICK ===== command: ${command}, time: ${currentTime}`);

        // Prevent sync operations for a period after user click
        ignoreVideoEventsRef.current = true;

        // Control local video FIRST, before any state changes
        if (shouldPlay) {
            console.log('[DisplayView] EXECUTING PLAY on host video...');
            videoRef.current.play()
                .then(() => {
                    console.log('[DisplayView] ✅ Host video PLAY SUCCESS');

                    // Update state AFTER successful play
                    const newState: VideoState = {
                        playing: true,
                        currentTime: videoRef.current!.currentTime,
                        duration: videoRef.current!.duration || 0,
                        volume: videoRef.current!.volume,
                        lastUpdate: timestamp
                    };
                    setSyncState(newState);

                    // Send to presentation after local success
                    if (isConnectedToPresentationDisplay) {
                        broadcastManager.sendVideoControl('play', currentTime, true);
                        console.log('[DisplayView] Sent PLAY command to presentation');
                    }
                })
                .catch((error) => {
                    console.error('[DisplayView] ❌ Host video PLAY FAILED:', error);
                })
                .finally(() => {
                    // Re-enable sync after delay
                    setTimeout(() => {
                        ignoreVideoEventsRef.current = false;
                        console.log('[DisplayView] Re-enabled sync after PLAY');
                    }, 500);
                });
        } else {
            console.log('[DisplayView] EXECUTING PAUSE on host video...');
            videoRef.current.pause();
            console.log('[DisplayView] ✅ Host video PAUSED');

            // Update state immediately for pause
            const newState: VideoState = {
                playing: false,
                currentTime: videoRef.current.currentTime,
                duration: videoRef.current.duration || 0,
                volume: videoRef.current.volume,
                lastUpdate: timestamp
            };
            setSyncState(newState);

            // Send to presentation
            if (isConnectedToPresentationDisplay) {
                broadcastManager.sendVideoControl('pause', currentTime, true);
                console.log('[DisplayView] Sent PAUSE command to presentation');
            }

            // Re-enable sync after delay
            setTimeout(() => {
                ignoreVideoEventsRef.current = false;
                console.log('[DisplayView] Re-enabled sync after PAUSE');
            }, 200);
        }
    }, [sessionId, isConnectedToPresentationDisplay, broadcastManager]);

    // Video event handlers - Only update state when not ignoring
    const handleHostVideoPlay = useCallback(() => {
        if (ignoreVideoEventsRef.current) {
            console.log('[DisplayView] Ignoring play event (triggered by our own action)');
            return;
        }

        if (videoRef.current) {
            const now = Date.now();
            console.log('[DisplayView] Host video play event (natural)');
            setSyncState(prev => ({
                ...prev,
                playing: true,
                currentTime: videoRef.current!.currentTime,
                lastUpdate: now
            }));
        }
    }, []);

    const handleHostVideoPause = useCallback(() => {
        if (ignoreVideoEventsRef.current) {
            console.log('[DisplayView] Ignoring pause event (triggered by our own action)');
            return;
        }

        if (videoRef.current) {
            const now = Date.now();
            console.log('[DisplayView] Host video pause event (natural)');
            setSyncState(prev => ({
                ...prev,
                playing: false,
                currentTime: videoRef.current!.currentTime,
                lastUpdate: now
            }));
        }
    }, []);

    const handleHostVideoTimeUpdate = useCallback(() => {
        if (ignoreVideoEventsRef.current) {
            return;
        }

        if (videoRef.current) {
            const now = Date.now();
            // Throttle time updates to prevent excessive state changes
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
        if (ignoreVideoEventsRef.current) {
            console.log('[DisplayView] Ignoring volume change event');
            return;
        }

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
        }
    }, []);

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

            {/* SlideRenderer with proper sync mode configuration */}
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

            {/* DEBUG INFO */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-20 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                    <div>Connected: {isConnectedToPresentationDisplay ? 'YES' : 'NO'}</div>
                    <div>Sync Mode: {isConnectedToPresentationDisplay ? 'ENABLED' : 'DISABLED'}</div>
                    <div>Host Clicks: ALWAYS ENABLED</div>
                    <div>Audio: {!isConnectedToPresentationDisplay ? 'YES' : 'NO'}</div>
                    <div>Ignoring Events: {ignoreVideoEventsRef.current ? 'YES' : 'NO'}</div>
                </div>
            )}
        </div>
    );
};

export default DisplayView;