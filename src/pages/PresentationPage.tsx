// src/pages/PresentationPage.tsx - Refactored with BroadcastManager
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '../types';
import SlideRenderer from '../components/Display/SlideRenderer';
import { Hourglass, Monitor, RefreshCw } from 'lucide-react';
import { useBroadcastManager, VideoState } from '../utils/broadcastManager';

const PresentationPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connecting to session...');
    const [videoState, setVideoState] = useState<VideoState>({
        playing: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        lastUpdate: Date.now()
    });
    const [connectionError, setConnectionError] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const commandTimeoutRef = useRef<NodeJS.Timeout>();
    const slideLoadTimeRef = useRef<number>(0);
    const lastStateUpdateRef = useRef<number>(0);

    // Use broadcast manager
    const broadcastManager = useBroadcastManager(sessionId || null, 'presentation');

    // Broadcast video state to host preview - WITH THROTTLING
    const broadcastVideoState = useCallback((newState: Partial<VideoState>) => {
        const timestamp = Date.now();

        // THROTTLE: Only update every 1 second to prevent log spam
        if (timestamp - lastStateUpdateRef.current < 1000) {
            return;
        }
        lastStateUpdateRef.current = timestamp;

        setVideoState(prevState => {
            const updatedState = {
                ...prevState,
                ...newState,
                lastUpdate: timestamp
            };

            console.log('[PresentationPage] Broadcasting video state (throttled):', updatedState);

            if (broadcastManager) {
                broadcastManager.sendVideoState(updatedState);
            }

            return updatedState;
        });
    }, [broadcastManager]);

    // Set up broadcast manager listeners
    useEffect(() => {
        if (!broadcastManager) return;

        console.log(`[PresentationPage] Setting up broadcast listeners`);

        // Handle slide updates
        const unsubscribeSlideUpdate = broadcastManager.subscribe('SLIDE_UPDATE', (message) => {
            setIsConnectedToHost(true);
            setStatusMessage('Connected - Presentation Display Active');
            setCurrentSlide(message.slide);
            setConnectionError(false);
            slideLoadTimeRef.current = Date.now();
            console.log('[PresentationPage] Slide updated:', message.slide?.id);

            // Reset video state when slide changes, but don't broadcast yet
            const newVideoState: VideoState = {
                playing: false,
                currentTime: 0,
                duration: 0,
                volume: 1,
                lastUpdate: Date.now()
            };
            setVideoState(newVideoState);
            lastStateUpdateRef.current = Date.now(); // Reset throttle timer
        });

        // Handle initial video state from host
        const unsubscribeInitialState = broadcastManager.subscribe('INITIAL_VIDEO_STATE', (message) => {
            if (message.videoState) {
                console.log('[PresentationPage] Received initial video state:', message.videoState);
                const initialState = message.videoState;
                setVideoState(initialState);
                lastStateUpdateRef.current = Date.now();

                // Apply the initial state to video IMMEDIATELY if it exists
                if (videoRef.current) {
                    const video = videoRef.current;

                    // Clear any existing timeout
                    if (commandTimeoutRef.current) {
                        clearTimeout(commandTimeoutRef.current);
                    }

                    console.log('[PresentationPage] Applying initial state immediately');

                    // Set time position first
                    if (initialState.currentTime !== undefined &&
                        Math.abs(video.currentTime - initialState.currentTime) > 0.1) {
                        video.currentTime = initialState.currentTime;
                        console.log('[PresentationPage] Set video time to:', initialState.currentTime);
                    }

                    // Then set play state
                    if (initialState.playing && video.paused) {
                        video.play().catch(console.error);
                        console.log('[PresentationPage] Started video playback');
                    } else if (!initialState.playing && !video.paused) {
                        video.pause();
                        console.log('[PresentationPage] Paused video');
                    }
                }
            }
        });

        // Handle video control commands
        const unsubscribeVideoControl = broadcastManager.subscribe('VIDEO_CONTROL', (message) => {
            if (videoRef.current) {
                const { action, value, expectAck } = message;
                console.log(`[PresentationPage] Video control received: ${action}`, value);

                let commandSuccess = false;

                switch (action) {
                    case 'play':
                        console.log(`[PresentationPage] Executing PLAY command`);
                        if (value !== undefined && Math.abs(videoRef.current.currentTime - value) > 0.5) {
                            videoRef.current.currentTime = value;
                        }
                        videoRef.current.play()
                            .then(() => console.log(`[PresentationPage] PLAY successful`))
                            .catch((error) => console.error(`[PresentationPage] PLAY failed:`, error));
                        commandSuccess = true;
                        break;
                    case 'pause':
                        console.log(`[PresentationPage] Executing PAUSE command`);
                        if (value !== undefined && Math.abs(videoRef.current.currentTime - value) > 0.5) {
                            videoRef.current.currentTime = value;
                        }
                        videoRef.current.pause();
                        commandSuccess = true;
                        break;
                    case 'seek':
                        console.log(`[PresentationPage] Executing SEEK command to: ${value}`);
                        videoRef.current.currentTime = value;
                        broadcastVideoState({
                            currentTime: value,
                            playing: !videoRef.current.paused
                        });
                        commandSuccess = true;
                        break;
                    case 'volume':
                        console.log(`[PresentationPage] Executing VOLUME command to: ${value}`);
                        videoRef.current.volume = value;
                        broadcastVideoState({ volume: value });
                        commandSuccess = true;
                        break;
                }

                // Send acknowledgment if requested
                if (expectAck && commandSuccess) {
                    broadcastManager.broadcast('VIDEO_COMMAND_ACK', {
                        command: action,
                        success: true
                    });
                    console.log(`[PresentationPage] Sent ACK for command: ${action}`);
                }
            } else {
                console.error(`[PresentationPage] VIDEO_CONTROL received but videoRef.current is null`);
            }
        });

        // Handle session ended
        const unsubscribeSessionEnded = broadcastManager.subscribe('SESSION_ENDED', () => {
            setCurrentSlide(null);
            setIsConnectedToHost(false);
            setStatusMessage('Session has ended');
        });

        // Handle current state requests
        const unsubscribeStateRequest = broadcastManager.subscribe('REQUEST_CURRENT_STATE', () => {
            broadcastManager.broadcast('STATE_RESPONSE', {
                slide: currentSlide,
                videoState
            });
        });

        // Connection monitoring
        const unsubscribeConnection = broadcastManager.onConnectionChange((status) => {
            const isHost = status.connectionType === 'host';
            setIsConnectedToHost(status.isConnected && isHost);
            setConnectionError(!status.isConnected);

            if (!status.isConnected) {
                setStatusMessage('Lost connection to host. Please check the host dashboard.');
            }
        });

        // Announce that presentation display is ready
        broadcastManager.announcePresentation();

        // Request current state from host
        broadcastManager.requestCurrentState();

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!isConnectedToHost) {
                setStatusMessage('Connection timeout. Please ensure the host dashboard is open.');
                setConnectionError(true);
            }
        }, 5000);

        return () => {
            if (commandTimeoutRef.current) {
                clearTimeout(commandTimeoutRef.current);
            }
            clearTimeout(connectionTimeout);
            unsubscribeSlideUpdate();
            unsubscribeInitialState();
            unsubscribeVideoControl();
            unsubscribeSessionEnded();
            unsubscribeStateRequest();
            unsubscribeConnection();
        };
    }, [broadcastManager, isConnectedToHost, videoState, currentSlide, broadcastVideoState]);

    // Video event handlers for sync broadcasting - WITH THROTTLING
    const handleVideoPlay = useCallback(() => {
        console.log('[PresentationPage] Video play event');
        broadcastVideoState({ playing: true });
    }, [broadcastVideoState]);

    const handleVideoPause = useCallback(() => {
        console.log('[PresentationPage] Video pause event');
        broadcastVideoState({ playing: false });
    }, [broadcastVideoState]);

    const handleVideoTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            // THROTTLED: Only broadcast every 1 second (was 200ms)
            const now = Date.now();
            if (now - lastStateUpdateRef.current > 1000) {
                broadcastVideoState({
                    currentTime: videoRef.current.currentTime,
                    duration: videoRef.current.duration || 0
                });
            }
        }
    }, [broadcastVideoState]);

    const handleVolumeChange = useCallback(() => {
        if (videoRef.current) {
            broadcastVideoState({ volume: videoRef.current.volume });
        }
    }, [broadcastVideoState]);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            console.log('[PresentationPage] Video metadata loaded');
            const newState = {
                duration: videoRef.current.duration,
                currentTime: videoRef.current.currentTime,
                volume: videoRef.current.volume
            };
            broadcastVideoState(newState);

            // Check if we need to auto-play (for new slides)
            const timeSinceSlideLoad = Date.now() - slideLoadTimeRef.current;
            if (timeSinceSlideLoad < 1000) {
                console.log('[PresentationPage] Fresh slide - checking for auto-play');
                // Don't auto-play here - wait for host command
            }
        }
    }, [broadcastVideoState]);

    // Loading/Connection State
    if (!isConnectedToHost || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center relative">
                <div className="text-center text-white p-8">
                    {connectionError ? (
                        <>
                            <Monitor size={48} className="mx-auto mb-4 text-red-400"/>
                            <h1 className="text-2xl font-bold mb-2 text-red-300">Connection Issue</h1>
                            <p className="text-lg text-gray-300 mb-4">{statusMessage}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg mx-auto transition-colors"
                            >
                                <RefreshCw size={16} />
                                Reload Page
                            </button>
                        </>
                    ) : (
                        <>
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
                                    Make sure the host dashboard is open in another tab
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            {/* Pure display - no user controls, completely view-only */}
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
                masterVideoMode={true} // Enable master video mode for audio/events
                syncMode={false} // Not syncing to another display
                hostMode={false} // No click controls - pure display
            />

            {/* Development debug info only */}
            {process.env.NODE_ENV === 'development' && currentSlide && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                    <div>Slide: {currentSlide.id}</div>
                    <div>Playing: {videoState.playing ? 'Yes' : 'No'}</div>
                    <div>Time: {Math.floor(videoState.currentTime)}s / {Math.floor(videoState.duration)}s</div>
                    <div>Volume: {Math.round(videoState.volume * 100)}%</div>
                </div>
            )}
        </div>
    );
};

export default PresentationPage;