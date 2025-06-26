// src/shared/components/Video/HostVideoControls.tsx
import React, { useRef, useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, FastForward, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '@shared/utils/video/helpers';

interface HostVideoControlsProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    onPlay: () => Promise<void>;
    onPause: () => Promise<void>;
    onSeek: (time: number) => Promise<void>;
    onVolumeChange?: (volume: number) => void;
    onMuteToggle?: () => void;
    isConnectedToPresentation: boolean;
    presentationMuted?: boolean;
}

const HostVideoControls: React.FC<HostVideoControlsProps> = ({
                                                                 videoRef,
                                                                 onPlay,
                                                                 onPause,
                                                                 onSeek,
                                                                 onVolumeChange,
                                                                 onMuteToggle,
                                                                 isConnectedToPresentation,
                                                                 presentationMuted = false
                                                             }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const progressBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => {
            setCurrentTime(video.currentTime);
            setDuration(video.duration || 0);
        };

        const updatePlayState = () => {
            setIsPlaying(!video.paused);
        };

        const updateVolumeState = () => {
            if (isConnectedToPresentation) {
                // When connected, show presentation state
                setIsMuted(presentationMuted);
                setVolume(video.volume);
            } else {
                // When not connected, show host state
                setIsMuted(video.muted);
                setVolume(video.volume);
            }
        };

        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateTime);
        video.addEventListener('play', updatePlayState);
        video.addEventListener('pause', updatePlayState);
        video.addEventListener('volumechange', updateVolumeState);

        // Set initial states
        updateTime();
        updatePlayState();
        updateVolumeState();

        return () => {
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateTime);
            video.removeEventListener('play', updatePlayState);
            video.removeEventListener('pause', updatePlayState);
            video.removeEventListener('volumechange', updateVolumeState);
        };
    }, [videoRef, isConnectedToPresentation, presentationMuted]);

    // Update mute state when presentation mute changes
    useEffect(() => {
        if (isConnectedToPresentation) {
            setIsMuted(presentationMuted);
        }
    }, [isConnectedToPresentation, presentationMuted]);

    const handlePlayPause = async () => {
        if (isPlaying) {
            await onPause();
        } else {
            await onPlay();
        }
    };

    const handleSeek = (seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
        onSeek(newTime);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = progressBarRef.current?.getBoundingClientRect();
        if (!rect || !duration) return;
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        onSeek(newTime);
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        onVolumeChange?.(newVolume);
    };

    const handleMuteToggle = () => {
        onMuteToggle?.();
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
            isMinimized ? 'h-10' : 'h-32'
        }`}>
            <div className="relative h-full bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="absolute top-2 right-2 p-1 text-white/60 hover:text-white transition-colors"
                >
                    {isMinimized ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </button>

                <div className={`absolute bottom-0 left-0 right-0 p-4 ${isMinimized ? 'hidden' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={handlePlayPause}
                            className="text-white hover:text-blue-400 transition-colors text-2xl"
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        <button
                            onClick={() => handleSeek(-10)}
                            className="text-white hover:text-blue-400 transition-colors"
                        >
                            <SkipForward size={18} className="rotate-180"/>
                        </button>
                        <button
                            onClick={() => handleSeek(30)}
                            className="text-white hover:text-blue-400 transition-colors"
                        >
                            <FastForward size={18}/>
                        </button>
                        <span className="text-white text-sm ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
                    </div>

                    <div
                        ref={progressBarRef}
                        onClick={handleProgressClick}
                        className="w-full h-2 bg-white/20 rounded-full cursor-pointer relative mb-3"
                    >
                        <div
                            className="absolute left-0 top-0 h-full bg-blue-500 rounded-full"
                            style={{width: `${progress}%`}}
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <div className={`text-xs font-medium px-2 py-1 rounded ${
                            isConnectedToPresentation ? 'bg-green-600/20 text-green-300' : 'bg-gray-600/20 text-gray-300'
                        }`}>
                            {isConnectedToPresentation ? '● Synced' : '● Local Only'}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 min-w-[120px]">
                                <button
                                    onClick={handleMuteToggle}
                                    className="p-1 text-white/80 hover:text-white transition-colors"
                                >
                                    {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
                                />
                            </div>
                            {isConnectedToPresentation && (
                                <span className="text-xs text-gray-400 ml-2">
                  (Controls presentation audio)
                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostVideoControls;