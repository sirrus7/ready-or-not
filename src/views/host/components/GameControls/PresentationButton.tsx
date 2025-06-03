// src/views/host/components/GameControls/PresentationButton.tsx - Simplified with master-slave pattern
import React, {useState, useEffect, useRef} from 'react';
import {ExternalLink, Monitor, Wifi, WifiOff} from 'lucide-react';
import {useGameContext} from '@app/providers/GameProvider';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';

/**
 * Simplified presentation button that launches and monitors presentation display
 * Uses SimpleBroadcastManager for basic connection status only
 */
const PresentationButton: React.FC = () => {
    const {state, currentSlideData} = useGameContext();
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const presentationTabRef = useRef<Window | null>(null);
    const broadcastManager = state.currentSessionId ?
        SimpleBroadcastManager.getInstance(state.currentSessionId, 'host') : null;

    // Monitor connection status
    useEffect(() => {
        if (!broadcastManager) return;

        const unsubscribe = broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            console.log('[PresentationButton] Connection status changed:', status);
            setConnectionStatus(status);

            // Send current slide when presentation connects
            if (status === 'connected' && currentSlideData) {
                console.log('[PresentationButton] Sending current slide to connected presentation');
                setTimeout(() => {
                    broadcastManager.sendSlideUpdate(currentSlideData);
                }, 500);
            }
        });

        return unsubscribe;
    }, [broadcastManager, currentSlideData]);

    // Send slide updates when current slide changes
    useEffect(() => {
        if (broadcastManager && currentSlideData && connectionStatus === 'connected') {
            console.log('[PresentationButton] Sending slide update:', currentSlideData.id, currentSlideData.title);
            broadcastManager.sendSlideUpdate(currentSlideData);
        }
    }, [broadcastManager, currentSlideData?.id, connectionStatus]);

    // Monitor presentation tab state
    useEffect(() => {
        if (!presentationTabRef.current) return;

        const checkInterval = setInterval(() => {
            if (presentationTabRef.current?.closed) {
                console.log('[PresentationButton] Presentation tab was closed');
                setConnectionStatus('disconnected');
                presentationTabRef.current = null;
                clearInterval(checkInterval);
            }
        }, 2000);

        return () => clearInterval(checkInterval);
    }, [presentationTabRef.current]);

    const handleOpenDisplay = () => {
        if (!state.currentSessionId) {
            alert("No active session. Please create or select a game first.");
            return;
        }

        const url = `/student-display/${state.currentSessionId}`;
        console.log('[PresentationButton] Opening presentation display:', url);

        // Open new window for presentation
        const newTab = window.open(url, '_blank', 'width=1920,height=1080');

        if (newTab) {
            presentationTabRef.current = newTab;
            setConnectionStatus('connecting');

            // Send current slide after delay to allow tab to initialize
            if (currentSlideData) {
                setTimeout(() => {
                    if (broadcastManager) {
                        broadcastManager.sendSlideUpdate(currentSlideData);
                    }
                }, 2000);
            }
        } else {
            alert("Failed to open presentation display. Please ensure pop-ups are allowed for this site.");
            setConnectionStatus('disconnected');
        }
    };

    // Determine button styling based on connection status
    const getButtonStyling = () => {
        switch (connectionStatus) {
            case 'connected':
                return {
                    bgClass: 'bg-green-50 border-green-200',
                    textClass: 'text-green-700',
                    iconClass: 'text-green-500',
                    statusText: 'Presentation Display Active',
                    statusIcon: <Wifi size={16} className="text-green-500 ml-2"/>
                };
            case 'connecting':
                return {
                    bgClass: 'bg-yellow-50 border-yellow-200',
                    textClass: 'text-yellow-700',
                    iconClass: 'text-yellow-500',
                    statusText: 'Connecting to Display...',
                    statusIcon: <Wifi size={16} className="text-yellow-500 animate-pulse ml-2"/>
                };
            default: // disconnected
                return {
                    bgClass: 'bg-blue-600',
                    textClass: 'text-white',
                    iconClass: 'text-white',
                    statusText: 'Launch Student Display',
                    statusIcon: null
                };
        }
    };

    const styling = getButtonStyling();

    return (
        <button
            onClick={handleOpenDisplay}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors shadow-md text-sm ${styling.bgClass} ${styling.textClass} hover:opacity-90`}
        >
            <ExternalLink size={16} className={styling.iconClass}/>
            <span>{styling.statusText}</span>
            {styling.statusIcon}
        </button>
    );
};

export default PresentationButton;
