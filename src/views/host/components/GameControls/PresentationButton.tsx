// src/views/host/components/GameControls/PresentationButton.tsx - Simplified with master-slave pattern
import React, {useEffect, useRef, useState} from 'react';
import {ExternalLink, Wifi} from 'lucide-react';
import {useGameContext} from '@app/providers/GameProvider';
import {ConnectionStatus, SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';

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

        return broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            setConnectionStatus(status);

            // Send current slide when presentation connects
            if (status === 'connected' && currentSlideData) {
                setTimeout(() => {
                    broadcastManager.sendSlideUpdate(currentSlideData);
                }, 500);
            }
        });
    }, [broadcastManager, currentSlideData]);

    // Send slide updates when current slide changes
    useEffect(() => {
        if (broadcastManager && currentSlideData && connectionStatus === 'connected') {
            broadcastManager.sendSlideUpdate(currentSlideData);
        }
    }, [broadcastManager, currentSlideData?.id, connectionStatus]);

    // Monitor presentation tab state
    useEffect(() => {
        if (!presentationTabRef.current) return;

        const checkInterval = setInterval(() => {
            if (presentationTabRef.current?.closed) {
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

        const url = `/display/${state.currentSessionId}`;

        // Open new window for presentation
        const newTab = window.open(url, '_blank');

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
                    bgClass: 'bg-game-orange-600',
                    textClass: 'text-white',
                    iconClass: 'text-white',
                    statusText: 'Launch Presentation Display',
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
