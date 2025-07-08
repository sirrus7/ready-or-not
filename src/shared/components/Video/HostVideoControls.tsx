// src/shared/components/Video/HostVideoControls.tsx
import React, { useRef, useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
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
    presentationVolume?: number;
}

const HostVideoControls: React.FC<HostVideoControlsProps> = ({
                                                                 videoRef,
                                                                 onPlay,
                                                                 onPause,
                                                                 onSeek,
                                                                 onVolumeChange,
                                                                 onMuteToggle,
                                                                 isConnectedToPresentation,
                                                                 presentationMuted = false,
                                                                 presentationVolume = 1
                                                             }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [volume, setVolume] = useState(presentationVolume);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

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

    // Update volume state when presentation volume changes
    useEffect(() => {
        if (isConnectedToPresentation) {
            setVolume(presentationVolume);
        }
    }, [isConnectedToPresentation, presentationVolume]);

    const handlePlayPause = async () => {
        if (isPlaying) {
            await onPause();
        } else {
            await onPlay();
        }
    };

    const handleSkipBackward = () => {
        const video = videoRef.current;
        if (!video) return;
        const newTime = Math.max(0, video.currentTime - 10);
        onSeek(newTime);
    };

    const handleSkipForward = () => {
        const video = videoRef.current;
        if (!video) return;
        const newTime = Math.min(duration, video.currentTime + 10);
        onSeek(newTime);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleSeekBarClick(e);
    };

    const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = seekBarRef.current?.getBoundingClientRect();
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

    // Handle mouse move for dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = seekBarRef.current?.getBoundingClientRect();
            if (!rect || !duration) return;
            const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const newTime = (clickX / rect.width) * duration;
            onSeek(newTime);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, duration, onSeek]);

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-2">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="absolute top-2 right-2 p-1 text-white/60 hover:text-white transition-colors"
                >
                    {isMinimized ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </button>

                <div className={`transition-all duration-300 ${isMinimized ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    <div className="mb-3">
                        <div
                            ref={seekBarRef}
                            className="relative h-2 bg-white/20 rounded-full cursor-pointer hover:bg-white/30 transition-colors group"
                            onMouseDown={handleMouseDown}
                        >
                            <div className="absolute top-0 left-0 h-full bg-game-orange-500 rounded-full"
                                 style={{width: `${progress}%`}}/>
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-game-orange-500 rounded-full border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{left: `calc(${progress}% - 8px)`}}/>
                        </div>
                        <div className="flex justify-between text-xs text-white/80 mt-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={handleSkipBackward}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                    title="Skip back 10s"><RotateCcw size={20}/></button>
                            <button onClick={handlePlayPause}
                                    className="p-3 bg-game-orange-600 hover:bg-game-orange-700 text-white rounded-full shadow-lg transition-colors"
                                    title={isPlaying ? 'Pause' : 'Play'}>
                                {isPlaying ? <Pause size={24}/> : <Play size={24}/>}
                            </button>
                            <button onClick={handleSkipForward}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                    title="Skip forward 10s"><RotateCcw size={20} className="scale-x-[-1]"/></button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className={`text-xs px-2 py-1 rounded-full ${isConnectedToPresentation ? 'bg-green-600/20 text-green-300' : 'bg-gray-600/20 text-gray-300'}`}>
                                {isConnectedToPresentation ? '● Synced' : '● Local Only'}
                            </div>
                            <div className="flex items-center gap-2 min-w-[120px]">
                                <button onClick={handleMuteToggle}
                                        className="p-1 text-white/80 hover:text-white transition-colors"
                                        title={isMuted ? 'Unmute' : 'Mute'}>
                                    {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                                </button>
                                <input type="range" min="0" max="1" step="0.1" value={volume}
                                       onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                       className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
                                       disabled={isMuted}/>
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