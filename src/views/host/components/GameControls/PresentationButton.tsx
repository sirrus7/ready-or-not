// src/components/Host/Controls/PresentationDisplayButton.tsx
import React, {useState, useEffect, useRef} from 'react';
import {ExternalLink, Monitor} from 'lucide-react';
import {useGameContext} from '@app/providers/GameProvider';
import {useBroadcastManager} from '@core/sync/BroadcastChannel';

type PresentationStatus = 'connecting' | 'connected' | 'disconnected';

const PresentationDisplayButton: React.FC = () => {
    const {state, currentSlideData} = useGameContext();
    const [isPresentationDisplayOpen, setIsPresentationDisplayOpen] = useState(false);
    const [presentationStatus, setPresentationStatus] = useState<PresentationStatus>('disconnected');

    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const presentationTabRef = useRef<Window | null>(null);
    const broadcastManager = useBroadcastManager(state.currentSessionId, 'host');

    // Clear connection timeout helper
    const clearConnectionTimeout = () => {
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
    };

    // Enhanced presentation display connection monitoring
    useEffect(() => {
        if (!broadcastManager) return;

        console.log('[PresentationDisplayButton] Setting up broadcast listeners');

        // Monitor connection to presentation display
        const unsubscribeConnection = broadcastManager.onConnectionChange((status) => {
            const isPresentation = status.connectionType === 'presentation';
            const wasConnected = isPresentationDisplayOpen;
            const nowConnected = status.isConnected && isPresentation;

            console.log(`[PresentationDisplayButton] Connection change - was: ${wasConnected}, now: ${nowConnected}, type: ${status.connectionType}`);

            setIsPresentationDisplayOpen(nowConnected);

            if (nowConnected) {
                setPresentationStatus('connected');
                clearConnectionTimeout();
            } else if (wasConnected) {
                setPresentationStatus('disconnected');
            }

            if (!wasConnected && nowConnected) {
                console.log('[PresentationDisplayButton] Presentation display connected');

                // Send current slide when presentation connects
                if (currentSlideData) {
                    console.log('[PresentationDisplayButton] Sending current slide to presentation:', currentSlideData.id);
                    setTimeout(() => {
                        broadcastManager.sendSlideUpdate(currentSlideData);
                    }, 300);
                }
            } else if (wasConnected && !nowConnected) {
                console.log('[PresentationDisplayButton] Presentation display disconnected');
            }
        });

        // Handle presentation ready events
        const unsubscribeReady = broadcastManager.subscribe('PRESENTATION_READY', () => {
            console.log('[PresentationDisplayButton] Presentation ready received');
            setIsPresentationDisplayOpen(true);
            setPresentationStatus('connected');
            clearConnectionTimeout();

            // Send current slide when presentation connects
            if (currentSlideData) {
                console.log('[PresentationDisplayButton] Sending current slide to presentation:', currentSlideData.id);
                setTimeout(() => {
                    broadcastManager.sendSlideUpdate(currentSlideData);
                }, 200);
            }
        });

        // Handle current state requests from presentation
        const unsubscribeStateRequest = broadcastManager.subscribe('REQUEST_CURRENT_STATE', () => {
            console.log('[PresentationDisplayButton] Presentation requesting current state');
            if (currentSlideData) {
                broadcastManager.sendSlideUpdate(currentSlideData);
            }
        });

        // Handle presentation heartbeat
        const unsubscribeHeartbeat = broadcastManager.subscribe('PRESENTATION_HEARTBEAT', () => {
            console.log('[PresentationDisplayButton] Received presentation heartbeat');
            setIsPresentationDisplayOpen(true);
            setPresentationStatus('connected');
            clearConnectionTimeout();
        });

        return () => {
            console.log('[PresentationDisplayButton] Cleaning up broadcast listeners');
            clearConnectionTimeout();
            unsubscribeConnection();
            unsubscribeReady();
            unsubscribeStateRequest();
            unsubscribeHeartbeat();
        };
    }, [broadcastManager, currentSlideData, isPresentationDisplayOpen]);

    // Send slide updates when current slide changes
    useEffect(() => {
        if (broadcastManager && currentSlideData && isPresentationDisplayOpen) {
            console.log('[PresentationDisplayButton] Sending slide update to presentation:', currentSlideData.id);
            // Small delay to ensure presentation is ready
            setTimeout(() => {
                broadcastManager.sendSlideUpdate(currentSlideData);
            }, 100);
        }
    }, [broadcastManager, currentSlideData, isPresentationDisplayOpen]);

    // Monitor presentation tab status
    useEffect(() => {
        if (presentationTabRef.current && !presentationTabRef.current.closed) {
            const checkInterval = setInterval(() => {
                if (presentationTabRef.current?.closed) {
                    console.log('[PresentationDisplayButton] Presentation tab was closed');
                    setIsPresentationDisplayOpen(false);
                    setPresentationStatus('disconnected');
                    presentationTabRef.current = null;
                    clearInterval(checkInterval);
                }
            }, 1000);

            return () => clearInterval(checkInterval);
        }
    }, []);

    const handleOpenDisplay = () => {
        if (!state.currentSessionId) {
            alert("No active session. Please create or select a game first.");
            return;
        }

        const url = `/student-display/${state.currentSessionId}`;
        console.log('[PresentationDisplayButton] Opening presentation display:', url);

        const newTab = window.open(url, '_blank', 'width=1920,height=1080');

        if (newTab) {
            console.log('[PresentationDisplayButton] Presentation display opened in new tab');
            presentationTabRef.current = newTab;
            setPresentationStatus('connecting');

            // Set up connection timeout
            clearConnectionTimeout();
            connectionTimeoutRef.current = setTimeout(() => {
                if (!isPresentationDisplayOpen) {
                    console.log('[PresentationDisplayButton] Presentation connection timeout');
                    setPresentationStatus('disconnected');
                }
            }, 8000);

            // Give the new tab time to initialize and connect
            setTimeout(() => {
                if (broadcastManager && currentSlideData) {
                    console.log('[PresentationDisplayButton] Sending initial slide after delay:', currentSlideData.id);
                    broadcastManager.sendSlideUpdate(currentSlideData);
                }
            }, 2000);
        } else {
            alert("Failed to open presentation display. Please ensure pop-ups are allowed for this site.");
            setPresentationStatus('disconnected');
        }
    };

    // Get status styling based on presentation status
    const getStatusStyling = () => {
        switch (presentationStatus) {
            case 'connected':
                return {
                    bgClass: 'bg-green-50 border-green-200',
                    textClass: 'text-green-700',
                    iconClass: 'text-green-500',
                    dotClass: 'bg-green-500 animate-pulse',
                    statusText: 'Presentation Display Active'
                };
            case 'connecting':
                return {
                    bgClass: 'bg-yellow-50 border-yellow-200',
                    textClass: 'text-yellow-700',
                    iconClass: 'text-yellow-500',
                    dotClass: 'bg-yellow-500 animate-pulse',
                    statusText: 'Connecting to Display...'
                };
            default:
                return {
                    bgClass: 'bg-blue-600',
                    textClass: 'text-white',
                    iconClass: 'text-white',
                    dotClass: '',
                    statusText: 'Launch Student Display'
                };
        }
    };

    const styling = getStatusStyling();

    if (isPresentationDisplayOpen) {
        return (
            <div className={`flex items-center justify-between p-2 ${styling.bgClass} border rounded-lg`}>
                <div className={`flex items-center gap-2 ${styling.textClass}`}>
                    {styling.dotClass && (
                        <div className={`w-2 h-2 ${styling.dotClass} rounded-full`}></div>
                    )}
                    <Monitor size={16} className={styling.iconClass}/>
                    <span className="text-sm font-medium">{styling.statusText}</span>
                </div>
                <span className="text-xs text-green-600">Synced with student display</span>
            </div>
        );
    }

    return (
        <button
            onClick={handleOpenDisplay}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 ${styling.bgClass} ${styling.textClass} font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm`}
        >
            <ExternalLink size={16} className={styling.iconClass}/>
            <span>{styling.statusText}</span>
        </button>
    );
};

export default PresentationDisplayButton;
