// src/views/host/HostApp.tsx - REFACTOR: Final, stable layout fix
import React, {useEffect, useState} from 'react';
import GamePanel from '@views/host/components/GamePanel';
import {useGameContext} from '@app/providers/GameProvider';
import {AlertCircle, ChevronLeft, ChevronRight} from 'lucide-react';
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import PresentationButton from '@views/host/components/GameControls/PresentationButton';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';
import {SimpleRealtimeManager} from "@core/sync";
import {Slide} from "@shared/types";

const HostApp: React.FC = () => {
    const {
        state,
        currentSlideData,
        previousSlide,
        nextSlide,
        setCurrentHostAlertState,
    } = useGameContext();

    const {currentSessionId, gameStructure, current_slide_index} = state;

    const [previousSlideData, setPreviousSlideData] = useState<Slide | null>(null);

    useEffect(() => {
        document.title = "Ready or Not - Host";
    }, []);

    useEffect(() => {
        if (!currentSessionId || currentSessionId === 'new') return;

        const realtimeManager = SimpleRealtimeManager.getInstance(currentSessionId, 'host');

        // 🆕 NEW: Check if we're leaving an interactive slide (decision defaulting)
        if (previousSlideData?.interactive_data_key &&
            previousSlideData.type.startsWith('interactive_') &&
            currentSlideData?.id !== previousSlideData.id) {

            console.log('📱 Broadcasting decision_closed for:', previousSlideData.interactive_data_key);
            realtimeManager.sendTeamEvent('decision_closed', {
                decisionKey: previousSlideData.interactive_data_key,
                message: 'Decision period has ended',
                slideId: previousSlideData.id
            });
        }

        // Update previous slide reference
        setPreviousSlideData(currentSlideData);

        // Exit early if no current slide
        if (!currentSlideData) return;

        // ✅ EXISTING: Broadcast to presentation display (unchanged)
        const broadcastManager = SimpleBroadcastManager.getInstance(currentSessionId, 'host');
        broadcastManager.sendSlideUpdate(currentSlideData);

        // ✅ EXISTING: Broadcast to teams if slide is relevant
        const isInteractiveSlide = currentSlideData.interactive_data_key &&
            currentSlideData.type.startsWith('interactive_');
        const isEffectSlide = ['consequence_reveal', 'payoff_reveal', 'kpi_reset'].includes(currentSlideData.type);

        if (isInteractiveSlide) {
            console.log('📱 Broadcasting decision_time for:', currentSlideData.interactive_data_key);
            realtimeManager.sendDecisionTime(currentSlideData);
        } else if (isEffectSlide) {
            console.log('📱 Broadcasting kpi_updated for:', currentSlideData.type);
            realtimeManager.sendKpiUpdated(currentSlideData);
            if (currentSlideData.type === 'kpi_reset') {
                realtimeManager.sendRoundTransition(currentSlideData.round_number);
            }
        }
    }, [currentSessionId, currentSlideData]);

    const isFirstSlideOverall = current_slide_index === 0;
    const isLastSlideOverall = current_slide_index === (gameStructure.slides.length - 1);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle keyboard events when the host app is focused
            // Ignore if user is typing in an input field
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement) {
                return;
            }

            switch (event.key) {
                case ' ':           // Space bar (most common clicker button)
                case 'Enter':       // Enter key
                case 'ArrowRight':  // Right arrow key
                case 'PageDown':    // Page Down key
                    event.preventDefault();
                    if (!isLastSlideOverall) {
                        nextSlide();
                    }
                    break;

                case 'ArrowLeft':   // Left arrow key
                case 'PageUp':      // Page Up key
                case 'Backspace':   // Backspace key
                    event.preventDefault();
                    if (!isFirstSlideOverall) {
                        previousSlide();
                    }
                    break;

                case 'Escape':      // Escape key (useful for troubleshooting)
                    event.preventDefault();
                    // Could add pause/stop functionality here if needed
                    break;
            }
        };

        // Add event listener
        window.addEventListener('keydown', handleKeyDown);
        // Cleanup function
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [nextSlide, previousSlide, isFirstSlideOverall, isLastSlideOverall]);

    const handleVideoEnd = () => {
        if (!currentSlideData) return;
        if (currentSlideData.host_alert) {
            setCurrentHostAlertState(currentSlideData.host_alert);
        } else {
            nextSlide();
        }
    };

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return <div className="min-h-screen ..."><AlertCircle/>Session Not Fully Loaded</div>;
    }

    return (
        <div
            className="h-screen w-screen bg-gradient-to-br from-gray-200 to-gray-400 p-4 flex flex-col overflow-hidden">
            <header
                className="flex-shrink-0 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">{gameStructure?.name || 'Game'}</h1>
                    <p className="text-gray-500 text-sm md:text-base">Session: {currentSessionId?.substring(0, 8)}...</p>
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
                <div className="lg:col-span-4 xl:col-span-3 min-h-0">
                    <GamePanel/>
                </div>
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0">
                    {/* Stable Slide Display Area with fixed aspect ratio */}
                    <div className="flex-grow relative w-full bg-black rounded-t-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-full">
                                <SlideRenderer slide={currentSlideData} sessionId={currentSessionId} isHost={true}
                                               onVideoEnd={handleVideoEnd}/>
                            </div>
                        </div>
                        {currentSlideData && (
                            <div className="absolute top-3 right-3 z-50 w-48">
                                <PresentationButton/>
                            </div>
                        )}
                    </div>
                    {/* Stable Navigation Area */}
                    <div className="flex-shrink-0 bg-white border-t border-gray-200 p-3 lg:p-4 rounded-b-lg shadow-md">
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={previousSlide} disabled={isFirstSlideOverall}
                                    className="p-3 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft size={24}/>
                            </button>
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-sm md:text-base font-semibold text-gray-800 truncate">
                                    {currentSlideData ? `Slide ${currentSlideData.id}: ${currentSlideData.title}` : 'No Slide Selected'}
                                </div>
                                <div className="text-xs md:text-sm text-gray-500">
                                    {currentSlideData && current_slide_index !== null && (
                                        <span>({current_slide_index + 1} of {gameStructure.slides.length})</span>
                                    )}
                                    {currentSlideData?.interactive_data_key &&
                                        <span className="ml-2 text-green-600 font-medium">• Interactive</span>}
                                </div>
                            </div>
                            <button onClick={nextSlide} disabled={isLastSlideOverall}
                                    className="p-3 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight size={24}/>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HostApp;
