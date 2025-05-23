// src/components/StudentDisplay/SlideRenderer.tsx
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
    isForTeacherPreview?: boolean;
    onPreviewVideoStateChange?: (playing: boolean, time: number, triggerSeek?: boolean) => void;
    onPreviewVideoDuration?: (duration: number) => void;
    onPreviewVideoEnded?: () => void;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
                                                         slide,
                                                         isPlayingTarget,
                                                         videoTimeTarget,
                                                         triggerSeekEvent,
                                                         isForTeacherPreview = false,
                                                         onPreviewVideoStateChange,
                                                         onPreviewVideoDuration,
                                                         onPreviewVideoEnded
                                                     }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastBroadcastedTime = useRef<number | undefined>(undefined);
    const isPreviewSeekingRef = useRef(false);
    const initialSyncDoneRef = useRef(false);
    const pendingSyncTimeRef = useRef<number | undefined>(undefined); // Track pending sync time
    const autoResumeTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track auto-resume timeout
    const { state } = useAppContext();

    useEffect(() => {
        const videoElement = videoRef.current;
        const context = isForTeacherPreview ? "TeacherPreview" : "StudentDisplay";

        const isVideoSlideType = slide?.type === 'video' ||
            (slide?.type === 'interactive_invest' && slide.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
            ((slide?.type === 'consequence_reveal' || slide?.type === 'payoff_reveal') && slide.source_url?.match(/\.(mp4|webm|ogg)$/i));

        if (videoElement && isVideoSlideType && slide?.source_url) {
            console.log(`[${context}] Processing video sync - slide: ${slide.id}, playing: ${isPlayingTarget}, time: ${videoTimeTarget}, seek: ${triggerSeekEvent}`);

            if (isForTeacherPreview) {
                if (triggerSeekEvent && videoTimeTarget !== undefined) {
                    if (Math.abs(videoElement.currentTime - videoTimeTarget) > 0.1) {
                        console.log(`[${context}] Seeking from ${videoElement.currentTime} to ${videoTimeTarget}`);
                        videoElement.currentTime = videoTimeTarget;
                    }
                    if (isPlayingTarget && videoElement.paused) {
                        videoElement.play().catch(e => console.warn(`[${context}] Play after programmatic seek error:`, e));
                    } else if (!isPlayingTarget && !videoElement.paused) {
                        videoElement.pause();
                    }
                }
            } else {
                // Student Display: More robust sync handling
                if (triggerSeekEvent && videoTimeTarget !== undefined) {
                    console.log(`[${context}] Explicit seek triggered to ${videoTimeTarget} from ${videoElement.currentTime}`);
                    videoElement.currentTime = videoTimeTarget;
                    pendingSyncTimeRef.current = undefined;

                    // Apply play state after seek with better timing
                    const applyPlayState = () => {
                        if (isPlayingTarget && videoElement.paused) {
                            console.log(`[${context}] Playing after seek`);
                            videoElement.play().catch(e => console.warn(`[${context}] Play after sync error:`, e));
                        } else if (!isPlayingTarget && !videoElement.paused) {
                            console.log(`[${context}] Pausing after seek`);
                            videoElement.pause();
                        }
                    };

                    if (videoElement.seeking) {
                        videoElement.addEventListener('seeked', applyPlayState, { once: true });
                    } else {
                        setTimeout(applyPlayState, 50);
                    }

                } else if (videoTimeTarget !== undefined && !initialSyncDoneRef.current) {
                    // Store for initial sync
                    pendingSyncTimeRef.current = videoTimeTarget;
                    console.log(`[${context}] Pending initial sync to time: ${videoTimeTarget}`);
                } else if (videoTimeTarget !== undefined && initialSyncDoneRef.current) {
                    // Handle drift correction during playback
                    const timeDifference = Math.abs(videoElement.currentTime - videoTimeTarget);
                    if (timeDifference > 1.5) { // Increased threshold for better stability
                        console.log(`[${context}] Correcting time drift: ${videoElement.currentTime} -> ${videoTimeTarget} (diff: ${timeDifference})`);
                        videoElement.currentTime = videoTimeTarget;

                        setTimeout(() => {
                            if (isPlayingTarget && videoElement.paused) {
                                videoElement.play().catch(e => console.warn(`[${context}] Play after correction error:`, e));
                            } else if (!isPlayingTarget && !videoElement.paused) {
                                videoElement.pause();
                            }
                        }, 100);
                    } else {
                        // Just apply play/pause state without seeking
                        if (isPlayingTarget && videoElement.paused) {
                            console.log(`[${context}] Playing (no seek needed)`);
                            videoElement.play().catch(e => console.warn(`[${context}] Video play error:`, e));
                        } else if (!isPlayingTarget && !videoElement.paused) {
                            console.log(`[${context}] Pausing (no seek needed)`);
                            videoElement.pause();
                        }
                    }
                } else {
                    // Normal play/pause control without time change
                    if (isPlayingTarget && videoElement.paused) {
                        console.log(`[${context}] Normal play`);
                        videoElement.play().catch(e => console.warn(`[${context}] Video play error:`, e));
                    } else if (!isPlayingTarget && !videoElement.paused) {
                        console.log(`[${context}] Normal pause`);
                        videoElement.pause();
                    }
                }
            }
        }
    }, [slide?.id, slide?.source_url, slide?.type, isPlayingTarget, videoTimeTarget, triggerSeekEvent, isForTeacherPreview]);

    const handlePreviewPlay = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current) {
            isPreviewSeekingRef.current = false;
            const currentTime = videoRef.current.currentTime;

            // For manual play (not auto-resume), just broadcast normally
            // Auto-resume is handled in handlePreviewSeeked
            onPreviewVideoStateChange(true, currentTime, false);
            lastBroadcastedTime.current = currentTime;

            console.log(`[TeacherPreview] Manual play at time: ${currentTime}`);
        }
    };

    const handlePreviewPause = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current) {
            if (!videoRef.current.ended && !isPreviewSeekingRef.current) {
                const currentTime = videoRef.current.currentTime;
                onPreviewVideoStateChange(false, currentTime, false);
                lastBroadcastedTime.current = currentTime;

                console.log(`[TeacherPreview] Paused at time: ${currentTime}`);
            }
        }
    };

    const handlePreviewTimeUpdate = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current && !isPreviewSeekingRef.current) {
            const currentTime = videoRef.current.currentTime;
            const isPlaying = !videoRef.current.paused;

            // Broadcast time updates when playing, or if there's a significant time change while paused
            // (this can happen with manual seeking or programmatic time changes)
            const shouldBroadcast = isPlaying ||
                (lastBroadcastedTime.current !== undefined && Math.abs(currentTime - lastBroadcastedTime.current) >= 0.25);

            if (lastBroadcastedTime.current === undefined || shouldBroadcast) {
                onPreviewVideoStateChange(isPlaying, currentTime, false);
                lastBroadcastedTime.current = currentTime;
            }
        }
    };

    const handlePreviewSeeking = () => {
        if (isForTeacherPreview && videoRef.current) {
            isPreviewSeekingRef.current = true;
        }
    };

    const handlePreviewSeeked = () => {
        if (isForTeacherPreview && onPreviewVideoStateChange && videoRef.current) {
            isPreviewSeekingRef.current = false;

            // Clear any pending auto-resume
            if (autoResumeTimeoutRef.current) {
                clearTimeout(autoResumeTimeoutRef.current);
                autoResumeTimeoutRef.current = null;
            }

            const wasPlaying = !videoRef.current.paused;
            const currentTime = videoRef.current.currentTime;

            if (wasPlaying) {
                // Pause both displays for sync
                videoRef.current.pause();
                onPreviewVideoStateChange(false, currentTime, true);

                console.log(`[TeacherPreview] Seeked to ${currentTime}, sync pause initiated`);

                // Brief pause to ensure student display catches up, then auto-resume
                autoResumeTimeoutRef.current = setTimeout(() => {
                    if (videoRef.current && videoRef.current.paused) {
                        // Double-check we're still at the right time before resuming
                        if (Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
                            videoRef.current.currentTime = currentTime;
                        }

                        videoRef.current.play().then(() => {
                            if (onPreviewVideoStateChange && videoRef.current) {
                                onPreviewVideoStateChange(true, videoRef.current.currentTime, true);
                                console.log(`[TeacherPreview] Auto-resumed after sync pause at ${videoRef.current.currentTime}`);
                            }
                        }).catch(e => {
                            console.warn(`[TeacherPreview] Auto-resume failed:`, e);
                            // Fallback: just broadcast the paused state
                            if (onPreviewVideoStateChange) {
                                onPreviewVideoStateChange(false, currentTime, false);
                            }
                        });
                    }
                    autoResumeTimeoutRef.current = null;
                }, 250); // 250ms should be enough for sync
            } else {
                // Was already paused, just update position
                onPreviewVideoStateChange(false, currentTime, true);
                console.log(`[TeacherPreview] Seeked while paused to time: ${currentTime}`);
            }

            lastBroadcastedTime.current = currentTime;
        }
    };

    const handlePreviewLoadedMetadata = () => {
        const videoElement = videoRef.current;
        if (videoElement) {
            lastBroadcastedTime.current = undefined;
            initialSyncDoneRef.current = false;

            if (isForTeacherPreview && onPreviewVideoDuration && videoElement.duration && !isNaN(videoElement.duration) && videoElement.duration !== Infinity) {
                onPreviewVideoDuration(videoElement.duration);
            }

            // For Student Display: Handle initial time sync more robustly
            if (!isForTeacherPreview) {
                const performInitialSync = () => {
                    const targetTime = pendingSyncTimeRef.current ?? videoTimeTarget ?? 0;

                    console.log(`[StudentDisplay] Performing initial sync - targetTime: ${targetTime}, currentTime: ${videoElement.currentTime}`);

                    // Always set the time on initial load for student display
                    if (targetTime !== undefined && Math.abs(videoElement.currentTime - targetTime) > 0.1) {
                        console.log(`[StudentDisplay] Setting initial video time to: ${targetTime}`);
                        videoElement.currentTime = targetTime;
                    }

                    // Wait for the time to be set, then apply play state
                    const syncPlayState = () => {
                        if (isPlayingTarget && videoElement.paused) {
                            console.log(`[StudentDisplay] Starting playback after initial sync`);
                            videoElement.play().catch(e => console.warn(`[StudentDisplay] Initial play error:`, e));
                        } else if (!isPlayingTarget && !videoElement.paused && !videoElement.seeking) {
                            console.log(`[StudentDisplay] Pausing after initial sync`);
                            videoElement.pause();
                        }
                        initialSyncDoneRef.current = true;
                        pendingSyncTimeRef.current = undefined;
                    };

                    // Give time for the seek to complete
                    if (targetTime > 0) {
                        setTimeout(syncPlayState, 200);
                    } else {
                        setTimeout(syncPlayState, 50);
                    }
                };

                // Perform initial sync after metadata is loaded
                setTimeout(performInitialSync, 100);

            } else if (isForTeacherPreview) {
                // Teacher Preview: Apply initial state with better time sync
                const targetTime = videoTimeTarget ?? 0;
                if (targetTime > 0 && Math.abs(videoElement.currentTime - targetTime) > 0.1) {
                    videoElement.currentTime = targetTime;
                }

                setTimeout(() => {
                    if (isPlayingTarget && videoElement.paused) {
                        videoElement.play().catch(e => console.warn(`[TeacherPreview] Initial play on load error for slide ${slide?.id}:`, e));
                    } else if (!isPlayingTarget && !videoElement.paused && !videoElement.seeking) {
                        videoElement.pause();
                    }
                }, 100);
            }
        }
    };

    const handlePreviewVideoEnded = () => {
        if (isForTeacherPreview && onPreviewVideoEnded) {
            onPreviewVideoEnded();
        }
    };

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
                            key={slide.id + "_" + slide.source_url + (isForTeacherPreview ? '_preview' : '_student')}
                            src={slide.source_url}
                            controls={isForTeacherPreview}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg outline-none"
                            playsInline
                            muted={!isForTeacherPreview}
                            onPlay={isForTeacherPreview ? handlePreviewPlay : undefined}
                            onPause={isForTeacherPreview ? handlePreviewPause : undefined}
                            onTimeUpdate={isForTeacherPreview ? handlePreviewTimeUpdate : undefined}
                            onSeeking={isForTeacherPreview ? handlePreviewSeeking : undefined}
                            onSeeked={isForTeacherPreview ? handlePreviewSeeked : undefined}
                            onLoadedMetadata={handlePreviewLoadedMetadata}
                            onEnded={handlePreviewVideoEnded}
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
                                key={slide.id + "_" + slide.source_url + (isForTeacherPreview ? '_preview_reveal' : '_student_reveal')}
                                src={slide.source_url}
                                controls={isForTeacherPreview}
                                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4 mx-auto outline-none"
                                playsInline
                                muted={!isForTeacherPreview}
                                loop={slide.title?.toLowerCase().includes('payoff')}
                                onPlay={isForTeacherPreview ? handlePreviewPlay : undefined}
                                onPause={isForTeacherPreview ? handlePreviewPause : undefined}
                                onTimeUpdate={isForTeacherPreview ? handlePreviewTimeUpdate : undefined}
                                onSeeking={isForTeacherPreview ? handlePreviewSeeking : undefined}
                                onSeeked={isForTeacherPreview ? handlePreviewSeeked : undefined}
                                onLoadedMetadata={handlePreviewLoadedMetadata}
                                onEnded={handlePreviewVideoEnded}
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