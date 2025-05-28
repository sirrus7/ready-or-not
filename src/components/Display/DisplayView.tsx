// src/components/Display/DisplayView.tsx - Updated with Audio Control
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

        const handleMessage = (event: MessageEvent) => {
            const now = Date.now();

            switch (event.data.type) {
                case 'VIDEO_STATE_UPDATE':
                    if (event.data.sessionId === sessionId && event.data.videoState) {
                        const newState = event.data.videoState;
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

    // Handle host video click - sends command to presentation display
    const handleHostVideoClick = useCallback((shouldPlay: boolean) => {
        if (!channelRef.current || !sessionId) return;

        const timestamp = Date.now();
        const command = shouldPlay ? 'play' : 'pause';

        // Send video command to presentation display
        channelRef.current.postMessage({
            type: 'VIDEO_CONTROL',
            sessionId,
            action: command,
            timestamp
        });

        // Update local state immediately for responsive UI
        setSyncState(prev => ({
            ...prev,
            playing: shouldPlay,
            lastUpdate: timestamp
        }));

        console.log(`[DisplayView] Host clicked: ${command}`);
    }, [sessionId]);

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
                <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                    <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        <span>
                            {isConnectedToPresentationDisplay ? 'Presentation Connected' : 'No Presentation Display'}
                        </span>
                    </div>
                </div>
            )}

            {/* SlideRenderer with audio control based on presentation display connection */}
            <SlideRenderer
                slide={slide}
                isPlayingTarget={syncState.playing}
                videoTimeTarget={syncState.currentTime}
                triggerSeekEvent={false}
                videoRef={videoRef}
                masterVideoMode={false}
                syncMode={isConnectedToPresentationDisplay}
                hostMode={true} // Enable click controls for host
                onHostVideoClick={handleHostVideoClick}
                allowHostAudio={!isConnectedToPresentationDisplay} // NEW: Enable audio when no presentation display
            />
        </div>
    );
};

export default DisplayView;