// src/components/TeacherHost/TeacherGameControls.tsx
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
    Monitor,
    Video,
    AlertCircle,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Modal from '../UI/Modal';
import MonitorSelector from './MonitorSelector';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { openWindowOnMonitor, getSavedMonitorPreference, saveMonitorPreference, MonitorInfo } from '../../utils/displayUtils';

const TeacherGameControls: React.FC = () => {
    const {
        state,
        previousSlide,
        nextSlide,
        updateTeacherNotesForCurrentSlide,
        currentSlideData,
        currentPhaseNode,
        clearTeacherAlert,
        setStudentWindowOpen,
        selectPhase,
        allPhasesInOrder,
        setCurrentTeacherAlertState,
    } = useAppContext();

    const navigate = useNavigate();
    const [showNotes, setShowNotes] = useState(false);
    const [isJoinCompanyModalOpen, setIsJoinCompanyModalOpen] = useState(false);
    const [isTeamCodesModalOpen, setIsTeamCodesModalOpen] = useState(false);
    const [isExitConfirmModalOpen, setisExitConfirmModalOpen] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [showMonitorSelector, setShowMonitorSelector] = useState(false);
    const [studentWindowRef, setStudentWindowRef] = useState<Window | null>(null);
    const [showVideoInstructionsModal, setShowVideoInstructionsModal] = useState(false);

    const handleNotesToggle = () => setShowNotes(!showNotes);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (currentSlideData) {
            updateTeacherNotesForCurrentSlide(e.target.value);
        }
    };

    const isVideoSlide = currentSlideData && (
        currentSlideData.type === 'video' ||
        (currentSlideData.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
        ((currentSlideData.type === 'consequence_reveal' || currentSlideData.type === 'payoff_reveal') &&
            currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

    const handleOpenStudentDisplay = async () => {
        if (!state.currentSessionId) {
            alert("No active session. Please create or select a game first.");
            return;
        }

        // Check if current slide is a video
        if (isVideoSlide) {
            setShowVideoInstructionsModal(true);
            return;
        }

        // For non-video content, proceed with normal student display
        const savedMonitor = getSavedMonitorPreference(state.currentSessionId);
        if (savedMonitor) {
            openOnMonitor(savedMonitor);
        } else {
            setShowMonitorSelector(true);
        }
    };

    const openOnMonitor = (monitor: MonitorInfo) => {
        if (!state.currentSessionId) return;

        const url = `/student-display/${state.currentSessionId}`;
        const studentWindow = openWindowOnMonitor(url, 'studentDisplay', monitor);

        if (studentWindow) {
            setStudentWindowRef(studentWindow);
            setStudentWindowOpen(true);
            saveMonitorPreference(state.currentSessionId, monitor);

            // Set up communication with student window
            studentWindow.addEventListener('load', () => {
                // Send current slide info
                if (currentSlideData && !isVideoSlide) {
                    studentWindow.postMessage({
                        type: 'SLIDE_UPDATE',
                        slide: currentSlideData
                    }, window.location.origin);
                }
            });

            // Monitor if window is closed
            const checkIfClosed = setInterval(() => {
                if (studentWindow.closed) {
                    clearInterval(checkIfClosed);
                    setStudentWindowOpen(false);
                    setStudentWindowRef(null);
                }
            }, 1000);

            // Store reference globally for other components
            (window as any).studentDisplayWindow = studentWindow;
        } else {
            alert("Failed to open student display. Please ensure pop-ups are allowed for this site.");
        }
    };

    // Update student display when slide changes
    useEffect(() => {
        if (studentWindowRef && !studentWindowRef.closed && currentSlideData) {
            studentWindowRef.postMessage({
                type: 'SLIDE_UPDATE',
                slide: currentSlideData
            }, window.location.origin);
        }
    }, [currentSlideData, studentWindowRef]);

    // Listen for messages from student display
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            switch (event.data.type) {
                case 'STUDENT_DISPLAY_READY':
                    // Send current state to newly opened student display
                    if (studentWindowRef && currentSlideData) {
                        studentWindowRef.postMessage({
                            type: 'SLIDE_UPDATE',
                            slide: currentSlideData
                        }, window.location.origin);
                    }
                    break;
                case 'REQUEST_CURRENT_STATE':
                    // Respond with current slide
                    if (event.source && currentSlideData) {
                        (event.source as Window).postMessage({
                            type: 'SLIDE_UPDATE',
                            slide: currentSlideData
                        }, window.location.origin);
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [currentSlideData, studentWindowRef]);

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

        // Close student display if open
        if (studentWindowRef && !studentWindowRef.closed) {
            studentWindowRef.close();
        }

        navigate('/dashboard');
    };

    const currentNotes = currentSlideData ? state.teacherNotes[String(currentSlideData.id)] || '' : '';
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
        <div className="bg-white p-3 md:p-4 rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-3">
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                        onClick={previousSlide}
                        disabled={isFirstSlideOverall}
                        className="p-2.5 rounded-full text-gray-600 hover:bg-gray-200 disabled:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous Slide"
                    >
                        <ChevronLeft size={24}/>
                    </button>
                    <button
                        onClick={nextSlide}
                        disabled={isLastSlideOverall}
                        className="p-2.5 rounded-full text-gray-600 hover:bg-gray-200 disabled:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next Slide"
                    >
                        <ChevronRight size={24}/>
                    </button>
                </div>
                <button
                    onClick={handleOpenStudentDisplay}
                    className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg transition-colors shadow-md text-sm font-medium w-full sm:w-auto ${
                        state.isStudentWindowOpen
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    {isVideoSlide ? (
                        <>
                            <Video size={18}/>
                            Video Display Info
                        </>
                    ) : state.isStudentWindowOpen ? (
                        <>
                            <Monitor size={18}/>
                            Student Display Active
                        </>
                    ) : (
                        <>
                            <ExternalLink size={18}/>
                            Launch Student Display
                        </>
                    )}
                </button>
            </div>

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

            {/* Monitor Selection Modal */}
            <Modal
                isOpen={showMonitorSelector}
                onClose={() => setShowMonitorSelector(false)}
                title="Select Display for Student View"
                size="lg"
            >
                <MonitorSelector
                    onSelect={(monitor) => {
                        openOnMonitor(monitor);
                        setShowMonitorSelector(false);
                    }}
                    currentSessionId={state.currentSessionId || ''}
                />
            </Modal>

            {/* Video Instructions Modal */}
            <Modal
                isOpen={showVideoInstructionsModal}
                onClose={() => setShowVideoInstructionsModal(false)}
                title="Displaying Video Content"
                size="md"
            >
                <div className="p-4">
                    <div className="flex items-start mb-4">
                        <Video className="text-blue-600 mt-1 mr-3" size={24} />
                        <div>
                            <p className="text-gray-700 mb-3">
                                For video content, use the <strong>Picture-in-Picture</strong> feature:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                                <li>Look for the <strong>"Pop Out to Projector"</strong> button in the video controls below</li>
                                <li>Click it to pop the video out into a floating window</li>
                                <li>Drag the video window to your projector/external display</li>
                                <li>Double-click the video to make it fullscreen</li>
                                <li>Use the controls in your main dashboard to play/pause</li>
                            </ol>
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <p className="text-blue-800">
                            <AlertCircle size={16} className="inline mr-1" />
                            This ensures perfect audio/video synchronization between your preview and the projector.
                        </p>
                    </div>
                    <div className="mt-4 text-right">
                        <button
                            onClick={() => setShowVideoInstructionsModal(false)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Teacher Alert Modal */}
            {state.currentTeacherAlert && (
                <Modal
                    isOpen={!!state.currentTeacherAlert}
                    onClose={() => { setCurrentTeacherAlertState(null); }}
                    title={state.currentTeacherAlert.title || "Game Host Alert!"}
                    hideCloseButton={false}
                >
                    <div className="p-1">
                        <div className="flex items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0 sm:h-8 sm:w-8">
                                <Lightbulb className="h-5 w-5 text-blue-600" aria-hidden="true"/>
                            </div>
                            <div className="ml-3 text-left">
                                <p className="text-sm text-gray-600 mt-1">{state.currentTeacherAlert.message}</p>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={clearTeacherAlert}
                            >
                                Next
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentTeacherAlertState(null)}
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
                    <p className="text-xs text-gray-500 mb-3">Students will also need their Team Name and Team
                        Passcode.</p>
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

export default TeacherGameControls;