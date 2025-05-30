// src/components/Display/DisplayView.tsx - Fixed with Enhanced Video System
import React from 'react';
import SlideRenderer from './SlideRenderer';
import { Slide } from '../../types';
import { Hourglass, Monitor, Video } from 'lucide-react';
import { isVideo } from "../../utils/videoUtils";

interface DisplayViewProps {
    slide: Slide | null;
    isPlayingTarget?: boolean; // Legacy - no longer used
    videoTimeTarget?: number; // Legacy - no longer used
    triggerSeekEvent?: boolean; // Legacy - no longer used
}

const DisplayView: React.FC<DisplayViewProps> = ({ slide }) => {
    // Get session ID from current URL or context
    const sessionId = window.location.pathname.includes('/classroom/')
        ? window.location.pathname.split('/classroom/')[1]
        : null;

    // Check if current slide has a video
    const isVideoSlide = isVideo(slide?.source_url);

    // Handle host video click - now properly integrated
    const handleHostVideoClick = (willPlay: boolean) => {
        console.log(`[DisplayView] Host video click - will play: ${willPlay}`);
        // The actual video control is now handled by useVideoSync hook
        // This is just for logging/feedback purposes
    };

    if (!slide) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                    <Hourglass size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Waiting for game content...</p>
                    <p className="text-sm text-gray-400 mt-2">(Host Preview)</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden relative">
            {/* Development debug info */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                    <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        <span>Host Preview Mode</span>
                        {isVideoSlide && (
                            <div className="ml-2 text-xs opacity-75 flex items-center gap-1">
                                <Video size={12} />
                                Click to control
                            </div>
                        )}
                    </div>
                    <div className="mt-1 text-xs opacity-75">
                        Slide: {slide.id} | Type: {slide.type}
                    </div>
                    {sessionId && (
                        <div className="text-xs opacity-75">
                            Session: {sessionId.substring(0, 8)}...
                        </div>
                    )}
                </div>
            )}

            {/* SlideRenderer with host mode - handles all video sync automatically */}
            <SlideRenderer
                slide={slide}
                sessionId={sessionId}
                videoMode="host"
                onHostVideoClick={handleHostVideoClick}
                allowHostAudio={true} // Host can have audio when presentation not connected
                enableNativeControls={false} // Use custom click handling
            />
        </div>
    );
};

export default DisplayView;
