// src/pages/GameHostPage.tsx - Minor cleanup for simplified video system
import React, { useState, useEffect } from 'react';
import HostPanel from '../components/Host/HostPanel.tsx';
import { useAppContext } from '../context/AppContext';
import { Monitor, AlertCircle, Info, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import DisplayView from '../components/Display/DisplayView';
import { useBroadcastManager } from '../utils/broadcastManager';

const PresentationDisplayButton: React.FC = () => {
    const { state, currentSlideData } = useAppContext();
    const [isPresentationDisplayOpen, setIsPresentationDisplayOpen] = useState(false);
    const broadcastManager = useBroadcastManager(state.currentSessionId, 'host');

    // Set up connection monitoring
    useEffect(() => {
        if (!broadcastManager) return;

        const unsubscribeConnection = broadcastManager.onConnectionChange((status) => {
            const isPresentation = status.connectionType === 'presentation';
            setIsPresentationDisplayOpen(status.isConnected && isPresentation);

            if (status.isConnected && isPresentation) {
                console.log('[PresentationDisplayButton] Presentation display connected');
            }
        });

        // Handle presentation ready events
        const unsubscribeReady = broadcastManager.subscribe('PRESENTATION_READY', (message) => {
            console.log('[PresentationDisplayButton] Presentation ready received');
            setIsPresentationDisplayOpen(true);

            // Send current slide when presentation connects
            if (currentSlideData) {
                broadcastManager.sendSlideUpdate(currentSlideData);
            }
        });

        // Handle current state requests
        const unsubscribeStateRequest = broadcastManager.subscribe('REQUEST_CURRENT_STATE', () => {
            if (currentSlideData) {
                broadcastManager.sendSlideUpdate(currentSlideData);
            }
        });

        return () => {
            unsubscribeConnection();
            unsubscribeReady();
            unsubscribeStateRequest();
        };
    }, [broadcastManager, currentSlideData]);

    // Send slide updates when current slide changes
    useEffect(() => {
        if (broadcastManager && currentSlideData) {
            console.log('[PresentationDisplayButton] Sending slide update:', currentSlideData.id);
            broadcastManager.sendSlideUpdate(currentSlideData);
        }
    }, [broadcastManager, currentSlideData]);

    const handleOpenDisplay = () => {
        if (!state.currentSessionId) {
            alert("No active session. Please create or select a game first.");
            return;
        }

        const url = `/student-display/${state.currentSessionId}`;
        const newTab = window.open(url, '_blank');

        if (newTab) {
            console.log('[PresentationDisplayButton] Opened presentation display in new tab');

            // Give the new tab time to initialize, then send state
            setTimeout(() => {
                if (broadcastManager && currentSlideData) {
                    broadcastManager.sendSlideUpdate(currentSlideData);
                }
            }, 1000);
        } else {
            alert("Failed to open presentation display. Please ensure pop-ups are allowed for this site.");
        }
    };

    return (
        <div className="absolute top-3 right-3 z-50">
            {isPresentationDisplayOpen ? (
                // Status indicator when connected
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg shadow-lg text-sm font-medium backdrop-blur-sm bg-green-600/90 text-white border border-green-500/30">
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                    <Monitor size={16}/>
                    <span>Presentation Active</span>
                </div>
            ) : (
                // Button when disconnected
                <button
                    onClick={handleOpenDisplay}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors shadow-lg text-sm font-medium backdrop-blur-sm bg-blue-600/90 text-white hover:bg-blue-700/90 border border-blue-500/30"
                >
                    <ExternalLink size={16}/>
                    <span>Open Display</span>
                </button>
            )}
        </div>
    );
};

const GameHostPage: React.FC = () => {
    const {
        state,
        currentSlideData,
        currentPhaseNode,
        previousSlide,
        nextSlide,
    } = useAppContext();

    const { currentSessionId, gameStructure } = state;

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle size={48} className="text-orange-500 mb-4"/>
                <h1 className="text-2xl font-semibold text-gray-700">Session Not Fully Loaded</h1>
                <p className="text-gray-600">Please wait for the session to initialize or start/select a game from the dashboard.</p>
                {currentSessionId === 'new' && <p className="text-sm text-gray-500 mt-2">Setting up new game session...</p>}
            </div>
        );
    }

    // Navigation logic
    const isFirstSlideOverall = currentPhaseNode?.id === gameStructure?.welcome_phases[0]?.id && state.currentSlideIdInPhase === 0;
    const gameEndPhaseIds = gameStructure?.game_end_phases.map(p => p.id) || [];

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
        <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-3 md:p-4 lg:p-6 overflow-hidden">
            <div className="max-w-screen-2xl mx-auto h-full flex flex-col">
                {/* Header */}
                <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center flex-shrink-0">
                    <div>
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                            {gameStructure?.name || 'Classroom Decision Simulator'}
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm">
                            Facilitator Control Center (Session: {currentSessionId?.substring(0, 8)}...)
                        </p>
                    </div>
                </header>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
                    {/* Teacher Control Panel */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <HostPanel />
                    </div>

                    {/* Content Preview Area with Navigation Below */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        {/* Content Area */}
                        <div className="flex-grow bg-gray-50 overflow-hidden relative" data-component="display-view">
                            {!currentSlideData ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    <div className="text-center">
                                        <Info size={48} className="mx-auto mb-3 opacity-50" />
                                        <p>No content loaded</p>
                                        <p className="text-sm mt-1">Navigate to a slide using the journey map</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="h-full">
                                        {/* DisplayView now handles all video complexity automatically */}
                                        <DisplayView slide={currentSlideData} />
                                    </div>

                                    {/* Presentation Display Button - Top Right */}
                                    <PresentationDisplayButton />
                                </>
                            )}
                        </div>

                        {/* Navigation Controls Below Content */}
                        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
                            <div className="flex items-center justify-center gap-6">
                                {/* Previous Button */}
                                <button
                                    onClick={previousSlide}
                                    disabled={isFirstSlideOverall}
                                    className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:bg-blue-700 transition-colors"
                                    title="Previous Slide"
                                >
                                    <ChevronLeft size={24} />
                                </button>

                                {/* Slide Info */}
                                <div className="flex-1 text-center">
                                    <div className="text-sm font-medium text-gray-700">
                                        {currentSlideData?.title || `Slide ${currentSlideData?.id || 'N/A'}`}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {currentPhaseNode?.label || 'No Phase'}
                                    </div>
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={nextSlide}
                                    disabled={isLastSlideOverall}
                                    className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:bg-blue-700 transition-colors"
                                    title="Next Slide"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameHostPage;