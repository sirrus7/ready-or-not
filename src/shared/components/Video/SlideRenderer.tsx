// src/shared/components/Video/SlideRenderer.tsx
// FIXED VERSION - All syntax errors corrected, proper exports

import React, {useState, useEffect} from 'react';
import {Slide} from '@shared/types/game';
import {AlertCircle, ListChecks} from 'lucide-react';
import {LeaderboardChartDisplay} from '@shared/components/UI/Leaderboard';
import {isVideo, useHostVideo, usePresentationVideo} from '@shared/utils/video';
import HostVideoControls from '@shared/components/Video/HostVideoControls';
import {useSignedMediaUrl} from '@shared/hooks/useSignedMediaUrl';
import DoubleDownDiceDisplay from '@shared/components/DoubleDownDice/DoubleDownDiceDisplay';
import {getInvestmentBySlideId} from '@core/content/DoubleDownMapping';

interface SlideRendererProps {
    slide: Slide | null;
    sessionId?: string | null;
    isHost: boolean;
    onVideoEnd?: () => void;
}

const SlideContent: React.FC<{
    slide: Slide,
    sourceUrl: string,
    className?: string,
    sessionId?: string | null
}> = ({slide, sourceUrl, className, sessionId}) => {
    switch (slide.type) {
        case 'image':
            return (
                <div className={`w-full h-full flex items-center justify-center p-2 ${className}`}>
                    <img
                        src={sourceUrl}
                        alt={slide.title || 'Slide Image'}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );

        case 'leaderboard_chart':
            return (
                <div className={`w-full h-full ${className}`}>
                    <LeaderboardChartDisplay
                        slideId={slide.id}
                        currentRoundForDisplay={slide.round_number}
                    />
                </div>
            );

        case 'double_down_dice_roll': {
            // REFACTORED: Use centralized mapping instead of hardcoded object
            const investment = getInvestmentBySlideId(slide.id);

            if (!investment || !sessionId) {
                return (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <p className="text-white text-2xl">Investment data not found</p>
                    </div>
                );
            }

            return (
                <div className={`w-full h-full ${className}`}>
                    <DoubleDownDiceDisplay
                        sessionId={sessionId}
                        investmentId={investment.id}
                        investmentName={investment.name}
                        slideId={slide.id}
                    />
                </div>
            );
        }

        default:
            return (
                <div className={`w-full h-full flex items-center justify-center p-4 ${className}`}>
                    <div
                        className="text-center max-w-2xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                        <ListChecks size={32} className="text-blue-400 mx-auto mb-4 animate-pulse"/>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">
                            {slide.main_text || slide.title}
                        </h2>
                        <p className="text-md sm:text-lg text-gray-300 mb-4">
                            {slide.sub_text || "Refer to your team device."}
                        </p>
                    </div>
                </div>
            );
    }
};

const MediaLoadingIndicator: React.FC = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-400 mb-3"></div>
        <p className="text-white text-sm">Loading Media...</p>
    </div>
);

const SlideRenderer: React.FC<SlideRendererProps> = ({slide, sessionId, isHost, onVideoEnd}) => {
    const [videoError, setVideoError] = useState(false);

    // Use the hook to get the signed URL for the current slide's media
    const {url: sourceUrl, isLoading: isUrlLoading, error: urlError} = useSignedMediaUrl(slide?.source_path);

    const isVideoSlide = isVideo(slide?.source_path);

    // Host video controls (when this is the host interface)
    const hostVideo = isHost ? useHostVideo({
        sessionId,
        sourceUrl,
        isEnabled: isVideoSlide && !!sourceUrl
    }) : null;

    // Presentation video sync (when this is the presentation display)
    const presentationVideo = !isHost ? usePresentationVideo({
        sessionId,
        sourceUrl,
        isEnabled: isVideoSlide && !!sourceUrl
    }) : null;

    const activeVideo = hostVideo || presentationVideo;

    useEffect(() => {
        setVideoError(false);
    }, [slide?.id]);

    if (!slide) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <p className="text-white text-xl">No slide data</p>
            </div>
        );
    }

    if (urlError) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="text-center p-8">
                    <AlertCircle size={48} className="text-red-400 mx-auto mb-4"/>
                    <h2 className="text-2xl font-bold text-white mb-2">Media Error</h2>
                    <p className="text-gray-300">{urlError}</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (!sourceUrl && slide.type !== 'leaderboard_chart' && slide.type !== 'double_down_dice_roll') {
            return null;
        }

        return (
            <SlideContent
                slide={slide}
                sourceUrl={sourceUrl || ''}
                sessionId={sessionId}
                className="w-full h-full"
            />
        );
    };

    return (
        <div className="relative w-full h-full bg-black">
            {/* Loading indicator */}
            {isUrlLoading && <MediaLoadingIndicator/>}

            {/* Video element for video slides */}
            {isVideoSlide && sourceUrl && activeVideo && (
                <video
                    {...activeVideo.getVideoProps(onVideoEnd, () => setVideoError(true))}
                    className={`w-full h-full ${videoError ? 'opacity-0' : 'opacity-100'}`}
                />
            )}

            {/* Content overlay for non-video slides and special slides */}
            <div className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center ${
                (!isVideoSlide || slide?.type === 'leaderboard_chart') && renderContent() ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
                {renderContent()}
            </div>

            {/* Host video controls - only show on host for video slides with a valid URL */}
            {isHost && hostVideo && isVideoSlide && sourceUrl && (
                <div className="absolute inset-0 z-20 pointer-events-none">
                    <div className="relative w-full h-full pointer-events-auto">
                        <HostVideoControls
                            videoRef={hostVideo.videoRef}
                            onPlay={hostVideo.play}
                            onPause={hostVideo.pause}
                            onSeek={hostVideo.seek}
                            onVolumeChange={hostVideo.setVolume}
                            onMuteToggle={hostVideo.toggleMute}
                            isConnectedToPresentation={hostVideo.isConnectedToPresentation}
                            presentationMuted={hostVideo.presentationMuted}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SlideRenderer;
