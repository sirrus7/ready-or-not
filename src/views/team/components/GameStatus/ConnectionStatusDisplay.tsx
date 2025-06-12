// src/views/team/components/GameStatus/ConnectionStatusDisplay.tsx
import React from 'react';
import {Wifi, WifiOff} from 'lucide-react';

interface ConnectionStatusDisplayProps {
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

const ConnectionStatusDisplay: React.FC<ConnectionStatusDisplayProps> = ({connectionStatus}) => {
    const isConnected = connectionStatus === 'connected';

    return (
        <div className="fixed bottom-4 right-4 z-20">
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                isConnected
                    ? 'bg-green-900/80 text-green-300 border border-green-700'
                    : 'bg-red-900/80 text-red-300 border border-red-700'
            }`}>
                {isConnected ? <Wifi size={12}/> : <WifiOff size={12}/>}
                <span>{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
        </div>
    );
};

export default ConnectionStatusDisplay;
