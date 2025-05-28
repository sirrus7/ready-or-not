// src/lib/supabase.ts
import {createClient} from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

console.log('[Supabase] Initializing client with:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    anonKeyLength: supabaseAnonKey?.length,
    environment: import.meta.env.MODE
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
    }
});

// Connection status tracking
let connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
let lastConnectionTime: number | null = null;
let connectionListeners: Array<(status: typeof connectionStatus) => void> = [];

// Function to add connection status listeners
export const addConnectionListener = (callback: (status: typeof connectionStatus) => void) => {
    connectionListeners.push(callback);
    // Immediately call with current status
    callback(connectionStatus);

    // Return cleanup function
    return () => {
        connectionListeners = connectionListeners.filter(cb => cb !== callback);
    };
};

// Get current connection status
export const getConnectionStatus = () => ({
    status: connectionStatus,
    lastConnectionTime,
    isConnected: connectionStatus === 'connected'
});

// Notify all listeners of status change
const notifyConnectionChange = (newStatus: typeof connectionStatus) => {
    if (newStatus !== connectionStatus) {
        connectionStatus = newStatus;
        if (newStatus === 'connected') {
            lastConnectionTime = Date.now();
        }
        console.log(`[Supabase] Connection status changed to: ${newStatus}`);
        connectionListeners.forEach(listener => listener(newStatus));
    }
};

// Monitor connection through channel subscriptions
export const monitorSupabaseConnection = () => {
    console.log('[Supabase] Starting connection monitoring');

    // Create a test channel to monitor connection
    const testChannel = supabase.channel('connection-test');

    testChannel.subscribe((status) => {
        console.log('[Supabase] Channel subscription status:', status);

        switch (status) {
            case 'SUBSCRIBED':
                notifyConnectionChange('connected');
                break;
            case 'CHANNEL_ERROR':
                notifyConnectionChange('error');
                break;
            case 'TIMED_OUT':
                notifyConnectionChange('error');
                break;
            case 'CLOSED':
                notifyConnectionChange('disconnected');
                break;
            default:
                if (connectionStatus === 'disconnected') {
                    notifyConnectionChange('connecting');
                }
        }
    });

    // Test connection periodically
    const connectionTestInterval = setInterval(async () => {
        try {
            const testResult = await checkSupabaseConnection();
            if (!testResult && connectionStatus === 'connected') {
                notifyConnectionChange('error');
            }
        } catch (error) {
            console.error('[Supabase] Periodic connection test failed:', error);
            if (connectionStatus === 'connected') {
                notifyConnectionChange('error');
            }
        }
    }, 30000); // Test every 30 seconds

    // Cleanup function
    return () => {
        clearInterval(connectionTestInterval);
        supabase.removeChannel(testChannel);
    };
};

// Utility function to check connection status
export const checkSupabaseConnection = async (): Promise<boolean> => {
    try {
        console.log('[Supabase] Testing connection...');

        // Use a simple query that should always work
        const {data, error} = await supabase
            .from('sessions')
            .select('count')
            .limit(1);

        if (error) {
            console.error('[Supabase] Connection test failed:', error);
            return false;
        }

        console.log('[Supabase] Connection test successful');
        return true;
    } catch (err) {
        console.error('[Supabase] Connection test error:', err);
        return false;
    }
};

// Enhanced channel creation helper with built-in monitoring
export const createMonitoredChannel = (channelName: string) => {
    console.log(`[Supabase] Creating monitored channel: ${channelName}`);

    const channel = supabase.channel(channelName);

    // Track this channel's status
    let channelStatus: string | null = null;

    const originalSubscribe = channel.subscribe.bind(channel);
    channel.subscribe = (callback?: (status: string) => void) => {
        return originalSubscribe((status: string) => {
            console.log(`[Supabase] Channel ${channelName} status: ${status}`);
            channelStatus = status;

            // Update global connection status based on channel status
            if (status === 'SUBSCRIBED' && connectionStatus !== 'connected') {
                notifyConnectionChange('connected');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                notifyConnectionChange('error');
            } else if (status === 'CLOSED' && connectionStatus === 'connected') {
                notifyConnectionChange('disconnected');
            }

            // Call the original callback if provided
            if (callback) {
                callback(status);
            }
        });
    };

    return channel;
};

// Initialize connection monitoring
monitorSupabaseConnection();