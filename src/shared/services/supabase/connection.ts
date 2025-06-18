// src/utils/supabase/connection.ts - Enhanced Connection Management
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './client';
import { db } from './services';
import {healthService} from "@shared/services/supabase/services/healthService.ts";

export interface ConnectionStatus {
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    isConnected: boolean;
    lastConnectionTime: number | null;
    latency: number | null;
    error?: string;
    reconnectAttempts: number;
}

export interface ConnectionMetrics {
    avgLatency: number;
    successfulRequests: number;
    failedRequests: number;
    lastHealthCheck: number | null;
}

// Singleton connection manager
class SupabaseConnectionManager {
    private static instance: SupabaseConnectionManager;
    private listeners: Set<(status: ConnectionStatus) => void> = new Set();
    private metricsListeners: Set<(metrics: ConnectionMetrics) => void> = new Set();

    private currentStatus: ConnectionStatus = {
        status: 'connecting',
        isConnected: false,
        lastConnectionTime: null,
        latency: null,
        reconnectAttempts: 0
    };

    private metrics: ConnectionMetrics = {
        avgLatency: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastHealthCheck: null
    };

    private testChannel: any = null;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private latencyHistory: number[] = [];

    private constructor() {
        this.initialize();
    }

    static getInstance(): SupabaseConnectionManager {
        if (!SupabaseConnectionManager.instance) {
            SupabaseConnectionManager.instance = new SupabaseConnectionManager();
        }
        return SupabaseConnectionManager.instance;
    }

    private initialize() {
        this.setupRealtimeConnection();
        this.startHealthChecking();
        this.setupGlobalErrorHandling();
    }

    private setupRealtimeConnection() {
        // Clean up existing channel
        if (this.testChannel) {
            supabase.removeChannel(this.testChannel);
        }

        this.testChannel = supabase.channel('connection-monitor');

        this.testChannel.subscribe((status: string) => {
            const now = Date.now();

            switch (status) {
                case 'SUBSCRIBED':
                    this.updateStatus({
                        status: 'connected',
                        isConnected: true,
                        lastConnectionTime: now,
                        reconnectAttempts: 0
                    });
                    break;

                case 'CHANNEL_ERROR':
                case 'TIMED_OUT':
                    this.updateStatus({
                        status: 'error',
                        isConnected: false,
                        error: `Realtime connection failed: ${status}`
                    });
                    this.scheduleReconnect();
                    break;

                case 'CLOSED':
                    this.updateStatus({
                        status: 'disconnected',
                        isConnected: false
                    });
                    this.scheduleReconnect();
                    break;
            }
        });
    }

    private async performHealthCheck(): Promise<boolean> {
        const startTime = Date.now();

        try {
            const healthResult = await healthService.healthCheck();
            const latency = Date.now() - startTime;

            this.recordLatency(latency);
            this.updateMetrics({
                lastHealthCheck: Date.now(),
                successfulRequests: this.metrics.successfulRequests + 1
            });

            if (healthResult.isHealthy) {
                if (!this.currentStatus.isConnected) {
                    this.updateStatus({
                        status: 'connected',
                        isConnected: true,
                        lastConnectionTime: Date.now(),
                        latency,
                        error: undefined,
                        reconnectAttempts: 0
                    });
                } else {
                    this.updateStatus({ latency });
                }
                return true;
            } else {
                throw new Error(healthResult.error || 'Health check failed');
            }
        } catch (error) {
            const latency = Date.now() - startTime;
            this.recordLatency(latency);
            this.updateMetrics({
                failedRequests: this.metrics.failedRequests + 1
            });

            if (this.currentStatus.isConnected) {
                this.updateStatus({
                    status: 'error',
                    isConnected: false,
                    error: error instanceof Error ? error.message : 'Health check failed',
                    latency
                });
            }
            return false;
        }
    }

    private recordLatency(latency: number) {
        this.latencyHistory.push(latency);

        // Keep only last 20 measurements
        if (this.latencyHistory.length > 20) {
            this.latencyHistory.shift();
        }

        const avgLatency = this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
        this.updateMetrics({ avgLatency: Math.round(avgLatency) });
    }

