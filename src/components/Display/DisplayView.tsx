// src/components/Display/DisplayView.tsx - Simplified Preview Display
import React from 'react';
import SlideRenderer from './SlideRenderer';
import {Slide} from '../../types';
import {Hourglass, Monitor, Info} from 'lucide-react';

interface DisplayViewProps {
    slide: Slide | null;
    isPlayingTarget?: boolean;
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
}

const DisplayView: React.FC<DisplayViewProps> = ({
                                                     slide,
                                                     isPlayingTarget = false,
                                                     videoTimeTarget = 0,
                                                     triggerSeekEvent = false,
                                                 }) => {
    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                <p className="text-xl">Waiting for game content...</p>
                <p className="text-sm text-gray-400 mt-2">(Teacher Preview)</p>
            </div>
        );
    }

    // Check if this is a video slide
    const isVideoSlide = slide && (
        slide.type === 'video' ||
        (slide.type === 'interactive_invest' && slide.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
        ((slide.type === 'consequence_reveal' || slide.type === 'payoff_reveal') &&
            slide.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

    return (
        <div className="h-full w-full overflow-hidden relative">
            <SlideRenderer
                slide={slide}
                isPlayingTarget={isPlayingTarget}
                videoTimeTarget={videoTimeTarget}
                triggerSeekEvent={triggerSeekEvent}
            />

            {/* Preview Overlay for Video Slides */}
            {isVideoSlide && (
                <div className="absolute top-4 right-4 bg-blue-900/90 backdrop-blur-sm rounded-lg p-3 text-white text-sm max-w-xs">
                    <div className="flex items-center mb-2">
                        <Monitor size={16} className="mr-2 text-blue-300"/>
                        <span className="font-semibold">Video Preview</span>
                    </div>
                    <div className="text-blue-200 text-xs space-y-1">
                        <p>🎬 This is a static preview</p>
                        <p>🔄 Launch Presentation Display for synchronized video playback</p>
                        <p>🎵 Audio will play from presentation screen</p>
                    </div>
                </div>
            )}

            {/* Preview Watermark */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                <div className="flex items-center">
                    <Info size={12} className="mr-1 text-blue-400"/>
                    <span>Teacher Preview</span>
                </div>
            </div>
        </div>
    );
};

export default DisplayView;