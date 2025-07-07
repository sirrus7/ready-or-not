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
import {shouldAutoAdvance} from '@shared/utils/versionUtils';

const HostApp: React.FC = () => {
    const {
        state,
        currentSlideData,
        gameVersion,
        previousSlide,
        nextSlide,
        setCurrentHostAlertState,
        allTeamsSubmittedCurrentInteractivePhase,
        permanentAdjustments,
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
        if (isInteractiveSlide) {
            console.log('📱 Broadcasting decision_time for:', currentSlideData.interactive_data_key);
            realtimeManager.sendDecisionTime(currentSlideData);
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
                        nextSlide('manual');
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
        console.log('[HostApp] Video ended naturally, currentSlideData:', currentSlideData);
        if (!currentSlideData) return;
        
        console.log('[HostApp] Video end logic - interactive_data_key:', currentSlideData.interactive_data_key, 'allTeamsSubmitted:', allTeamsSubmittedCurrentInteractivePhase);
        console.log('[HostApp] Video end logic - host_alert:', currentSlideData.host_alert, 'timer_duration:', currentSlideData.timer_duration_seconds);
        console.log('[HostApp] Video end logic - auto_advance_after_video:', currentSlideData.auto_advance_after_video);
        
        // For interactive slides, check if we should wait for submissions
        if (currentSlideData.interactive_data_key && !allTeamsSubmittedCurrentInteractivePhase) {
            console.log('[HostApp] Showing submission wait alert');
            setCurrentHostAlertState({
                title: "Timer Complete",
                message: "The timer has ended, but not all teams have submitted. You may wait or proceed to the next slide."
            });
        } else if (currentSlideData.host_alert || currentSlideData.timer_duration_seconds) {
            console.log('[HostApp] Showing host alert after video completion');
            setCurrentHostAlertState(currentSlideData.host_alert || {
                title: "Timer Complete", 
                message: "Click OK to continue to the next slide."
            });
        } else if (shouldAutoAdvance(gameVersion, currentSlideData.auto_advance_after_video)) {
            console.log('[HostApp] Auto-advancing to next slide');
            nextSlide('video');
        }
        // If auto_advance_after_video is false, do nothing (wait for manual advance)
    };

    // TODO: Remove this for production
    // Updated TestingJumpButton component with all colors
    const TestingJumpButton: React.FC<{
        slideId: number;
        label: string;
        color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
    }> = ({ slideId, label, color }) => {
        const { selectSlideByIndex, state } = useGameContext();
        const [isJumping, setIsJumping] = useState(false);

        const colorClasses = {
            blue: 'bg-game-orange-500 hover:bg-game-orange-600 text-white',
            green: 'bg-green-500 hover:bg-green-600 text-white',
            purple: 'bg-game-orange-500 hover:bg-game-orange-600 text-white',
            orange: 'bg-orange-500 hover:bg-orange-600 text-white',
            red: 'bg-red-500 hover:bg-red-600 text-white',
            gray: 'bg-gray-500 hover:bg-gray-600 text-white'
        };

        const handleJump = async () => {
            if (!state.gameStructure) return;

            setIsJumping(true);
            try {
                // Find the slide index in the slides array
                const slideIndex = state.gameStructure.slides.findIndex(slide => slide.id === slideId);
                if (slideIndex !== -1) {
                    await selectSlideByIndex(slideIndex);
                } else {
                    console.warn(`Slide with ID ${slideId} not found`);
                }
            } catch (error) {
                console.error('Failed to jump to slide:', error);
            } finally {
                setIsJumping(false);
            }
        };

        return (
            <button
                onClick={handleJump}
                disabled={isJumping}
                className={`
                px-2 py-1 rounded text-xs font-medium transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${colorClasses[color]}
            `}
            >
                {isJumping ? 'Jumping...' : label}
            </button>
        );
    };

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return <div className="min-h-screen ..."><AlertCircle/>Session Not Fully Loaded</div>;
    }

    return (
        <div
            className="h-screen w-screen bg-gradient-to-br from-gray-200 to-gray-400 p-4 flex flex-col overflow-hidden">
            <header
                className="flex-shrink-0 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                    {/* Logo */}
                    <img
                        src="/images/ready-or-not-logo.png"
                        alt="Ready or Not 2.0"
                        className="h-24 w-auto rounded-lg shadow-sm"
                    />

                    {/* Game Title and Session Info */}
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                            {gameStructure?.name || 'Game'}
                        </h1>
                        <p className="text-gray-500 text-sm md:text-base">
                            Session: {currentSessionId?.substring(0, 8)}...
                        </p>
                    </div>
                </div>

                {/* TODO: Remove this for production */}
                {/* Development Testing Tools - Complete Version */}
                {import.meta.env.DEV && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex flex-col gap-3">
                            <div className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                                <span>🧪</span> Testing: Team Decision Points
                            </div>

                            {/* Round 1 */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Round 1</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={7} label="💰 RD-1 Invest: A-F Options ($400K)" color="blue" />
                                    <TestingJumpButton slideId={17} label="⚠️ CH1 Equipment: CNC/Replace/Outsource/Nothing" color="red" />
                                    <TestingJumpButton slideId={32} label="⚠️ CH2 Tax: Prices/Marketing/Cutting/Nothing" color="red" />
                                    <TestingJumpButton slideId={47} label="⚠️ CH3 Recession: Layoffs/Furlough/Cut OT/Nothing" color="red" />
                                </div>
                            </div>

                            {/* Round 2 */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Round 2</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={70} label="💰 RD-2 Invest: A-L Options ($500K)" color="blue" />
                                    <TestingJumpButton slideId={78} label="⚠️ CH4 Supply: Costly/Fast/Local" color="red" />
                                    <TestingJumpButton slideId={91} label="⚠️ CH5 Capacity: Staff/Temps/Prices/Nothing" color="red" />
                                    <TestingJumpButton slideId={105} label="⚠️ CH6 Quality: Expert/PR/Both/Nothing" color="red" />
                                    <TestingJumpButton slideId={118} label="⚠️ CH7 Compete: Price/Market/Innovate/Nothing" color="red" />
                                </div>
                            </div>

                            {/* Round 3 */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Round 3</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={142} label="🔄 RD-3 KPI Reset" color="gray" />
                                    <TestingJumpButton slideId={143} label="💰 RD-3 Invest: A-K Options ($600K)" color="blue" />
                                    <TestingJumpButton slideId={144} label="🎯 Double Down: Yes/No Decision" color="purple" />
                                    <TestingJumpButton slideId={151} label="⚠️ CH8 Cyber: Isolate/Pay/Restore" color="red" />
                                    <TestingJumpButton slideId={164} label="⚠️ CH9 ERP: Consultant/Sheets/Immunity" color="red" />
                                    <TestingJumpButton slideId={186} label="🎲 Double Down Roll: Expanded 2nd Shift" color="orange" />
                                </div>
                            </div>

                            {/* Quick Navigation */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Quick Navigation</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={40} label="📅 Year 2 Start" color="orange" />
                                    <TestingJumpButton slideId={72} label="📅 Year 3 Start" color="orange" />
                                    <TestingJumpButton slideId={145} label="📅 Year 5 Start" color="orange" />
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-2 pt-2 border-t border-yellow-300">
                            <div className="text-xs text-gray-600 flex flex-wrap gap-4">
                                <span>💰 Investment Choices</span>
                                <span>⚠️ Challenge Responses</span>
                                <span>🎯 Special Decisions</span>
                                <span>📅 Round Transitions</span>
                            </div>
                        </div>
                    </div>
                )}

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
                    {/* Subtly Enhanced Navigation Area */}
                    <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 lg:p-4 rounded-b-lg shadow-md">
                        <div className="flex items-center justify-between gap-4">
                            {/* Previous Button - Subtle Enhancement */}
                            <button
                                onClick={previousSlide}
                                disabled={isFirstSlideOverall}
                                className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={28}/>
                                <span className="font-medium">Prev</span>
                            </button>

                            {/* Slide Info - Slightly Enhanced */}
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-base md:text-lg font-semibold text-gray-800 truncate">
                                    {currentSlideData ? `Slide ${currentSlideData.id}: ${currentSlideData.title}` : 'No Slide Selected'}
                                </div>
                                <div className="text-sm md:text-sm text-gray-600 mt-1">
                                    {currentSlideData && current_slide_index !== null && (
                                        <span className="font-medium">({current_slide_index + 1} of {gameStructure.slides.length})</span>
                                    )}
                                    {currentSlideData?.interactive_data_key && (
                                        <span className="ml-2 text-green-600 font-medium">• Interactive</span>
                                    )}
                                </div>
                            </div>

                            {/* Next Button - Subtle Enhancement */}
                            <button
                                onClick={() => nextSlide('manual')}
                                disabled={isLastSlideOverall}
                                className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="font-medium">Next</span>
                                <ChevronRight size={28}/>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HostApp;
