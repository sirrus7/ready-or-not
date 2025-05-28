// src/components/TeacherHost/TeacherGameControls.tsx - Simplified
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Users, QrCode, Trophy, LogOut } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { TeamJoinModal, TeamCodesModal, ConfirmModal } from '../UI/CommonModals';
import { openStudentDisplay } from '../../utils/videoUtils';

const TeacherGameControls: React.FC = () => {
    const { state, previousSlide, nextSlide, updateTeacherNotesForCurrentSlide, currentSlideData } = useAppContext();

    // Simplified state management
    const [showNotes, setShowNotes] = useState(false);
    const [activeModal, setActiveModal] = useState<'join' | 'codes' | 'exit' | null>(null);
    const [studentWindow, setStudentWindow] = useState<Window | null>(null);

    const handleOpenStudentDisplay = () => {
        if (state.currentSessionId) {
            const window = openStudentDisplay(state.currentSessionId);
            if (window) setStudentWindow(window);
        }
    };

    const currentNotes = currentSlideData ? state.teacherNotes[String(currentSlideData.id)] || '' : '';

    return (
        <div className="bg-white p-4 rounded-lg shadow border">
            {/* Navigation */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                    <button onClick={previousSlide} className="p-2 rounded hover:bg-gray-100">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={nextSlide} className="p-2 rounded hover:bg-gray-100">
                        <ChevronRight size={24} />
                    </button>
                </div>

                <button
                    onClick={handleOpenStudentDisplay}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    <ExternalLink size={18} />
                    Student Display
                </button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 border-t pt-3">
                <button onClick={() => setActiveModal('join')} className="btn-secondary">
                    <QrCode size={16} /> Join Info
                </button>
                <button onClick={() => setActiveModal('codes')} className="btn-secondary">
                    <Users size={16} /> Team Codes
                </button>
                <button onClick={() => setShowNotes(!showNotes)}
                        className={`btn-secondary ${showNotes ? 'bg-blue-50' : ''}`}>
                    <FileText size={16} /> Notes
                </button>
                <button onClick={() => setActiveModal('exit')} className="btn-danger">
                    <LogOut size={16} /> Exit
                </button>
            </div>

            {/* Notes Section */}
            {showNotes && (
                <div className="mt-3 border-t pt-3">
                    <textarea
                        value={currentNotes}
                        onChange={(e) => updateTeacherNotesForCurrentSlide(e.target.value)}
                        placeholder="Notes for this slide..."
                        className="w-full p-2 border rounded resize-none"
                        rows={3}
                    />
                </div>
            )}

            {/* Modals */}
            <TeamJoinModal
                isOpen={activeModal === 'join'}
                onClose={() => setActiveModal(null)}
                joinUrl={`${window.location.origin}/student-game/${state.currentSessionId}`}
            />

            <TeamCodesModal
                isOpen={activeModal === 'codes'}
                onClose={() => setActiveModal(null)}
                teams={state.teams}
            />

            <ConfirmModal
                isOpen={activeModal === 'exit'}
                onClose={() => setActiveModal(null)}
                onConfirm={() => window.location.href = '/dashboard'}
                title="Exit Game"
                message="Are you sure you want to exit? Your progress is saved."
                variant="warning"
            />
        </div>
    );
};