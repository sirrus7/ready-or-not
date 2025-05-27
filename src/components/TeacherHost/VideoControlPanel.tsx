// src/components/TeacherHost/VideoControlPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface VideoControlPanelProps {
    slideId: number;
    videoUrl: string;
    isForCurrentSlide: boolean;
}

const VideoControlPanel: React.FC<VideoControlPanelProps> = ({
                                                                 slideId,
                                                                 videoUrl,
                                                                 isForCurrentSlide
                                                             }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);

    const {
        broadcastVideoState,
        isPlayingVideo,
        videoCurrentTime
    } = useAppContext();

    // Sync with global state when this is the current slide
    useEffect(() => {
        if (isForCurrentSlide && videoRef.current) {
            if (isPlayingVideo && !videoRef.current.playing) {
                videoRef.current.play();
            } else if (!isPlayingVideo && !videoRef.current.paused) {
                videoRef.current.pause();
            }

            if (Math.abs(videoRef.current.currentTime - videoCurrentTime) > 0.5) {
                videoRef.current.currentTime = videoCurrentTime;
            }
        }
    }, [isForCurrentSlide, isPlayingVideo, videoCurrentTime]);

    const handlePlayPause = () => {
        if (!videoRef.current || !isForCurrentSlide) return;

        if (videoRef.current.paused) {
            videoRef.current.play();
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

            // Broadcast state periodically when playing
            if (isForCurrentSlide && !videoRef.current.paused) {
                broadcastVideoState(true, videoRef.current.currentTime);
            }
        }
    };

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
            {/* Video Preview */}
            <div className="relative aspect-video bg-black">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full"
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    controls={false}
                />

                {!isForCurrentSlide && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <p className="text-white text-sm bg-black/70 px-3 py-1 rounded">
                            Preview Only - Not Current Slide
                        </p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-gray-800">
                {/* Play/Pause and Skip */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <button
                        onClick={() => handleSkip(-10)}
                        disabled={!isForCurrentSlide}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        title="Skip back 10s"
                    >
                        <SkipBack size={20} />
                    </button>

                    <button
                        onClick={handlePlayPause}
                        disabled={!isForCurrentSlide}
                        className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>

                    <button
                        onClick={() => handleSkip(10)}
                        disabled={!isForCurrentSlide}
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
                        value={currentTime}
                        onChange={handleSeek}
                        disabled={!isForCurrentSlide}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2">
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
                        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Status */}
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-400">
                        {isForCurrentSlide ? (
                            <span className="text-green-400">● Live Control Active</span>
                        ) : (
                            <span className="text-gray-500">Preview Mode</span>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VideoControlPanel;