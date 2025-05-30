// src/pages/TeamDisplayPage/components/ConnectionStatus.tsx - Connection indicator
import React from 'react';
import { ConnectionStatus as ConnectionStatusType } from '../../../utils/supabase';

interface ConnectionStatusProps {
    connection: ConnectionStatusType & {
        forceReconnect: () => Promise<void>;
        forceHealthCheck: () => Promise<boolean>;
    };
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connection }) => {
    return (
        <div className="fixed bottom-4 right-4 z-20">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                connection.isConnected
                    ? 'bg-green-900/80 text-green-300 border border-green-700'
                    : 'bg-red-900/80 text-red-300 border border-red-700'
            }`}>
                {connection.isConnected
                    ? `● Live ${connection.latency ? `(${connection.latency}ms)` : ''}`
                    : '● Disconnected'}
            </div>
        </div>
    );
};

export default ConnectionStatus;
