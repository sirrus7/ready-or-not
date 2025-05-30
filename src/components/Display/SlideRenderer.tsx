// src/components/Display/SlideRenderer.tsx - Refactored with Simplified Video System
import React, { useState } from 'react';
import { Slide } from '../../types';
import { Tv2, AlertCircle, ListChecks, Play, Pause, RefreshCw } from 'lucide-react';
import LeaderboardChartDisplay from './LeaderboardChartDisplay';
import { isVideo, useVideoSync } from "../../utils/videoUtils";

interface SlideRendererProps {
    slide: Slide | null;
    sessionId?: string | null;
    // Video sync mode
    videoMode?: 'master' | 'host' | 'independent';
    // Host mode props
    onHostVideoClick?: (willPlay: boolean) => void;
    // Display options
    allowHostAudio?: boolean;
    enableNativeControls?: boolean;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
                                                         slide,
                                                         sessionId = null,
                                                         videoMode = 'independent',
                                                         onHostVideoClick,
                                                         allowHostAudio = false,
                                                         enableNativeControls = false
                                                     }) => {
    const [videoError, setVideoError] = useState(false);
    const [showPlayIcon, setShowPlayIcon] = useState(false);

    // Unified video management
    const { videoState, getVideoProps } = useVideoSync({
        sessionId,
        mode: videoMode,
        allowHostAudio,
        enableNativeControls,
        onHostVideoClick: (willPlay) => {
            // Show visual feedback
            setShowPlayIcon(true);
            setTimeout(() => setShowPlayIcon(false), 1000);

            // Call parent handler
            onHostVideoClick?.(willPlay);
        }
    });

    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Tv2 size={48} className="mb-4 text-blue-400 opacity-50"/>
                <p className="text-xl">Display is Ready</p>
                <p className="text-sm text-gray-400">Waiting for facilitator to start content...</p>
            </div>
        );
    }

    const renderVideoContent = (slide: Slide, hasVideoSrc: boolean) => {
        if (videoError) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-red-900/20 backdrop-blur-sm rounded-lg border border-red-600/30 p-8">
                    <AlertCircle size={48} className="text-red-400 mb-4" />
                    <h3 className="text-xl font-semibold text-red-300 mb-2">Video Load Error</h3>
                    <p className="text-red-200 text-center mb-4">
                        Unable to load video content for this slide.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} />
                        Reload Page
                    </button>
                </div>
            );
        }

        if (!hasVideoSrc || !slide.source_url) {
            return (
                <div className="text-center max-w-2xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                    <ListChecks size={32} className="text-blue-400 mx-auto mb-4 animate-pulse"/>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">{slide.main_text || slide.title || "Interactive Content"}</h2>
                    <p className="text-md sm:text-lg text-gray-300 mb-4">{slide.sub_text || "Refer to your team device for interactions."}</p>
                    {slide.timer_duration_seconds && (
                        <div className="mt-5 text-xl sm:text-2xl font-mono text-yellow-300 bg-black/40 px-4 py-2 rounded-lg inline-block shadow-md">
                            TIME: {`${Math.floor(slide.timer_duration_seconds / 60)}:${(slide.timer_duration_seconds % 60).toString().padStart(2, '0')}`}
                        </div>
                    )}
                </div>
            );
        }

        // Video element with unified props
        const videoElement = (
            <video
                key={`video_${slide.id}_${slide.source_url}`} // Stable key for re-renders
                src={slide.source_url}
                {...getVideoProps()}
                onError={() => setVideoError(true)}
            >
                Your browser does not support the video tag.
            </video>
        );

        // Add click overlay for host mode
        if (videoMode === 'host' && !enableNativeControls && onHostVideoClick) {
            return (
                <div className="relative">
                    {videoElement}
                    {showPlayIcon && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/60 rounded-full p-4 backdrop-blur-sm animate-in fade-in duration-200">
                                {videoState.playing ? (
                                    <Pause size={48} className="text-white" />
                                ) : (
                                    <Play size={48} className="text-white ml-1" />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return videoElement;
    };

    const renderContent = () => {
        switch (slide.type) {
            case 'image':
                if (!slide.source_url) {
                    return <div className="text-red-500 p-4 text-center">Image source missing for slide ID: {slide.id}.</div>;
                }
                return (
                    <img
                        src={slide.source_url}
                        alt={slide.title || 'Slide Image'}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                );

            case 'leaderboard_chart':
                if (!slide.interactive_data_key) {
                    return <div className="p-8 text-center text-xl text-red-500">Leaderboard configuration error for slide ID: {slide.id}.</div>;
                }
                return (
                    <LeaderboardChartDisplay
                        dataKey={slide.interactive_data_key}
                        currentRoundForDisplay={1}
                    />
                );

            default:
                // Handle all video types (video, interactive_*, etc.)
                const hasVideoFile = isVideo(slide.source_url);
                return renderVideoContent(slide, hasVideoFile);
        }
    };

    return (
        <div className={`h-full w-full flex flex-col items-center justify-center text-white p-4 md:p-6 overflow-hidden ${slide?.background_css || 'bg-gray-900'}`}>
            {renderContent()}
        </div>
    );
};

export default SlideRenderer;