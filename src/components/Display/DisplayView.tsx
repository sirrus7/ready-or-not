// src/components/Display/DisplayView.tsx
import React from 'react';
import SlideRenderer from './SlideRenderer';
import {Slide} from '../../types';
import {Hourglass} from 'lucide-react';

interface DisplayViewProps {
    slide: Slide | null;
    isPlayingTarget: boolean;
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
}

const DisplayView: React.FC<DisplayViewProps> = ({
                                                                   slide,
                                                                   isPlayingTarget,
                                                                   videoTimeTarget,
                                                                   triggerSeekEvent,
                                                               }) => {
    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                <p className="text-xl">Waiting for game content...</p>
                {<p className="text-xs text-gray-400 mt-2">(This is the Teacher's Preview)</p>}
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden">
            <SlideRenderer
                slide={slide}
                isPlayingTarget={isPlayingTarget}
                videoTimeTarget={videoTimeTarget}
                triggerSeekEvent={triggerSeekEvent}
            />
        </div>
    );
};

export default DisplayView;