// src/shared/components/Video/HostVideoControls.tsx - FINAL CLEAN FIX
import React, {useState, useEffect, useRef} from 'react';
import {Play, Pause, RotateCcw, Volume2} from 'lucide-react';
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

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (!isDragging) setCurrentTime(video.currentTime);
        };
        const handleLoadedMetadata = () => setDuration(video.duration || 0);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('volumechange', handleVolumeChange);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('volumechange', handleVolumeChange);
        };
    }, [videoRef, isDragging]);

    const handlePlayPause = () => (isPlaying ? onPause() : onPlay());

    const handleSeek = async (newTime: number) => {
        await onSeek(newTime);
        setCurrentTime(newTime);
    };

    const handleSeekBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!seekBarRef.current || duration === 0) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        handleSeek(newTime);
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleSeekBarClick(event);
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (!isDragging || !seekBarRef.current || duration === 0) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const dragX = event.clientX - rect.left;
        const newTime = Math.max(0, Math.min(duration, (dragX / rect.width) * duration));
        setCurrentTime(newTime);
    };

    const handleMouseUp = async () => {
        if (!isDragging) return;
        setIsDragging(false);
        await handleSeek(currentTime);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, currentTime, handleSeek]);

    const handleVolumeChange = (newVolume: number) => {
        if (videoRef.current) videoRef.current.volume = newVolume;
    };
    const handleMuteToggle = () => {
        if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
    };
    const handleSkipBackward = () => handleSeek(Math.max(0, currentTime - 10));
    const handleSkipForward = () => handleSeek(Math.min(duration, currentTime + 10));

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-3">
                    <div
                        ref={seekBarRef}
                        className="relative h-2 bg-white/20 rounded-full cursor-pointer hover:bg-white/30 transition-colors group"
                        onMouseDown={handleMouseDown}
                    >
                        <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                             style={{width: `${progress}%`}}/>
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                                title="Skip back 10s"><RotateCcw size={20}/></button>
                        <button onClick={handlePlayPause}
                                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg"
                                title={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause size={24}/> : <Play size={24}/>}
                        </button>
                        <button onClick={handleSkipForward}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                                title="Skip forward 10s"><RotateCcw size={20} className="scale-x-[-1]"/></button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className={`text-xs px-2 py-1 rounded-full ${isConnectedToPresentation ? 'bg-green-600/20 text-green-300' : 'bg-gray-600/20 text-gray-300'}`}>
                            {isConnectedToPresentation ? '● Synced' : '● Local Only'}
                        </div>
                        {!isConnectedToPresentation && (
                            <div className="flex items-center gap-2 min-w-[120px]">
                                <button onClick={handleMuteToggle} className="p-1 text-white/80 hover:text-white">
                                    <Volume2 size={18}/></button>
                                <input type="range" min="0" max="1" step="0.1" value={volume}
                                       onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                       className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                                       disabled={isMuted}/>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostVideoControls;
