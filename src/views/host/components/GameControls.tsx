// src/views/host/components/GameControls.tsx
// FIXED VERSION - Handles null currentSlideData properly

import React, {useState} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import ActionButtons from './GameControls/ActionButtons';
import AlertModal from './GameControls/AlertModal';
import ExitModal from './GameControls/ExitModal';
import JoinInfoModal from './GameControls/JoinInfoModal';
import NotesSection from './GameControls/NotesSection';
import TeamCodesModal from './GameControls/TeamCodesModal';
import {useNavigate} from 'react-router-dom';
import {useHostSyncManager} from '@core/sync/HostSyncManager';
import RonBotHelpModal from './GameControls/RonBotHelpModal';
import {useAuth} from "@app/providers/AuthProvider.tsx";
import {BulkMediaDownload} from "@shared/components/BulkMediaDownload.tsx";
import {getUserType} from "@shared/constants/formOptions.ts";
import TeamManagementModal from "@views/host/components/GameControls/TeamManagementModal";

interface GameControlsProps {
    joinInfo: { joinUrl: string; qrCodeDataUrl: string } | null;
    setJoinInfo: (info: { joinUrl: string; qrCodeDataUrl: string } | null) => void;
    isJoinInfoOpen: boolean;
    setIsJoinInfoOpen: (open: boolean) => void;
}

const GameControls: React.FC<GameControlsProps> = ({joinInfo, setJoinInfo, isJoinInfoOpen, setIsJoinInfoOpen}) => {
    const {state, currentSlideData, updateHostNotesForCurrentSlide, gameVersion, canModifyTeams} = useGameContext();
    const hostSyncManager = useHostSyncManager(state.currentSessionId);
    // Modal states
    const [showNotes, setShowNotes] = useState(false);
    const [isTeamCodesModalOpen, setIsTeamCodesModalOpen] = useState(false);
    const [isExitConfirmModalOpen, setIsExitConfirmModalOpen] = useState(false);
    const [isRonBotHelpModalOpen, setIsRonBotHelpModalOpen] = useState(false);
    const [showBulkDownload, setShowBulkDownload] = useState(false);
    const [isTeamManagementModalOpen, setIsTeamManagementModalOpen] = useState(false);

    const { user } = useAuth();

    const navigate = useNavigate();

    // Handlers
    const handleNotesToggle = () => setShowNotes(!showNotes);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (currentSlideData) {
            updateHostNotesForCurrentSlide(e.target.value);
        }
    };

    const onConfirmExit = () => {
        hostSyncManager?.sendPresenationClose();
        // Reset connection state when presentation is intentionally closed
        // Note: This will be called when the host exits the game
        setIsExitConfirmModalOpen(false);
        navigate('/dashboard');
    };

    // FIXED: Safely handle null currentSlideData AND null/undefined hostNotes
    const currentNotes = (currentSlideData && state.hostNotes)
        ? (state.hostNotes[String(currentSlideData.id)] || '')
        : '';

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-3 md:p-4">
                {/* Action Buttons */}
                <ActionButtons
                    onOpenJoinInfo={() => setIsJoinInfoOpen(true)}
                    onOpenTeamCodes={() => setIsTeamCodesModalOpen(true)}
                    onToggleNotes={handleNotesToggle}
                    onOpenRonBotHelp={() => setIsRonBotHelpModalOpen(true)}
                    onExitGame={() => setIsExitConfirmModalOpen(true)}
                    onOpenBulkDownload={() => setShowBulkDownload(true)}
                    onOpenTeamManagement={() => setIsTeamManagementModalOpen(true)}
                    showNotes={showNotes}
                    canModifyTeams={canModifyTeams}
                    teamCount={state.teams.length}
                />

                {/* Notes Section */}
                <NotesSection
                    showNotes={showNotes}
                    currentSlideData={currentSlideData}
                    currentNotes={currentNotes}
                    onNotesChange={handleNotesChange}
                />
            </div>

            {/* Modals */}
            <AlertModal/>

            <JoinInfoModal
                isOpen={isJoinInfoOpen}
                onClose={() => setIsJoinInfoOpen(false)}
                sessionId={state.currentSessionId}
                joinInfo={joinInfo}
                setJoinInfo={setJoinInfo}
            />

            <TeamCodesModal
                isOpen={isTeamCodesModalOpen}
                onClose={() => setIsTeamCodesModalOpen(false)}
                teams={state.teams}
            />

            <ExitModal
                isOpen={isExitConfirmModalOpen}
                onClose={() => setIsExitConfirmModalOpen(false)}
                onConfirmExit={onConfirmExit}
            />

            <RonBotHelpModal
                isOpen={isRonBotHelpModalOpen}
                onClose={() => setIsRonBotHelpModalOpen(false)}
            />

            <RonBotHelpModal
                isOpen={isRonBotHelpModalOpen}
                onClose={() => setIsRonBotHelpModalOpen(false)}
            />

            <TeamManagementModal
                isOpen={isTeamManagementModalOpen}
                onClose={() => setIsTeamManagementModalOpen(false)}
            />

            {showBulkDownload && state.gameStructure && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <BulkMediaDownload
                        slides={state.gameStructure.slides}
                        userType={getUserType(user)}
                        gameVersion={gameVersion}
                        onClose={() => setShowBulkDownload(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default GameControls;
