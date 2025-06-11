// src/views/presentation/PresentationApp.tsx
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Slide} from '@shared/types/game';
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import {Hourglass, Monitor, RefreshCw, Wifi, WifiOff, Maximize, Minimize, Play} from 'lucide-react';
import {SimpleBroadcastManager, HostCommand} from '@core/sync/SimpleBroadcastManager';

/**
 * Simplified presentation app that immediately displays content from the host.
 */
const PresentationApp: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Initializing display...');
    const [connectionError, setConnectionError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        document.title = "Ready or Not - Presentation";
    }, []);

    const broadcastManager = sessionId ?
        SimpleBroadcastManager.getInstance(sessionId, 'presentation') : null;

    const handleVideoEnd = () => {
        if (!currentSlide) return;
        console.log('[PresentationApp] Video ended for slide:', currentSlide.id);
    };

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error('[PresentationApp] Fullscreen toggle failed:', error);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!broadcastManager) return;

        console.log('[PresentationApp] Setting up slide and command listeners');

        const unsubscribeSlides = broadcastManager.onSlideUpdate((slide: Slide) => {
            console.log('[PresentationApp] Received slide update:', slide.id, slide.title);
            setCurrentSlide(slide);
            setIsConnectedToHost(true);
            setStatusMessage('Connected - Presentation Display Active');
            setConnectionError(false);
        });

        const handleHostCommand = (command: HostCommand) => {
            if (command.action === 'close_presentation') {
                console.log('[PresentationApp] Received close_presentation command from host. Closing window.');
                window.close();
            }
        };

        const unsubscribeCommands = broadcastManager.onHostCommand(handleHostCommand);

        return () => {
            console.log('[PresentationApp] Cleaning up listeners');
            unsubscribeSlides();
            unsubscribeCommands();
        };
    }, [broadcastManager]);

    useEffect(() => {
        if (!sessionId || !broadcastManager) return;

        const connectionTimeout = setTimeout(() => {
            if (!isConnectedToHost) {
                setConnectionError(true);
                setStatusMessage('Unable to connect to host. Please ensure the host dashboard is open.');
            }
        }, 10000);

        return () => clearTimeout(connectionTimeout);
    }, [sessionId, broadcastManager, isConnectedToHost]);

    useEffect(() => {
        if (broadcastManager) {
            console.log('[PresentationApp] Presentation initialized and ready');
        }
    }, [broadcastManager]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && broadcastManager && !isConnectedToHost) {
                console.log('[PresentationApp] Page became visible, announcing ready');
                broadcastManager.sendStatus('ready');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [broadcastManager, isConnectedToHost]);

    const handleRetry = () => {
        setConnectionError(false);
        setStatusMessage('Reconnecting...');

        if (broadcastManager) {
            broadcastManager.sendStatus('ready');
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            <SlideRenderer
                slide={currentSlide}
                sessionId={sessionId}
                isHost={false}
                onVideoEnd={handleVideoEnd}
            />

            {/* OVERLAYS for status messages */}
            {(!isConnectedToHost || (!currentSlide && !connectionError)) && (
                <div className="absolute inset-0 bg-gray-900 z-40 flex items-center justify-center">
                    <div className="text-center text-white p-8 max-w-md">
                        {connectionError ? (
                            <>
                                <Monitor size={48} className="mx-auto mb-4 text-red-400"/>
                                <h1 className="text-2xl font-bold mb-2 text-red-300">Connection Issue</h1>
                                <p className="text-lg text-gray-300 mb-4">{statusMessage}</p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleRetry}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mx-auto transition-colors"
                                    >
                                        <RefreshCw size={16}/>
                                        Retry Connection
                                    </button>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg mx-auto transition-colors"
                                    >
                                        <RefreshCw size={16}/>
                                        Reload Page
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-4">
                                    Make sure the host dashboard is open and active
                                </p>
                            </>
                        ) : (
                            <>
                                <Hourglass size={48} className="mx-auto mb-4 text-blue-400 animate-pulse"/>
                                <h1 className="text-2xl font-bold mb-2">Presentation Display</h1>
                                <p className="text-lg text-gray-300 mb-2">{statusMessage}</p>
                                {sessionId && (
                                    <p className="text-sm text-gray-500 mt-4">
                                        Session ID: {sessionId}
                                    </p>
                                )}
                                <div className="mt-6 text-sm text-gray-400">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <WifiOff size={16} className="text-red-400"/>
                                        <span>Waiting for host connection</span>
                                    </div>
                                    <p className="text-xs">
                                        Make sure the host dashboard is open and active
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button
                    onClick={toggleFullscreen}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-900/80 text-gray-300 border border-gray-700 hover:bg-gray-800/80 hover:text-white transition-colors flex items-center gap-1"
                    title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
                >
                    {isFullscreen ? (
                        <>
                            <Minimize size={12}/>
                            <span>Exit</span>
                        </>
                    ) : (
                        <>
                            <Maximize size={12}/>
                            <span>Maximize</span>
                        </>
                    )}
                </button>

                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isConnectedToHost
                        ? 'bg-green-900/80 text-green-300 border border-green-700'
                        : 'bg-red-900/80 text-red-300 border border-red-700'
                }`}>
                    <div className="flex items-center gap-2">
                        {isConnectedToHost ? (
                            <Wifi size={12} className="text-green-400"/>
                        ) : (
                            <WifiOff size={12} className="text-red-400"/>
                        )}
                        <span>
                            {isConnectedToHost ? 'Live' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>

            {process.env.NODE_ENV === 'development' && currentSlide && (
                <div
                    className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-20">
                    <div>Slide: {currentSlide.id}</div>
                    <div>Mode: Presentation (Slave)</div>
                    <div>Connected: {isConnectedToHost ? 'Yes' : 'No'}</div>
                    <div>Fullscreen: {isFullscreen ? 'Yes' : 'No'}</div>
                    <div>Session: {sessionId?.substring(0, 8)}...</div>
                </div>
            )}
        </div>
    );
};

export default PresentationApp;
