// src/pages/PresentationPage.tsx - Master Control with Perfect Sync
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '../types';
import SlideRenderer from '../components/Display/SlideRenderer';
import { Hourglass, Monitor, Wifi, WifiOff } from 'lucide-react';

interface VideoState {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    lastUpdate: number;
}

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

    const videoRef = useRef<HTMLVideoElement>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout>();
    const lastPingRef = useRef<number>(0);

    // Broadcast video state to host preview
    const broadcastVideoState = useCallback((newState: Partial<VideoState>) => {
        const updatedState = {
            ...videoState,
            ...newState,
            lastUpdate: Date.now()
        };

        setVideoState(updatedState);

        if (channelRef.current && sessionId) {
            channelRef.current.postMessage({
                type: 'VIDEO_STATE_UPDATE',
                sessionId,
                videoState: updatedState,
                timestamp: Date.now()
            });
        }
    }, [sessionId, videoState]);

    // Initialize BroadcastChannel for cross-tab communication
    useEffect(() => {
        if (!sessionId) return;

        const channelName = `game-session-${sessionId}`;
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        console.log(`[PresentationPage] Created BroadcastChannel: ${channelName}`);

        // Listen for messages from host
        const handleMessage = (event: MessageEvent) => {
            const now = Date.now();
            lastPingRef.current = now;

            console.log('[PresentationPage] BroadcastChannel message received:', event.data);

            switch (event.data.type) {
                case 'SLIDE_UPDATE':
                    setIsConnectedToHost(true);
                    setStatusMessage('Connected to host - Presentation Display Active');
                    setCurrentSlide(event.data.slide);
                    console.log('[PresentationPage] Slide updated:', event.data.slide?.id);

                    // Reset video state when slide changes
                    const newVideoState = {
                        playing: false,
                        currentTime: 0,
                        duration: 0,
                        volume: 1,
                        lastUpdate: now
                    };
                    setVideoState(newVideoState);

                    // Broadcast the reset state
                    if (channel) {
                        channel.postMessage({
                            type: 'VIDEO_STATE_UPDATE',
                            sessionId,
                            videoState: newVideoState,
                            timestamp: now
                        });
                    }
                    break;

                case 'VIDEO_CONTROL':
                    if (videoRef.current) {
                        const { action, value } = event.data;
                        console.log(`[PresentationPage] Video control: ${action}`, value);

                        switch (action) {
                            case 'play':
                                videoRef.current.play().catch(console.error);
                                broadcastVideoState({ playing: true });
                                break;
                            case 'pause':
                                videoRef.current.pause();
                                broadcastVideoState({ playing: false });
                                break;
                            case 'seek':
                                videoRef.current.currentTime = value;
                                broadcastVideoState({
                                    currentTime: value,
                                    playing: !videoRef.current.paused
                                });
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
                    setIsConnectedToHost(false);
                    setStatusMessage('Session has ended');
                    break;

                case 'PING':
                    // Respond to keep-alive pings from host
                    setIsConnectedToHost(true);
                    channel.postMessage({
                        type: 'PONG',
                        sessionId,
                        videoState,
                        timestamp: now
                    });
                    break;

                case 'REQUEST_CURRENT_STATE':
                    // Send current state when requested
                    channel.postMessage({
                        type: 'STATE_RESPONSE',
                        sessionId,
                        slide: currentSlide,
                        videoState,
                        timestamp: now
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

        // Set up connection monitoring
        const connectionTimeout = setTimeout(() => {
            if (!isConnectedToHost) {
                setStatusMessage('Connection timeout. Please ensure the host dashboard is open in another tab.');
            }
        }, 5000);

        // Monitor connection status
        const connectionMonitor = setInterval(() => {
            const timeSinceLastPing = Date.now() - lastPingRef.current;
            if (timeSinceLastPing > 5000) {
                setIsConnectedToHost(false);
                setStatusMessage('Lost connection to host. Please check the host dashboard.');
            }
        }, 2000);

        return () => {
            clearTimeout(connectionTimeout);
            clearInterval(connectionMonitor);
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, [sessionId, isConnectedToHost, videoState, currentSlide, broadcastVideoState]);

    // Set up video state broadcasting
    useEffect(() => {
        if (videoRef.current && currentSlide && isConnectedToHost) {
            const video = videoRef.current;

            // Clear any existing interval
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }

            // Broadcast video state periodically when playing
            syncIntervalRef.current = setInterval(() => {
                if (!video.paused) {
                    broadcastVideoState({
                        playing: !video.paused,
                        currentTime: video.currentTime,
                        duration: video.duration || 0,
                        volume: video.volume
                    });
                }
            }, 250); // High frequency updates for smooth sync

            return () => {
                if (syncIntervalRef.current) {
                    clearInterval(syncIntervalRef.current);
                }
            };
        }
    }, [currentSlide, isConnectedToHost, broadcastVideoState]);

    // Video event handlers
    const handleVideoPlay = useCallback(() => {
        broadcastVideoState({ playing: true });
    }, [broadcastVideoState]);

    const handleVideoPause = useCallback(() => {
        broadcastVideoState({ playing: false });
    }, [broadcastVideoState]);

    const handleVideoTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            // Throttled time updates to prevent overwhelming the channel
            const now = Date.now();
            if (now - videoState.lastUpdate > 200) { // Update every 200ms max
                broadcastVideoState({
                    currentTime: videoRef.current.currentTime,
                    duration: videoRef.current.duration || 0
                });
            }
        }
    }, [broadcastVideoState, videoState.lastUpdate]);

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

    const handleVideoSeeked = useCallback(() => {
        if (videoRef.current) {
            broadcastVideoState({
                currentTime: videoRef.current.currentTime,
                playing: !videoRef.current.paused
            });
        }
    }, [broadcastVideoState]);

    // Connection Status Component
    const ConnectionStatus = () => (
        <div className="absolute top-4 right-4 z-50">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isConnectedToHost
                    ? 'bg-green-900/80 text-green-200 border border-green-600'
                    : 'bg-red-900/80 text-red-200 border border-red-600'
            } backdrop-blur-sm`}>
                {isConnectedToHost ? (
                    <Wifi size={16} className="text-green-400" />
                ) : (
                    <WifiOff size={16} className="text-red-400" />
                )}
                <span>{isConnectedToHost ? 'Connected' : 'Disconnected'}</span>
            </div>
        </div>
    );

    // Loading/Connection State
    if (!isConnectedToHost || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center relative">
                <ConnectionStatus />
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
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            <ConnectionStatus />

            {/* Master video display with enhanced event handling */}
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

            {/* Enhanced video event listeners */}
            {currentSlide && videoRef.current && (
                <div style={{ display: 'none' }}>
                    {/* Hidden event listener setup */}
                    <video
                        ref={(el) => {
                            if (el && videoRef.current && el !== videoRef.current) {
                                // Additional event listeners for perfect sync
                                el.addEventListener('seeked', handleVideoSeeked);
                                el.addEventListener('loadstart', () => {
                                    console.log('[PresentationPage] Video load started');
                                });
                                el.addEventListener('canplaythrough', () => {
                                    console.log('[PresentationPage] Video ready for smooth playback');
                                });
                            }
                        }}
                    />
                </div>
            )}

            {/* Debug info overlay (only in development) */}
            {process.env.NODE_ENV === 'development' && currentSlide && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                    <div>Slide: {currentSlide.id}</div>
                    <div>Playing: {videoState.playing ? 'Yes' : 'No'}</div>
                    <div>Time: {Math.floor(videoState.currentTime)}s / {Math.floor(videoState.duration)}s</div>
                    <div>Volume: {Math.round(videoState.volume * 100)}%</div>
                    <div>Sync Updates: {videoState.lastUpdate}</div>
                </div>
            )}
        </div>
    );
};

export default PresentationPage;