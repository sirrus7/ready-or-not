// src/components/Display/SlideRenderer.tsx - Fixed Video Sync Logic
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
    // New sync mode for perfect synchronization
    syncMode?: boolean;
    // Host mode for click controls
    hostMode?: boolean;
    onHostVideoClick?: (playing: boolean) => void;
    // NEW: Allow audio on host preview when presentation display is disconnected
    allowHostAudio?: boolean;
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
                                                         allowHostAudio = false
                                                     }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const activeVideoRef = videoRef || localVideoRef;
    const lastSeekTimeRef = useRef(0);
    const syncTimeoutRef = useRef<NodeJS.Timeout>();
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const iconTimeoutRef = useRef<NodeJS.Timeout>();

    // Handle video synchronization for master mode (presentation display)
    useEffect(() => {
        if (masterVideoMode && activeVideoRef.current && slide) {
            const video = activeVideoRef.current;
            console.log(`[SlideRenderer] Setting up master video mode event listeners for slide ${slide.id}`);

            // Set up event listeners for master video
            const handlePlay = () => {
                console.log(`[SlideRenderer] Video play event (via addEventListener) for slide ${slide.id}`);
                if (onVideoPlay) {
                    console.log(`[SlideRenderer] Calling onVideoPlay handler via addEventListener`);
                    onVideoPlay();
                }
            };

            const handlePause = () => {
                console.log(`[SlideRenderer] Video pause event (via addEventListener) for slide ${slide.id}`);
                if (onVideoPause) {
                    console.log(`[SlideRenderer] Calling onVideoPause handler via addEventListener`);
                    onVideoPause();
                }
            };

            const handleTimeUpdate = () => {
                if (onVideoTimeUpdate) {
                    onVideoTimeUpdate();
                }
            };

            const handleVolumeChange = () => {
                if (onVolumeChange) {
                    onVolumeChange();
                }
            };

            const handleLoadedMetadata = () => {
                console.log(`[SlideRenderer] Video metadata loaded (via addEventListener) for slide ${slide.id}`);
                if (onLoadedMetadata) {
                    console.log(`[SlideRenderer] Calling onLoadedMetadata handler via addEventListener`);
                    onLoadedMetadata();
                }
            };

            // Add event listeners
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('volumechange', handleVolumeChange);
            video.addEventListener('loadedmetadata', handleLoadedMetadata);

            // Test if video is already playing
            if (!video.paused) {
                console.log(`[SlideRenderer] Video is already playing on setup`);
                handlePlay();
            }

            // Cleanup
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

    // Enhanced synchronization for preview mode
    const syncVideoState = useCallback(() => {
        if (!activeVideoRef.current || masterVideoMode) return;

        const video = activeVideoRef.current;
        const now = Date.now();

        // Sync play/pause state with immediate response
        if (isPlayingTarget && video.paused) {
            console.log('[SlideRenderer] Syncing play state');
            video.play().catch(console.error);
        } else if (!isPlayingTarget && !video.paused) {
            console.log('[SlideRenderer] Syncing pause state');
            video.pause();
        }

        // Sync time position with smart tolerance
        if (videoTimeTarget !== undefined) {
            const timeDiff = Math.abs(video.currentTime - videoTimeTarget);
            const timeSinceLastSeek = now - lastSeekTimeRef.current;

            // Only seek if difference is significant and enough time has passed
            if (timeDiff > 0.5 && timeSinceLastSeek > 300 && video.readyState >= 2) {
                console.log(`[SlideRenderer] Syncing time: ${videoTimeTarget}s (diff: ${timeDiff}s)`);
                video.currentTime = videoTimeTarget;
                lastSeekTimeRef.current = now;
            }
        }
    }, [isPlayingTarget, videoTimeTarget, masterVideoMode]);

    // Enhanced sync effect with proper handling for different modes
    useEffect(() => {
        if (!activeVideoRef.current) return;

        const video = activeVideoRef.current;

        // Only apply sync logic for non-master modes (host preview)
        if (!masterVideoMode) {
            if (syncMode) {
                // In sync mode, be more responsive to state changes
                console.log(`[SlideRenderer] Sync mode - playing: ${isPlayingTarget}, time: ${videoTimeTarget}`);

                // Clear any pending operations
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current);
                }

                // Immediate play/pause sync
                if (isPlayingTarget !== !video.paused) {
                    if (isPlayingTarget) {
                        video.play().catch(console.error);
                    } else {
                        video.pause();
                    }
                }

                // Time sync with small delay to allow for smooth playback
                if (videoTimeTarget !== undefined) {
                    syncTimeoutRef.current = setTimeout(() => {
                        syncVideoState();
                    }, 100);
                }
            } else {
                // Standard sync for non-master, non-sync mode
                syncVideoState();
            }
        }
        // For master mode (presentation display), don't apply any sync logic
        // Let it play naturally based on commands

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [isPlayingTarget, videoTimeTarget, syncMode, masterVideoMode, syncVideoState]);

    // Handle video loading and metadata
    useEffect(() => {
        if (activeVideoRef.current && slide) {
            const video = activeVideoRef.current;

            const handleLoadedData = () => {
                // Only apply sync for non-master modes
                if (!masterVideoMode && (syncMode || !masterVideoMode)) {
                    syncVideoState();
                }
                setVideoError(false);
            };

            const handleCanPlay = () => {
                // Only apply time sync for non-master modes
                if (!masterVideoMode && videoTimeTarget !== undefined && Math.abs(video.currentTime - videoTimeTarget) > 0.5) {
                    video.currentTime = videoTimeTarget;
                }
            };

            const handleError = () => {
                console.error(`[SlideRenderer] Video error for slide ${slide.id}`);
                setVideoError(true);
            };

            video.addEventListener('loadeddata', handleLoadedData);
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('error', handleError);

            return () => {
                video.removeEventListener('loadeddata', handleLoadedData);
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('error', handleError);
            };
        }
    }, [slide, syncMode, masterVideoMode, videoTimeTarget, syncVideoState]);

    // Handle host video click
    const handleVideoClick = useCallback(() => {
        if (!hostMode || !activeVideoRef.current || !onHostVideoClick) return;

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
    }, [hostMode, onHostVideoClick]);

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

        // FIXED: Audio logic - enable audio for master mode OR when host audio is allowed
        const shouldHaveAudio = masterVideoMode || allowHostAudio;

        const videoElement = (
            <video
                ref={activeVideoRef}
                key={`${slide.id}_${slide.source_url}_${masterVideoMode ? 'master' : syncMode ? 'sync' : 'preview'}`}
                src={slide.source_url}
                className={`max-w-full max-h-full object-contain rounded-lg shadow-lg outline-none ${hostMode ? 'cursor-pointer' : ''}`}
                playsInline
                controls={false} // Always false - no native controls
                autoPlay={false}
                preload="auto"
                muted={!shouldHaveAudio} // FIXED: Use shouldHaveAudio instead of just masterVideoMode
                onClick={hostMode ? handleVideoClick : undefined}
                onPlay={(e) => {
                    console.log(`[SlideRenderer] Video onPlay INLINE event fired for slide ${slide.id}, masterVideoMode: ${masterVideoMode}`);
                    if (masterVideoMode && onVideoPlay) {
                        console.log(`[SlideRenderer] Calling onVideoPlay handler from INLINE event`);
                        onVideoPlay();
                    }
                }}
                onPause={(e) => {
                    console.log(`[SlideRenderer] Video onPause INLINE event fired for slide ${slide.id}, masterVideoMode: ${masterVideoMode}`);
                    if (masterVideoMode && onVideoPause) {
                        console.log(`[SlideRenderer] Calling onVideoPause handler from INLINE event`);
                        onVideoPause();
                    }
                }}
                onTimeUpdate={(e) => {
                    if (masterVideoMode && onVideoTimeUpdate) {
                        onVideoTimeUpdate();
                    }
                }}
                onVolumeChange={(e) => {
                    if (masterVideoMode && onVolumeChange) {
                        onVolumeChange();
                    }
                }}
                onLoadedMetadata={(e) => {
                    console.log(`[SlideRenderer] Video metadata loaded INLINE for slide ${slide.id}, masterVideoMode: ${masterVideoMode}`);
                    if (masterVideoMode && onLoadedMetadata) {
                        console.log(`[SlideRenderer] Calling onLoadedMetadata handler from INLINE event`);
                        onLoadedMetadata();
                    }
                }}
                onCanPlay={(e) => {
                    console.log(`[SlideRenderer] Video canPlay event for slide ${slide.id}, masterVideoMode: ${masterVideoMode}`);
                    // Check if video is already playing when it becomes ready
                    if (masterVideoMode && activeVideoRef.current && !activeVideoRef.current.paused && onVideoPlay) {
                        console.log(`[SlideRenderer] Video is already playing when canPlay fired`);
                        onVideoPlay();
                    }
                }}
                onError={(e) => {
                    console.error('[SlideRenderer] Video loading error:', e);
                    setVideoError(true);
                }}
            >
                Your browser does not support the video tag.
            </video>
        );

        // Wrap video with overlay for host mode
        if (hostMode) {
            return (
                <div className="relative">
                    {videoElement}
                    {/* YouTube-style play/pause icon overlay */}
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