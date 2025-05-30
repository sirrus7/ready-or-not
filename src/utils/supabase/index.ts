// src/utils/supabase/index.ts - Main exports
// Clean, organized exports by service

// Core client
export { supabase } from './client';

// Database operations (organized by domain)
export { db, formatSupabaseError, withRetry } from './database';

// Realtime subscriptions
export { createChannel, useRealtimeSubscription } from './realtime';

// Connection monitoring
export { useSupabaseConnection, type ConnectionStatus } from './connection';

// Auth operations (for future expansion)
export { auth } from './auth';

// Legacy compatibility exports (can remove after migration)
export const addConnectionListener = () => {
    console.warn('[Supabase] addConnectionListener deprecated. Use useSupabaseConnection hook.');
    return () => {};
};

export const getConnectionStatus = () => {
    console.warn('[Supabase] getConnectionStatus deprecated. Use useSupabaseConnection hook.');
    return { status: 'connected', isConnected: true, lastConnectionTime: Date.now() };
};

export const createMonitoredChannel = createChannel; // Alias