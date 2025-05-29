// src/components/Display/DisplayView.tsx - Fixed Host Click Responsiveness
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
    const ignoreVideoEventsRef = useRef<boolean>(false); // NEW: Prevent event loops

    // Get session ID from current URL or context
    const sessionId = window.location.pathname.includes('/classroom/')
        ? window.location.pathname.split('/classroom/')[1]
        : null;

    // Check if current slide has a video - SIMPLIFIED: Just check for video file
    const isVideoSlide = slide && slide.source_url && slide.source_url.match(/\.(mp4|webm|ogg)$/i);

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

                        // Send current state to presentation (preserve current playing state)
                        if (videoRef.current && isVideoSlide) {
                            const video = videoRef.current;
                            const currentlyPlaying = !video.paused;

                            const currentState = {
                                playing: currentlyPlaying, // FIXED: Preserve current playing state
                                currentTime: video.currentTime,
                                duration: video.duration || 0,
                                volume: video.volume,
                                lastUpdate: now
                            };

                            console.log('[DisplayView] Sending current state (preserving playback):', currentState);
                            setSyncState(currentState);

                            // Send immediately to presentation
                            if (channelRef.current) {
                                channelRef.current.postMessage({
                                    type: 'INITIAL_VIDEO_STATE',
                                    sessionId,
                                    videoState: currentState,
                                    timestamp: now
                                });
                                console.log('[DisplayView] Sent current state to presentation');
                            }
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

                // When presentation disconnects, don't auto-pause - let user control
                console.log('[DisplayView] Presentation disconnected - host video control restored');
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

    // FIXED: Handle host video click - COMPLETELY OVERRIDE SYNC
    const handleHostVideoClick = useCallback((shouldPlay: boolean) => {
        if (!sessionId || !videoRef.current) {
            console.warn('[DisplayView] No session ID or video ref for video command');
            return;
        }

        const timestamp = Date.now();
        lastCommandTimeRef.current = timestamp;
        const command = shouldPlay ? 'play' : 'pause';
        const currentTime = videoRef.current.currentTime;

        console.log(`[DisplayView] ===== HOST CLICK ===== command: ${command}, time: ${currentTime}`);

        // CRITICAL: Prevent ALL sync operations for a period after user click
        ignoreVideoEventsRef.current = true;

        // Control local video FIRST, before any state changes
        if (shouldPlay) {
            console.log('[DisplayView] EXECUTING PLAY on host video...');
            videoRef.current.play()
                .then(() => {
                    console.log('[DisplayView] ✅ Host video PLAY SUCCESS');

                    // Update state AFTER successful play
                    const newState = {
                        playing: true,
                        currentTime: videoRef.current!.currentTime,
                        duration: videoRef.current!.duration || 0,
                        volume: videoRef.current!.volume,
                        lastUpdate: timestamp
                    };
                    setSyncState(newState);

                    // Send to presentation after local success
                    if (isConnectedToPresentationDisplay && channelRef.current) {
                        channelRef.current.postMessage({
                            type: 'VIDEO_CONTROL',
                            sessionId,
                            action: 'play',
                            value: currentTime,
                            timestamp,
                            expectAck: true
                        });
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
            const newState = {
                playing: false,
                currentTime: videoRef.current.currentTime,
                duration: videoRef.current.duration || 0,
                volume: videoRef.current.volume,
                lastUpdate: timestamp
            };
            setSyncState(newState);

            // Send to presentation
            if (isConnectedToPresentationDisplay && channelRef.current) {
                channelRef.current.postMessage({
                    type: 'VIDEO_CONTROL',
                    sessionId,
                    action: 'pause',
                    value: currentTime,
                    timestamp,
                    expectAck: true
                });
                console.log('[DisplayView] Sent PAUSE command to presentation');
            }

            // Re-enable sync after delay
            setTimeout(() => {
                ignoreVideoEventsRef.current = false;
                console.log('[DisplayView] Re-enabled sync after PAUSE');
            }, 200);
        }
    }, [sessionId, isConnectedToPresentationDisplay]);

    // FIXED: Video event handlers - Only update state when not ignoring
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
            return; // Don't spam logs for time updates
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

            // REMOVED: Auto-play logic when presentation connects
            // The auto-play should be controlled by SlideRenderer based on mode
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
                syncMode={isConnectedToPresentationDisplay} // Sync mode when presentation is connected
                hostMode={true} // Always enable host click controls
                onHostVideoClick={handleHostVideoClick} // This must always be responsive
                allowHostAudio={!isConnectedToPresentationDisplay} // Audio when not connected
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