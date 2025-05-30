// src/utils/supabase/realtime.ts - Realtime subscriptions
import { supabase } from './client';
import { useEffect, useRef } from 'react';

export interface RealtimeSubscriptionConfig {
    table: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema?: string;
    filter?: string;
    onchange: (payload: any) => void;
}

// Simple channel creation
export const createChannel = (channelName: string) => {
    console.log(`[Supabase Realtime] Creating channel: ${channelName}`);
    return supabase.channel(channelName);
};

// Hook for managing realtime subscriptions
export const useRealtimeSubscription = (
    channelName: string,
    config: RealtimeSubscriptionConfig,
    enabled: boolean = true
) => {
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!enabled) return;

        console.log(`[Supabase Realtime] Setting up subscription: ${channelName}`);

        channelRef.current = createChannel(channelName)
            .on('postgres_changes', {
                event: config.event || '*',
                schema: config.schema || 'public',
                table: config.table,
                ...(config.filter && { filter: config.filter })
            }, config.onchange)
            .subscribe((status: string) => {
                console.log(`[Supabase Realtime] ${channelName} status: ${status}`);
            });

        return () => {
            if (channelRef.current) {
                console.log(`[Supabase Realtime] Cleaning up: ${channelName}`);
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [channelName, config.table, config.event, config.filter, enabled]);

    return channelRef.current;
};
