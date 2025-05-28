// src/pages/PresentationPage.tsx - Master Display with Perfect Sync
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

    // Send video state updates to host
    const broadcastVideoState = useCallback((newState: Partial<VideoState>) => {
        const updatedState = { ...videoState, ...newState };
        setVideoState(updatedState);

        if (window.opener) {
            window.opener.postMessage({
                type: 'VIDEO_STATE_UPDATE',
                sessionId,
                videoState: updatedState
            }, window.location.origin);
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

    useEffect(() => {
        if (!sessionId) {
            setStatusMessage('No session ID provided');
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            // Only accept messages from same origin
            if (event.origin !== window.location.origin) return;

            console.log('[PresentationPage] Received message:', event.data);

            switch (event.data.type) {
                case 'SLIDE_UPDATE':
                    setIsConnected(true);
                    setCurrentSlide(event.data.slide);
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
                    // Respond to keep-alive pings from teacher window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'PONG',
                            sessionId,
                            videoState
                        }, window.location.origin);
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify teacher window that student display is ready
        if (window.opener) {
            window.opener.postMessage({
                type: 'STUDENT_DISPLAY_READY',
                sessionId
            }, window.location.origin);

            // Request current state
            window.opener.postMessage({
                type: 'REQUEST_CURRENT_STATE',
                sessionId
            }, window.location.origin);
        }

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!isConnected) {
                setStatusMessage('Connection timeout. Please ensure the teacher dashboard is open.');
            }
        }, 5000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearTimeout(connectionTimeout);
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }

            // Notify teacher window that student display is closing
            if (window.opener) {
                window.opener.postMessage({
                    type: 'STUDENT_DISPLAY_CLOSING',
                    sessionId
                }, window.location.origin);
            }
        };
    }, [sessionId, isConnected, videoState]);

    // Loading/Connection State
    if (!isConnected || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white p-8">
                    <Hourglass size={48} className="mx-auto mb-4 text-blue-400 animate-pulse"/>
                    <h1 className="text-2xl font-bold mb-2">Student Display</h1>
                    <p className="text-lg text-gray-300">{statusMessage}</p>
                    {sessionId && (
                        <p className="text-sm text-gray-500 mt-4">
                            Session ID: {sessionId}
                        </p>
                    )}
                    <div className="mt-8 text-sm text-gray-400">
                        <p className="flex items-center justify-center">
                            <Monitor size={16} className="mr-2"/>
                            Waiting for teacher to start content display
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Check if current slide is a video
    const isVideoSlide = currentSlide && (
        currentSlide.type === 'video' ||
        (currentSlide.type === 'interactive_invest' && currentSlide.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
        ((currentSlide.type === 'consequence_reveal' || currentSlide.type === 'payoff_reveal') &&
            currentSlide.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

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