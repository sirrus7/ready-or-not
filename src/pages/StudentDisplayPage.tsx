// src/pages/StudentDisplayPage.tsx - Simplified Version
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '../types';
import SlideRenderer from '../components/StudentDisplay/SlideRenderer';
import { Hourglass } from 'lucide-react';

const StudentDisplayPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!sessionId) return;

        // Single message channel - simplified
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'SLIDE_UPDATE') {
                setIsConnected(true);
                setCurrentSlide(event.data.slide);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify parent window we're ready
        if (window.opener) {
            window.opener.postMessage({ type: 'STUDENT_DISPLAY_READY', sessionId }, '*');
        }

        return () => window.removeEventListener('message', handleMessage);
    }, [sessionId]);

    if (!isConnected || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <Hourglass size={48} className="mx-auto mb-4 text-blue-400 animate-pulse" />
                    <h1 className="text-2xl font-bold mb-2">Student Display</h1>
                    <p className="text-lg">Connecting to session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden">
            <SlideRenderer slide={currentSlide} isPlayingTarget={false} />
        </div>
    );
};