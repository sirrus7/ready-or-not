// src/components/Display/SlideRenderer.tsx
import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Slide } from '../../types';
import {Tv2, AlertCircle, ListChecks } from 'lucide-react';
import LeaderboardChartDisplay from './LeaderboardChartDisplay';

interface SlideRendererProps {
    slide: Slide | null;
    isPlayingTarget: boolean;
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
                                                         slide,
                                                         isPlayingTarget,
                                                     }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const initialSyncDoneRef = useRef(false);
    const pendingSyncTimeRef = useRef<number | undefined>(undefined); // Track pending sync time
    const autoResumeTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track auto-resume timeout
    const { state } = useAppContext();

    // Reset sync state when slide changes
    useEffect(() => {
        initialSyncDoneRef.current = false;
        pendingSyncTimeRef.current = undefined;

        // Clear any pending auto-resume when slide changes
        if (autoResumeTimeoutRef.current) {
            clearTimeout(autoResumeTimeoutRef.current);
            autoResumeTimeoutRef.current = null;
        }
    }, [slide?.id]);

    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Tv2 size={48} className="mb-4 text-blue-400 opacity-50"/>
                <p className="text-xl">Display is Ready</p>
                <p className="text-sm text-gray-400">Waiting for facilitator to start content...</p>
            </div>
        );
    }

    const isVideoSourceValid = (url?: string): boolean => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes(".mp4") || lowerUrl.includes(".webm") || lowerUrl.includes(".ogg");
    };

    const renderContent = () => {
        if (!slide) return <div className="text-xl text-gray-400 p-4 text-center">Waiting for slide data...</div>;

        switch (slide.type) {
            case 'image':
                if (!slide.source_url) return <div className="text-red-500 p-4 text-center">Image source missing for slide ID: {slide.id}.</div>;
                return (
                    <img
                        src={slide.source_url}
                        alt={slide.title || 'Slide Image'}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                );
            case 'video':
            case 'interactive_invest':
                const hasVideoSrc = isVideoSourceValid(slide.source_url);
                if (hasVideoSrc && slide.source_url) {
                    return (
                        <video
                            ref={videoRef}
                            key={slide.id + "_" + slide.source_url}
                            src={slide.source_url}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg outline-none"
                            playsInline
                        >
                            Your browser does not support the video tag.
                        </video>
                    );
                } else if (slide.type === 'interactive_invest') {
                    return (
                        <div
                            className="text-center max-w-2xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                            <ListChecks size={32} className="text-blue-400 mx-auto mb-4 animate-pulse"/>
                            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">{slide.main_text || slide.title || "Investment Decisions"}</h2>
                            <p className="text-md sm:text-lg text-gray-300 mb-4">{slide.sub_text || "Refer to your team device to make investment choices."}</p>
                            {slide.timer_duration_seconds && !slide.source_url && (
                                <div
                                    className="mt-5 text-xl sm:text-2xl font-mono text-yellow-300 bg-black/40 px-4 py-2 rounded-lg inline-block shadow-md">
                                    TIME: {`${Math.floor(slide.timer_duration_seconds / 60)}:${(slide.timer_duration_seconds % 60).toString().padStart(2, '0')}`}
                                </div>
                            )}
                        </div>
                    );
                }
                console.error(`[SlideRenderer] Video source missing or invalid for slide ID: ${slide.id}, type: '${slide.type}', URL: '${slide.source_url}'`);
                return <div className="text-red-500 p-4 text-center">Video source missing or invalid for slide ID: {slide.id}, type '{slide.type}'.</div>;

            case 'content_page':
                return (
                    <div
                        className="text-center max-w-3xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-10 rounded-xl shadow-2xl">
                        {slide.main_text &&
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-shadow-lg break-words">{slide.main_text}</h1>}
                        {slide.sub_text &&
                            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-6 sm:mb-8 text-shadow break-words">{slide.sub_text}</p>}
                        {slide.bullet_points && slide.bullet_points.length > 0 && (
                            <ul className="list-disc list-inside text-left space-y-2 text-md sm:text-lg md:text-xl text-gray-100 max-w-xl mx-auto">
                                {slide.bullet_points.map((point, index) => (
                                    <li key={index} className="text-shadow-sm">{point}</li>))}
                            </ul>
                        )}
                    </div>
                );
            case 'interactive_choice':
            case 'interactive_double_down_prompt':
            case 'interactive_double_down_select':
                return (
                    <div
                        className="text-center max-w-2xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                        <ListChecks size={32} className="text-blue-400 mx-auto mb-4 animate-pulse"/>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">{slide.main_text || slide.title || "Team Decision Time"}</h2>
                        <p className="text-md sm:text-lg text-gray-300 mb-4">{slide.sub_text || "Please refer to your devices to make your selections."}</p>
                        {slide.timer_duration_seconds && (
                            <div
                                className="mt-5 text-xl sm:text-2xl font-mono text-yellow-300 bg-black/40 px-4 py-2 rounded-lg inline-block shadow-md">
                                TIME: {`${Math.floor(slide.timer_duration_seconds / 60)}:${(slide.timer_duration_seconds % 60).toString().padStart(2, '0')}`}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-4"> (Timer is active on individual team devices)</p>
                    </div>
                );
            case 'consequence_reveal':
            case 'payoff_reveal':
                const hasConsequenceVideo = isVideoSourceValid(slide.source_url);
                return (
                    <div
                        className="text-center max-w-4xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-2xl">
                        {slide.source_url && !hasConsequenceVideo && slide.source_url.match(/\.(jpeg|jpg|gif|png)$/i) != null &&
                            <img src={slide.source_url} alt={slide.title || 'Reveal Image'}
                                 className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4 mx-auto"/>
                        }
                        {hasConsequenceVideo && slide.source_url &&
                            <video
                                ref={videoRef}
                                key={slide.id + "_" + slide.source_url}
                                src={slide.source_url}
                                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4 mx-auto outline-none"
                                playsInline
                                loop={slide.title?.toLowerCase().includes('payoff')}
                                autoPlay={isPlayingTarget}
                            />
                        }
                        {slide.main_text &&
                            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-shadow-md break-words">{slide.main_text || slide.title}</h2>}
                        {slide.sub_text &&
                            <p className="text-lg text-gray-200 text-shadow-sm break-words">{slide.sub_text}</p>}
                        {slide.details && slide.details.length > 0 && (
                            <div
                                className="mt-4 text-left text-md text-gray-100 space-y-1 bg-slate-700/50 p-4 rounded-md max-w-md mx-auto">
                                {slide.details.map((detail, index) => <p key={index}>{detail}</p>)}
                            </div>
                        )}
                        {!slide.source_url && !slide.main_text && <p className="text-xl p-8">Details for {slide.title || 'this event'} will be shown based on team choices or game events.</p>}
                    </div>
                );
            case 'kpi_summary_instructional':
            case 'game_end_summary':
                if (slide.source_url && slide.source_url.match(/\.(jpeg|jpg|gif|png|svg)$/i) != null) {
                    return <img src={slide.source_url} alt={slide.title || 'Summary Screen'}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"/>;
                }
                return (
                    <div
                        className="text-center max-w-3xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-10 rounded-xl shadow-2xl">
                        {slide.main_text &&
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-shadow-lg break-words">{slide.main_text || slide.title || "Summary"}</h1>}
                        {slide.sub_text &&
                            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 text-shadow break-words">{slide.sub_text}</p>}
                        {!slide.source_url && !slide.main_text && <p className="text-xl">Loading summary information...</p>}
                    </div>
                );
            case 'leaderboard_chart':
                if (!slide.interactive_data_key || !state.currentPhaseNode?.round_number) {
                    return <div className="p-8 text-center text-xl text-red-500">Leaderboard configuration error for slide ID: {slide.id}.</div>;
                }
                return (
                    <LeaderboardChartDisplay
                        dataKey={slide.interactive_data_key}
                        currentRoundForDisplay={state.currentPhaseNode.round_number as 1 | 2 | 3}
                    />
                );
            default:
                console.warn("[SlideRenderer] Fallback: Unsupported slide type encountered:", (slide as any).type, slide);
                return (
                    <div className="text-center p-6 bg-red-800/50 rounded-lg">
                        <AlertCircle size={32} className="mx-auto mb-2 text-red-300"/>
                        <p className="text-lg text-red-200">Unsupported slide type: {(slide as any).type}</p>
                        <p className="text-sm text-red-300 mt-1">Content: {slide.main_text || slide.title}</p>
                    </div>
                );
        }
    };

    return (
        <div
            className={`h-full w-full flex flex-col items-center justify-center text-white p-4 md:p-6 overflow-hidden ${slide?.background_css || 'bg-gray-900'}`}>
            {slide && slide.id !== null && slide.id !== undefined && (
                <div
                    className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-xs font-semibold z-20 shadow-lg">
                    SLIDE: {slide.id} {slide.title ? `(${slide.title})` : ''}
                </div>
            )}
            {renderContent()}
        </div>
    );
};

export default SlideRenderer;