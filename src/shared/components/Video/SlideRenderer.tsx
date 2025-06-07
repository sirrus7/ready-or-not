// src/shared/components/Video/SlideRenderer.tsx - FINAL: Corrected host/presentation logic
import React, {useState, useEffect} from 'react';
import {Slide} from '@shared/types/game';
import {AlertCircle, ListChecks, RefreshCw} from 'lucide-react';
import LeaderboardChartDisplay from '@shared/components/UI/LeaderboardChart';
import {isVideo, useHostVideo, usePresentationVideo} from '@shared/utils/video';
import HostVideoControls from '@shared/components/Video/HostVideoControls';

interface SlideRendererProps {
    slide: Slide | null;
    sessionId?: string | null;
    isHost: boolean;
    onVideoEnd?: () => void;
}

const SlideContent: React.FC<{ slide: Slide, className?: string }> = ({slide, className}) => {
    switch (slide.type) {
        case 'image':
            return (
                <div className={`w-full h-full flex items-center justify-center p-2 ${className}`}>
                    <img
                        src={slide.source_url}
                        alt={slide.title || 'Slide Image'}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        case 'leaderboard_chart':
            return (
                <div className={`w-full h-full ${className}`}>
                    <LeaderboardChartDisplay dataKey={slide.interactive_data_key!}
                                             currentRoundForDisplay={slide.round_number}/>
                </div>
            );
        default:
            return (
                <div className={`w-full h-full flex items-center justify-center p-4 ${className}`}>
                    <div
                        className="text-center max-w-2xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                        <ListChecks size={32} className="text-blue-400 mx-auto mb-4 animate-pulse"/>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">{slide.main_text || slide.title}</h2>
                        <p className="text-md sm:text-lg text-gray-300 mb-4">{slide.sub_text || "Refer to your team device."}</p>
                    </div>
                </div>
            );
    }
};

const SlideRenderer: React.FC<SlideRendererProps> = ({slide, sessionId, isHost, onVideoEnd}) => {
    const [videoError, setVideoError] = useState(false);

    const isVideoSlide = slide ? isVideo(slide.source_url) : false;

    const hostVideo = isHost ? useHostVideo({sessionId, sourceUrl: slide?.source_url, isEnabled: isVideoSlide}) : null;
    const presentationVideo = !isHost ? usePresentationVideo({
        sessionId,
        sourceUrl: slide?.source_url,
        isEnabled: isVideoSlide
    }) : null;

    // *** THE CORE FIX IS HERE ***
    // We now correctly select the props and ref from the appropriate hook based on `isHost`.
    const videoProps = isHost
        ? hostVideo?.getVideoProps(onVideoEnd, () => setVideoError(true))
        : presentationVideo?.getVideoProps(onVideoEnd, () => setVideoError(true));

    useEffect(() => {
        setVideoError(false);
    }, [slide?.id]);

    const renderContent = () => {
        if (!slide) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-white p-8">
                    <div
                        className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400 mb-4"></div>
                    <p className="text-xl">Loading Content</p>
                </div>
            );
        }

        if (videoError) {
            return (
                <div
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-sm p-8">
                    <AlertCircle size={48} className="text-red-400 mb-4"/>
                    <h3 className="text-xl font-semibold text-red-300 mb-2">Video Load Error</h3>
                    <button onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        <RefreshCw size={16}/> Reload Page
                    </button>
                </div>
            );
        }

        if (isVideo(slide.source_url)) {
            return null; // Video is handled by the base element, no overlay needed.
        }

        return <SlideContent slide={slide} className="animate-fade-in"/>;
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-black animate-fade-in">
            {/* Stable Video Player - always in the DOM */}
            <video
                key="stable-video-player"
                {...videoProps}
                className={`transition-opacity duration-300 w-full h-full object-contain ${isVideoSlide ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Overlay for Non-Video Content */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center ${!isVideoSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {renderContent()}
            </div>

            {/* Host Controls - only show on host for video slides */}
            {isHost && hostVideo && isVideoSlide && (
                <div className="absolute inset-0 z-20 pointer-events-none">
                    <div className="relative w-full h-full pointer-events-auto">
                        <HostVideoControls
                            videoRef={hostVideo.videoRef}
                            onPlay={hostVideo.play}
                            onPause={hostVideo.pause}
                            onSeek={hostVideo.seek}
                            isConnectedToPresentation={hostVideo.isConnectedToPresentation}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SlideRenderer;
