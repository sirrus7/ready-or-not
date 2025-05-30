// src/components/Host/HostGameControls.tsx - Minor cleanup for simplified video system
import React, { useState, useEffect } from 'react';
import {
    Users,
    QrCode,
    Trophy,
    FileText,
    Lightbulb,
    LogOut,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Modal from '../UI/Modal';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useBroadcastManager } from '../../utils/broadcastManager';

const HostGameControls: React.FC = () => {
    const {
        state,
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

    // Use broadcast manager for presentation communication
    const broadcastManager = useBroadcastManager(state.currentSessionId, 'host');

    const handleNotesToggle = () => setShowNotes(!showNotes);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (currentSlideData) {
            updateHostNotesForCurrentSlide(e.target.value);
        }
    };

    // Set up broadcast manager listeners for presentation status
    useEffect(() => {
        if (!broadcastManager) return;

        // Monitor connection to presentation display
        const unsubscribeConnection = broadcastManager.onConnectionChange((status) => {
            const isPresentation = status.connectionType === 'presentation';
            setIsPresentationDisplayOpen(status.isConnected && isPresentation);
        });

        // Handle presentation ready
        const unsubscribeReady = broadcastManager.subscribe('PRESENTATION_READY', (message) => {
            setIsPresentationDisplayOpen(true);
            console.log('[HostGameControls] Presentation display connected');

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
            console.log('[HostGameControls] Sending slide update:', currentSlideData.id);
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
            console.log('[HostGameControls] Opened presentation display in new tab');
            // Give the new tab time to initialize before sending state
            setTimeout(() => {
                if (broadcastManager && currentSlideData) {
                    broadcastManager.sendSlideUpdate(currentSlideData);
                }
            }, 1000);
        } else {
            alert("Failed to open presentation display. Please ensure pop-ups are allowed for this site.");
        }
    };

    // NOTE: Video control commands are no longer needed here!
    // The SlideRenderer + useVideoSync hook handles all video control automatically
    // when the host clicks on videos in DisplayView

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

        // Notify presentation display that session is ending via broadcast manager
        if (broadcastManager) {
            broadcastManager.broadcast('SESSION_ENDED', {});
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

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-3 md:p-4">

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