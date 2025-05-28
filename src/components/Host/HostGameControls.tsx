// src/components/Host/HostGameControls.tsx - Updated with Floating Navigation
import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Users,
    QrCode,
    Trophy,
    FileText,
    ExternalLink,
    Lightbulb,
    LogOut,
    Monitor
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Modal from '../UI/Modal';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

const HostGameControls: React.FC = () => {
    const {
        state,
        previousSlide,
        nextSlide,
        updateHostNotesForCurrentSlide,
        currentSlideData,
        currentPhaseNode,
        clearHostAlert,
        selectPhase,
        allPhasesInOrder,
        setCurrentHostAlertState,
    } = useAppContext();

    const navigate = useNavigate();
    const [showNotes, setShowNotes] = useState(false);
    const [isJoinCompanyModalOpen, setIsJoinCompanyModalOpen] = useState(false);
    const [isTeamCodesModalOpen, setIsTeamCodesModalOpen] = useState(false);
    const [isExitConfirmModalOpen, setisExitConfirmModalOpen] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [isPresentationDisplayOpen, setIsPresentationDisplayOpen] = useState(false);

    const channelRef = useRef<BroadcastChannel | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout>();
    const lastPongRef = useRef<number>(0);

    const handleNotesToggle = () => setShowNotes(!showNotes);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (currentSlideData) {
            updateHostNotesForCurrentSlide(e.target.value);
        }
    };

    // Check if current slide is a video
    const isVideoSlide = currentSlideData && (
        currentSlideData.type === 'video' ||
        (currentSlideData.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
        ((currentSlideData.type === 'consequence_reveal' || currentSlideData.type === 'payoff_reveal') &&
            currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

    // Initialize BroadcastChannel when session is available
    useEffect(() => {
        if (!state.currentSessionId) return;

        const channelName = `game-session-${state.currentSessionId}`;
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        // Listen for messages from presentation display
        const handleMessage = (event: MessageEvent) => {
            switch (event.data.type) {
                case 'PONG':
                    if (event.data.sessionId === state.currentSessionId) {
                        lastPongRef.current = Date.now();
                        setIsPresentationDisplayOpen(true);
                    }
                    break;

                case 'PRESENTATION_READY':
                    if (event.data.sessionId === state.currentSessionId) {
                        setIsPresentationDisplayOpen(true);
                        console.log('[HostGameControls] Presentation display connected');

                        // Send current slide when presentation connects
                        if (currentSlideData) {
                            channel.postMessage({
                                type: 'SLIDE_UPDATE',
                                slide: currentSlideData,
                                sessionId: state.currentSessionId,
                                timestamp: Date.now()
                            });
                        }
                    }
                    break;

                case 'REQUEST_CURRENT_STATE':
                    if (event.data.sessionId === state.currentSessionId && currentSlideData) {
                        channel.postMessage({
                            type: 'SLIDE_UPDATE',
                            slide: currentSlideData,
                            sessionId: state.currentSessionId,
                            timestamp: Date.now()
                        });
                    }
                    break;
            }
        };

        channel.addEventListener('message', handleMessage);

        // Set up ping to monitor presentation display connection
        pingIntervalRef.current = setInterval(() => {
            channel.postMessage({
                type: 'PING',
                sessionId: state.currentSessionId,
                timestamp: Date.now()
            });

            // Check if we haven't received a pong in the last 5 seconds
            if (Date.now() - lastPongRef.current > 5000) {
                setIsPresentationDisplayOpen(false);
            }
        }, 2000);

        return () => {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, [state.currentSessionId, currentSlideData]);

    // Send slide update when current slide changes
    useEffect(() => {
        if (channelRef.current && currentSlideData && state.currentSessionId) {
            console.log('[HostGameControls] Sending slide update:', currentSlideData.id);
            channelRef.current.postMessage({
                type: 'SLIDE_UPDATE',
                slide: currentSlideData,
                sessionId: state.currentSessionId,
                timestamp: Date.now()
            });
        }
    }, [currentSlideData, state.currentSessionId]);

    const handleOpenDisplay = () => {
        if (!state.currentSessionId) {
            alert("No active session. Please create or select a game first.");
            return;
        }

        const url = `/student-display/${state.currentSessionId}`;
        const newTab = window.open(url, '_blank');

        if (newTab) {
            console.log('[HostGameControls] Opened presentation display in new tab');
            // Give the new tab time to initialize before sending state
            setTimeout(() => {
                if (channelRef.current && currentSlideData) {
                    channelRef.current.postMessage({
                        type: 'SLIDE_UPDATE',
                        slide: currentSlideData,
                        sessionId: state.currentSessionId,
                        timestamp: Date.now()
                    });
                }
            }, 1000);
        } else {
            alert("Failed to open presentation display. Please ensure pop-ups are allowed for this site.");
        }
    };

    const openJoinInfoModal = () => setIsJoinCompanyModalOpen(true);
    const closeJoinCompanyModal = () => setIsJoinCompanyModalOpen(false);
    const openTeamCodesModal = () => setIsTeamCodesModalOpen(true);
    const closeCompanyCodesModal = () => setIsTeamCodesModalOpen(false);

    const showCurrentRoundLeaderboard = () => {
        if (currentPhaseNode && currentPhaseNode.round_number > 0) {
            const leaderboardPhaseId = `rd${currentPhaseNode.round_number}-leaderboard`;
            if (allPhasesInOrder.find(p => p.id === leaderboardPhaseId)) {
                selectPhase(leaderboardPhaseId);
            } else {
                alert("Leaderboard for the current round is not yet available or configured.");
            }
        } else if (currentPhaseNode?.phase_type === 'game-end') {
            const finalLeaderboardPhase = allPhasesInOrder.find(p => p.id === 'final-leaderboard');
            if (finalLeaderboardPhase) selectPhase(finalLeaderboardPhase.id);
        } else {
            alert("Not in an active round to show leaderboard, or game has not started.");
        }
    };

    const handleExitGameClick = () => {
        setisExitConfirmModalOpen(true);
    };

    const confirmExitGame = () => {
        setisExitConfirmModalOpen(false);

        // Notify presentation display that session is ending
        if (channelRef.current && state.currentSessionId) {
            channelRef.current.postMessage({
                type: 'SESSION_ENDED',
                sessionId: state.currentSessionId,
                timestamp: Date.now()
            });
        }

        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
        }

        navigate('/dashboard');
    };

    const currentNotes = currentSlideData ? state.hostNotes[String(currentSlideData.id)] || '' : '';
    const CompanyDisplayBaseUrl = `${window.location.origin}/student-game`;
    const studentJoinUrl = `${CompanyDisplayBaseUrl}/${state.currentSessionId}`;

    // Generate QR code when modal opens
    useEffect(() => {
        if (isJoinCompanyModalOpen && state.currentSessionId) {
            QRCode.toDataURL(studentJoinUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
                .then(url => {
                    setQrCodeDataUrl(url);
                })
                .catch(err => {
                    console.error('Error generating QR code:', err);
                    setQrCodeDataUrl(null);
                });
        }
    }, [isJoinCompanyModalOpen, studentJoinUrl, state.currentSessionId]);

    const isFirstSlideOverall = currentPhaseNode?.id === state.gameStructure?.welcome_phases[0]?.id && state.currentSlideIdInPhase === 0;
    const gameEndPhaseIds = state.gameStructure?.game_end_phases.map(p => p.id) || [];

    let isLastSlideOverall = false;
    if (currentPhaseNode && state.gameStructure) {
        if (gameEndPhaseIds.includes(currentPhaseNode.id)) {
            const lastGameEndPhase = state.gameStructure.game_end_phases[state.gameStructure.game_end_phases.length - 1];
            if (currentPhaseNode.id === lastGameEndPhase.id && state.currentSlideIdInPhase === (lastGameEndPhase.slide_ids.length - 1)) {
                isLastSlideOverall = true;
            }
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
            {/* UPDATED: Floating Action Button Style Navigation */}
            <div className="p-3 md:p-4">
                <div className="relative bg-gray-50 rounded-lg p-6 mb-3">
                    <button
                        onClick={previousSlide}
                        disabled={isFirstSlideOverall}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:bg-blue-700 transition-colors z-10"
                        title="Previous Slide"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="text-center px-16">
                        <div className="text-xl font-bold text-gray-800 mb-1">Game Navigation</div>
                        <div className="text-sm text-gray-600">Navigate between presentation slides</div>
                    </div>

                    <button
                        onClick={nextSlide}
                        disabled={isLastSlideOverall}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:bg-blue-700 transition-colors z-10"
                        title="Next Slide"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-3">
                    <button
                        onClick={handleOpenDisplay}
                        className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg transition-colors shadow-md text-sm font-medium w-full sm:w-auto ${
                            isPresentationDisplayOpen
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {isPresentationDisplayOpen ? (
                            <>
                                <Monitor size={18}/>
                                Presentation Display Connected
                            </>
                        ) : (
                            <>
                                <ExternalLink size={18}/>
                                Open Presentation Display
                            </>
                        )}
                    </button>
                </div>

                {/* Simple video instruction for video slides */}
                {isVideoSlide && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800">
                            <div className="flex items-center mb-1">
                                <Monitor size={14} className="mr-2"/>
                                <span className="font-medium">Video Slide Active</span>
                            </div>
                            <p className="text-blue-700 text-xs">
                                Click directly on the video preview above to play/pause.
                                Video will sync automatically with the presentation display.
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 border-t border-gray-200 pt-3">
                    <button
                        onClick={openJoinInfoModal}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                        aria-label="Show Student Join Info"
                    >
                        <QrCode size={16}/> Join Info
                    </button>
                    <button
                        onClick={openTeamCodesModal}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                        aria-label="Team Codes"
                    >
                        <Users size={16}/> Team Codes
                    </button>
                    <button
                        onClick={showCurrentRoundLeaderboard}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                        aria-label="Show Leaderboard"
                    >
                        <Trophy size={16}/> Leaderboard
                    </button>
                    <button
                        onClick={handleNotesToggle}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors border
                          ${showNotes
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'hover:bg-gray-100 text-gray-600 border-gray-300'
                        }`}
                    >
                        <FileText size={16}/> Notes
                    </button>
                    <button
                        onClick={handleExitGameClick}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors border border-red-300"
                        aria-label="Exit Game"
                    >
                        <LogOut size={16}/> Exit Game
                    </button>
                </div>

                {/* Notes Section */}
                {showNotes && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                        <label htmlFor="teacherNotes" className="block text-xs font-medium text-gray-500 mb-1">
                            Notes for: <span
                            className="font-semibold text-gray-700">{currentSlideData?.title || `Slide ${currentSlideData?.id || 'N/A'}`}</span>
                        </label>
                        <textarea
                            id="teacherNotes"
                            className="w-full text-sm bg-gray-50 text-gray-800 p-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow focus:shadow-md"
                            rows={3}
                            placeholder="Type your private notes for this slide..."
                            value={currentNotes}
                            onChange={handleNotesChange}
                            disabled={!currentSlideData}
                        />
                    </div>
                )}
            </div>

            {/* Teacher Alert Modal */}
            {state.currentHostAlert && (
                <Modal
                    isOpen={!!state.currentHostAlert}
                    onClose={() => { setCurrentHostAlertState(null); }}
                    title={state.currentHostAlert.title || "Game Host Alert!"}
                    hideCloseButton={false}
                >
                    <div className="p-1">
                        <div className="flex items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0 sm:h-8 sm:w-8">
                                <Lightbulb className="h-5 w-5 text-blue-600" aria-hidden="true"/>
                            </div>
                            <div className="ml-3 text-left">
                                <p className="text-sm text-gray-600 mt-1">{state.currentHostAlert.message}</p>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={clearHostAlert}
                            >
                                Next
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentHostAlertState(null)}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm sm:mr-3"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Join Info Modal */}
            <Modal isOpen={isJoinCompanyModalOpen} onClose={closeJoinCompanyModal} title="Company Join Information" size="md">
                <div className="p-2 text-center">
                    <p className="text-sm text-gray-600 mb-2">Students join at:</p>
                    <div className="bg-gray-100 p-3 rounded-md mb-3">
                        <a href={studentJoinUrl} target="_blank"
                           rel="noopener noreferrer"
                           className="font-mono text-blue-600 hover:text-blue-800 break-all text-lg">
                            {studentJoinUrl}
                        </a>
                    </div>
                    {state.currentSessionId && qrCodeDataUrl && (
                        <div className="flex justify-center my-4">
                            <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                                <img
                                    src={qrCodeDataUrl}
                                    alt="QR Code for student join link"
                                    className="w-48 h-48"
                                />
                                <p className="text-xs text-gray-500 mt-2">Scan to join game</p>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 mb-3">Students will also need their Team Name and Team Passcode.</p>
                    <button onClick={closeJoinCompanyModal}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">Close
                    </button>
                </div>
            </Modal>

            {/* Team Codes Modal */}
            <Modal isOpen={isTeamCodesModalOpen} onClose={closeCompanyCodesModal} title="Team Access Codes" size="sm">
                <div className="p-2">
                    {state.teams.length > 0 ? (
                        <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                            {state.teams.map(team => (
                                <li key={team.id}
                                    className="p-2.5 bg-gray-100 rounded-md text-sm flex justify-between items-center">
                                    <span className="font-semibold text-gray-800">{team.name}:</span>
                                    <span className="ml-2 text-blue-600 font-mono bg-blue-100 px-2 py-0.5 rounded">{team.passcode}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600 text-sm py-4 text-center">No teams found for this session. Ensure
                            teams are set up.</p>
                    )}
                    <div className="mt-4 text-right">
                        <button onClick={closeCompanyCodesModal}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Exit Game Confirmation Modal */}
            <Modal
                isOpen={isExitConfirmModalOpen}
                onClose={() => setisExitConfirmModalOpen(false)}
                title="Confirm Exit Game"
                size="sm"
            >
                <div className="p-1">
                    <p className="text-sm text-gray-700">
                        Are you sure you want to exit this game session and return to the dashboard?
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Your current game progress is saved.
                    </p>
                    <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm w-full sm:w-auto"
                            onClick={confirmExitGame}
                        >
                            Yes, Exit Game
                        </button>
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm w-full sm:w-auto"
                            onClick={() => setisExitConfirmModalOpen(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default HostGameControls;