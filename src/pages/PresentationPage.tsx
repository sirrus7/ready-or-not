// src/pages/PresentationPage.tsx
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Slide} from '../types';
import SlideRenderer from '../components/StudentDisplay/SlideRenderer';
import {Hourglass, Monitor, Video} from 'lucide-react';

const PresentationPage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connecting to session...');

    useEffect(() => {
        if (!sessionId) {
            setStatusMessage('No session ID provided');
            return;
        }

        // Simple message listener for non-video content
        const handleMessage = (event: MessageEvent) => {
            // Only accept messages from same origin
            if (event.origin !== window.location.origin) return;

            console.log('[PresentationPage] Received message:', event.data);

            switch (event.data.type) {
                case 'SLIDE_UPDATE':
                    setIsConnected(true);
                    const slide = event.data.slide;

                    // For video slides, show informational message since video is handled by PiP
                    if (slide && (slide.type === 'video' ||
                        (slide.type === 'interactive_invest' && slide.source_url?.match(/\.(mp4|webm|ogg)$/i)))) {
                        setCurrentSlide({
                            id: slide.id,
                            type: 'content_page',
                            title: 'Video Content',
                            main_text: 'Video is being displayed directly on this screen',
                            sub_text: 'The teacher has popped out the video using Picture-in-Picture',
                            background_css: 'bg-gray-900'
                        } as Slide);
                    } else {
                        // For non-video slides, display normally
                        setCurrentSlide(slide);
                    }
                    break;

                case 'SESSION_ENDED':
                    setCurrentSlide(null);
                    setIsConnected(false);
                    setStatusMessage('Session has ended');
                    break;

                case 'PING':
                    // Respond to keep-alive pings from teacher window
                    if (window.opener) {
                        window.opener.postMessage({type: 'PONG', sessionId}, window.location.origin);
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify teacher window that student display is ready
        if (window.opener) {
            window.opener.postMessage({
                type: 'STUDENT_DISPLAY_READY',
                sessionId
            }, window.location.origin);

            // Request current state
            window.opener.postMessage({
                type: 'REQUEST_CURRENT_STATE',
                sessionId
            }, window.location.origin);
        }

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!isConnected) {
                setStatusMessage('Connection timeout. Please ensure the teacher dashboard is open.');
            }
        }, 5000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearTimeout(connectionTimeout);

            // Notify teacher window that student display is closing
            if (window.opener) {
                window.opener.postMessage({
                    type: 'STUDENT_DISPLAY_CLOSING',
                    sessionId
                }, window.location.origin);
            }
        };
    }, [sessionId, isConnected]);

    // Loading/Connection State
    if (!isConnected || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white p-8">
                    <Hourglass size={48} className="mx-auto mb-4 text-blue-400 animate-pulse"/>
                    <h1 className="text-2xl font-bold mb-2">Student Display</h1>
                    <p className="text-lg text-gray-300">{statusMessage}</p>
                    {sessionId && (
                        <p className="text-sm text-gray-500 mt-4">
                            Session ID: {sessionId}
                        </p>
                    )}
                    <div className="mt-8 text-sm text-gray-400">
                        <p>For video content, the teacher will use Picture-in-Picture</p>
                        <p>to display directly on this screen.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Special handling for video placeholder
    if (currentSlide.type === 'content_page' && currentSlide.main_text === 'Video is being displayed directly on this screen') {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white p-8 max-w-2xl">
                    <Video size={64} className="mx-auto mb-6 text-blue-400"/>
                    <h1 className="text-3xl font-bold mb-4">{currentSlide.main_text}</h1>
                    <p className="text-xl text-gray-300 mb-6">{currentSlide.sub_text}</p>
                    <div className="bg-gray-800 rounded-lg p-6 text-left">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <Monitor size={20} className="mr-2"/>
                            Picture-in-Picture Mode Active
                        </h3>
                        <p className="text-gray-400 mb-2">
                            The video should be visible as a floating window on this display.
                        </p>
                        <p className="text-sm text-gray-500">
                            If you don't see the video, ask the teacher to:
                        </p>
                        <ol className="list-decimal list-inside text-sm text-gray-500 mt-2 space-y-1">
                            <li>Click "Pop Out to Projector" in their video controls</li>
                            <li>Drag the video window to this display</li>
                            <li>Double-click the video to fullscreen it</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    // Render non-video content normally
    return (
        <div className="h-screen w-screen overflow-hidden">
            <SlideRenderer
                slide={currentSlide}
                isPlayingTarget={false}
                videoTimeTarget={0}
                triggerSeekEvent={false}
            />
        </div>
    );
};

export default PresentationPage;