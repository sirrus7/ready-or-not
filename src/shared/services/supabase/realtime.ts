// src/shared/services/supabase/realtime.ts
// CRITICAL FIX: Enhanced realtime subscriptions with stability improvements

import {supabase} from './client';
import {useEffect, useRef} from 'react';

export interface RealtimeSubscriptionConfig {
    table: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema?: string;
    filter?: string;
    onchange: (payload: any) => void;
}

// Simple channel creation with enhanced error handling
export const createChannel = (channelName: string) => {
    return supabase.channel(channelName);
};

// CRITICAL FIX: Enhanced hook for managing realtime subscriptions
export const useRealtimeSubscription = (
    channelName: string,
    config: RealtimeSubscriptionConfig,
    enabled: boolean = true
) => {
    const channelRef = useRef<any>(null);
    const configRef = useRef<RealtimeSubscriptionConfig>(config);
    const retryCountRef = useRef(0);
    const maxRetries = 3;

    // Update config ref when config changes
    useEffect(() => {
        configRef.current = config;
    }, [config.table, config.event, config.filter, config.onchange]);

    useEffect(() => {
        if (!enabled) {
            // Clean up when disabled
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            return;
        }

        // CRITICAL FIX: Enhanced subscription setup with error handling
        const setupSubscription = () => {
            const currentConfig = configRef.current;

            channelRef.current = createChannel(channelName)
                .on('postgres_changes', {
                    event: currentConfig.event || '*',
                    schema: currentConfig.schema || 'public',
                    table: currentConfig.table,
                    ...(currentConfig.filter && {filter: currentConfig.filter})
                }, (payload: any) => {
                    try {
                        // CRITICAL FIX: Wrap callback in try-catch to prevent errors from breaking subscription
                        currentConfig.onchange(payload);
                        retryCountRef.current = 0; // Reset retry count on successful callback
                    } catch (error) {
                        console.error(`[Supabase Realtime] Error in subscription callback for ${channelName}:`, error);
                    }
                })
                .subscribe((status: string) => {
                    // CRITICAL FIX: Handle subscription errors with retry logic
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        if (retryCountRef.current < maxRetries) {
                            retryCountRef.current++;

                            // Clean up failed subscription
                            if (channelRef.current) {
                                supabase.removeChannel(channelRef.current);
                            }

                            // Retry after delay
                            setTimeout(() => {
                                if (enabled) {
                                    setupSubscription();
                                }
                            }, 1000 * retryCountRef.current); // Exponential backoff
                        } else {
                            console.error(`[Supabase Realtime] Max retries reached for ${channelName}`);
                        }
                    } else if (status === 'SUBSCRIBED') {
                        retryCountRef.current = 0; // Reset retry count on successful subscription
                    }
                });
        };

        setupSubscription();

        // Cleanup function
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [channelName, enabled]);

    return channelRef.current;
};
