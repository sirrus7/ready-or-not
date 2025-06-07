// src/views/presentation/PresentationApp.tsx - Enhanced with user interaction requirement
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Slide} from '@shared/types/game';
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import {Hourglass, Monitor, RefreshCw, Wifi, WifiOff, Maximize, Minimize, Play} from 'lucide-react';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';

/**
 * Enhanced presentation app with user interaction requirement for video playback
 */
const PresentationApp: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Initializing display...');
    const [connectionError, setConnectionError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        document.title = "Ready or Not - Presentation";
    }, []);

    // New state for user interaction
    const [hasUserInteraction, setHasUserInteraction] = useState(false);
    const [showInteractionOverlay, setShowInteractionOverlay] = useState(false);

    const broadcastManager = sessionId ?
        SimpleBroadcastManager.getInstance(sessionId, 'presentation') : null;

    // Handle video end - for presentation, we just log it
    const handleVideoEnd = () => {
        if (!currentSlide) return;
        console.log('[PresentationApp] Video ended for slide:', currentSlide.id);
    };

    // Handle user interaction to enable video playback
    const handleUserInteraction = () => {
        console.log('[PresentationApp] User interaction detected - enabling video playback');
        setHasUserInteraction(true);
        setShowInteractionOverlay(false);

        // Store in sessionStorage so it persists if user refreshes
        if (sessionId) {
            sessionStorage.setItem(`presentation-interaction-${sessionId}`, 'true');
        }
    };

    // Check for existing user interaction on mount
    useEffect(() => {
        if (sessionId) {
            const hasInteraction = sessionStorage.getItem(`presentation-interaction-${sessionId}`) === 'true';
            if (hasInteraction) {
                setHasUserInteraction(true);
                setShowInteractionOverlay(false);
            }
        }
    }, [sessionId]);

    // Fullscreen functionality
    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error('[PresentationApp] Fullscreen toggle failed:', error);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Listen for slide updates from host
    useEffect(() => {
        if (!broadcastManager) return;

        console.log('[PresentationApp] Setting up slide listener');

        const unsubscribeSlides = broadcastManager.onSlideUpdate((slide: Slide) => {
            console.log('[PresentationApp] Received slide update:', slide.id, slide.title);
            setCurrentSlide(slide);
            setIsConnectedToHost(true);
            setStatusMessage('Connected - Presentation Display Active');
            setConnectionError(false);

            // Show interaction overlay if user hasn't interacted yet and we have a video slide
            if (!hasUserInteraction && slide.type === 'video') {
                setShowInteractionOverlay(true);
            }
        });

        return () => {
            console.log('[PresentationApp] Cleaning up slide listener');
            unsubscribeSlides();
        };
    }, [broadcastManager, hasUserInteraction]);

    // Connection timeout check
    useEffect(() => {
        if (!sessionId || !broadcastManager) return;

        const connectionTimeout = setTimeout(() => {
            if (!isConnectedToHost) {
                setConnectionError(true);
                setStatusMessage('Unable to connect to host. Please ensure the host dashboard is open.');
            }
        }, 10000);

        return () => clearTimeout(connectionTimeout);
    }, [sessionId, broadcastManager, isConnectedToHost]);

    // Send ping responses automatically
    useEffect(() => {
        if (broadcastManager) {
            console.log('[PresentationApp] Presentation initialized and ready');
        }
    }, [broadcastManager]);

    // Handle page visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && broadcastManager && !isConnectedToHost) {
                console.log('[PresentationApp] Page became visible, announcing ready');
                broadcastManager.sendStatus('ready');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [broadcastManager, isConnectedToHost]);

    // Manual retry function
    const handleRetry = () => {
        setConnectionError(false);
        setStatusMessage('Reconnecting...');

        if (broadcastManager) {
            broadcastManager.sendStatus('ready');
        }
    };

    // Render active presentation display
    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            {/* SlideRenderer is always mounted to prevent flicker */}
            <SlideRenderer
                slide={currentSlide}
                sessionId={sessionId}
                isHost={false}
                onVideoEnd={handleVideoEnd}
            />

            {/* OVERLAYS for status messages */}
            {(!isConnectedToHost || (!currentSlide && !connectionError)) && (
                <div className="absolute inset-0 bg-gray-900 z-40 flex items-center justify-center">
                    <div className="text-center text-white p-8 max-w-md">
                        {connectionError ? (
                            <>
                                <Monitor size={48} className="mx-auto mb-4 text-red-400"/>
                                <h1 className="text-2xl font-bold mb-2 text-red-300">Connection Issue</h1>
                                <p className="text-lg text-gray-300 mb-4">{statusMessage}</p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleRetry}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mx-auto transition-colors"
                                    >
                                        <RefreshCw size={16}/>
                                        Retry Connection
                                    </button>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg mx-auto transition-colors"
                                    >
                                        <RefreshCw size={16}/>
                                        Reload Page
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-4">
                                    Make sure the host dashboard is open and active
                                </p>
                            </>
                        ) : (
                            <>
                                <Hourglass size={48} className="mx-auto mb-4 text-blue-400 animate-pulse"/>
                                <h1 className="text-2xl font-bold mb-2">Presentation Display</h1>
                                <p className="text-lg text-gray-300 mb-2">{statusMessage}</p>
                                {sessionId && (
                                    <p className="text-sm text-gray-500 mt-4">
                                        Session ID: {sessionId}
                                    </p>
                                )}
                                <div className="mt-6 text-sm text-gray-400">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <WifiOff size={16} className="text-red-400"/>
                                        <span>Waiting for host connection</span>
                                    </div>
                                    <p className="text-xs">
                                        Make sure the host dashboard is open and active
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}


            {/* User Interaction Overlay */}
            {showInteractionOverlay && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30">
                    <div className="text-center text-white p-8 max-w-md">
                        <div className="mb-6">
                            <Play size={64} className="mx-auto mb-4 text-blue-400"/>
                            <h2 className="text-2xl font-bold mb-2">Ready to Start</h2>
                            <p className="text-lg text-gray-300 mb-4">
                                Click to enable video playback for this presentation
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-green-400 mb-4">
                                <Wifi size={16}/>
                                <span>Connected to host</span>
                            </div>
                        </div>

                        <button
                            onClick={handleUserInteraction}
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mx-auto transition-colors text-lg font-semibold shadow-lg"
                        >
                            <Play size={24}/>
                            Start Presentation
                        </button>

                        <p className="text-xs text-gray-400 mt-4">
                            This enables browser video playback permissions
                        </p>
                    </div>
                </div>
            )}

            {/* Connection status indicator and fullscreen toggle */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                {/* Fullscreen toggle button */}
                <button
                    onClick={toggleFullscreen}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-900/80 text-gray-300 border border-gray-700 hover:bg-gray-800/80 hover:text-white transition-colors flex items-center gap-1"
                    title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
                >
                    {isFullscreen ? (
                        <>
                            <Minimize size={12}/>
                            <span>Exit</span>
                        </>
                    ) : (
                        <>
                            <Maximize size={12}/>
                            <span>Maximize</span>
                        </>
                    )}
                </button>

                {/* Connection status */}
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isConnectedToHost
                        ? 'bg-green-900/80 text-green-300 border border-green-700'
                        : 'bg-red-900/80 text-red-300 border border-red-700'
                }`}>
                    <div className="flex items-center gap-2">
                        {isConnectedToHost ? (
                            <Wifi size={12} className="text-green-400"/>
                        ) : (
                            <WifiOff size={12} className="text-red-400"/>
                        )}
                        <span>
                            {isConnectedToHost ? 'Live' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                {/* User interaction status */}
                {hasUserInteraction && (
                    <div
                        className="px-3 py-1 rounded-full text-xs font-medium bg-blue-900/80 text-blue-300 border border-blue-700">
                        <div className="flex items-center gap-2">
                            <Play size={12} className="text-blue-400"/>
                            <span>Video Enabled</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Development debug info */}
            {process.env.NODE_ENV === 'development' && currentSlide && (
                <div
                    className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                    <div>Slide: {currentSlide.id}</div>
                    <div>Mode: Presentation (Slave)</div>
                    <div>Connected: {isConnectedToHost ? 'Yes' : 'No'}</div>
                    <div>Fullscreen: {isFullscreen ? 'Yes' : 'No'}</div>
                    <div>User Interaction: {hasUserInteraction ? 'Yes' : 'No'}</div>
                    <div>Session: {sessionId?.substring(0, 8)}...</div>
                    <div>Auto-advance: Enabled</div>
                </div>
            )}
        </div>
    );
};

export default PresentationApp;
