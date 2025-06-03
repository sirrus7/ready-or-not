// src/shared/components/Video/HostVideoControls.tsx
import React, {useState, useEffect, useRef} from 'react';
import {Play, Pause, RotateCcw, Volume2, VolumeX} from 'lucide-react';
import {formatTime} from '@shared/utils/video/helpers';

interface HostVideoControlsProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    onPlay: (time?: number) => Promise<void>;
    onPause: (time?: number) => Promise<void>;
    onSeek: (time: number) => Promise<void>;
    isConnectedToPresentation: boolean;
}

const HostVideoControls: React.FC<HostVideoControlsProps> = ({
                                                                 videoRef,
                                                                 onPlay,
                                                                 onPause,
                                                                 onSeek,
                                                                 isConnectedToPresentation
                                                             }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const seekBarRef = useRef<HTMLDivElement>(null);
    const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Update video state from video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateVideoState = () => {
            if (!isDragging) {
                setCurrentTime(video.currentTime);
            }
            setDuration(video.duration || 0);
            setIsPlaying(!video.paused);
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        const handleLoadedMetadata = () => {
            updateVideoState();
        };

        const handleLoadedData = () => {
            // Force UI update when new video data loads
            setCurrentTime(video.currentTime);
            setIsPlaying(!video.paused);
            console.log('[HostVideoControls] Video loaded, currentTime:', video.currentTime);
        };

        const handleTimeUpdate = () => {
            if (!isDragging) {
                setCurrentTime(video.currentTime);
            }
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('volumechange', handleVolumeChange);

        // Initial state update
        updateVideoState();

        // Regular updates when playing
        updateIntervalRef.current = setInterval(() => {
            if (!video.paused && !isDragging) {
                setCurrentTime(video.currentTime);
            }
        }, 100);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('volumechange', handleVolumeChange);

            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, [isDragging, videoRef]);

    // Handle play/pause toggle
    const handlePlayPause = async () => {
        if (isPlaying) {
            await onPause(currentTime);
        } else {
            await onPlay(currentTime);
        }
    };

    // Handle seeking with pause-first approach for better sync
    const handleSeek = async (newTime: number) => {
        console.log('[HostVideoControls] Seeking to:', newTime);

        // First pause both displays
        await onPause(newTime);

        // Then seek
        await onSeek(newTime);

        // Update local state immediately for responsive UI
        setCurrentTime(newTime);
        setIsPlaying(false); // Force user to click play for perfect sync
    };

    // Seek bar interaction
    const handleSeekBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!seekBarRef.current || duration === 0) return;

        const rect = seekBarRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = Math.max(0, Math.min(duration, percentage * duration));

        handleSeek(newTime);
    };

    // Drag handling for seek bar
    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleSeekBarClick(event);
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (!isDragging || !seekBarRef.current || duration === 0) return;

        const rect = seekBarRef.current.getBoundingClientRect();
        const dragX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, dragX / rect.width));
        const newTime = percentage * duration;

        setCurrentTime(newTime);
    };

    const handleMouseUp = async () => {
        if (!isDragging) return;

        setIsDragging(false);
        await handleSeek(currentTime);
    };

    // Mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, currentTime]);

    // Volume control
    const handleVolumeChange = (newVolume: number) => {
        const video = videoRef.current;
        if (video) {
            video.volume = newVolume;
            setVolume(newVolume);
        }
    };

    const handleMuteToggle = () => {
        const video = videoRef.current;
        if (video) {
            video.muted = !video.muted;
            setIsMuted(video.muted);
        }
    };

    // Quick skip controls
    const handleSkipBackward = () => {
        const newTime = Math.max(0, currentTime - 10);
        handleSeek(newTime);
    };

    const handleSkipForward = () => {
        const newTime = Math.min(duration, currentTime + 10);
        handleSeek(newTime);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="max-w-4xl mx-auto">
                {/* Seek Bar */}
                <div className="mb-3">
                    <div
                        ref={seekBarRef}
                        className="relative h-2 bg-white/20 rounded-full cursor-pointer hover:bg-white/30 transition-colors group"
                        onMouseDown={handleMouseDown}
                        onClick={handleSeekBarClick}
                    >
                        {/* Progress Bar */}
                        <div
                            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full pointer-events-none"
                            style={{width: `${progress}%`}}
                        />

                        {/* Seek Handle */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{left: `calc(${progress}% - 8px)`}}
                        />
                    </div>

                    {/* Time Display */}
                    <div className="flex justify-between text-xs text-white/80 mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Skip Backward */}
                        <button
                            onClick={handleSkipBackward}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            title="Skip back 10 seconds"
                        >
                            <RotateCcw size={20}/>
                        </button>

                        {/* Play/Pause */}
                        <button
                            onClick={handlePlayPause}
                            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-lg"
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <Pause size={24}/> : <Play size={24}/>}
                        </button>

                        {/* Skip Forward */}
                        <button
                            onClick={handleSkipForward}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            title="Skip forward 10 seconds"
                        >
                            <RotateCcw size={20} className="scale-x-[-1]"/>
                        </button>
                    </div>

                    {/* Volume Control & Status */}
                    <div className="flex items-center gap-3">
                        {/* Connection Status */}
                        <div className={`text-xs px-2 py-1 rounded-full ${
                            isConnectedToPresentation
                                ? 'bg-green-600/20 text-green-300'
                                : 'bg-gray-600/20 text-gray-300'
                        }`}>
                            {isConnectedToPresentation ? '● Synced' : '● Local Only'}
                        </div>

                        {/* Volume Control (only when not connected to presentation) */}
                        {!isConnectedToPresentation && (
                            <div className="flex items-center gap-2 min-w-[120px]">
                                <button
                                    onClick={handleMuteToggle}
                                    className="p-1 text-white/80 hover:text-white transition-colors"
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                                </button>

                                <div className="flex-1">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={volume}
                                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                                                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                                                 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                                                 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white
                                                 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
                                        disabled={isMuted}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Seek Instructions */}
                {isDragging && (
                    <div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-white bg-black/60 px-2 py-1 rounded">
                        Release to seek to {formatTime(currentTime)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostVideoControls;
