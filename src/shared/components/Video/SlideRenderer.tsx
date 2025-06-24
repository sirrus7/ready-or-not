// src/shared/components/Video/SlideRenderer.tsx
// ONLY CHANGE: Updated isVideoSlide logic to handle 'kpi_reset' slides as videos

import React, {useState, useEffect} from 'react';
import {Slide} from '@shared/types/game';
import {AlertCircle, ListChecks, RefreshCw, Film} from 'lucide-react';
import {LeaderboardChartDisplay} from '@shared/components/UI/Leaderboard';
import {isVideo, useHostVideo, usePresentationVideo} from '@shared/utils/video';
import HostVideoControls from '@shared/components/Video/HostVideoControls';
import {useSignedMediaUrl} from '@shared/hooks/useSignedMediaUrl';
import DoubleDownDiceDisplay from '@shared/components/DoubleDownDice/DoubleDownDiceDisplay';

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
            // Map slide ID to investment option (A-J)
            const investmentMapping: Record<number, { optionId: string; name: string }> = {
                185: {optionId: 'A', name: 'Production Efficiency'},
                186: {optionId: 'B', name: 'Expanded 2nd Shift'},
                187: {optionId: 'C', name: 'Supply Chain Optimization'},
                188: {optionId: 'D', name: 'Employee Development'},
                189: {optionId: 'E', name: 'Maximize Boutique Retail'},
                190: {optionId: 'F', name: 'Big Box Expansion'},
                191: {optionId: 'G', name: 'Enterprise Resource Planning'},
                192: {optionId: 'H', name: 'IT & Cyber Security'},
                193: {optionId: 'I', name: 'Product Line Expansion'},
                194: {optionId: 'J', name: 'Automation & Co-bots'}
            };

            const investment = investmentMapping[slide.id];

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
                        investmentId={investment.optionId}
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
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">{slide.main_text || slide.title}</h2>
                        <p className="text-md sm:text-lg text-gray-300 mb-4">{slide.sub_text || "Refer to your team device."}</p>
                    </div>
                </div>
            );
    }
};

const MediaLoadingIndicator: React.FC = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400 mb-3"></div>
        <p className="text-white text-sm">Loading Media...</p>
    </div>
);

const SlideRenderer: React.FC<SlideRendererProps> = ({slide, sessionId, isHost, onVideoEnd}) => {
    const [videoError, setVideoError] = useState(false);

    // Use the new hook to get the signed URL for the current slide's media
    const {url: sourceUrl, isLoading: isUrlLoading, error: urlError} = useSignedMediaUrl(slide?.source_path);

    const isVideoSlide = isVideo(slide?.source_path);

    const hostVideo = isHost ? useHostVideo({sessionId, sourceUrl, isEnabled: isVideoSlide}) : null;
    const presentationVideo = !isHost ? usePresentationVideo({
        sessionId,
        sourceUrl,
        isEnabled: isVideoSlide
    }) : null;

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
                    <Film size={48} className="text-gray-600 mb-4"/>
                    <p className="text-xl text-gray-400">Waiting for Host</p>
                </div>
            );
        }

        if (urlError) {
            return (
                <div
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-sm p-8">
                    <AlertCircle size={48} className="text-red-400 mb-4"/>
                    <h3 className="text-xl font-semibold text-red-300 mb-2">Media Load Error</h3>
                    <p className="text-sm text-red-200 mb-4">{urlError}</p>
                    <button onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        <RefreshCw size={16}/> Reload Page
                    </button>
                </div>
            );
        }

        if (isVideoSlide) {
            return null;
        }

        // Special handling for leaderboard charts (no source_path needed)
        if (slide.type === 'leaderboard_chart') {
            return <SlideContent slide={slide} sourceUrl="" className="animate-fade-in" sessionId={sessionId}/>;
        }

        // For other non-video content, render it if the URL is ready
        if (sourceUrl) {
            return <SlideContent slide={slide} sourceUrl={sourceUrl} className="animate-fade-in" sessionId={sessionId}/>;
        }

        return null;
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-black animate-fade-in">
            {/* Localized loading indicator for the media element */}
            {isUrlLoading && <MediaLoadingIndicator/>}

            {/* Stable Video Player - always in the DOM, gets its src updated */}
            <video
                key="stable-video-player"
                // preload="auto"
                // crossOrigin="anonymous"
                {...videoProps}
                className={`transition-opacity duration-300 w-full h-full object-contain ${isVideoSlide && sourceUrl ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Overlay for Non-Video Content */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center ${
                    (!isVideoSlide || slide?.type === 'leaderboard_chart') && renderContent() ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                {renderContent()}
            </div>

            {/* Host Controls - only show on host for video slides with a valid URL */}
            {isHost && hostVideo && isVideoSlide && sourceUrl && (
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
