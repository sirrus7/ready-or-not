// src/components/Host/Controls/NotesSection.tsx
import React from 'react';
import { Slide } from '@shared/types/common';

interface NotesSectionProps {
    showNotes: boolean;
    currentSlideData: Slide | null;
    currentNotes: string;
    onNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({
                                                       showNotes,
                                                       currentSlideData,
                                                       currentNotes,
                                                       onNotesChange
                                                   }) => {
    if (!showNotes) return null;

    return (
        <div className="mt-3 border-t border-gray-200 pt-3">
            <label htmlFor="teacherNotes" className="block text-xs font-medium text-gray-500 mb-1">
                Notes for: <span className="font-semibold text-gray-700">
                    {currentSlideData?.title || `Slide ${currentSlideData?.id || 'N/A'}`}
                </span>
            </label>
            <textarea
                id="teacherNotes"
                className="w-full text-sm bg-gray-50 text-gray-800 p-2.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow focus:shadow-md"
                rows={3}
                placeholder="Type your private notes for this slide..."
                value={currentNotes}
                onChange={onNotesChange}
                disabled={!currentSlideData}
            />
        </div>
    );
};

export default NotesSection;
