// src/shared/components/Video/SlideRenderer.tsx - Updated with auto-advance functionality
import React, {useState, useEffect} from 'react';
import {Slide} from '@shared/types/game';
import {Tv2, AlertCircle, ListChecks, RefreshCw} from 'lucide-react';
import LeaderboardChartDisplay from '@shared/components/UI/LeaderboardChart';
import {isVideo, useHostVideo, usePresentationVideo} from '@shared/utils/video';
import HostVideoControls from '@shared/components/Video/HostVideoControls';

interface SlideRendererProps {
    slide: Slide | null;
    sessionId?: string | null;
    isHost: boolean;
    onVideoEnd?: () => void; // New prop for video end callback
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
                                                         slide,
                                                         sessionId = null,
                                                         isHost,
                                                         onVideoEnd
                                                     }) => {
    const [videoError, setVideoError] = useState(false);
    const [isInFullscreen, setIsInFullscreen] = useState(false);

    // Use appropriate video hook based on role
    const hostVideo = isHost ? useHostVideo(sessionId) : null;
    const presentationVideo = !isHost ? usePresentationVideo(sessionId) : null;

    // Monitor fullscreen changes to adjust video sizing
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsInFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Reset error state when slide changes
    useEffect(() => {
        setVideoError(false);
    }, [slide?.id]);

    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Tv2 size={48} className="mb-4 text-blue-400 opacity-50"/>
                <p className="text-xl">Display is Ready</p>
                <p className="text-sm text-gray-400">Waiting for content...</p>
            </div>
        );
    }

    const renderVideoContent = (slide: Slide, hasVideoSrc: boolean) => {
        if (videoError) {
            return (
                <div
                    className="flex flex-col items-center justify-center h-full bg-red-900/20 backdrop-blur-sm rounded-lg border border-red-600/30 p-8">
                    <AlertCircle size={48} className="text-red-400 mb-4"/>
                    <h3 className="text-xl font-semibold text-red-300 mb-2">Video Load Error</h3>
                    <p className="text-red-200 text-center mb-4">
                        Unable to load video content for this slide.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw size={16}/>
                        Reload Page
                    </button>
                </div>
            );
        }

        if (!hasVideoSrc || !slide.source_url) {
            return (
                <div
                    className="text-center max-w-2xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                    <ListChecks size={32} className="text-blue-400 mx-auto mb-4 animate-pulse"/>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">
                        {slide.main_text || slide.title || "Interactive Content"}
                    </h2>
                    <p className="text-md sm:text-lg text-gray-300 mb-4">
                        {slide.sub_text || "Refer to your team device for interactions."}
                    </p>
                    {slide.timer_duration_seconds && (
                        <div
                            className="mt-5 text-xl sm:text-2xl font-mono text-yellow-300 bg-black/40 px-4 py-2 rounded-lg inline-block shadow-md">
                            TIME: {`${Math.floor(slide.timer_duration_seconds / 60)}:${(slide.timer_duration_seconds % 60).toString().padStart(2, '0')}`}
                        </div>
                    )}
                </div>
            );
        }

        // Get video props with auto-advance callback
        const videoProps = isHost ?
            hostVideo?.getVideoProps(onVideoEnd) :
            presentationVideo?.getVideoProps(onVideoEnd);

        if (!videoProps) {
            return (
                <div className="flex items-center justify-center h-full text-white">
                    <p>Loading video player...</p>
                </div>
            );
        }

        return (
            <div className="h-full w-full flex items-center justify-center relative">
                <video
                    key={`video_${slide.id}_${slide.source_url}`}
                    src={slide.source_url}
                    {...videoProps}
                    onError={() => setVideoError(true)}
                    onLoadStart={() => {
                        console.log('[SlideRenderer] Video load started for slide:', slide.id);
                    }}
                    onCanPlay={() => {
                        console.log('[SlideRenderer] Video can play for slide:', slide.id);
                    }}
                    style={{
                        ...videoProps.style,
                        // In fullscreen, fill the entire screen; otherwise maintain aspect ratio
                        objectFit: isInFullscreen ? 'cover' : 'contain',
                        // Ensure video takes full dimensions in fullscreen
                        width: isInFullscreen ? '100vw' : videoProps.style.maxWidth,
                        height: isInFullscreen ? '100vh' : videoProps.style.maxHeight
                    }}
                >
                    Your browser does not support the video tag.
                </video>

                {/* Host Video Controls Overlay */}
                {isHost && hostVideo && (
                    <HostVideoControls
                        videoRef={hostVideo.videoRef}
                        onPlay={hostVideo.play}
                        onPause={hostVideo.pause}
                        onSeek={hostVideo.seek}
                        isConnectedToPresentation={hostVideo.isConnectedToPresentation}
                    />
                )}

                {/* Connection status for development */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-4 right-4 bg-black/60 text-white text-xs p-2 rounded">
                        <div>Mode: {isHost ? 'Host' : 'Presentation'}</div>
                        <div>Connected: {isHost ?
                            (hostVideo?.isConnectedToPresentation ? 'Yes' : 'No') :
                            (presentationVideo?.isConnectedToHost ? 'Yes' : 'No')
                        }</div>
                        <div>Fullscreen: {isInFullscreen ? 'Yes' : 'No'}</div>
                        <div>Video Fit: {isInFullscreen ? 'Cover' : 'Contain'}</div>
                        <div>Auto-advance: {onVideoEnd ? 'Enabled' : 'Disabled'}</div>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (slide.type) {
            case 'image':
                if (!slide.source_url) {
                    return (
                        <div className="text-red-500 p-4 text-center">
                            Image source missing for slide ID: {slide.id}.
                        </div>
                    );
                }
                return (
                    <div className="h-full w-full flex items-center justify-center p-4">
                        <img
                            src={slide.source_url}
                            alt={slide.title || 'Slide Image'}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                    </div>
                );

            case 'leaderboard_chart':
                if (!slide.interactive_data_key) {
                    return (
                        <div className="p-8 text-center text-xl text-red-500">
                            Leaderboard configuration error for slide ID: {slide.id}.
                        </div>
                    );
                }
                return (
                    <LeaderboardChartDisplay
                        dataKey={slide.interactive_data_key}
                        currentRoundForDisplay={1}
                    />
                );

            default:
                // Handle all video types with auto-advance
                const hasVideoFile = isVideo(slide.source_url);
                return renderVideoContent(slide, hasVideoFile);
        }
    };

    return (
        <div
            className={`h-full w-full flex flex-col items-center justify-center text-white overflow-hidden ${slide?.background_css || 'bg-gray-900'}`}>
            {renderContent()}
        </div>
    );
};

export default SlideRenderer;
