// src/shared/components/Video/SlideRenderer.tsx - Complete with smart auto-play
import React, {useState, useEffect, useRef} from 'react';
import {Slide} from '@shared/types/game';
import {Tv2, AlertCircle, ListChecks, RefreshCw} from 'lucide-react';
import LeaderboardChartDisplay from '@shared/components/UI/LeaderboardChart';
import {isVideo, useHostVideo, usePresentationVideo} from '@shared/utils/video';
import HostVideoControls from '@shared/components/Video/HostVideoControls';

/*
 * SlideRenderer Requirements & Design Notes:
 *
 * This component must handle three critical video behaviors simultaneously:
 *
 * 1. AUTO-PLAY: When a new video slide is displayed (host only), automatically start
 *    playback after a short delay (500ms if presentation connected, 200ms if local only).
 *    This ensures videos start without manual intervention.
 *
 * 2. AUTO-ADVANCE: When a video ends, automatically advance to the next slide UNLESS
 *    the slide has a host_alert property. This is handled by the onVideoEnd callback
 *    passed from HostApp.
 *
 * 3. HOST ALERTS: When a video ends AND the slide has a host_alert property, display
 *    an alert modal instead of auto-advancing. The HostApp.handleVideoEnd function
 *    contains the logic to decide between auto-advance vs. alert display.
 *
 * Key Implementation Details:
 * - Uses refs to store callbacks and slide data to avoid stale closures
 * - Auto-play timeout is stored in a ref to prevent clearing on re-renders
 * - onVideoEnd callback is always called - HostApp decides the behavior
 * - Dependencies are carefully managed to prevent race conditions
 *
 * Critical: All three behaviors must work together - fixing one cannot break others.
 */

interface SlideRendererProps {
    slide: Slide | null;
    sessionId?: string | null;
    isHost: boolean;
    onVideoEnd?: () => void;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
                                                         slide,
                                                         sessionId = null,
                                                         isHost,
                                                         onVideoEnd
                                                     }) => {
    const [videoError, setVideoError] = useState(false);
    const [isInFullscreen, setIsInFullscreen] = useState(false);
    const previousSlideIdRef = useRef<number | undefined>(undefined);
    const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const onVideoEndRef = useRef<(() => void) | undefined>(onVideoEnd);
    const slideDataRef = useRef(slide); // Store current slide data

    // Update refs when props change
    useEffect(() => {
        onVideoEndRef.current = onVideoEnd;
        slideDataRef.current = slide;
    }, [onVideoEnd, slide]);

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

    // Simple auto-play using ref to avoid dependency issues
    useEffect(() => {
        // Clear any existing timeout first
        if (autoPlayTimeoutRef.current) {
            clearTimeout(autoPlayTimeoutRef.current);
            autoPlayTimeoutRef.current = null;
        }

        if (!isHost || !slide || !isVideo(slide?.source_url)) {
            return;
        }

        const isNewSlide = slide.id !== previousSlideIdRef.current;
        previousSlideIdRef.current = slide.id;

        if (!isNewSlide) {
            return;
        }

        console.log('[SlideRenderer] New video slide detected, setting up auto-play:', slide.id);

        // Use a ref-stored timeout to avoid dependency issues
        autoPlayTimeoutRef.current = setTimeout(async () => {
            if (hostVideo) {
                try {
                    console.log('[SlideRenderer] Auto-playing video for slide:', slide.id);
                    await hostVideo.play(0);
                    console.log('[SlideRenderer] Auto-play successful');
                } catch (error) {
                    console.error('[SlideRenderer] Auto-play failed:', error);
                }
            }
            autoPlayTimeoutRef.current = null;
        }, hostVideo?.isConnectedToPresentation ? 500 : 200);

        return () => {
            if (autoPlayTimeoutRef.current) {
                clearTimeout(autoPlayTimeoutRef.current);
                autoPlayTimeoutRef.current = null;
            }
        };
    }, [slide?.id, isHost]); // Remove hostVideo from dependencies to prevent timeout clearing

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

        // Get video props with stable callback reference
        const videoProps = isHost ?
            hostVideo?.getVideoProps(() => {
                console.log('[SlideRenderer] Video ended for slide:', slideDataRef.current?.id);
                console.log('[SlideRenderer] Slide has host_alert:', !!slideDataRef.current?.host_alert);
                console.log('[SlideRenderer] onVideoEnd callback exists:', !!onVideoEndRef.current);

                if (onVideoEndRef.current) {
                    console.log('[SlideRenderer] Calling HostApp handleVideoEnd');
                    onVideoEndRef.current();
                } else {
                    console.warn('[SlideRenderer] No onVideoEnd callback available');
                }
            }) :
            presentationVideo?.getVideoProps(() => {
                console.log('[SlideRenderer] Video ended (presentation)');
                if (onVideoEndRef.current) {
                    onVideoEndRef.current();
                }
            });

        if (!videoProps) {
            return (
                <div className="flex items-center justify-center h-full text-white">
                    <p>Loading video player...</p>
                </div>
            );
        }

        console.log('[SlideRenderer] Video props for slide:', slide.id, {
            hasOnVideoEnd: !!onVideoEnd,
            hasVideoProps: !!videoProps,
            hasOnEnded: !!videoProps.onEnded
        });

        return (
            <div className="h-full w-full flex items-center justify-center relative">
                <video
                    key={`video-${slide.id}`}
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
                        objectFit: isInFullscreen ? 'cover' : 'contain',
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
