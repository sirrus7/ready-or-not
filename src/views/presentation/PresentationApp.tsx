// src/views/presentation/PresentationApp.tsx
import React, {useEffect, useState, useRef} from 'react';
import {useParams} from 'react-router-dom';
import {Slide} from '@shared/types/game';
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import {Hourglass, Monitor, RefreshCw, Wifi, WifiOff, Maximize, Minimize} from 'lucide-react';
import { usePresentationSyncManager } from '@core/sync/PresentationSyncManager';
import {Team, TeamDecision, TeamRoundData} from "@shared/types";
/**
 * Simplified presentation app that immediately displays content from the host.
 */
const PresentationApp: React.FC = () => {
    console.log('[PresentationApp] Component rendered');
    const {sessionId} = useParams<{ sessionId: string }>();
    console.log('[PresentationApp] SessionId:', sessionId);
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Initializing display...');
    const [connectionError, setConnectionError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [broadcastedTeamData, setBroadcastedTeamData] = useState<{
        teams: Team[];
        teamRoundData: Record<string, Record<number, TeamRoundData>>;
        teamDecisions: TeamDecision[];
    } | null>(null);
    const [joinInfo, setJoinInfo] = useState<{
        joinUrl: string;
        qrCodeDataUrl: string;
    } | null>(null);

    const syncManager = usePresentationSyncManager(sessionId || null);
    console.log('[PresentationApp] SyncManager:', syncManager ? 'created' : 'null');
    const connectionTimeoutRef = useRef<NodeJS.Timeout>();
    const isInitializedRef = useRef(false);
    const previousConnectionStateRef = useRef<boolean>(false);

    // Log state changes
    useEffect(() => {
        const currentState = { isConnectedToHost, currentSlide: !!currentSlide, connectionError };
        const previousState = previousConnectionStateRef.current;
        
        if (previousState !== isConnectedToHost) {
            console.log('[PresentationApp] Connection status changed:', {
                from: previousState,
                to: isConnectedToHost,
                hasSlide: !!currentSlide,
                hasError: connectionError
            });
            previousConnectionStateRef.current = isConnectedToHost;
        }
    }, [isConnectedToHost, currentSlide, connectionError]);

    // Track component lifecycle
    useEffect(() => {
        console.log('[PresentationApp] Component mounted, isInitialized:', isInitializedRef.current);
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            console.log('[PresentationApp] First time initialization');
        }
        return () => {
            console.log('[PresentationApp] Component unmounting');
        };
    }, []);

    useEffect(() => {
        document.title = "Ready or Not - Presentation";
    }, []);

    useEffect(() => {
        if (!syncManager) return;
        console.log('[PresentationApp] Setting up slide update listener');
        const unsub = syncManager.onSlideUpdate((slide, teamData) => {
            console.log('[PresentationApp] Received slide update:', slide?.id, slide?.title);
            setCurrentSlide(slide);
            console.log('[PresentationApp] Setting isConnectedToHost to true');
            setIsConnectedToHost(true);
            setStatusMessage('Connected - Presentation Display Active');
            setConnectionError(false);
            if (teamData) setBroadcastedTeamData(teamData);
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = setTimeout(() => {
                console.log('[PresentationApp] Connection timeout - setting disconnected');
                setIsConnectedToHost(false);
                setStatusMessage('Connection lost - waiting for host...');
                setConnectionError(true);
            }, 10000);
        });
        return () => {
            console.log('[PresentationApp] Cleaning up slide update listener');
            unsub();
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        };
    }, [syncManager]);

    useEffect(() => {
        if (!syncManager) return;
        const unsub = syncManager.onJoinInfo((joinUrl, qrCodeDataUrl) => {
            if (joinUrl && qrCodeDataUrl) {
                setJoinInfo({ joinUrl, qrCodeDataUrl });
            } else {
                setJoinInfo(null);
            }
        });
        return unsub;
    }, [syncManager]);

    const videoRef = useRef<{ sendCommand: (action: string, data?: any) => void } | null>(null);

    const handleVideoEnd = () => {
        if (!currentSlide) return;
    };

    useEffect(() => {
        if (!syncManager) return;
        console.log('[PresentationApp] Setting up host command listener');
        const unsub = syncManager.onHostCommand((command) => {
            console.log('[PresentationApp] Received host command:', command.action, command.data);
            if (!videoRef.current) {
                console.log('[PresentationApp] No video ref available for command:', command.action);
                return;
            }
            console.log('[PresentationApp] Executing command on video:', command.action);
            switch (command.action) {
                case 'play':
                case 'pause':
                case 'seek':
                case 'reset':
                case 'volume':
                    videoRef.current.sendCommand(command.action, command.data);
                    break;
                case 'close_presentation':
                    window.close();
                    break;
            }
            console.log('[PresentationApp] Setting isConnectedToHost to true (from command)');
            setIsConnectedToHost(true);
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = setTimeout(() => {
                console.log('[PresentationApp] Command timeout - setting disconnected');
                setIsConnectedToHost(false);
                setStatusMessage('Connection lost - waiting for host...');
                setConnectionError(true);
            }, 10000);
        });
        return unsub;
    }, [syncManager]);

    useEffect(() => {
        if (!syncManager) return;
        const unsub = syncManager.onPing(() => {
            setIsConnectedToHost(true);
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = setTimeout(() => {
                setIsConnectedToHost(false);
                setStatusMessage('Connection lost - waiting for host...');
                setConnectionError(true);
            }, 10000);
        });
        return unsub;
    }, [syncManager]);

    useEffect(() => {
        if (!syncManager) return;
        syncManager.sendStatus('ready');
        const interval = setInterval(() => {
            syncManager.sendStatus('pong');
        }, 3000);
        return () => {
            clearInterval(interval);
        };
    }, [syncManager]);

    const handleConnectionStatusChange = (connected: boolean) => {
        setIsConnectedToHost(connected);
        if (!connected) {
            setStatusMessage('Connection lost - waiting for host...');
            setConnectionError(true);
        }
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
        if (!sessionId) return;

        const connectionTimeout = setTimeout(() => {
            if (!isConnectedToHost) {
                setConnectionError(true);
                setStatusMessage('Unable to connect to host. Please ensure the host dashboard is open.');
            }
        }, 5000);

        return () => clearTimeout(connectionTimeout);
    }, [sessionId, isConnectedToHost]);

    const handleRetry = () => {
        setConnectionError(false);
        setStatusMessage('Reconnecting...');
        // The sync component will handle reconnection
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative">
            {/* Presentation Sync Component - REMOVED */}
            {/* <PresentationSyncComponent ... /> */}
            
            <SlideRenderer
                slide={currentSlide}
                sessionId={sessionId}
                isHost={false}
                onVideoEnd={handleVideoEnd}
                teams={broadcastedTeamData?.teams || []}
                teamRoundData={broadcastedTeamData?.teamRoundData || {}}
                teamDecisions={broadcastedTeamData?.teamDecisions || []}
                onVideoControl={api => { 
                    console.log('[PresentationApp] Received video control API:', {
                        hasSendCommand: !!api.sendCommand
                    });
                    videoRef.current = api; 
                }}
            />

            {/* OVERLAYS for status messages */}
            {(() => {
                const shouldShowOverlay = (!isConnectedToHost || (!currentSlide && !connectionError));
                return shouldShowOverlay;
            })() && (
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
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-game-orange-600 hover:bg-game-orange-700 text-white rounded-lg mx-auto transition-colors"
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

            {joinInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900">Team Join Information</h2>
                        <p className="text-gray-600 mb-4">Teams join at:</p>
                        <div className="bg-gray-100 p-4 rounded-md mb-4">
                            <div className="font-mono text-blue-600 break-all text-lg">
                                {joinInfo.joinUrl}
                            </div>
                        </div>
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                                <img
                                    src={joinInfo.qrCodeDataUrl}
                                    alt="QR Code for student join link"
                                    className="w-48 h-48"
                                />
                                <p className="text-sm text-gray-500 mt-2">Scan to join game</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            Players will also need their Team Name and Team Passcode.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PresentationApp;
