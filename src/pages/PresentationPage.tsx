// src/pages/PresentationPage.tsx - Enhanced with better connection and video handling
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '../types';
import SlideRenderer from '../components/Display/SlideRenderer';
import { Hourglass, Monitor, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useBroadcastManager } from '../utils/broadcastManager';

const PresentationPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connecting to session...');
    const [connectionError, setConnectionError] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const isInitializedRef = useRef(false);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Broadcast manager for host communication only
    const broadcastManager = useBroadcastManager(sessionId || null, 'presentation');

    // Clear any existing timeouts
    const clearConnectionTimeout = () => {
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
    };

    // Set up broadcast manager listeners for slide updates
    useEffect(() => {
        if (!broadcastManager || !sessionId) return;

        console.log(`[PresentationPage] Setting up broadcast listeners for session ${sessionId}`);

        // Handle slide updates from host
        const unsubscribeSlideUpdate = broadcastManager.subscribe('SLIDE_UPDATE', (message) => {
            console.log('[PresentationPage] Received slide update:', message.slide?.id);
            setIsConnectedToHost(true);
            setStatusMessage('Connected - Presentation Display Active');
            setCurrentSlide(message.slide);
            setConnectionError(false);
            setConnectionAttempts(0);
            clearConnectionTimeout();
        });

        // Handle current state requests from host
        const unsubscribeStateRequest = broadcastManager.subscribe('REQUEST_CURRENT_STATE', () => {
            console.log('[PresentationPage] Host requesting current state');
            broadcastManager.broadcast('STATE_RESPONSE', {
                slide: currentSlide,
                connectionType: 'presentation'
            });
        });

        // Handle session ended
        const unsubscribeSessionEnded = broadcastManager.subscribe('SESSION_ENDED', () => {
            console.log('[PresentationPage] Session ended by host');
            setCurrentSlide(null);
            setIsConnectedToHost(false);
            setStatusMessage('Session has ended by facilitator');
            setConnectionError(false);
            clearConnectionTimeout();
        });

        // Enhanced connection monitoring
        const unsubscribeConnection = broadcastManager.onConnectionChange((status) => {
            const isHost = status.connectionType === 'host';
            const nowConnected = status.isConnected && isHost;
            const wasConnected = isConnectedToHost;

            console.log('[PresentationPage] Connection status changed:', status);

            setIsConnectedToHost(nowConnected);

            if (!status.isConnected) {
                setConnectionError(true);
                if (wasConnected) {
                    setStatusMessage('Lost connection to host. Attempting to reconnect...');
                } else {
                    setStatusMessage('Unable to connect to host. Please ensure the host dashboard is open.');
                }
            } else if (nowConnected && !wasConnected) {
                setConnectionError(false);
                setStatusMessage('Connected to host. Waiting for content...');
                setConnectionAttempts(0);
                clearConnectionTimeout();

                // Request current state when connection is established
                setTimeout(() => {
                    broadcastManager.requestCurrentState();
                }, 200);
            }
        });

        // Initialize connection
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;

            // Announce that presentation display is ready
            console.log('[PresentationPage] Announcing presentation ready');
            setTimeout(() => {
                broadcastManager.announcePresentation();
            }, 200);

            // Request current state from host
            setTimeout(() => {
                broadcastManager.requestCurrentState();
            }, 700);

            // Set up connection timeout with retry logic
            const attemptConnection = (attempt: number) => {
                connectionTimeoutRef.current = setTimeout(() => {
                    if (!isConnectedToHost) {
                        setConnectionAttempts(attempt);

                        if (attempt < 4) {
                            setStatusMessage(`Connection attempt ${attempt}/4. Retrying...`);

                            // Retry connection
                            setTimeout(() => {
                                console.log(`[PresentationPage] Retry attempt ${attempt}`);
                                broadcastManager.announcePresentation();
                                broadcastManager.requestCurrentState();
                                attemptConnection(attempt + 1);
                            }, 2000);
                        } else {
                            setStatusMessage('Connection timeout. Please ensure the host dashboard is open and try refreshing this page.');
                            setConnectionError(true);
                        }
                    }
                }, 3000 + (attempt * 1000)); // Progressive timeout
            };

            attemptConnection(1);
        }

        return () => {
            clearConnectionTimeout();
            unsubscribeSlideUpdate();
            unsubscribeStateRequest();
            unsubscribeSessionEnded();
            unsubscribeConnection();
        };
    }, [broadcastManager, sessionId, isConnectedToHost, currentSlide]);

    // Periodic connection health check
    useEffect(() => {
        if (!broadcastManager || !isConnectedToHost) return;

        const healthCheck = setInterval(() => {
            broadcastManager.broadcast('PRESENTATION_HEARTBEAT', {
                connectionType: 'presentation',
                timestamp: Date.now()
            });
        }, 10000); // Every 10 seconds

        return () => clearInterval(healthCheck);
    }, [broadcastManager, isConnectedToHost]);

    // Handle page visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && broadcastManager && !isConnectedToHost) {
                console.log('[PresentationPage] Page became visible, attempting reconnection');
                setConnectionAttempts(0);
                setConnectionError(false);
                setStatusMessage('Reconnecting...');
                broadcastManager.announcePresentation();
                broadcastManager.requestCurrentState();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [broadcastManager, isConnectedToHost]);

    // Manual retry function
    const handleRetry = () => {
        setConnectionError(false);
        setConnectionAttempts(0);
        setStatusMessage('Reconnecting...');
        clearConnectionTimeout();

        if (broadcastManager) {
            broadcastManager.announcePresentation();
            broadcastManager.requestCurrentState();
        }
    };

    // Loading/Connection State
    if (!isConnectedToHost || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center relative">
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
                                    <RefreshCw size={16} />
                                    Retry Connection
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg mx-auto transition-colors"
                                >
                                    <RefreshCw size={16} />
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
                                    {isConnectedToHost ? (
                                        <Wifi size={16} className="text-green-400"/>
                                    ) : (
                                        <WifiOff size={16} className="text-red-400"/>
                                    )}
                                    <span>
                                        {isConnectedToHost ? 'Connected to host' : 'Waiting for host connection'}
                                    </span>
                                </div>
                                <p className="text-xs">
                                    Make sure the host dashboard is open and active
                                </p>
                                {connectionAttempts > 0 && (
                                    <p className="text-xs mt-1 text-yellow-400">
                                        Attempt {connectionAttempts}/4
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            {/* Pure presentation display - SlideRenderer handles all video sync automatically */}
            <SlideRenderer
                slide={currentSlide}
                sessionId={sessionId}
                videoMode="master" // Master mode: controls video and broadcasts state
            />

            {/* Connection status indicator */}
            <div className="absolute top-4 right-4 z-20">
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
            </div>

            {/* Development debug info only */}
            {process.env.NODE_ENV === 'development' && currentSlide && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                    <div>Slide: {currentSlide.id}</div>
                    <div>Mode: Master (Presentation Display)</div>
                    <div>Connected: {isConnectedToHost ? 'Yes' : 'No'}</div>
                    <div>Session: {sessionId?.substring(0, 8)}...</div>
                </div>
            )}
        </div>
    );
};

export default PresentationPage;
