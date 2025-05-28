// src/pages/PresentationPage.tsx - Cross-Tab Communication with Perfect Sync
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '../types';
import SlideRenderer from '../components/Display/SlideRenderer';
import { Hourglass, Monitor } from 'lucide-react';

interface VideoState {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
}

const PresentationPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connecting to session...');
    const [videoState, setVideoState] = useState<VideoState>({
        playing: false,
        currentTime: 0,
        duration: 0,
        volume: 1
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout>();
    const channelRef = useRef<BroadcastChannel | null>(null);

    // Initialize BroadcastChannel for cross-tab communication
    useEffect(() => {
        if (!sessionId) return;

        const channelName = `game-session-${sessionId}`;
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        console.log(`[PresentationPage] Created BroadcastChannel: ${channelName}`);

        // Listen for messages from host
        const handleMessage = (event: MessageEvent) => {
            console.log('[PresentationPage] BroadcastChannel message received:', event.data);

            switch (event.data.type) {
                case 'SLIDE_UPDATE':
                    setIsConnected(true);
                    setStatusMessage('Connected to host');
                    setCurrentSlide(event.data.slide);
                    console.log('[PresentationPage] Slide updated:', event.data.slide?.id);
                    // Reset video state when slide changes
                    setVideoState({
                        playing: false,
                        currentTime: 0,
                        duration: 0,
                        volume: 1
                    });
                    break;

                case 'VIDEO_CONTROL':
                    if (videoRef.current) {
                        const { action, value } = event.data;
                        console.log(`[PresentationPage] Video control: ${action}`, value);

                        switch (action) {
                            case 'play':
                                videoRef.current.play().catch(console.error);
                                break;
                            case 'pause':
                                videoRef.current.pause();
                                break;
                            case 'seek':
                                videoRef.current.currentTime = value;
                                broadcastVideoState({ currentTime: value });
                                break;
                            case 'volume':
                                videoRef.current.volume = value;
                                broadcastVideoState({ volume: value });
                                break;
                        }
                    }
                    break;

                case 'SESSION_ENDED':
                    setCurrentSlide(null);
                    setIsConnected(false);
                    setStatusMessage('Session has ended');
                    break;

                case 'PING':
                    // Respond to keep-alive pings from host
                    channel.postMessage({
                        type: 'PONG',
                        sessionId,
                        videoState,
                        timestamp: Date.now()
                    });
                    break;

                case 'REQUEST_CURRENT_STATE':
                    // Send current state when requested
                    channel.postMessage({
                        type: 'STATE_RESPONSE',
                        sessionId,
                        slide: currentSlide,
                        videoState,
                        timestamp: Date.now()
                    });
                    break;
            }
        };

        channel.addEventListener('message', handleMessage);

        // Announce that presentation display is ready
        channel.postMessage({
            type: 'PRESENTATION_READY',
            sessionId,
            timestamp: Date.now()
        });

        // Request current state from host
        channel.postMessage({
            type: 'REQUEST_CURRENT_STATE',
            sessionId,
            timestamp: Date.now()
        });

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!isConnected) {
                setStatusMessage('Connection timeout. Please ensure the host dashboard is open in another tab.');
            }
        }, 5000);

        return () => {
            clearTimeout(connectionTimeout);
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, [sessionId, isConnected, videoState, currentSlide]);

    // Send video state updates to host
    const broadcastVideoState = useCallback((newState: Partial<VideoState>) => {
        const updatedState = { ...videoState, ...newState };
        setVideoState(updatedState);

        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'VIDEO_STATE_UPDATE',
                sessionId,
                videoState: updatedState,
                timestamp: Date.now()
            });
        }
    }, [sessionId, videoState]);

    // Handle video events
    const handleVideoPlay = useCallback(() => {
        broadcastVideoState({ playing: true });
    }, [broadcastVideoState]);

    const handleVideoPause = useCallback(() => {
        broadcastVideoState({ playing: false });
    }, [broadcastVideoState]);

    const handleVideoTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            // Throttle time updates to avoid excessive messaging
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }

            syncTimeoutRef.current = setTimeout(() => {
                broadcastVideoState({
                    currentTime: videoRef.current?.currentTime || 0,
                    duration: videoRef.current?.duration || 0
                });
            }, 500); // Update every 500ms when playing
        }
    }, [broadcastVideoState]);

    const handleVolumeChange = useCallback(() => {
        if (videoRef.current) {
            broadcastVideoState({ volume: videoRef.current.volume });
        }
    }, [broadcastVideoState]);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            broadcastVideoState({
                duration: videoRef.current.duration,
                currentTime: videoRef.current.currentTime,
                volume: videoRef.current.volume
            });
        }
    }, [broadcastVideoState]);

    // Loading/Connection State
    if (!isConnected || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white p-8">
                    <Hourglass size={48} className="mx-auto mb-4 text-blue-400 animate-pulse"/>
                    <h1 className="text-2xl font-bold mb-2">Presentation Display</h1>
                    <p className="text-lg text-gray-300">{statusMessage}</p>
                    {sessionId && (
                        <p className="text-sm text-gray-500 mt-4">
                            Session ID: {sessionId}
                        </p>
                    )}
                    <div className="mt-8 text-sm text-gray-400">
                        <p className="flex items-center justify-center">
                            <Monitor size={16} className="mr-2"/>
                            Waiting for host to start content display
                        </p>
                        <p className="mt-2 text-xs">
                            Make sure the teacher dashboard is open in another tab
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-black">
            <SlideRenderer
                slide={currentSlide}
                isPlayingTarget={videoState.playing}
                videoTimeTarget={videoState.currentTime}
                triggerSeekEvent={false}
                videoRef={videoRef}
                onVideoPlay={handleVideoPlay}
                onVideoPause={handleVideoPause}
                onVideoTimeUpdate={handleVideoTimeUpdate}
                onVolumeChange={handleVolumeChange}
                onLoadedMetadata={handleLoadedMetadata}
                masterVideoMode={true}
            />
        </div>
    );
};

export default PresentationPage;