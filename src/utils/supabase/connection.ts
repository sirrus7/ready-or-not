// src/utils/supabase/connection.ts - Connection monitoring
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './client';

export interface ConnectionStatus {
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    isConnected: boolean;
    lastConnectionTime: number | null;
    error?: string;
}

// Connection monitoring hook
export const useSupabaseConnection = () => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
        status: 'connecting',
        isConnected: false,
        lastConnectionTime: null
    });

    const testChannelRef = useRef<any>(null);
    const testIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const testConnection = useCallback(async (): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('count')
                .limit(1);
            return !error;
        } catch {
            return false;
        }
    }, []);

    const updateStatus = useCallback((updates: Partial<ConnectionStatus>) => {
        setConnectionStatus(prev => {
            const newStatus = { ...prev, ...updates };
            if (newStatus.status !== prev.status) {
                console.log(`[Supabase Connection] Status: ${newStatus.status}`);
            }
            return newStatus;
        });
    }, []);

    useEffect(() => {
        // Create test channel for connection monitoring
        testChannelRef.current = supabase.channel('connection-test');

        testChannelRef.current.subscribe((status: string) => {
            switch (status) {
                case 'SUBSCRIBED':
                    updateStatus({
                        status: 'connected',
                        isConnected: true,
                        lastConnectionTime: Date.now()
                    });
                    break;
                case 'CHANNEL_ERROR':
                case 'TIMED_OUT':
                    updateStatus({
                        status: 'error',
                        isConnected: false,
                        error: `Connection failed: ${status}`
                    });
                    break;
                case 'CLOSED':
                    updateStatus({
                        status: 'disconnected',
                        isConnected: false
                    });
                    break;
            }
        });

        // Periodic health check
        testIntervalRef.current = setInterval(async () => {
            const isHealthy = await testConnection();
            if (!isHealthy && connectionStatus.isConnected) {
                updateStatus({
                    status: 'error',
                    isConnected: false,
                    error: 'Health check failed'
                });
            }
        }, 30000);

        return () => {
            if (testChannelRef.current) {
                supabase.removeChannel(testChannelRef.current);
            }
            if (testIntervalRef.current) {
                clearInterval(testIntervalRef.current);
            }
        };
    }, [testConnection, updateStatus, connectionStatus.isConnected]);

    return connectionStatus;
};
