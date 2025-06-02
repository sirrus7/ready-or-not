// src/views/host/HostApp.tsx
import React from 'react';
import GamePanel from '@views/host/components/GamePanel';
import {useGameContext} from '@app/providers/GameProvider';
import {AlertCircle, Info, ChevronLeft, ChevronRight} from 'lucide-react';
import DisplayView from '@views/presentation/components/DisplayView';
import PresentationDisplayButton from '@views/host/components/GameControls/PresentationButton'; // Corrected import path

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
