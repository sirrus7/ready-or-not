// src/components/Display/SlideRenderer.tsx - Fixed Manual Sync
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Slide } from '../../types';
import { Tv2, AlertCircle, ListChecks, Play, Pause, RefreshCw } from 'lucide-react';
import LeaderboardChartDisplay from './LeaderboardChartDisplay';

interface SlideRendererProps {
    slide: Slide | null;
    isPlayingTarget: boolean;
    videoTimeTarget?: number;
    triggerSeekEvent?: boolean;
    // Master video mode props (for presentation display)
    videoRef?: React.RefObject<HTMLVideoElement>;
    onVideoPlay?: () => void;
    onVideoPause?: () => void;
    onVideoTimeUpdate?: () => void;
    onVolumeChange?: () => void;
    onLoadedMetadata?: () => void;
    masterVideoMode?: boolean;
    // Sync mode for sync behavior
    syncMode?: boolean;
    // Host mode for click controls
    hostMode?: boolean;
    onHostVideoClick?: (playing: boolean) => void;
    // Allow audio on host preview when presentation display is disconnected
    allowHostAudio?: boolean;
    // Enable native video controls
    enableNativeControls?: boolean;
    onSeek?: (time: number) => void;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
                                                         slide,
                                                         isPlayingTarget,
                                                         videoTimeTarget,
                                                         triggerSeekEvent,
                                                         videoRef,
                                                         onVideoPlay,
                                                         onVideoPause,
                                                         onVideoTimeUpdate,
                                                         onVolumeChange,
                                                         onLoadedMetadata,
                                                         masterVideoMode = false,
                                                         syncMode = false,
                                                         hostMode = false,
                                                         onHostVideoClick,
                                                         allowHostAudio = false,
                                                         enableNativeControls = false,
                                                         onSeek
                                                     }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const activeVideoRef = videoRef || localVideoRef;
    const lastSeekTimeRef = useRef(0);
    const lastSyncTimeRef = useRef(0);
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
    const iconTimeoutRef = useRef<NodeJS.Timeout>();
    const currentSlideIdRef = useRef<number | null>(null);
    const lastTargetTimeRef = useRef<number>(0);

    // Reset auto-play flag when slide changes
    useEffect(() => {
        if (slide && slide.id !== currentSlideIdRef.current) {
            console.log(`[SlideRenderer] Slide changed from ${currentSlideIdRef.current} to ${slide.id}, resetting auto-play flag`);
            setHasAutoPlayed(false);
            currentSlideIdRef.current = slide.id;
            lastTargetTimeRef.current = 0;
        }
    }, [slide?.id]);

    // Auto-play logic for video slides - ONLY when NOT in sync mode
    useEffect(() => {
        if (!activeVideoRef.current || !slide || hasAutoPlayed || syncMode) return;

        const video = activeVideoRef.current;
        const isVideoSlide = slide.type === 'video' ||
            (slide.type === 'interactive_invest' && slide.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
            ((slide.type === 'consequence_reveal' || slide.type === 'payoff_reveal') &&
                slide.source_url?.match(/\.(mp4|webm|ogg)$/i));

        if (isVideoSlide && video.readyState >= 2) {
            // For master video mode (presentation display), don't auto-play unless commanded
            if (masterVideoMode) {
                console.log(`[SlideRenderer] Master mode - not auto-playing, waiting for host command for slide ${slide.id}`);
                setHasAutoPlayed(true);
                return;
            }

            console.log(`[SlideRenderer] Auto-playing video for slide ${slide.id}`);

            const attemptAutoPlay = async () => {
                try {
                    await video.play();
                    setHasAutoPlayed(true);
                    console.log(`[SlideRenderer] Auto-play successful for slide ${slide.id}`);
                } catch (error) {
                    console.warn(`[SlideRenderer] Auto-play failed for slide ${slide.id}:`, error);
                    setHasAutoPlayed(true);
                }
            };

            attemptAutoPlay();
        }
    }, [slide, hasAutoPlayed, activeVideoRef.current?.readyState, masterVideoMode, syncMode]);

    // Manual sync for host preview when connected to presentation display
    useEffect(() => {
        if (!activeVideoRef.current || masterVideoMode || !syncMode) return;

        const video = activeVideoRef.current;
        const now = Date.now();

        // Throttle sync operations
        if (now - lastSyncTimeRef.current < 200) return;
        lastSyncTimeRef.current = now;

        console.log(`[SlideRenderer] Manual sync - target playing: ${isPlayingTarget}, target time: ${videoTimeTarget}`);

        // Sync play/pause state
        const shouldPlay = isPlayingTarget;
        const currentlyPlaying = !video.paused;

        if (shouldPlay !== currentlyPlaying) {
            console.log(`[SlideRenderer] Syncing play state: ${shouldPlay ? 'play' : 'pause'}`);
            if (shouldPlay) {
                video.play().catch(console.error);
            } else {
                video.pause();
            }
        }

        // Sync time position - only if there's a significant difference
        if (videoTimeTarget !== undefined && video.readyState >= 2) {
            const timeDiff = Math.abs(video.currentTime - videoTimeTarget);
            const timeSinceLastSeek = now - lastSeekTimeRef.current;
            const targetTimeChanged = Math.abs(videoTimeTarget - lastTargetTimeRef.current) > 0.1;

            // Only seek if:
            // 1. Time difference is significant (> 1 second), OR
            // 2. Target time changed significantly (new command from presentation)
            if ((timeDiff > 1.0 && timeSinceLastSeek > 1000) || (targetTimeChanged && timeSinceLastSeek > 100)) {
                console.log(`[SlideRenderer] Syncing time: ${videoTimeTarget}s (diff: ${timeDiff}s, changed: ${targetTimeChanged})`);
                video.currentTime = videoTimeTarget;
                lastSeekTimeRef.current = now;
                lastTargetTimeRef.current = videoTimeTarget;
            }
        }
    }, [isPlayingTarget, videoTimeTarget, masterVideoMode, syncMode]);

    // Handle video synchronization for master mode (presentation display)
    useEffect(() => {
        if (masterVideoMode && activeVideoRef.current && slide) {
            const video = activeVideoRef.current;
            console.log(`[SlideRenderer] Setting up master video mode event listeners for slide ${slide.id}`);

            const handlePlay = () => {
                console.log(`[SlideRenderer] Video play event for slide ${slide.id}`);
                if (onVideoPlay) onVideoPlay();
            };

            const handlePause = () => {
                console.log(`[SlideRenderer] Video pause event for slide ${slide.id}`);
                if (onVideoPause) onVideoPause();
            };

            const handleTimeUpdate = () => {
                if (onVideoTimeUpdate) onVideoTimeUpdate();
            };

            const handleVolumeChange = () => {
                if (onVolumeChange) onVolumeChange();
            };

            const handleLoadedMetadata = () => {
                console.log(`[SlideRenderer] Video metadata loaded for slide ${slide.id}`);
                if (onLoadedMetadata) onLoadedMetadata();
            };

            // Add event listeners
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('volumechange', handleVolumeChange);
            video.addEventListener('loadedmetadata', handleLoadedMetadata);

            return () => {
                console.log(`[SlideRenderer] Cleaning up master video mode event listeners for slide ${slide.id}`);
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('timeupdate', handleTimeUpdate);
                video.removeEventListener('volumechange', handleVolumeChange);
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [masterVideoMode, slide?.id, onVideoPlay, onVideoPause, onVideoTimeUpdate, onVolumeChange, onLoadedMetadata]);

    // Handle video loading and metadata
    useEffect(() => {
        if (activeVideoRef.current && slide) {
            const video = activeVideoRef.current;

            const handleLoadedData = () => {
                setVideoError(false);
                console.log(`[SlideRenderer] Video data loaded for slide ${slide.id}`);

                // Only auto-play if not in sync mode and not master mode
                if (!hasAutoPlayed && !syncMode && !masterVideoMode) {
                    const isVideoSlide = slide.type === 'video' ||
                        (slide.type === 'interactive_invest' && slide.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
                        ((slide.type === 'consequence_reveal' || slide.type === 'payoff_reveal') &&
                            slide.source_url?.match(/\.(mp4|webm|ogg)$/i));

                    if (isVideoSlide) {
                        console.log(`[SlideRenderer] Auto-playing on data load for slide ${slide.id}`);
                        video.play()
                            .then(() => {
                                setHasAutoPlayed(true);
                                console.log(`[SlideRenderer] Auto-play successful on loadeddata for slide ${slide.id}`);
                            })
                            .catch(error => {
                                console.warn(`[SlideRenderer] Auto-play failed on loadeddata for slide ${slide.id}:`, error);
                                setHasAutoPlayed(true);
                            });
                    }
                }
            };

            const handleError = () => {
                console.error(`[SlideRenderer] Video error for slide ${slide.id}`);
                setVideoError(true);
            };

            const handleSeeked = () => {
                if (enableNativeControls && onSeek && video.currentTime !== undefined) {
                    onSeek(video.currentTime);
                }
            };

            video.addEventListener('loadeddata', handleLoadedData);
            video.addEventListener('error', handleError);

            if (enableNativeControls) {
                video.addEventListener('seeked', handleSeeked);
            }

            return () => {
                video.removeEventListener('loadeddata', handleLoadedData);
                video.removeEventListener('error', handleError);
                if (enableNativeControls) {
                    video.removeEventListener('seeked', handleSeeked);
                }
            };
        }
    }, [slide, syncMode, masterVideoMode, enableNativeControls, onSeek, hasAutoPlayed]);

    // Handle host video click (only when native controls are disabled)
    const handleVideoClick = useCallback(() => {
        if (!hostMode || !activeVideoRef.current || !onHostVideoClick || enableNativeControls) return;

        const video = activeVideoRef.current;
        const willPlay = video.paused;

        // Show visual feedback
        setShowPlayIcon(true);

        // Clear existing timeout
        if (iconTimeoutRef.current) {
            clearTimeout(iconTimeoutRef.current);
        }

        // Hide icon after 1 second
        iconTimeoutRef.current = setTimeout(() => {
            setShowPlayIcon(false);
        }, 1000);

        // Notify parent component
        onHostVideoClick(willPlay);
    }, [hostMode, onHostVideoClick, enableNativeControls]);

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

        // Audio logic - enable audio for master mode OR when host audio is allowed
        const shouldHaveAudio = masterVideoMode || allowHostAudio;

        // Use a stable key that only changes when the slide or source URL changes
        const videoKey = `video_${slide.id}_${slide.source_url}`;

        const videoElement = (
            <video
                ref={activeVideoRef}
                key={videoKey}
                src={slide.source_url}
                className={`max-w-full max-h-full object-contain rounded-lg shadow-lg outline-none ${
                    hostMode && !enableNativeControls ? 'cursor-pointer' : ''
                }`}
                playsInline
                controls={enableNativeControls}
                autoPlay={false} // We handle auto-play manually
                preload="auto"
                muted={!shouldHaveAudio}
                onClick={hostMode && !enableNativeControls ? handleVideoClick : undefined}
                onError={(e) => {
                    console.error('[SlideRenderer] Video loading error:', e);
                    setVideoError(true);
                }}
            >
                Your browser does not support the video tag.
            </video>
        );

        // Wrap video with overlay for host mode (only when native controls are disabled)
        if (hostMode && !enableNativeControls) {
            return (
                <div className="relative">
                    {videoElement}
                    {showPlayIcon && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/60 rounded-full p-4 backdrop-blur-sm animate-in fade-in duration-200">
                                {isPlayingTarget ? (
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
                return renderVideoContent(slide, hasVideoSrc);

            case 'content_page':
                return (
                    <div className="text-center max-w-3xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-10 rounded-xl shadow-2xl">
                        {slide.main_text && <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-shadow-lg break-words">{slide.main_text}</h1>}
                        {slide.sub_text && <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-6 sm:mb-8 text-shadow break-words">{slide.sub_text}</p>}
                        {slide.bullet_points && slide.bullet_points.length > 0 && (
                            <ul className="list-disc list-inside text-left space-y-2 text-md sm:text-lg md:text-xl text-gray-100 max-w-xl mx-auto">
                                {slide.bullet_points.map((point, index) => (
                                    <li key={index} className="text-shadow-sm">{point}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                );

            case 'interactive_choice':
            case 'interactive_double_down_prompt':
            case 'interactive_double_down_select':
                return (
                    <div className="text-center max-w-2xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                        <ListChecks size={32} className="text-blue-400 mx-auto mb-4 animate-pulse"/>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-sky-300">{slide.main_text || slide.title || "Team Decision Time"}</h2>
                        <p className="text-md sm:text-lg text-gray-300 mb-4">{slide.sub_text || "Please refer to your devices to make your selections."}</p>
                        {slide.timer_duration_seconds && (
                            <div className="mt-5 text-xl sm:text-2xl font-mono text-yellow-300 bg-black/40 px-4 py-2 rounded-lg inline-block shadow-md">
                                TIME: {`${Math.floor(slide.timer_duration_seconds / 60)}:${(slide.timer_duration_seconds % 60).toString().padStart(2, '0')}`}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-4">(Timer is active on individual team devices)</p>
                    </div>
                );

            case 'consequence_reveal':
            case 'payoff_reveal':
                const hasConsequenceVideo = isVideoSourceValid(slide.source_url);
                return (
                    <div className="text-center max-w-4xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-2xl">
                        {slide.source_url && !hasConsequenceVideo && slide.source_url.match(/\.(jpeg|jpg|gif|png)$/i) != null &&
                            <img src={slide.source_url} alt={slide.title || 'Reveal Image'}
                                 className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg mb-4 mx-auto"/>
                        }
                        {hasConsequenceVideo && slide.source_url && renderVideoContent(slide, true)}
                        {slide.main_text && <h2 className="text-2xl md:text-3xl font-bold mb-2 text-shadow-md break-words">{slide.main_text || slide.title}</h2>}
                        {slide.sub_text && <p className="text-lg text-gray-200 text-shadow-sm break-words">{slide.sub_text}</p>}
                        {slide.details && slide.details.length > 0 && (
                            <div className="mt-4 text-left text-md text-gray-100 space-y-1 bg-slate-700/50 p-4 rounded-md max-w-md mx-auto">
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
                    <div className="text-center max-w-3xl mx-auto bg-black/20 backdrop-blur-md p-6 md:p-10 rounded-xl shadow-2xl">
                        {slide.main_text && <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-shadow-lg break-words">{slide.main_text || slide.title || "Summary"}</h1>}
                        {slide.sub_text && <p className="text-lg sm:text-xl md:text-2xl text-gray-200 text-shadow break-words">{slide.sub_text}</p>}
                        {!slide.source_url && !slide.main_text && <p className="text-xl">Loading summary information...</p>}
                    </div>
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
        <div className={`h-full w-full flex flex-col items-center justify-center text-white p-4 md:p-6 overflow-hidden ${slide?.background_css || 'bg-gray-900'}`}>
            {renderContent()}
        </div>
    );
};

export default SlideRenderer;