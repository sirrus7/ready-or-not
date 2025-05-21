// src/components/StudentDisplay/StudentDisplayView.tsx
import React from 'react';
import SlideRenderer from './SlideRenderer'; // Assuming SlideRenderer is in the same folder
import {Slide} from '../../types';
import {Hourglass} from 'lucide-react';

interface StudentDisplayViewProps {
    slide: Slide | null;
    isPlaying: boolean;
    isForTeacherPreview?: boolean; // New prop
}

const StudentDisplayView: React.FC<StudentDisplayViewProps> = ({slide, isPlaying, isForTeacherPreview = false}) => {
    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                <p className="text-xl">Waiting for game content...</p>
                {isForTeacherPreview && <p className="text-xs text-gray-400 mt-2">(This is the Teacher's Preview)</p>}
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden"> {/* Ensure full height and width */}
            <SlideRenderer
                slide={slide}
                isPlaying={isPlaying}
                isStudentView={!isForTeacherPreview} // If it's for teacher preview, it's NOT the actual student view
                isForTeacherPreview={isForTeacherPreview} // Pass this down
            />
        </div>
    );
};

export default StudentDisplayView;