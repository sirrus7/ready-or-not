// src/components/StudentDisplay/SlideRenderer.tsx
import React, {useEffect, useRef} from 'react';
import {Slide} from '../../types';
import {Tv2, AlertCircle, ListChecks} from 'lucide-react';

interface SlideRendererProps {
    slide: Slide | null;
    isPlayingTarget: boolean;
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
    isForTeacherPreview?: boolean;
    onPreviewVideoStateChange?: (playing: boolean, time: number, triggerSeek?: boolean) => void;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
                                                         slide,
                                                         isPlayingTarget,
                                                         videoTimeTarget,
                                                         triggerSeekEvent,
                                                         isForTeacherPreview = false,
                                                         onPreviewVideoStateChange
                                                     }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastBroadcastedTime = useRef<number | undefined>(undefined);

    useEffect(() => {
        const videoElement = videoRef.current;
        const context = isForTeacherPreview ? "TeacherPreview" : "StudentDisplay";

        if (videoElement && slide?.type === 'video') {
            if (!isForTeacherPreview) { // Student Display Logic
                console.log(`[${context}] STUDENT EFFECT: slideId=${slide?.id}, isPlayingTarget=${isPlayingTarget}, videoTimeTarget=${videoTimeTarget?.toFixed(2)}, triggerSeekEvent=${triggerSeekEvent}`);

                if (triggerSeekEvent && videoTimeTarget !== undefined) {
                    // Teacher initiated a seek. Global isPlayingTarget should be false.
                    // Student display must pause and seek.
                    console.log(`[${context}] STUDENT: PROCESSING SEEK TRIGGER. TargetTime: ${videoTimeTarget.toFixed(2)}.`);

                    if (!videoElement.paused) {
                        console.log(`[${context}] STUDENT: Pausing video due to seek trigger.`);
                        videoElement.pause();
                    }

                    // Only set currentTime if it's significantly different, to prevent no-op seeks
                    if (Math.abs(videoElement.currentTime - videoTimeTarget) > 0.1) {
                        console.log(`[${context}] STUDENT: Setting currentTime from ${videoElement.currentTime.toFixed(2)} to ${videoTimeTarget.toFixed(2)}.`);
                        videoElement.currentTime = videoTimeTarget;
                    } else {
                        console.log(`[${context}] STUDENT: currentTime ${videoElement.currentTime.toFixed(2)} already close to target ${videoTimeTarget.toFixed(2)}. No seek action taken for currentTime.`);
                    }
                    // Video remains paused after this block.
                    // The next useEffect run (when triggerSeekEvent becomes false) will handle play based on isPlayingTarget.

                    // It's crucial that isPlayingTarget is indeed false when triggerSeekEvent is true,
                    // as per the logic in useGameController.
                    if (isPlayingTarget) {
                        console.warn(`[${context}] STUDENT: isPlayingTarget is TRUE during seek trigger. This is unexpected. Video should remain paused.`);
                        if (!videoElement.paused) videoElement.pause(); // Extra safety pause
                    }

                } else { // triggerSeekEvent is false
                    // This is a regular play/pause command or the state after a seek has been processed
                    // and triggerSeekEvent has been reset to false.
                    if (isPlayingTarget && videoElement.paused) {
                        console.log(`[${context}] STUDENT: Regular PLAY command (triggerSeek=false). CurrentTime: ${videoElement.currentTime.toFixed(2)}`);
                        videoElement.play().catch(e => console.warn(`[${context}] Student display video play error:`, e));
                    } else if (!isPlayingTarget && !videoElement.paused) {
                        console.log(`[${context}] STUDENT: Regular PAUSE command (triggerSeek=false). CurrentTime: ${videoElement.currentTime.toFixed(2)}`);
                        videoElement.pause();
                    }
                }

            } else { // Teacher Preview Logic (remains the same as your last version)
                if (isPlayingTarget && videoElement.paused && !videoElement.seeking) {
                    videoElement.play().catch(e => console.warn(`[${context}] Teacher preview video play error:`, e));
                } else if (!isPlayingTarget && !videoElement.paused && !videoElement.seeking) {
                    videoElement.pause();
                }
                if (triggerSeekEvent && videoTimeTarget !== undefined && Math.abs(videoElement.currentTime - videoTimeTarget) > 0.5) {
                    videoElement.currentTime = videoTimeTarget;
                }
            }
        }
    }, [slide, isPlayingTarget, videoTimeTarget, triggerSeekEvent, isForTeacherPreview]);

    const handlePreviewPlay = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current) {
            onPreviewVideoStateChange(true, videoRef.current.currentTime, false);
        }
    };
    const handlePreviewPause = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current) {
            onPreviewVideoStateChange(false, videoRef.current.currentTime, false);
        }
    };

    const handlePreviewTimeUpdate = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current && !videoRef.current.seeking) {
            const currentTime = videoRef.current.currentTime;
            if (lastBroadcastedTime.current === undefined || Math.abs(currentTime - lastBroadcastedTime.current) >= 0.5) {
                onPreviewVideoStateChange(!videoRef.current.paused, currentTime, false);
                lastBroadcastedTime.current = currentTime;
            }
        }
    };

    const handlePreviewSeeked = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current) {
            console.log(`[TeacherPreview] handlePreviewSeeked - new time: ${videoRef.current.currentTime.toFixed(2)}. Broadcasting with triggerSeek=true.`);
            onPreviewVideoStateChange(videoRef.current.paused ? false : true, videoRef.current.currentTime, true);
        }
    };
    const handlePreviewLoadedMetadata = () => {
        if (videoRef.current && videoTimeTarget !== undefined) {
            if (triggerSeekEvent || Math.abs(videoRef.current.currentTime - videoTimeTarget) > 0.1) {
                videoRef.current.currentTime = videoTimeTarget;
            }
        }
    };

    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Tv2 size={48} className="mb-4 text-blue-400 opacity-50"/>
                <p className="text-xl">Display is Ready</p>
                <p className="text-sm text-gray-400">Waiting for facilitator to start content...</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (slide.type) {
            case 'image':
                return (
                    <img
                        src={slide.source_url}
                        alt={slide.title || 'Slide Image'}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                );
            case 'video':
                return (
                    <video
                        ref={videoRef}
                        key={slide.source_url + (isForTeacherPreview ? '_preview' : '_student')}
                        src={slide.source_url}
                        controls={isForTeacherPreview}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg outline-none"
                        playsInline
                        muted={!isForTeacherPreview}
                        onPlay={isForTeacherPreview ? handlePreviewPlay : undefined}
                        onPause={isForTeacherPreview ? handlePreviewPause : undefined}
                        onTimeUpdate={isForTeacherPreview ? handlePreviewTimeUpdate : undefined}
                        onSeeked={isForTeacherPreview ? handlePreviewSeeked : undefined}
                        onLoadedMetadata={handlePreviewLoadedMetadata}
                    >
                        Your browser does not support the video tag.
                    </video>
                );
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
            case 'interactive_invest':
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
                return (
                    <div
                        className="text-center max-w-4xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-2xl">
                        {slide.source_url && slide.source_url.match(/\.(jpeg|jpg|gif|png)$/i) != null &&
                            <img src={slide.source_url} alt={slide.title || 'Reveal Image'}
                                 className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4 mx-auto"/>
                        }
                        {slide.source_url && slide.source_url.match(/\.(mp4|webm|ogg)$/i) != null &&
                            <video
                                ref={videoRef}
                                key={slide.source_url + (isForTeacherPreview ? '_preview_reveal' : '_student_reveal')}
                                src={slide.source_url}
                                controls={isForTeacherPreview}
                                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4 mx-auto outline-none"
                                playsInline
                                muted={!isForTeacherPreview}
                                loop={slide.title?.toLowerCase().includes('payoff')}
                                onPlay={isForTeacherPreview ? handlePreviewPlay : undefined}
                                onPause={isForTeacherPreview ? handlePreviewPause : undefined}
                                onTimeUpdate={isForTeacherPreview ? handlePreviewTimeUpdate : undefined}
                                onSeeked={isForTeacherPreview ? handlePreviewSeeked : undefined}
                                onLoadedMetadata={handlePreviewLoadedMetadata}
                                autoPlay={!isForTeacherPreview && isPlayingTarget}
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
                    </div>
                );
            case 'kpi_summary_instructional':
            case 'leaderboard_chart':
            case 'game_end_summary':
                if (slide.source_url) {
                    return <img src={slide.source_url} alt={slide.title || 'Summary Screen'}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"/>;
                }
                return (
                    <div
                        className="text-center max-w-3xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-10 rounded-xl shadow-2xl">
                        {slide.main_text &&
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-shadow-lg break-words">{slide.main_text}</h1>}
                        {slide.sub_text &&
                            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 text-shadow break-words">{slide.sub_text}</p>}
                    </div>
                );
            default:
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
            {isForTeacherPreview && slide && slide.id !== null && slide.id !== undefined && (
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