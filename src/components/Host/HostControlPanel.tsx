// src/components/Host/HostControlPanel.tsx - Simplified Version
import React, { useState, useRef, useEffect } from 'react';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    Monitor,
    MonitorOff,
    Info,
    Video
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface SimpleVideoControlPanelProps {
    slideId: number;
    videoUrl: string;
    isForCurrentSlide: boolean;
    hostVideoEnabled: boolean;
}

// AI-generated fallback content for different video types
const getVideoFallbackContent = (slideId: number, videoUrl: string) => {
    const fallbackContent = {
        title: "Video Content Summary",
        learningPoints: [
            "Students are watching an instructional video about market dynamics",
            "Key concepts being covered include supply, demand, and pricing strategies",
            "The video demonstrates real-world business scenarios",
            "Students should be taking notes on competitive advantages"
        ],
        teacherNotes: [
            "Watch student engagement - pause if needed for discussion",
            "After video, consider asking teams to discuss key takeaways",
            "Next phase will involve applying these concepts to their business decisions",
            "Be ready to clarify any concepts students found confusing"
        ],
        estimatedDuration: "3-5 minutes",
        nextPhase: "Students will make investment decisions based on this content"
    };

    return fallbackContent;
};

const HostControlPanel: React.FC<SimpleVideoControlPanelProps> = ({
                                                                      slideId,
                                                                      videoUrl,
                                                                      isForCurrentSlide,
                                                                      hostVideoEnabled
                                                                  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);

    const { broadcastVideoState, isPlayingVideo, videoCurrentTime } = useAppContext();

    // Generate fallback content for when video is disabled
    const fallbackContent = getVideoFallbackContent(slideId, videoUrl);

    // Sync with global state when this is the current slide
    useEffect(() => {
        if (isForCurrentSlide && videoRef.current && hostVideoEnabled) {
            if (isPlayingVideo && videoRef.current.paused) {
                videoRef.current.play().catch(console.error);
            } else if (!isPlayingVideo && !videoRef.current.paused) {
                videoRef.current.pause();
            }

            // Allow slight sync tolerance (1 second) to prevent constant seeking
            if (Math.abs(videoRef.current.currentTime - videoCurrentTime) > 1) {
                videoRef.current.currentTime = videoCurrentTime;
            }
        }
    }, [isForCurrentSlide, isPlayingVideo, videoCurrentTime, hostVideoEnabled]);

    const handlePlayPause = () => {
        if (!videoRef.current || !isForCurrentSlide) return;

        if (videoRef.current.paused) {
            videoRef.current.play().catch(console.error);
            broadcastVideoState(true, videoRef.current.currentTime);
        } else {
            videoRef.current.pause();
            broadcastVideoState(false, videoRef.current.currentTime);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current || !isForCurrentSlide) return;

        const newTime = parseFloat(e.target.value);
        videoRef.current.currentTime = newTime;
        broadcastVideoState(isPlaying, newTime);
    };

    const handleSkip = (seconds: number) => {
        if (!videoRef.current || !isForCurrentSlide) return;

        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        videoRef.current.currentTime = newTime;
        broadcastVideoState(isPlaying, newTime);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);

            // Broadcast state periodically when playing (every 2 seconds to reduce bandwidth)
            if (isForCurrentSlide && !videoRef.current.paused) {
                const now = Date.now();
                if (!handleTimeUpdate.lastBroadcast || now - handleTimeUpdate.lastBroadcast > 2000) {
                    broadcastVideoState(true, videoRef.current.currentTime);
                    handleTimeUpdate.lastBroadcast = now;
                }
            }
        }
    };

    // Add timestamp to function to track last broadcast
    (handleTimeUpdate as any).lastBroadcast = 0;

    const handlePlay = () => {
        setIsPlaying(true);
        if (isForCurrentSlide) {
            broadcastVideoState(true, videoRef.current?.currentTime || 0);
        }
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (isForCurrentSlide) {
            broadcastVideoState(false, videoRef.current?.currentTime || 0);
        }
    };

    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-white text-sm font-medium">Host Video Preview</span>
                    {hostVideoEnabled ? (
                        <Monitor size={16} className="text-green-400" />
                    ) : (
                        <MonitorOff size={16} className="text-red-400" />
                    )}
                </div>
                <div className="text-xs text-gray-400">
                    {hostVideoEnabled ? 'Preview Enabled' : 'Preview Disabled'}
                </div>
            </div>

            {/* Video Preview or Fallback Content */}
            <div className="relative aspect-video bg-black">
                {hostVideoEnabled ? (
                    <>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-contain"
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            controls={false}
                            playsInline
                        />

                        {!isForCurrentSlide && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <p className="text-white text-sm bg-black/70 px-3 py-1 rounded">
                                    Preview Only - Not Current Slide
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    // Fallback content when video is disabled
                    <div className="w-full h-full p-6 overflow-y-auto bg-gray-800 text-white">
                        <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-6">
                                <MonitorOff size={32} className="mx-auto mb-2 text-gray-400" />
                                <h3 className="text-lg font-semibold mb-2">{fallbackContent.title}</h3>
                                <p className="text-sm text-gray-400">
                                    Host video disabled - Students are watching on presentation screen
                                </p>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div>
                                    <h4 className="font-semibold text-blue-300 mb-2">What Students Are Learning:</h4>
                                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                                        {fallbackContent.learningPoints.map((point, index) => (
                                            <li key={index}>{point}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-yellow-300 mb-2">Teacher Notes:</h4>
                                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                                        {fallbackContent.teacherNotes.map((note, index) => (
                                            <li key={index}>{note}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-gray-700 p-3 rounded">
                                    <div className="text-xs text-gray-400 space-y-1">
                                        <div>Duration: {fallbackContent.estimatedDuration}</div>
                                        <div>Next: {fallbackContent.nextPhase}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls - Always visible */}
            <div className="p-4 bg-gray-800">
                {/* Play/Pause and Skip */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <button
                        onClick={() => handleSkip(-10)}
                        disabled={!isForCurrentSlide || !hostVideoEnabled}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        title="Skip back 10s"
                    >
                        <SkipBack size={20} />
                    </button>

                    <button
                        onClick={handlePlayPause}
                        disabled={!isForCurrentSlide || !hostVideoEnabled}
                        className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>

                    <button
                        onClick={() => handleSkip(10)}
                        disabled={!isForCurrentSlide || !hostVideoEnabled}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        title="Skip forward 10s"
                    >
                        <SkipForward size={20} />
                    </button>
                </div>

                {/* Timeline */}
                <div className="mb-4">
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={hostVideoEnabled ? currentTime : 0}
                        onChange={handleSeek}
                        disabled={!isForCurrentSlide || !hostVideoEnabled}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{hostVideoEnabled ? formatTime(currentTime) : '--:--'}</span>
                        <span>{hostVideoEnabled ? formatTime(duration) : '--:--'}</span>
                    </div>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 mb-4">
                    <Volume2 size={16} className="text-gray-400" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => {
                            const newVolume = parseFloat(e.target.value);
                            setVolume(newVolume);
                            if (videoRef.current) {
                                videoRef.current.volume = newVolume;
                            }
                        }}
                        disabled={!hostVideoEnabled}
                        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}%</span>
                </div>

                {/* Status */}
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                            {isForCurrentSlide ? (
                                <span className="text-green-400">● Live Control</span>
                            ) : (
                                <span className="text-gray-500">Preview Mode</span>
                            )}
                        </div>

                        {hostVideoEnabled ? (
                            <span className="text-blue-400">Host Video: ON</span>
                        ) : (
                            <span className="text-red-400">Host Video: OFF</span>
                        )}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                        Audio syncs to presentation screen • Video can be 1-2s behind
                    </div>

                    {!hostVideoEnabled && (
                        <div className="text-xs text-yellow-400 mt-1 flex items-center justify-center">
                            <Info size={12} className="mr-1" />
                            Toggle "Host Video" in controls to see video preview
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HostControlPanel;