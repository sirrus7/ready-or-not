import React, {useState} from 'react';
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
} from 'lucide-react';
import {useAppContext} from '../../context/AppContext';
import Modal from '../UI/Modal';
import {openStudentDisplay} from '../../utils/windowUtils';
import {useNavigate} from 'react-router-dom';

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

    const handleNotesToggle = () => setShowNotes(!showNotes);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (currentSlideData) {
            updateTeacherNotesForCurrentSlide(e.target.value);
        }
    };

    const handleOpenStudentDisplay = () => {
        const studentWindow = openStudentDisplay(state.currentSessionId);
        if (studentWindow) {
            setStudentWindowOpen(true);
            const checkIfClosed = setInterval(() => {
                if (studentWindow.closed) {
                    clearInterval(checkIfClosed);
                    setStudentWindowOpen(false);
                }
            }, 1000);
        } else {
            alert("Failed to open student display. Please ensure pop-ups are allowed for this site or try again. A game session must be active.");
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
        navigate('/dashboard');
    };

    const currentNotes = currentSlideData ? state.teacherNotes[String(currentSlideData.id)] || '' : '';
    const CompanyDisplayBaseUrl = `${window.location.origin}/student-game`;

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
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-5 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm font-medium w-full sm:w-auto"
                >
                    <ExternalLink size={18}/>
                    Launch Student Display
                </button>
            </div>

            <div
                className="flex flex-wrap items-center justify-center sm:justify-start gap-2 border-t border-gray-200 pt-3">
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

            {/* The Modal for teacher alerts. This is used to notify the teacher they need to take action! */}
            {state.currentTeacherAlert && (
                <Modal
                    isOpen={!!state.currentTeacherAlert}
                    onClose={() => { setCurrentTeacherAlertState(null); }}
                    title={state.currentTeacherAlert.title || "Game Host Alert!"}
                    hideCloseButton={false}
                >
                    <div className="p-1">
                        <div className="flex items-start">
                            <div
                                className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0 sm:h-8 sm:w-8">
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
            
            {/* This is the Modal that shows the students how to join the Company page */}
            <Modal isOpen={isJoinCompanyModalOpen} onClose={closeJoinCompanyModal} title="Company Join Information" size="md">
                <div className="p-2 text-center">
                    <p className="text-sm text-gray-600 mb-2">Students join at:</p>
                    <div className="bg-gray-100 p-3 rounded-md mb-3">
                        <a href={`${CompanyDisplayBaseUrl}/${state.currentSessionId}`} target="_blank"
                           rel="noopener noreferrer"
                           className="font-mono text-blue-600 hover:text-blue-800 break-all text-lg">
                            {`${CompanyDisplayBaseUrl}/${state.currentSessionId}`}
                        </a>
                    </div>
                    {state.currentSessionId && (
                        <div className="flex justify-center my-4">
                            <div
                                className="w-40 h-40 bg-gray-200 flex items-center justify-center text-gray-500 text-xs p-2">
                                [QR Code for student join link]
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

            {/* This model shows the team codes */}
            <Modal isOpen={isTeamCodesModalOpen} onClose={closeCompanyCodesModal} title="Team Access Codes" size="sm">
                <div className="p-2">
                    {state.teams.length > 0 ? (
                        <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                            {state.teams.map(team => (
                                <li key={team.id}
                                    className="p-2.5 bg-gray-100 rounded-md text-sm flex justify-between items-center">
                                    <span className="font-semibold text-gray-800">{team.name}:</span>
                                    <span
                                        className="ml-2 text-blue-600 font-mono bg-blue-100 px-2 py-0.5 rounded">{team.passcode}</span>
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

            {/* This Modal confirms that the teacher wants to exist the game */}
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