import React, { useState, useEffect } from 'react';
import { supabase } from '@shared/services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const RealtimeTimeout = 5000;
const DatabaseTimeout = 5000;

enum HealthStates {
    Healthy = "Healthy",
    Unhealthy = "Unhealthy",
    Loading = "Loading"
}

interface HealthStatus {
    frontend: HealthStates;
    database: HealthStates;
    databaseLatency: number | null;
    databaseError: string | null;
    realtime: HealthStates;
    realtimeLatency: number | null;
    realtimeError: string | null;
}

export const HealthCheck: React.FC = () => {
    const [status, setStatus] = useState<HealthStatus>({
        frontend: HealthStates.Healthy,
        database: HealthStates.Loading,
        databaseLatency: null,
        databaseError: null,
        realtime: HealthStates.Loading,
        realtimeLatency: null,
        realtimeError: null,
    });

    useEffect(() => {
        checkDatabaseHealth();
        checkRealtimeHealth();
    }, []);

    const checkDatabaseHealth = async () => {
        const startTime = Date.now();
        new Promise<void>(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(`Database operation timed out after ${DatabaseTimeout} ms`)
            }, DatabaseTimeout);

            const { error } = await supabase
                .from('sessions')
                .select('id')
                .limit(1);
            if (error) {
                clearTimeout(timeoutId);
                reject(error);
            } else {
                clearTimeout(timeoutId);
                resolve();
            }
        }).then(() => {
            setStatus(prev => ({
                ...prev,
                database: HealthStates.Healthy,
                databaseLatency: Date.now() - startTime,
            }));
        }).catch((error) => {
            setStatus(prev => ({
                ...prev,
                database: HealthStates.Unhealthy,
                databaseLatency: Date.now() - startTime,
                databaseError: error ? error.message : 'Unknown error',
            }));
        });
    };

    const checkRealtimeHealth = async () => {
        const startTime = Date.now();
        let testChannel: RealtimeChannel | null = null;
        await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(`Failed to recieve broadcast before timeout of ${RealtimeTimeout} ms!`)
            }, RealtimeTimeout)

            const channelName = `health-check-${Date.now()}`
            testChannel = supabase.channel(channelName, {
                config: {
                    broadcast: {
                        self: true
                    }
                }
            });

            // Listen for our own broadcast
            testChannel.on('broadcast', { event: 'health_check' }, (response) => {
                if (response.payload.test === 'health-check-ping') {
                    clearTimeout(timeoutId);
                    resolve();
                }
            });

            // Subscribe to channel
            testChannel.subscribe((subStatus) => {
                if (subStatus === 'SUBSCRIBED') {
                    // Send a test broadcast message
                    testChannel!.send({
                        type: 'broadcast',
                        event: 'health_check',
                        payload: { test: 'health-check-ping' }
                    });
                } else {
                    clearTimeout(timeoutId);
                    reject('Error sending broadcast!')
                }
            });


        }).then(() => {
            setStatus(prev => ({
                ...prev,
                realtime: HealthStates.Healthy,
                realtimeLatency: Date.now() - startTime,
            }))
        }).catch((error) => {
            setStatus(prev => ({
                ...prev,
                realtime: HealthStates.Unhealthy,
                realtimeLatency: Date.now() - startTime,
                realtimeError: error,
            }));
        }).finally(() => {
            if (testChannel !== null) {
                supabase.removeChannel(testChannel);
            }
        });
    };

    const statusRow = (label: string, state: HealthStates) => (
        <div
            id={`status-row-${label.toLowerCase()}`}
            data-status={state}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px',
                backgroundColor: '#f9fafb',
                borderRadius: '4px',
                borderLeft: `4px solid ${getHealthColor(state)}`
            }}
        >
            <span>{label}</span>
            <span style={{
                fontWeight: 'bold',
                color: getHealthColor(state),
                textTransform: 'uppercase'
            }}>
                {state}
            </span>
        </div>
    )

    const getHealthColor = (state: HealthStates) => state === HealthStates.Loading ? '#e3e700ff' : state === HealthStates.Healthy ? '#16a34a' : '#dc2626'

    const getOverallStatus = () => {
        if (status.realtime === HealthStates.Loading || status.database === HealthStates.Loading){
            return HealthStates.Loading
        } else if (status.realtime === HealthStates.Healthy && status.database === HealthStates.Healthy){
            return HealthStates.Healthy
        } else {
            return HealthStates.Unhealthy;
        }
    };

    const overallStatus = getOverallStatus();

    return (
        <div style={{
            fontFamily: 'monospace',
            padding: '20px',
            backgroundColor: 'white',
            minHeight: '100vh'
        }}>
            <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
                Health Check
            </h1>

            <div
                id="overall-status"
                data-status={overallStatus }
                style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: getHealthColor(overallStatus),
                    marginBottom: '30px',
                    padding: '15px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: `3px solid ${getHealthColor(overallStatus)}`
                }}
            >
                Status: {overallStatus}
            </div>
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Components</h2>

                <div style={{ display: 'grid', gap: '10px' }}>
                    {statusRow('Front End', status.frontend, "status-row-frontend")}
                    {statusRow('Database', status.database, "status-row-database")}
                    {statusRow('Realtime', status.realtime, "status-row-realtime")}
                </div>
            </div>

            {/* Metrics */}
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Metrics</h2>

                <div id="database-latency" data-latency={status.databaseLatency}>
                    <strong>Database Latency:</strong> {status.databaseLatency !== null ? `${status.databaseLatency}ms` : 'N/A'}
                </div>
                <div id="realtime=latency" data-timestamp={status.realtimeLatency}>
                    <strong>Realtime Latency:</strong> {status.realtimeLatency !== null ? `${status.realtimeLatency}ms` : 'N/A'}
                </div>
            </div>

            {status.databaseError && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #dc2626'
                }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#dc2626' }}>
                        Database Error Details
                    </h2>
                    <pre id="database-error-message" style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#991b1b'
                    }}>
                        {status.databaseError}
                    </pre>
                </div>
            )}

            {status.realtimeError && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #dc2626'
                }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#dc2626' }}>
                        Realtime Error Details
                    </h2>
                    <pre id="realtime-error-message" style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#991b1b'
                    }}>
                        {status.realtimeError}
                    </pre>
                </div>
            )}

            <details style={{ marginTop: '20px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                    Raw JSON
                </summary>
                <pre
                    id="health-json"
                    style={{
                        backgroundColor: '#f3f4f6',
                        padding: '15px',
                        borderRadius: '4px',
                        marginTop: '10px',
                        overflow: 'auto'
                    }}
                >
                    {JSON.stringify(status, null, 2)}
                </pre>
            </details>
        </div>
    );
};