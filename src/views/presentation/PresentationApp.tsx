// src/views/presentation/PresentationApp.tsx
import React, {useEffect, useState, useRef, useCallback} from 'react';
import {useParams} from 'react-router-dom';
import {Slide} from '@shared/types/game'; // Using game.ts for Slide
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import {Hourglass, Monitor, RefreshCw, Wifi, WifiOff} from 'lucide-react';
import {VideoSyncManager} from '@core/sync/VideoSyncManager'; // Correct import for the centralized video sync manager
import {ConnectionMonitor, BroadcastConnectionStatus} from '@core/sync/ConnectionMonitor'; // Correct import for the broadcast channel connection monitor

const PresentationApp: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>(); // Get session ID from URL parameters.
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null); // Current slide data to display.
    const [isConnectedToHost, setIsConnectedToHost] = useState(false); // Connection status to the host.
    const [statusMessage, setStatusMessage] = useState('Initializing display...'); // User-facing status message.
    const [connectionError, setConnectionError] = useState(false); // Flag for connection errors.
    const [connectionAttempts, setConnectionAttempts] = useState(0); // Counter for connection retry attempts.
    const isInitializedRef = useRef(false); // Ref to ensure initialization logic runs only once.
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for connection timeout timer.

    // Get singleton instances of `VideoSyncManager` and `ConnectionMonitor` for this session and role.
    const videoSyncManager = sessionId ? VideoSyncManager.getInstance(sessionId) : null;
    const connectionMonitor = sessionId ? ConnectionMonitor.getInstance(sessionId, 'presentation') : null;

    /**
     * Clears any active connection timeout timer.
     */
    const clearConnectionTimeout = useCallback(() => {
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
    }, []);

    // Effect hook to set up broadcast manager listeners for slide updates and connection status.
    useEffect(() => {
        // Ensure managers are initialized and sessionId is available before setting up listeners.
        if (!videoSyncManager || !connectionMonitor || !sessionId) return;

        console.log(`[PresentationApp] Setting up broadcast listeners for session ${sessionId}`);

        // --- VideoSyncManager Subscriptions ---
        // Handles `SLIDE_UPDATE` messages from the host to change the displayed slide.
        const unsubscribeSlideUpdate = videoSyncManager.subscribe('SLIDE_UPDATE', (message) => {
            console.log('[PresentationApp] Received slide update:', message.slide?.id);
            setIsConnectedToHost(true); // Confirm connection if slide update is received.
            setStatusMessage('Connected - Presentation Display Active');
            setCurrentSlide(message.slide); // Update the slide to display.
            setConnectionError(false); // Clear any connection errors.
            setConnectionAttempts(0); // Reset connection attempts.
            clearConnectionTimeout(); // Clear any pending connection timeout.
        });

        // Handles `REQUEST_CURRENT_STATE` messages from the host.
        // This is typically sent when a host tab first opens or when it explicitly requests status.
        const unsubscribeStateRequest = videoSyncManager.subscribe('REQUEST_CURRENT_STATE', () => {
            console.log('[PresentationApp] Host requesting current state');
            // Respond with the current slide and announce readiness.
            if (currentSlide) {
                videoSyncManager.sendSlideUpdate(currentSlide);
            }
            videoSyncManager.announcePresentationReady();
        });

        // Handles `SESSION_ENDED` messages from the host.
        // This signals that the game session has been terminated by the facilitator.
        const unsubscribeSessionEnded = videoSyncManager.subscribe('SESSION_ENDED', () => {
            console.log('[PresentationApp] Session ended by host');
            setCurrentSlide(null); // Clear the displayed slide.
            setIsConnectedToHost(false); // Mark as disconnected.
            setStatusMessage('Session has ended by facilitator');
            setConnectionError(false); // Clear any errors.
            clearConnectionTimeout(); // Clear any timeouts.
            // Explicitly destroy managers for this session when it ends.
            connectionMonitor.destroy();
            videoSyncManager.destroy();
        });

        // --- ConnectionMonitor Subscriptions ---
        // Monitors the broadcast channel connection status to the host.
        const unsubscribeConnection = connectionMonitor.addStatusListener((status: BroadcastConnectionStatus) => {
            const isHost = status.connectionType === 'host';
            const nowConnected = status.isConnected && isHost; // True if connected to a host instance.
            const wasConnected = isConnectedToHost; // Track previous state for messaging.

            console.log('[PresentationApp] Connection status changed:', status);

            setIsConnectedToHost(nowConnected); // Update local connection state.

            if (!status.isConnected) { // If overall broadcast connection is down.
                setConnectionError(true);
                if (wasConnected) { // If it was connected before, now lost.
                    setStatusMessage('Lost connection to host. Attempting to reconnect...');
                } else { // If never connected initially.
                    setStatusMessage('Unable to connect to host. Please ensure the host dashboard is open.');
                }
            } else if (nowConnected && !wasConnected) { // If just established connection to host.
                setConnectionError(false);
                setStatusMessage('Connected to host. Waiting for content...');
                setConnectionAttempts(0); // Reset retry attempts.
                clearConnectionTimeout(); // Clear any pending timeouts.

                // Request current state from host upon successful connection.
                setTimeout(() => {
                    videoSyncManager.requestCurrentState();
                }, 200);
            }
        });

        // --- Initial Connection Sequence ---
        // This logic runs once when the component mounts or the session ID changes.
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;

            // Announce that this presentation display is ready to receive content.
            // This helps the host detect this display.
            console.log('[PresentationApp] Announcing presentation ready');
            setTimeout(() => {
                videoSyncManager.announcePresentationReady();
            }, 200);

            // Request current state from host in case the host already has content displayed.
            setTimeout(() => {
                videoSyncManager.requestCurrentState();
            }, 700);

            // Set up a connection timeout with retry logic.
            const attemptConnection = (attempt: number) => {
                clearConnectionTimeout(); // Clear previous timeout before setting a new one.
                connectionTimeoutRef.current = setTimeout(() => {
                    if (!isConnectedToHost) { // Only proceed if still not connected.
                        setConnectionAttempts(attempt); // Update attempt count for UI feedback.

                        if (attempt < 4) { // Retry up to 3 times after initial (total 4 attempts).
                            setStatusMessage(`Connection attempt ${attempt}/4. Retrying...`);
                            console.log(`[PresentationApp] Retry attempt ${attempt}`);
                            // Re-announce and re-request state to trigger another connection attempt.
                            videoSyncManager.announcePresentationReady();
                            videoSyncManager.requestCurrentState();
                            attemptConnection(attempt + 1); // Schedule the next attempt.
                        } else {
                            setStatusMessage('Connection timeout. Please ensure the host dashboard is open and try refreshing this page.');
                            setConnectionError(true); // Indicate a persistent connection error.
                        }
                    }
                }, 3000 + (attempt * 1000)); // Progressive timeout delay (3s, 4s, 5s, 6s).
            };

            attemptConnection(1); // Start the first connection attempt.
        }

        // --- Cleanup on Unmount ---
        return () => {
            clearConnectionTimeout(); // Clear any pending timeouts.
            // Unsubscribe all listeners to prevent memory leaks.
            unsubscribeSlideUpdate();
            unsubscribeStateRequest();
            unsubscribeSessionEnded();
            unsubscribeConnection();
        };
    }, [videoSyncManager, connectionMonitor, sessionId, isConnectedToHost, currentSlide, clearConnectionTimeout]);

    // --- Periodic Connection Health Check (Heartbeat) ---
    // This effect sends a periodic signal to the host to confirm this display is still active.
    useEffect(() => {
        if (!videoSyncManager || !isConnectedToHost) return; // Only send heartbeat if connected.

        const healthCheck = setInterval(() => {
            videoSyncManager.sendPresentationHeartbeat();
        }, 10000); // Send heartbeat every 10 seconds.

        return () => clearInterval(healthCheck); // Cleanup interval on unmount.
    }, [videoSyncManager, isConnectedToHost]);

    // --- Handle Page Visibility Changes ---
    // This ensures that if the tab is hidden and then becomes visible, it tries to re-sync.
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && videoSyncManager && connectionMonitor && !isConnectedToHost) {
                console.log('[PresentationApp] Page became visible, attempting reconnection');
                setConnectionAttempts(0); // Reset attempts.
                setConnectionError(false); // Clear error.
                setStatusMessage('Reconnecting...');
                // Force a health check and re-announce/request state.
                connectionMonitor.forceHealthCheck();
                videoSyncManager.announcePresentationReady();
                videoSyncManager.requestCurrentState();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [videoSyncManager, connectionMonitor, isConnectedToHost]);

    /**
     * Manual retry function for user clicks (e.g., on an error message).
     * It resets the connection state and initiates a new connection attempt.
     */
    const handleRetry = useCallback(() => {
        setConnectionError(false); // Clear error state.
        setConnectionAttempts(0); // Reset attempts.
        setStatusMessage('Reconnecting...');
        clearConnectionTimeout(); // Clear any old timeouts.

        if (videoSyncManager && connectionMonitor) {
            // Re-announce readiness, request state, and force a health check.
            videoSyncManager.announcePresentationReady();
            videoSyncManager.requestCurrentState();
            connectionMonitor.forceHealthCheck();
        }
    }, [videoSyncManager, connectionMonitor, clearConnectionTimeout]);

    // --- Render Loading/Connection State UI ---
    if (!isConnectedToHost || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center relative">
                <div className="text-center text-white p-8 max-w-md">
                    {connectionError ? (
                        // Display for persistent connection errors.
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
                        // Display for initial loading/connecting state.
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

    // --- Render Active Presentation Display ---
    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            {/* SlideRenderer displays the actual content (video, image, chart).
                It operates in "master" video mode, meaning it controls the video
                and broadcasts its state to other clients. */}
            <SlideRenderer
                slide={currentSlide}
                sessionId={sessionId}
                videoMode="master"
            />

            {/* Connection status indicator in the top right corner. */}
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

            {/* Development debug information (only visible in development mode). */}
            {process.env.NODE_ENV === 'development' && currentSlide && (
                <div
                    className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                    <div>Slide: {currentSlide.id}</div>
                    <div>Mode: Master (Presentation Display)</div>
                    <div>Connected: {isConnectedToHost ? 'Yes' : 'No'}</div>
                    <div>Session: {sessionId?.substring(0, 8)}...</div>
                </div>
            )}
        </div>
    );
};

export default PresentationApp;
