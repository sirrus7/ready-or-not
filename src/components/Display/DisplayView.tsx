// src/components/Display/DisplayView.tsx - Perfect Sync Preview Display
import React, { useEffect, useRef, useState, useCallback } from 'react';
import SlideRenderer from './SlideRenderer';
import { Slide } from '../../types';
import { Hourglass, Monitor, Info, Video, Wifi, WifiOff } from 'lucide-react';

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
    const lastSyncTimeRef = useRef(0);

    // Get session ID from current URL or context
    const sessionId = window.location.pathname.includes('/classroom/')
        ? window.location.pathname.split('/classroom/')[1]
        : null;

    // Initialize BroadcastChannel for cross-tab sync
    useEffect(() => {
        if (!sessionId || !slide) return;

        const channelName = `game-session-${sessionId}`;
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        console.log(`[DisplayView] Sync channel created: ${channelName}`);

        const handleMessage = (event: MessageEvent) => {
            const now = Date.now();

            switch (event.data.type) {
                case 'VIDEO_STATE_UPDATE':
                    if (event.data.sessionId === sessionId && event.data.videoState) {
                        const newState = event.data.videoState;
                        // Only update if this is newer than our last update
                        if (newState.lastUpdate > syncState.lastUpdate) {
                            setSyncState(prev => ({
                                ...prev,
                                ...newState,
                                lastUpdate: now
                            }));
                            setIsConnectedToPresentationDisplay(true);
                        }
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
            if (timeSinceLastUpdate > 5000) {
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
    }, [sessionId, slide?.id, syncState.lastUpdate]);

    // Sync video state with presentation display
    useEffect(() => {
        if (!videoRef.current || !isConnectedToPresentationDisplay) return;

        const video = videoRef.current;
        const timeDiff = Math.abs(video.currentTime - syncState.currentTime);

        // Sync play/pause state
        if (syncState.playing && video.paused) {
            video.play().catch(console.error);
        } else if (!syncState.playing && !video.paused) {
            video.pause();
        }

        // Sync time position (only if difference is significant)
        if (timeDiff > 0.5) {
            video.currentTime = syncState.currentTime;
            lastSyncTimeRef.current = Date.now();
        }

        // Sync volume
        if (Math.abs(video.volume - syncState.volume) > 0.05) {
            video.volume = syncState.volume;
        }
    }, [syncState, isConnectedToPresentationDisplay]);

    // Prevent local video events from interfering with sync
    const handleVideoEvent = useCallback((e: Event) => {
        // Only prevent default if we're syncing with presentation display
        if (isConnectedToPresentationDisplay) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, [isConnectedToPresentationDisplay]);

    // Add event listeners to prevent interference
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.addEventListener('play', handleVideoEvent);
        video.addEventListener('pause', handleVideoEvent);
        video.addEventListener('seeked', handleVideoEvent);

        return () => {
            video.removeEventListener('play', handleVideoEvent);
            video.removeEventListener('pause', handleVideoEvent);
            video.removeEventListener('seeked', handleVideoEvent);
        };
    }, [handleVideoEvent]);

    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                <p className="text-xl">Waiting for game content...</p>
                <p className="text-sm text-gray-400 mt-2">(Host Preview)</p>
            </div>
        );
    }

    // Check if this is a video slide
    const isVideoSlide = slide && (
        slide.type === 'video' ||
        (slide.type === 'interactive_invest' && slide.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
        ((slide.type === 'consequence_reveal' || slide.type === 'payoff_reveal') &&
            slide.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

    return (
        <div className="h-full w-full overflow-hidden relative">
            {/* Use the same SlideRenderer with sync support */}
            <SlideRenderer
                slide={slide}
                isPlayingTarget={syncState.playing}
                videoTimeTarget={syncState.currentTime}
                triggerSeekEvent={false}
                videoRef={videoRef}
                masterVideoMode={false}
                // Pass sync state for perfect synchronization
                syncMode={isConnectedToPresentationDisplay}
            />

            {/* Sync Status Indicator for Video Slides */}
            {isVideoSlide && (
                <div className="absolute top-4 right-4 bg-blue-900/90 backdrop-blur-sm rounded-lg p-3 text-white text-sm max-w-xs z-20">
                    <div className="flex items-center mb-2">
                        <Video size={16} className="mr-2 text-blue-300"/>
                        <span className="font-semibold">Video Sync</span>
                        <div className="ml-2">
                            {isConnectedToPresentationDisplay ? (
                                <Wifi size={14} className="text-green-400" />
                            ) : (
                                <WifiOff size={14} className="text-red-400" />
                            )}
                        </div>
                    </div>
                    <div className="text-blue-200 text-xs space-y-1">
                        {isConnectedToPresentationDisplay ? (
                            <>
                                <p>🔄 Synced with presentation display</p>
                                <p>⏯️ Play/Pause: {syncState.playing ? 'Playing' : 'Paused'}</p>
                                <p>⏱️ Time: {Math.floor(syncState.currentTime)}s / {Math.floor(syncState.duration)}s</p>
                                <p>🔊 Volume: {Math.round(syncState.volume * 100)}%</p>
                            </>
                        ) : (
                            <>
                                <p>❌ Not connected to presentation display</p>
                                <p>🎬 Open presentation display for sync</p>
                                <p>🎵 Audio plays from presentation tab</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* General Preview Watermark */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                <div className="flex items-center">
                    <Monitor size={12} className="mr-1 text-blue-400"/>
                    <span>Host Preview</span>
                    {slide.id !== undefined && (
                        <span className="ml-2 text-gray-300">• Slide {slide.id}</span>
                    )}
                    {isVideoSlide && (
                        <span className="ml-2">
                            {isConnectedToPresentationDisplay ? (
                                <span className="text-green-400">• Synced</span>
                            ) : (
                                <span className="text-red-400">• Not Synced</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DisplayView;