    private startHealthChecking() {
        // Initial health check
        this.performHealthCheck();

        // Regular health checks every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000);
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        const attempts = this.currentStatus.reconnectAttempts;
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30 seconds

        this.updateStatus({
            reconnectAttempts: attempts + 1
        });

        console.log(`[Supabase Connection] Scheduling reconnect in ${delay}ms (attempt ${attempts + 1})`);

        this.reconnectTimeout = setTimeout(() => {
            this.setupRealtimeConnection();
            this.performHealthCheck();
        }, delay);
    }

    private setupGlobalErrorHandling() {
        // Monitor for network status changes
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[Supabase Connection] Network back online, checking connection');
                this.performHealthCheck();
            });

            window.addEventListener('offline', () => {
                console.log('[Supabase Connection] Network offline detected');
                this.updateStatus({
                    status: 'disconnected',
                    isConnected: false,
                    error: 'Network offline'
                });
            });
        }
    }

    private updateStatus(updates: Partial<ConnectionStatus>) {
        const oldStatus = { ...this.currentStatus };
        this.currentStatus = { ...this.currentStatus, ...updates };

        // Log significant status changes
        if (oldStatus.status !== this.currentStatus.status) {
            console.log(`[Supabase Connection] Status: ${oldStatus.status} → ${this.currentStatus.status}`);
        }

        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener(this.currentStatus);
            } catch (error) {
                console.error('[Supabase Connection] Error in status listener:', error);
            }
        });
    }

    private updateMetrics(updates: Partial<ConnectionMetrics>) {
        this.metrics = { ...this.metrics, ...updates };

        this.metricsListeners.forEach(listener => {
            try {
                listener(this.metrics);
            } catch (error) {
                console.error('[Supabase Connection] Error in metrics listener:', error);
            }
        });
    }

    // Public API
    getStatus(): ConnectionStatus {
        return { ...this.currentStatus };
    }

    getMetrics(): ConnectionMetrics {
        return { ...this.metrics };
    }

    addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
        this.listeners.add(listener);

        // Immediately call with current status
        listener(this.currentStatus);

        return () => {
            this.listeners.delete(listener);
        };
    }

    addMetricsListener(listener: (metrics: ConnectionMetrics) => void): () => void {
        this.metricsListeners.add(listener);

        // Immediately call with current metrics
        listener(this.metrics);

        return () => {
            this.metricsListeners.delete(listener);
        };
    }

    async forceHealthCheck(): Promise<boolean> {
        return this.performHealthCheck();
    }

    async forceReconnect(): Promise<void> {
        console.log('[Supabase Connection] Force reconnect triggered');
        this.updateStatus({
            status: 'connecting',
            reconnectAttempts: 0
        });

        this.setupRealtimeConnection();
        await this.performHealthCheck();
    }

    destroy() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.testChannel) {
            supabase.removeChannel(this.testChannel);
            this.testChannel = null;
        }

        this.listeners.clear();
        this.metricsListeners.clear();
    }
}

// React hooks for clean component integration
export const useSupabaseConnection = () => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() =>
        SupabaseConnectionManager.getInstance().getStatus()
    );

    useEffect(() => {
        const manager = SupabaseConnectionManager.getInstance();
        return manager.addStatusListener(setConnectionStatus);
    }, []);

    const forceReconnect = useCallback(async () => {
        const manager = SupabaseConnectionManager.getInstance();
        await manager.forceReconnect();
    }, []);

    const forceHealthCheck = useCallback(async () => {
        const manager = SupabaseConnectionManager.getInstance();
        return manager.forceHealthCheck();
    }, []);

    return {
        ...connectionStatus,
        forceReconnect,
        forceHealthCheck
    };
};

export const useSupabaseMetrics = () => {
    const [metrics, setMetrics] = useState<ConnectionMetrics>(() =>
        SupabaseConnectionManager.getInstance().getMetrics()
    );

    useEffect(() => {
        const manager = SupabaseConnectionManager.getInstance();
        return manager.addMetricsListener(setMetrics);
    }, []);

    return metrics;
};

// Legacy compatibility (for gradual migration)
export const addConnectionListener = (callback: (status: any) => void) => {
    console.warn('[Supabase] addConnectionListener deprecated. Use useSupabaseConnection hook.');
    const manager = SupabaseConnectionManager.getInstance();
    return manager.addStatusListener(callback);
};

export const getConnectionStatus = () => {
    console.warn('[Supabase] getConnectionStatus deprecated. Use useSupabaseConnection hook.');
    return SupabaseConnectionManager.getInstance().getStatus();
};