// src/pages/PresentationPage.tsx - Refactored with Simplified Video System
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '../types';
import SlideRenderer from '../components/Display/SlideRenderer';
import { Hourglass, Monitor, RefreshCw } from 'lucide-react';
import { useBroadcastManager } from '../utils/broadcastManager';

const PresentationPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connecting to session...');
    const [connectionError, setConnectionError] = useState(false);

    // Broadcast manager for host communication only
    const broadcastManager = useBroadcastManager(sessionId || null, 'presentation');

    // Set up broadcast manager listeners for slide updates
    useEffect(() => {
        if (!broadcastManager) return;

        console.log(`[PresentationPage] Setting up broadcast listeners`);

        // Handle slide updates from host
        const unsubscribeSlideUpdate = broadcastManager.subscribe('SLIDE_UPDATE', (message) => {
            setIsConnectedToHost(true);
            setStatusMessage('Connected - Presentation Display Active');
            setCurrentSlide(message.slide);
            setConnectionError(false);
            console.log('[PresentationPage] Slide updated:', message.slide?.id);
        });

        // Handle current state requests from host
        const unsubscribeStateRequest = broadcastManager.subscribe('REQUEST_CURRENT_STATE', () => {
            broadcastManager.broadcast('STATE_RESPONSE', {
                slide: currentSlide
            });
        });

        // Handle session ended
        const unsubscribeSessionEnded = broadcastManager.subscribe('SESSION_ENDED', () => {
            setCurrentSlide(null);
            setIsConnectedToHost(false);
            setStatusMessage('Session has ended');
        });

        // Connection monitoring
        const unsubscribeConnection = broadcastManager.onConnectionChange((status) => {
            const isHost = status.connectionType === 'host';
            setIsConnectedToHost(status.isConnected && isHost);
            setConnectionError(!status.isConnected);

            if (!status.isConnected) {
                setStatusMessage('Lost connection to host. Please check the host dashboard.');
            }
        });

        // Announce that presentation display is ready
        broadcastManager.announcePresentation();

        // Request current state from host
        broadcastManager.requestCurrentState();

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!isConnectedToHost) {
                setStatusMessage('Connection timeout. Please ensure the host dashboard is open.');
                setConnectionError(true);
            }
        }, 5000);

        return () => {
            clearTimeout(connectionTimeout);
            unsubscribeSlideUpdate();
            unsubscribeStateRequest();
            unsubscribeSessionEnded();
            unsubscribeConnection();
        };
    }, [broadcastManager, isConnectedToHost, currentSlide]);

    // Loading/Connection State
    if (!isConnectedToHost || !currentSlide) {
        return (
            <div className="h-screen w-screen bg-gray-900 flex items-center justify-center relative">
                <div className="text-center text-white p-8">
                    {connectionError ? (
                        <>
                            <Monitor size={48} className="mx-auto mb-4 text-red-400"/>
                            <h1 className="text-2xl font-bold mb-2 text-red-300">Connection Issue</h1>
                            <p className="text-lg text-gray-300 mb-4">{statusMessage}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg mx-auto transition-colors"
                            >
                                <RefreshCw size={16} />
                                Reload Page
                            </button>
                        </>
                    ) : (
                        <>
                            <Hourglass size={48} className="mx-auto mb-4 text-blue-400 animate-pulse"/>
                            <h1 className="text-2xl font-bold mb-2">Presentation Display</h1>
                            <p className="text-lg text-gray-300">{statusMessage}</p>
                            {sessionId && (
                                <p className="text-sm text-gray-500 mt-4">
                                    Session ID: {sessionId}
                                </p>
                            )}
                            <div className="mt-8 text-sm text-gray-400">
                                <p className="flex items-center justify-center">
                                    <Monitor size={16} className="mr-2"/>
                                    Waiting for host to start content display
                                </p>
                                <p className="mt-2 text-xs">
                                    Make sure the host dashboard is open in another tab
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            {/* Pure presentation display - SlideRenderer handles all video sync automatically */}
            <SlideRenderer
                slide={currentSlide}
                sessionId={sessionId}
                videoMode="master" // Master mode: controls video and broadcasts state
            />

            {/* Development debug info only */}
            {process.env.NODE_ENV === 'development' && currentSlide && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                    <div>Slide: {currentSlide.id}</div>
                    <div>Mode: Master (Presentation Display)</div>
                    <div>Connected: {isConnectedToHost ? 'Yes' : 'No'}</div>
                </div>
            )}
        </div>
    );
};

export default PresentationPage;