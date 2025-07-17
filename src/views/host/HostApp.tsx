// src/views/host/HostApp.tsx - REFACTOR: Final, stable layout fix
import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import GamePanel from '@views/host/components/GamePanel';
import {useGameContext} from '@app/providers/GameProvider';
import {AlertCircle, ChevronLeft, ChevronRight} from 'lucide-react';
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import PresentationButton, { ConnectionStatus as PresentationConnectionStatus } from '@views/host/components/GameControls/PresentationButton';
import { useHostSyncManager } from '@core/sync/HostSyncManager';
import {SimpleRealtimeManager} from "@core/sync";
import {ChallengeOption, GameStructure, InvestmentOption, Slide} from "@shared/types";
import {shouldAutoAdvance} from '@shared/utils/versionUtils';
import type {SlideRendererProps} from '@shared/components/Video/SlideRenderer';
import { TeamGameEventType } from '@core/sync/SimpleRealtimeManager';

const broadcastInteractiveSlideData = (
    realtimeManager: SimpleRealtimeManager,
    currentSlideData: Slide,
    gameStructure: GameStructure
): void => {
    const dataKey = currentSlideData.interactive_data_key;
    if (!dataKey) return;

    const interactiveData: {
        slideId: number;
        slide: Slide;
        investmentOptions?: InvestmentOption[];
        challengeOptions?: ChallengeOption[];
        budgetForPhase?: number;
        rd3Investments?: InvestmentOption[];
        decisionType: string;
        decisionKey: string;
        roundNumber: number;
        title: string;
        isDecisionTime: boolean;
    } = {
        slideId: currentSlideData.id,
        slide: currentSlideData,
        decisionType: currentSlideData.type,
        decisionKey: dataKey,
        roundNumber: currentSlideData.round_number || 1,
        title: currentSlideData.title || '',
        isDecisionTime: true
    };

    // Add investment options if needed
    if (currentSlideData.type === 'interactive_invest' || currentSlideData.type === 'interactive_double_down_select') {
        interactiveData.investmentOptions = currentSlideData.type === 'interactive_invest'
            ? gameStructure.all_investment_options[dataKey] || []
            : gameStructure.all_investment_options['rd3-invest'] || [];

        // Add budget info for investment slides
        if (currentSlideData.type === 'interactive_invest') {
            interactiveData.budgetForPhase = gameStructure.investment_phase_budgets[dataKey] || 0;
        }
    }

    // Add challenge options if needed
    if (currentSlideData.type === 'interactive_choice' || currentSlideData.type === 'interactive_double_down_select') {
        interactiveData.challengeOptions = gameStructure.all_challenge_options[dataKey] || [];
    }

    // Add RD3 investments for double down
    if (currentSlideData.type === 'interactive_double_down_select') {
        interactiveData.rd3Investments = gameStructure.all_investment_options['rd3-invest'] || [];
    }

    console.log('📱 Broadcasting interactive slide data for:', dataKey);
    realtimeManager.sendInteractiveSlideData(interactiveData);
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

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
    const [isPresentationConnected, setIsPresentationConnected] = useState(false);
    const [joinInfo, setJoinInfo] = useState<{ joinUrl: string; qrCodeDataUrl: string } | null>(null);
    const [isJoinInfoOpen, setIsJoinInfoOpen] = useState(false);

    const [presentationConnectionStatus, setPresentationConnectionStatus] = useState<PresentationConnectionStatus>('disconnected');
    const presentationTabRef = useRef<Window | null>(null);
    // TODO - unfortunate this needs to be here, but it's a hack to get the video control API to the slide renderer
    const videoControlRef = useRef<{ sendCommand: (action: string, data?: any) => void } | null>(null);

    const handleVideoEnd = useCallback(() => {
        if (!currentSlideData) return;

        // For interactive slides, check if we should wait for submissions
        if (currentSlideData.interactive_data_key && !allTeamsSubmittedCurrentInteractivePhase) {
            setCurrentHostAlertState({
                title: "Timer Complete",
                message: "The timer has ended, but not all teams have submitted. You may wait or proceed to the next slide."
            });
        } else if (currentSlideData.host_alert || currentSlideData.timer_duration_seconds) {
            setCurrentHostAlertState(currentSlideData.host_alert || {
                title: "Timer Complete",
                message: "Click OK to continue to the next slide."
            });
        } else if (shouldAutoAdvance(gameVersion, currentSlideData.auto_advance_after_video)) {
            nextSlide('video');
        }
        // If auto_advance_after_video is false, do nothing (wait for manual advance)
    }, [currentSlideData, allTeamsSubmittedCurrentInteractivePhase, setCurrentHostAlertState]);

    const memoizedSlideRendererProps = useMemo((): SlideRendererProps => {
        return {
            slide: currentSlideData,
            sessionId: currentSessionId,
            isHost: true,
            onVideoEnd: handleVideoEnd,
            teams: state.teams,
            teamRoundData: state.teamRoundData,
            teamDecisions: Object.values(state.teamDecisions).flatMap(teamDecisionsByPhase =>
                Object.values(teamDecisionsByPhase)
            ),
            onVideoControl: (api: { sendCommand: (action: string, data?: any) => void }) => {
                videoControlRef.current = api;
            }
        };
    }, [
        currentSlideData,
        currentSessionId,
        handleVideoEnd,
        state.teams,
        state.teamRoundData,
        state.teamDecisions
    ]);

    useEffect(() => {
        console.log('presentationConnectionStatus', presentationConnectionStatus);
    }, [presentationConnectionStatus]);

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

            realtimeManager.sendTeamEvent(TeamGameEventType.DECISION_CLOSED, {
                decisionKey: previousSlideData.interactive_data_key,
                message: 'Decision period has ended',
                slideId: previousSlideData.id
            });
        }

        // Update previous slide reference
        setPreviousSlideData(currentSlideData);

        // Exit early if no current slide
        if (!currentSlideData) return;

        // ✅ EXISTING: Broadcast to teams if slide is relevant
        const isInteractiveSlide = currentSlideData.interactive_data_key &&
            currentSlideData.type.startsWith('interactive_');
        if (isInteractiveSlide && gameStructure) {
            broadcastInteractiveSlideData(realtimeManager, currentSlideData, gameStructure);
        }
    }, [currentSessionId, currentSlideData, gameStructure]);

    const hostSyncManager = useHostSyncManager(currentSessionId || null);

    // Open presentation window and set status
    const handleOpenDisplay = useCallback(() => {
        if (!currentSessionId) {
            alert("No active session. Please create or select a game first.");
            return;
        }
        
        // Pause the host video when opening presentation
        if (videoControlRef.current) {
            videoControlRef.current.sendCommand('pause');
        }
        
        const url = `/display/${currentSessionId}`;
        const newTab = window.open(url, '_blank');
        if (newTab) {
            // TODO - we should invert pass video to slide renderer rather than have it instantiate...honestly child component?? 
            
            presentationTabRef.current = newTab;
            console.log('[HostApp] setting presentationConnectionStatus to connecting');
            setPresentationConnectionStatus('connecting');
        } else {
            alert("Failed to open presentation display. Please ensure pop-ups are allowed for this site.");
            console.log('[HostApp] setting presentationConnectionStatus to disconnected');
            setPresentationConnectionStatus('disconnected');
        }
    }, [currentSessionId]);

    // Monitor presentation tab state and set status to disconnected if closed
    useEffect(() => {
        if (!presentationTabRef.current) return;
        const checkInterval = setInterval(() => {
            if (presentationTabRef.current?.closed) {
                console.log('[HostApp] Presentation window closed - restoring audio dominance');
                setPresentationConnectionStatus('disconnected');
                
                // Force sync manager to disconnect immediately
                if (hostSyncManager) {
                    // Force immediate disconnect status update
                    hostSyncManager.forceDisconnect();
                }
                
                // Restore audio precedence to host
                if (videoControlRef.current) {
                    // Pause the host video when presentation closes
                    videoControlRef.current.sendCommand('pause');
                    // Unmute the host video and set volume to normal
                    videoControlRef.current.sendCommand('volume', {
                        muted: false,
                        volume: 1
                    });
                }
                
                presentationTabRef.current = null;
                clearInterval(checkInterval);
            }
        }, 2000);
        return () => clearInterval(checkInterval);
    }, [presentationTabRef.current, hostSyncManager]);

    // Prepare team data for broadcasting
    const teamData = {
        teams: state.teams,
        teamRoundData: state.teamRoundData,
        teamDecisions: Object.values(state.teamDecisions).flatMap(teamDecisionsByPhase =>
            Object.values(teamDecisionsByPhase)
        )
    };

    // Sync: Presentation connection status
    useEffect(() => {
        if (!hostSyncManager) return;
        const unsubscribe = hostSyncManager.onPresentationStatus((status: string) => {
            console.log('[HostApp] received presentation status', status);
            setIsPresentationConnected(status === 'connected');
            setPresentationConnectionStatus(status as PresentationConnectionStatus);
        });
        return unsubscribe;
    }, [hostSyncManager]);

    // Sync: Presentation video ready
    useEffect(() => {
        if (!hostSyncManager) return;
        hostSyncManager.onPresentationVideoReady(() => {
            console.log('[HostApp] Presentation video ready');
        });
    }, [hostSyncManager]);

    // Sync: Send slide updates to presentation
    useEffect(() => {
        if (!hostSyncManager || !currentSlideData) return;
        hostSyncManager.sendSlideUpdate(currentSlideData, teamData);
    }, [hostSyncManager, currentSlideData, teamData]);

    // Sync: Send join info updates
    useEffect(() => {
        if (!hostSyncManager) return;
        if (isJoinInfoOpen && joinInfo) {
            hostSyncManager.sendJoinInfo(joinInfo.joinUrl, joinInfo.qrCodeDataUrl);
        } else if (!isJoinInfoOpen) {
            hostSyncManager.sendJoinInfoClose();
        }
    }, [hostSyncManager, joinInfo, isJoinInfoOpen]);

    const isFirstSlideOverall = current_slide_index === 0;
    const isLastSlideOverall = gameStructure && gameStructure.slides ? current_slide_index === (gameStructure.slides.length - 1) : false;

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

    // TODO: Remove this for production
    // Updated TestingJumpButton component with all colors
    const TestingJumpButton: React.FC<{
        slideId: number;
        label: string;
        color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
    }> = ({slideId, label, color}) => {
        const {selectSlideByIndex, state} = useGameContext();
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
            
            {/* Host Sync Component for presentation communication - REMOVED */}
            {/* Removed HostSyncComponent */}

            {/* Development Testing Tools - Complete Version */}
            {import.meta.env.DEV && (
                <header
                    className="flex-shrink-0 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex flex-col gap-3">
                            <div className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                                <span>🧪</span> Testing: Team Decision Points
                            </div>

                            {/* Round 1 */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Round 1</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={7} label="💰 RD-1 Invest: A-F Options ($400K)"
                                                       color="blue"/>
                                    <TestingJumpButton slideId={17}
                                                       label="⚠️ CH1 Equipment: CNC/Replace/Outsource/Nothing"
                                                       color="red"/>
                                    <TestingJumpButton slideId={32} label="⚠️ CH2 Tax: Prices/Marketing/Cutting/Nothing"
                                                       color="red"/>
                                    <TestingJumpButton slideId={47}
                                                       label="⚠️ CH3 Recession: Layoffs/Furlough/Cut OT/Nothing"
                                                       color="red"/>
                                </div>
                            </div>

                            {/* Round 2 */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Round 2</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={70} label="💰 RD-2 Invest: A-L Options ($500K)"
                                                       color="blue"/>
                                    <TestingJumpButton slideId={78} label="⚠️ CH4 Supply: Costly/Fast/Local"
                                                       color="red"/>
                                    <TestingJumpButton slideId={91} label="⚠️ CH5 Capacity: Staff/Temps/Prices/Nothing"
                                                       color="red"/>
                                    <TestingJumpButton slideId={105} label="⚠️ CH6 Quality: Expert/PR/Both/Nothing"
                                                       color="red"/>
                                    <TestingJumpButton slideId={118}
                                                       label="⚠️ CH7 Compete: Price/Market/Innovate/Nothing"
                                                       color="red"/>
                                </div>
                            </div>

                            {/* Round 3 */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Round 3</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={142} label="🔄 RD-3 KPI Reset" color="gray"/>
                                    <TestingJumpButton slideId={143} label="💰 RD-3 Invest: A-K Options ($600K)"
                                                       color="blue"/>
                                    <TestingJumpButton slideId={144} label="🎯 Double Down: Yes/No Decision"
                                                       color="purple"/>
                                    <TestingJumpButton slideId={151} label="⚠️ CH8 Cyber: Isolate/Pay/Restore"
                                                       color="red"/>
                                    <TestingJumpButton slideId={164} label="⚠️ CH9 ERP: Consultant/Sheets/Immunity"
                                                       color="red"/>
                                    <TestingJumpButton slideId={186} label="🎲 Double Down Roll: Expanded 2nd Shift"
                                                       color="orange"/>
                                </div>
                            </div>

                            {/* Quick Navigation */}
                            <div className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-gray-700">Quick Navigation</div>
                                <div className="flex flex-wrap gap-2">
                                    <TestingJumpButton slideId={40} label="📅 Year 2 Start" color="orange"/>
                                    <TestingJumpButton slideId={72} label="📅 Year 3 Start" color="orange"/>
                                    <TestingJumpButton slideId={145} label="📅 Year 5 Start" color="orange"/>
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
                </header>
            )}

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
                <div className="lg:col-span-4 xl:col-span-3 min-h-0">
                    <GamePanel 
                        joinInfo={joinInfo}
                        setJoinInfo={setJoinInfo}
                        isJoinInfoOpen={isJoinInfoOpen}
                        setIsJoinInfoOpen={setIsJoinInfoOpen}
                        onClosePresentation={() => {
                            hostSyncManager?.sendClosePresentation();
                        }}
                    />
                </div>
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0">
                    {/* Stable Slide Display Area with fixed aspect ratio */}
                    <div className="flex-grow relative w-full bg-black rounded-t-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-full">
                                <SlideRenderer {...memoizedSlideRendererProps} />
                            </div>
                        </div>
                        {currentSlideData && (
                            <div className="absolute top-3 right-3 z-50 w-48">
                                <PresentationButton
                                    connectionStatus={presentationConnectionStatus}
                                    onOpenDisplay={handleOpenDisplay}
                                />
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
