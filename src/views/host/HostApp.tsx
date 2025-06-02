// src/views/host/HostApp.tsx
import React, {useState, useEffect, useRef, useCallback} from 'react';
import GamePanel from '@views/host/components/GamePanel';
import {useGameContext} from '@app/providers/GameProvider';
import {AlertCircle, Info, ChevronLeft, ChevronRight, ExternalLink, Wifi, WifiOff} from 'lucide-react';
import DisplayView from '@views/presentation/components/DisplayView';
import {VideoSyncManager} from '@core/sync/VideoSyncManager'; // New import for the centralized video sync manager
import {ConnectionMonitor, BroadcastConnectionStatus} from '@core/sync/ConnectionMonitor'; // New import for the broadcast channel connection monitor

type PresentationStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * `PresentationDisplayButton` component manages the launching and monitoring
 * of the dedicated student presentation display tab. It leverages `VideoSyncManager`
 * and `ConnectionMonitor` for cross-tab communication.
 */
const PresentationDisplayButton: React.FC = () => {
    const {state, currentSlideData} = useGameContext();
    const [isPresentationDisplayOpen, setIsPresentationDisplayOpen] = useState(false); // Tracks if the presentation tab is open and connected.
    const [presentationStatus, setPresentationStatus] = useState<PresentationStatus>('disconnected'); // Detailed connection status.

    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timer for initial connection attempts.
    const presentationTabRef = useRef<Window | null>(null); // Reference to the opened window object.

    // Get singleton instances of `VideoSyncManager` and `ConnectionMonitor` for the current session and host role.
    const videoSyncManager = state.currentSessionId ? VideoSyncManager.getInstance(state.currentSessionId) : null;
    const connectionMonitor = state.currentSessionId ? ConnectionMonitor.getInstance(state.currentSessionId, 'host') : null;

    /**
     * Clears any active connection timeout timer.
     */
    const clearConnectionTimeout = useCallback(() => {
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
    }, []);

    // Effect hook for setting up and managing broadcast listeners for presentation display.
    useEffect(() => {
        // Ensure managers are initialized before setting up listeners.
        if (!videoSyncManager || !connectionMonitor) return;

        console.log('[PresentationDisplayButton] Setting up broadcast listeners');

        // --- ConnectionMonitor Listener ---
        // Monitors the connection status reported by the `ConnectionMonitor` for the presentation display.
        const unsubscribeConnection = connectionMonitor.addStatusListener((status: BroadcastConnectionStatus) => {
            const isPresentation = status.connectionType === 'presentation'; // Check if the peer is a presentation display.
            const wasConnected = isPresentationDisplayOpen; // Track previous connection state for logging/messaging.
            const nowConnected = status.isConnected && isPresentation; // Current connection state to a presentation.

            console.log(`[PresentationDisplayButton] Connection change - was: ${wasConnected}, now: ${nowConnected}, type: ${status.connectionType}`);

            setIsPresentationDisplayOpen(nowConnected); // Update local state for UI.

            if (nowConnected) {
                setPresentationStatus('connected'); // Set detailed status to 'connected'.
                clearConnectionTimeout(); // Clear any pending connection timeout.
            } else if (wasConnected) { // If it was connected and now isn't.
                setPresentationStatus('disconnected'); // Set detailed status to 'disconnected'.
            }

            if (!wasConnected && nowConnected) {
                console.log('[PresentationDisplayButton] Presentation display connected');
                // When a presentation display first connects, send it the current slide data.
                if (currentSlideData) {
                    console.log('[PresentationDisplayButton] Sending current slide to presentation:', currentSlideData.id);
                    setTimeout(() => { // Small delay to ensure the new tab is fully ready to receive messages.
                        videoSyncManager.sendSlideUpdate(currentSlideData);
                    }, 300);
                }
            } else if (wasConnected && !nowConnected) {
                console.log('[PresentationDisplayButton] Presentation display disconnected');
            }
        });

        // --- VideoSyncManager Subscriptions ---
        // Handles `PRESENTATION_READY` messages from the display (sent when it initializes).
        const unsubscribeReady = videoSyncManager.subscribe('PRESENTATION_READY', () => {
            console.log('[PresentationDisplayButton] Presentation ready received');
            setIsPresentationDisplayOpen(true); // Confirm it's open.
            setPresentationStatus('connected'); // Set status to connected.
            clearConnectionTimeout(); // Clear connection timeout.

            // Send current slide again as a fallback, ensuring the display has the latest content.
            if (currentSlideData) {
                console.log('[PresentationDisplayButton] Sending current slide to presentation:', currentSlideData.id);
                setTimeout(() => {
                    videoSyncManager.sendSlideUpdate(currentSlideData);
                }, 200);
            }
        });

        // Handles `REQUEST_CURRENT_STATE` messages from the display (sent when it needs sync).
        const unsubscribeStateRequest = videoSyncManager.subscribe('REQUEST_CURRENT_STATE', () => {
            console.log('[PresentationDisplayButton] Presentation requesting current state');
            if (currentSlideData) {
                videoSyncManager.sendSlideUpdate(currentSlideData); // Send current slide.
            }
        });

        // Handles `PRESENTATION_HEARTBEAT` messages from the display (periodic check-in).
        const unsubscribeHeartbeat = videoSyncManager.subscribe('PRESENTATION_HEARTBEAT', () => {
            console.log('[PresentationDisplayButton] Received presentation heartbeat');
            setIsPresentationDisplayOpen(true); // Confirm it's open.
            setPresentationStatus('connected'); // Set status to connected.
            clearConnectionTimeout(); // Reset connection timeout on every heartbeat.
        });

        // --- Cleanup ---
        return () => {
            console.log('[PresentationDisplayButton] Cleaning up broadcast listeners');
            clearConnectionTimeout();
            unsubscribeConnection();
            unsubscribeReady();
            unsubscribeStateRequest();
            unsubscribeHeartbeat();
        };
    }, [videoSyncManager, connectionMonitor, currentSlideData, isPresentationDisplayOpen, clearConnectionTimeout]);

    // Effect hook to send slide updates when the `currentSlideData` changes on the host.
    useEffect(() => {
        // Only send if the VideoSyncManager is ready, there's current slide data, and a display is connected.
        if (videoSyncManager && currentSlideData && isPresentationDisplayOpen) {
            console.log('[PresentationDisplayButton] Sending slide update to presentation:', currentSlideData.id);
            setTimeout(() => { // Small delay to ensure the presentation tab is ready to process the update.
                videoSyncManager.sendSlideUpdate(currentSlideData);
            }, 100);
        }
    }, [videoSyncManager, currentSlideData, isPresentationDisplayOpen]);

    // Effect hook to monitor the state of the opened presentation tab.
    // This is useful if the tab is manually closed by the user.
    useEffect(() => {
        if (presentationTabRef.current) {
            const checkInterval = setInterval(() => {
                // If the window is closed, update status and clear interval.
                if (presentationTabRef.current?.closed) {
                    console.log('[PresentationDisplayButton] Presentation tab was closed');
                    setIsPresentationDisplayOpen(false);
                    setPresentationStatus('disconnected');
                    presentationTabRef.current = null;
                    clearInterval(checkInterval);
                }
            }, 1000); // Check every second.

            return () => clearInterval(checkInterval); // Cleanup interval on unmount.
        }
    }, []); // Runs once when component mounts or `presentationTabRef.current` changes.

    /**
     * Handles opening the presentation display tab.
     */
    const handleOpenDisplay = () => {
        // Ensure there's an active session ID before trying to open the display.
        if (!state.currentSessionId) {
            alert("No active session. Please create or select a game first.");
            return;
        }

        const url = `/student-display/${state.currentSessionId}`; // URL for the presentation display.
        console.log('[PresentationDisplayButton] Opening presentation display:', url);

        // Open a new browser window/tab for the display.
        // It's often helpful to suggest dimensions for large displays.
        const newTab = window.open(url, '_blank', 'width=1920,height=1080');

        if (newTab) {
            console.log('[PresentationDisplayButton] Presentation display opened in new tab');
            presentationTabRef.current = newTab; // Store reference to the new window.
            setPresentationStatus('connecting'); // Set status to connecting.

            // Set up a connection timeout for this specific attempt to open the display.
            clearConnectionTimeout();
            connectionTimeoutRef.current = setTimeout(() => {
                // If after the timeout, the status is still 'connecting' (no PONG/READY received),
                // assume connection failed.
                if (presentationStatus === 'connecting') {
                    console.log('[PresentationDisplayButton] Presentation connection timeout after opening');
                    setPresentationStatus('disconnected');
                    // Optionally close the new tab if it failed to connect after timeout.
                    if (newTab && !newTab.closed) {
                        newTab.close();
                    }
                }
            }, 8000); // 8 seconds timeout for initial connection.

            // Give the new tab a moment to fully initialize and connect before sending initial content.
            setTimeout(() => {
                if (videoSyncManager && currentSlideData) {
                    console.log('[PresentationDisplayButton] Sending initial slide after delay:', currentSlideData.id);
                    videoSyncManager.sendSlideUpdate(currentSlideData);
                }
            }, 2000); // Wait 2 seconds.
        } else {
            // Alert user if pop-ups are blocked.
            alert("Failed to open presentation display. Please ensure pop-ups are allowed for this site.");
            setPresentationStatus('disconnected');
        }
    };

    /**
     * Determines CSS classes and text based on the current `presentationStatus`.
     */
    const getStatusStyling = () => {
        switch (presentationStatus) {
            case 'connected':
                return {
                    bgClass: 'bg-green-50 border-green-200',
                    textClass: 'text-green-700',
                    iconClass: 'text-green-500',
                    dotClass: 'bg-green-500 animate-pulse', // Green pulse for connected.
                    statusText: 'Presentation Display Active'
                };
            case 'connecting':
                return {
                    bgClass: 'bg-yellow-50 border-yellow-200',
                    textClass: 'text-yellow-700',
                    iconClass: 'text-yellow-500',
                    dotClass: 'bg-yellow-500 animate-pulse', // Yellow pulse for connecting.
                    statusText: 'Connecting to Display...'
                };
            default: // 'disconnected'
                return {
                    bgClass: 'bg-blue-600',
                    textClass: 'text-white',
                    iconClass: 'text-white',
                    dotClass: '', // No dot for the button itself.
                    statusText: 'Launch Student Display'
                };
        }
    };

    const styling = getStatusStyling();

    // Render the button or status indicator based on the presentation display state.
    return (
        <button
            onClick={handleOpenDisplay}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors shadow-md text-sm
                               ${styling.bgClass} ${styling.textClass} hover:bg-blue-700`}
        >
            {/* Conditional dot indicator for connecting/connected states. */}
            {styling.dotClass && (
                <div className={`w-2 h-2 ${styling.dotClass} rounded-full`}></div>
            )}
            <ExternalLink size={16} className={styling.iconClass}/>
            <span>{styling.statusText}</span>
            {/* Conditional WiFi icons based on detailed status. */}
            {presentationStatus === 'connected' && (
                <Wifi size={16} className="text-green-500 ml-2"/>
            )}
            {presentationStatus === 'connecting' && (
                <Wifi size={16} className="text-yellow-500 animate-pulse ml-2"/>
            )}
            {presentationStatus === 'disconnected' && isPresentationDisplayOpen && (
                // Show red Wi-Fi off if the tab is open but disconnected.
                <WifiOff size={16} className="text-red-500 ml-2"/>
            )}
        </button>
    );
};

/**
 * `HostApp` is the main component for the facilitator's game control interface.
 * It displays the game map, current content preview, and controls for managing the session.
 */
const HostApp: React.FC = () => {
    // Consume game context for current game state and navigation actions.
    const {
        state,
        currentSlideData,
        currentPhaseNode,
        previousSlide,
        nextSlide,
    } = useGameContext();

    const {currentSessionId, gameStructure} = state;

    // Display a loading/error message if the game session is not fully loaded.
    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle size={48} className="text-orange-500 mb-4"/>
                <h1 className="text-2xl font-semibold text-gray-700">Session Not Fully Loaded</h1>
                <p className="text-gray-600">Please wait for the session to initialize or start/select a game from the
                    dashboard.</p>
                {currentSessionId === 'new' &&
                    <p className="text-sm text-gray-500 mt-2">Setting up new game session...</p>}
            </div>
        );
    }

    // Determine if the current slide is the very first one in the entire game (to disable 'Previous').
    const isFirstSlideOverall = currentPhaseNode?.id === gameStructure?.welcome_phases?.[0]?.id && state.currentSlideIdInPhase === 0;
    // Get IDs of all game-ending phases.
    const gameEndPhaseIds = gameStructure?.game_end_phases?.map(p => p.id) || [];

    // Determine if the current slide is the very last one in the entire game (to disable 'Next').
    let isLastSlideOverall = false;
    if (currentPhaseNode && gameStructure) {
        if (gameEndPhaseIds.includes(currentPhaseNode.id)) {
            const lastGameEndPhase = gameStructure.game_end_phases[gameStructure.game_end_phases.length - 1];
            if (currentPhaseNode.id === lastGameEndPhase.id && state.currentSlideIdInPhase === (lastGameEndPhase.slide_ids.length - 1)) {
                isLastSlideOverall = true;
            }
        }
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-3 md:p-4 lg:p-6 overflow-hidden">
            <div className="max-w-screen-2xl mx-auto h-full flex flex-col">
                {/* Header Section */}
                <header
                    className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center flex-shrink-0">
                    <div>
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                            {gameStructure?.name || 'Classroom Decision Simulator'}
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm">
                            Facilitator Control Center (Session: {currentSessionId?.substring(0, 8)}...)
                        </p>
                    </div>
                </header>

                {/* Main Content Grid */}
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
                    {/* Left Panel: Teacher Control Panel (Game Map, Team Monitor, Game Controls) */}
                    <div
                        className="lg:col-span-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <GamePanel/>
                    </div>

                    {/* Right Panel: Content Preview Area with Navigation Below */}
                    <div
                        className="lg:col-span-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        {/* Content Area (DisplayView) */}
                        <div className="flex-grow bg-gray-50 overflow-hidden relative" data-component="display-view">
                            {!currentSlideData ? (
                                // Placeholder if no slide data is available.
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    <div className="text-center">
                                        <Info size={48} className="mx-auto mb-3 opacity-50"/>
                                        <p>No content loaded</p>
                                        <p className="text-sm mt-1">Navigate to a slide using the journey map</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* `DisplayView` renders the current slide content (video, image, etc.). */}
                                    <div className="h-full">
                                        <DisplayView slide={currentSlideData}/>
                                    </div>

                                    {/* `PresentationDisplayButton` for launching and monitoring the external display. */}
                                    <div className="absolute top-3 right-3 z-50 w-48">
                                        <PresentationDisplayButton/>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Navigation Controls Below Content Preview */}
                        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
                            <div className="flex items-center justify-center gap-6">
                                {/* Previous Slide Button */}
                                <button
                                    onClick={previousSlide}
                                    disabled={isFirstSlideOverall} // Disable if on the very first slide.
                                    className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:bg-blue-700 transition-colors"
                                    title="Previous Slide"
                                >
                                    <ChevronLeft size={24}/>
                                </button>

                                {/* Current Slide Information */}
                                <div className="flex-1 text-center">
                                    <div className="text-sm font-medium text-gray-700">
                                        {currentSlideData?.title || `Slide ${currentSlideData?.id || 'N/A'}`}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {currentPhaseNode?.label || 'No Phase'}
                                    </div>
                                </div>

                                {/* Next Slide Button */}
                                <button
                                    onClick={nextSlide}
                                    disabled={isLastSlideOverall} // Disable if on the very last slide.
                                    className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:bg-blue-700 transition-colors"
                                    title="Next Slide"
                                >
                                    <ChevronRight size={24}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostApp;
