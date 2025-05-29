// src/components/Display/SlideRenderer.tsx - Fixed Host Click Responsiveness
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
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
    const iconTimeoutRef = useRef<NodeJS.Timeout>();
    const currentSlideIdRef = useRef<number | null>(null);

    // Reset auto-play flag when slide changes
    useEffect(() => {
        if (slide && slide.id !== currentSlideIdRef.current) {
            console.log(`[SlideRenderer] Slide changed from ${currentSlideIdRef.current} to ${slide.id}, resetting auto-play flag`);
            setHasAutoPlayed(false);
            currentSlideIdRef.current = slide.id;
        }
    }, [slide]);

    // CONSOLIDATED AUTO-PLAY LOGIC
    useEffect(() => {
        console.log(`[SlideRenderer] Auto-play effect triggered:`, {
            hasVideoRef: !!activeVideoRef.current,
            hasSlide: !!slide,
            slideId: slide?.id,
            slideType: slide?.type,
            hasAutoPlayed,
            masterVideoMode,
            syncMode,
            hostMode
        });

        if (!activeVideoRef.current || !slide || hasAutoPlayed) {
            console.log(`[SlideRenderer] Auto-play skipped - early return conditions`);
            return;
        }

        const video = activeVideoRef.current;
        const isVideoSlide = !!isVideo(slide);

        console.log(`[SlideRenderer] Is video slide: ${isVideoSlide}, source: ${slide.source_url}`);

        if (!isVideoSlide) {
            console.log(`[SlideRenderer] Not a video slide, skipping auto-play`);
            return;
        }

        const attemptAutoPlayWhenReady = () => {
            console.log(`[SlideRenderer] Attempting auto-play when ready, readyState: ${video.readyState}`);

            if (video.readyState < 2) {
                console.log(`[SlideRenderer] Video not ready (readyState: ${video.readyState}), waiting for loadeddata`);
                const handleLoadedData = () => {
                    console.log(`[SlideRenderer] Video loadeddata event fired, retrying auto-play`);
                    video.removeEventListener('loadeddata', handleLoadedData);
                    attemptAutoPlayWhenReady();
                };
                video.addEventListener('loadeddata', handleLoadedData);

                setTimeout(() => {
                    if (video.readyState >= 2) {
                        video.removeEventListener('loadeddata', handleLoadedData);
                        attemptAutoPlayWhenReady();
                    }
                }, 500);
                return;
            }

            console.log(`[SlideRenderer] Auto-play decision for slide ${slide.id}:`);
            console.log(`  - Master mode: ${masterVideoMode}, Sync mode: ${syncMode}, Host mode: ${hostMode}`);

            // FIXED AUTO-PLAY LOGIC:
            // 1. Master mode (presentation display) - wait for host command
            // 2. Sync mode (host with presentation) - STILL AUTO-PLAY but will be controlled by host clicks
            // 3. Host only mode - auto-play immediately

            if (masterVideoMode) {
                console.log(`[SlideRenderer] Master mode - waiting for host command`);
                setHasAutoPlayed(true);
                return;
            }

            // FIXED: In sync mode OR host only mode, auto-play the video
            // Host clicks will control it afterwards
            console.log(`[SlideRenderer] ${syncMode ? 'Sync' : 'Host only'} mode - attempting auto-play NOW`);
            const attemptAutoPlay = async () => {
                try {
                    console.log(`[SlideRenderer] Calling video.play() for slide ${slide.id}`);
                    await video.play();
                    setHasAutoPlayed(true);
                    console.log(`[SlideRenderer] ✅ Auto-play SUCCESSFUL for slide ${slide.id}`);
                } catch (error) {
                    console.error(`[SlideRenderer] ❌ Auto-play FAILED for slide ${slide.id}:`, error);
                    setHasAutoPlayed(true);
                }
            };

            attemptAutoPlay();
        };

        console.log(`[SlideRenderer] Starting auto-play attempt for slide ${slide.id}`);
        attemptAutoPlayWhenReady();
    }, [slide, hasAutoPlayed, masterVideoMode, syncMode, hostMode, activeVideoRef]);

    // IMPROVED SYNC LOGIC - Only applies when NOT ignoring and sync is needed
    useEffect(() => {
        if (!activeVideoRef.current || masterVideoMode || !syncMode) {
            return;
        }

        const video = activeVideoRef.current;

        // Check if we should ignore sync (due to recent user interaction)
        const timeSinceLastCommand = Date.now() - (videoTimeTarget || 0);
        if (timeSinceLastCommand < 1000) {
            console.log(`[SlideRenderer] Skipping sync - recent user command (${timeSinceLastCommand}ms ago)`);
            return;
        }

        console.log(`[SlideRenderer] Sync check - target playing: ${isPlayingTarget}, current playing: ${!video.paused}, target time: ${videoTimeTarget}`);

        // Sync play/pause state - but ONLY if significantly different
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

        // Sync time position with reduced threshold - but ONLY if needed
        if (videoTimeTarget !== undefined && video.readyState >= 2) {
            const timeDiff = Math.abs(video.currentTime - videoTimeTarget);

            if (timeDiff > 1.0) { // Increased threshold to 1 second
                console.log(`[SlideRenderer] Syncing time: ${videoTimeTarget}s (diff: ${timeDiff}s)`);
                video.currentTime = videoTimeTarget;
            }
        }
    }, [isPlayingTarget, videoTimeTarget, masterVideoMode, syncMode, activeVideoRef]);

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
    }, [slide, enableNativeControls, onSeek]);

    // FIXED: Handle host video click - ALWAYS works when in host mode
    const handleVideoClick = useCallback(() => {
        console.log(`[SlideRenderer] Video click - hostMode: ${hostMode}, enableNativeControls: ${enableNativeControls}, hasCallback: ${!!onHostVideoClick}`);

        if (!hostMode || !activeVideoRef.current || !onHostVideoClick || enableNativeControls) {
            console.log(`[SlideRenderer] Video click ignored - conditions not met`);
            return;
        }

        const video = activeVideoRef.current;
        const willPlay = video.paused;

        console.log(`[SlideRenderer] Processing video click - current paused: ${video.paused}, will play: ${willPlay}`);

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

        // IMPORTANT: Always call the callback - DisplayView must handle this
        console.log(`[SlideRenderer] Calling onHostVideoClick with willPlay: ${willPlay}`);
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

    const isVideo = (slide: Slide) => {
        return slide.source_url && !slide.source_url.match(/\.(mp4|webm|ogg)$/i);
    }

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
                {
                    const hasVideoFile = !!isVideo(slide);
                    console.log(`[SlideRenderer] Slide ${slide.id} (${slide.type}) → Video rendering (hasFile: ${hasVideoFile})`);
                    return renderVideoContent(slide, hasVideoFile);
                }
        }
    };
    return (
        <div className={`h-full w-full flex flex-col items-center justify-center text-white p-4 md:p-6 overflow-hidden ${slide?.background_css || 'bg-gray-900'}`}>
            {renderContent()}
        </div>
    );
};

export default SlideRenderer;