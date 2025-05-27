// src/components/TeacherHost/VideoControlPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, Minimize, Monitor } from 'lucide-react';

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
    const [isPiPActive, setIsPiPActive] = useState(false);
    const [pipWindow, setPipWindow] = useState<PictureInPictureWindow | null>(null);

    // Enter PiP mode
    const enterPiP = async () => {
        if (!videoRef.current) return;

        try {
            const pip = await videoRef.current.requestPictureInPicture();
            setPipWindow(pip);

            // Show instructions to teacher
            alert(
                "Video popped out successfully!\n\n" +
                "1. Drag the video window to your projector/external display\n" +
                "2. Double-click the video to fullscreen it\n" +
                "3. Use controls here to play/pause"
            );
        } catch (error) {
            console.error('Failed to enter PiP:', error);
            alert('Failed to pop out video. Please try again.');
        }
    };

    // Exit PiP mode
    const exitPiP = async () => {
        try {
            await document.exitPictureInPicture();
        } catch (error) {
            console.error('Failed to exit PiP:', error);
        }
    };

    // Set up PiP event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnterPiP = (event: any) => {
            setIsPiPActive(true);
            setPipWindow(event.pictureInPictureWindow);
            console.log('Entered PiP mode');
        };

        const handleLeavePiP = () => {
            setIsPiPActive(false);
            setPipWindow(null);
            console.log('Left PiP mode');
        };

        video.addEventListener('enterpictureinpicture', handleEnterPiP);
        video.addEventListener('leavepictureinpicture', handleLeavePiP);

        return () => {
            video.removeEventListener('enterpictureinpicture', handleEnterPiP);
            video.removeEventListener('leavepictureinpicture', handleLeavePiP);
        };
    }, []);

    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
            {/* Video Element */}
            <div className="relative aspect-video bg-black">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full"
                    controls={false} // We'll use custom controls
                />
            </div>

            {/* Control Bar */}
            <div className="p-4 bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                    {/* Play/Pause Controls */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                        >
                            {videoRef.current?.paused ? <Play size={20} /> : <Pause size={20} />}
                        </button>
                    </div>

                    {/* PiP Controls */}
                    <div className="flex gap-2">
                        {!isPiPActive ? (
                            <button
                                onClick={enterPiP}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                                title="Pop out video to external display"
                            >
                                <Monitor size={20} />
                                Pop Out to Projector
                            </button>
                        ) : (
                            <button
                                onClick={exitPiP}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
                                title="Return video to main window"
                            >
                                <Minimize size={20} />
                                Return to Dashboard
                            </button>
                        )}
                    </div>
                </div>

                {/* Status */}
                <div className="text-sm text-gray-400">
                    {isPiPActive ? (
                        <p className="text-green-400">
                            ✓ Video is displayed on external monitor - Use controls here to play/pause
                        </p>
                    ) : (
                        <p>Click "Pop Out to Projector" to display video on external monitor</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoControlPanel;