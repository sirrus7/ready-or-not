// src/utils/supabase/index.ts - Complete Supabase Integration
// Clean, organized exports with enhanced functionality

// Core client
export { supabase } from './client';

export { db } from './services';

// Enhanced database operations
export {
    formatSupabaseError,
    withRetry,
    callRPC
} from './database';

// Enhanced connection monitoring
export {
    useSupabaseConnection,
    useSupabaseMetrics,
    type ConnectionStatus,
    type ConnectionMetrics
} from './connection';

// Realtime subscriptions
export {
    createChannel,
    useRealtimeSubscription
} from './realtime';

// Auth operations
export { auth } from './auth';

// Legacy compatibility (deprecated - will be removed in future version)
export const addConnectionListener = () => {
    console.warn('[Supabase] addConnectionListener deprecated. Use useSupabaseConnection hook.');
    return () => {};
};

export const getConnectionStatus = () => {
    console.warn('[Supabase] getConnectionStatus deprecated. Use useSupabaseConnection hook.');
    return { status: 'connected', isConnected: true, lastConnectionTime: Date.now() };
};