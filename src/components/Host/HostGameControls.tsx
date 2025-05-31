// src/components/Host/HostGameControls.tsx - Refactored main component
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
    PresentationDisplayButton,
    ActionButtonsRow,
    NotesSection,
    HostAlertModal,
    JoinInfoModal,
    TeamCodesModal,
    ExitGameModal
} from './Controls';

const HostGameControls: React.FC = () => {
    const { state, currentSlideData, updateHostNotesForCurrentSlide } = useAppContext();

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
                    <PresentationDisplayButton />
                </div>

                {/* Action Buttons */}
                <ActionButtonsRow
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
            <HostAlertModal />

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

            <ExitGameModal
                isOpen={isExitConfirmModalOpen}
                onClose={() => setIsExitConfirmModalOpen(false)}
            />
        </div>
    );
};

export default HostGameControls;
