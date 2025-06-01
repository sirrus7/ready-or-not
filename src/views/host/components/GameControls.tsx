// src/views/host/components/GameControls.tsx
// This component orchestrates the various host controls.
import React, { useState } from 'react';
import { useGameContext } from '@app/providers/GameProvider';
import ActionButtons from './GameControls/ActionButtons';
import AlertModal from './GameControls/AlertModal';
import ExitModal from './GameControls/ExitModal';
import JoinInfoModal from './GameControls/JoinInfoModal';
import NotesSection from './GameControls/NotesSection';
import PresentationButton from './GameControls/PresentationButton';
import TeamCodesModal from './GameControls/TeamCodesModal';

const GameControls: React.FC = () => { // Renamed component from HostGameControls
    const { state, currentSlideData, updateHostNotesForCurrentSlide } = useGameContext();

    // Modal states
    const [showNotes, setShowNotes] = useState(false);
    const [isJoinCompanyModalOpen, setIsJoinCompanyModalOpen] = useState(false);
    const [isTeamCodesModalOpen, setIsTeamCodesModalOpen] = useState(false);
    const [isExitConfirmModalOpen, setIsExitConfirmModalOpen] = useState(false);

    // Handlers
    const handleNotesToggle = () => setShowNotes(!showNotes);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (currentSlideData) {
            updateHostNotesForCurrentSlide(e.target.value);
        }
    };

    const currentNotes = currentSlideData ? state.hostNotes[String(currentSlideData.id)] || '' : '';

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-3 md:p-4">
                {/* Presentation Display Section */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                    <PresentationButton /> {/* Using the renamed component */}
                </div>

                {/* Action Buttons */}
                <ActionButtons
                    onOpenJoinInfo={() => setIsJoinCompanyModalOpen(true)}
                    onOpenTeamCodes={() => setIsTeamCodesModalOpen(true)}
                    onToggleNotes={handleNotesToggle}
                    onExitGame={() => setIsExitConfirmModalOpen(true)}
                    showNotes={showNotes}
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
            <AlertModal
                isOpen={!!state.currentHostAlert}
                onClose={() => state.setCurrentHostAlertState(null)}
                title={state.currentHostAlert?.title || "Game Host Alert!"}
                message={state.currentHostAlert?.message || ""} // Ensure message prop is passed if AlertModal expects it
            />

            <JoinInfoModal
                isOpen={isJoinCompanyModalOpen}
                onClose={() => setIsJoinCompanyModalOpen(false)}
                sessionId={state.currentSessionId}
            />

            <TeamCodesModal
                isOpen={isTeamCodesModalOpen}
                onClose={() => setIsTeamCodesModalOpen(false)}
                teams={state.teams}
            />

            <ExitModal // Using the renamed component
                isOpen={isExitConfirmModalOpen}
                onClose={() => setIsExitConfirmModalOpen(false)}
            />
        </div>
    );
};

export default GameControls; // Renamed export