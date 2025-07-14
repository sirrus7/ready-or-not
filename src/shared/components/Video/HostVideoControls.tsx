// Simplified video controls component
import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    muted?: boolean;
    volume?: number;
}

const HostVideoControls: React.FC<HostVideoControlsProps> = ({
    videoRef,
    onPlay,
    onPause,
    onSeek,
    onVolumeChange,
    onMuteToggle,
    isConnectedToPresentation,
    muted = false,
    volume = 1
}) => {
    // UI state
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    // Video playback state
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Refs
    const seekBarRef = useRef<HTMLDivElement>(null);

    // Sync playback state from video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateState = () => {
            setCurrentTime(video.currentTime);
            setDuration(video.duration || 0);
            setIsPlaying(!video.paused);
        };

        // Event listeners
        video.addEventListener('timeupdate', updateState);
        video.addEventListener('loadedmetadata', updateState);
        video.addEventListener('play', updateState);
        video.addEventListener('pause', updateState);
        video.addEventListener('durationchange', updateState);
        
        // Set initial state
        updateState();

        return () => {
            video.removeEventListener('timeupdate', updateState);
            video.removeEventListener('loadedmetadata', updateState);
            video.removeEventListener('play', updateState);
            video.removeEventListener('pause', updateState);
            video.removeEventListener('durationchange', updateState);
        };
    }, [videoRef]);

    // Control handlers
    const handlePlayPause = async () => {
        if (isPlaying) {
            await onPause();
        } else {
            await onPlay();
        }
    };

    const handleSkipBackward = () => {
        const newTime = Math.max(0, currentTime - 10);
        onSeek(newTime);
    };

    const handleSkipForward = () => {
        const newTime = Math.min(duration, currentTime + 10);
        onSeek(newTime);
    };

    // Seek handling
    const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = seekBarRef.current?.getBoundingClientRect();
        if (!rect || !duration) return;
        
        setIsDragging(true);
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        onSeek(newTime);
    };

    // Global mouse event handling for seek dragging
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

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
                    {/* Progress bar */}
                    <div className="mb-3">
                        <div
                            ref={seekBarRef}
                            className="relative h-2 bg-white/20 rounded-full cursor-pointer hover:bg-white/30 transition-colors group"
                            onMouseDown={handleSeekStart}
                        >
                            <div 
                                className="absolute top-0 left-0 h-full bg-game-orange-500 rounded-full"
                                style={{width: `${progress}%`}}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-game-orange-500 rounded-full border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{left: `calc(${progress}% - 8px)`}}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-white/80 mt-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleSkipBackward}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                title="Skip back 10s"
                            >
                                <RotateCcw size={20}/>
                            </button>
                            <button 
                                onClick={handlePlayPause}
                                className="p-3 bg-game-orange-600 hover:bg-game-orange-700 text-white rounded-full shadow-lg transition-colors"
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause size={24}/> : <Play size={24}/>}
                            </button>
                            <button 
                                onClick={handleSkipForward}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                title="Skip forward 10s"
                            >
                                <RotateCcw size={20} className="scale-x-[-1]"/>
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {/* Connection status */}
                            <div className={`text-xs px-2 py-1 rounded-full ${
                                isConnectedToPresentation 
                                    ? 'bg-green-600/20 text-green-300' 
                                    : 'bg-gray-600/20 text-gray-300'
                            }`}>
                                {isConnectedToPresentation ? '● Presentation Audio' : '● Host Audio'}
                            </div>
                            
                            {/* Volume controls */}
                            <div className="flex items-center gap-2 min-w-[120px]">
                                <button 
                                    onClick={onMuteToggle}
                                    className="p-1 text-white/80 hover:text-white transition-colors"
                                    title={muted ? 'Unmute' : 'Mute'}
                                >
                                    {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                                </button>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    value={volume}
                                    onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
                                    disabled={muted}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostVideoControls;