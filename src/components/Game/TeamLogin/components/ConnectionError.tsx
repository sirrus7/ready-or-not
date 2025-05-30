// src/components/Game/TeamLogin/components/ConnectionError.tsx - Connection error display
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConnectionStatus } from '../../../../utils/supabase';

interface ConnectionErrorProps {
    connection: ConnectionStatus & {
        forceReconnect: () => Promise<void>;
    };
}

const ConnectionError: React.FC<ConnectionErrorProps> = ({ connection }) => {
    return (
        <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
            <div className="text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-red-400"/>
                <h2 className="text-xl font-bold mb-2">Connection Problem</h2>
                <p className="mb-4">{connection.error}</p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={connection.forceReconnect}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Retry Connection
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConnectionError;