// src/components/StudentDisplay/StudentDisplayView.tsx
import React from 'react';
import SlideRenderer from './SlideRenderer';
import {Slide} from '../../types';
import {Hourglass} from 'lucide-react';

interface StudentDisplayViewProps {
    slide: Slide | null;
    isPlayingTarget: boolean; // CHANGED: from isPlaying to isPlayingTarget
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
    isForTeacherPreview?: boolean;
    onPreviewVideoStateChange?: (playing: boolean, time: number, triggerSeek?: boolean) => void;
    onPreviewVideoDuration?: (duration: number) => void;
}

const StudentDisplayView: React.FC<StudentDisplayViewProps> = ({
                                                                   slide,
                                                                   isPlayingTarget, // CHANGED: from isPlaying
                                                                   videoTimeTarget,
                                                                   triggerSeekEvent,
                                                                   isForTeacherPreview = false,
                                                                   onPreviewVideoStateChange,
                                                                   onPreviewVideoDuration,
                                                               }) => {
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
                isPlayingTarget={isPlayingTarget} // CHANGED: from isPlaying
                videoTimeTarget={videoTimeTarget}
                triggerSeekEvent={triggerSeekEvent}
                isForTeacherPreview={isForTeacherPreview}
                onPreviewVideoStateChange={onPreviewVideoStateChange}
                onPreviewVideoDuration={onPreviewVideoDuration}
            />
        </div>
    );
};

export default StudentDisplayView;