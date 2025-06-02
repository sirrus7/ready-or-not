// src/core/sync/ConnectionMonitor.ts
import {BroadcastChannelService} from './BroadcastChannelService';

/**
 * Represents the status of a broadcast channel connection.
 * Includes details about connectivity, last communication, peer type, and latency.
 */
export interface BroadcastConnectionStatus {
    isConnected: boolean; // True if a responsive peer is detected
    lastPing: number; // Timestamp of the last ping sent
    connectionType: 'host' | 'presentation' | 'display' | 'unknown'; // Type of the connected peer
    latency?: number; // Latency to the connected peer in milliseconds
    error?: string; // An error message if the connection is in an error state
}

/**
 * Type for a listener that reacts to changes in broadcast connection status.
 */
export type ConnectionStatusListener = (status: BroadcastConnectionStatus) => void;

/**
 * A singleton class responsible for monitoring the connection status
 * over a BroadcastChannel, typically for peer-to-peer communication (e.g., Host-Presentation).
 * It uses PING/PONG messages to determine connectivity and latency.
 */
export class ConnectionMonitor {
    // A static map to store instances, ensuring a singleton per session ID.
    private static instances: Map<string, ConnectionMonitor> = new Map();
    private channelService: BroadcastChannelService;
    // A set of listeners for connection status changes.
    private listeners: Set<ConnectionStatusListener> = new Set();
    private pingInterval: NodeJS.Timeout | null = null;
    private connectionCheckTimeout: NodeJS.Timeout | null = null;
    private connectionStatus: BroadcastConnectionStatus;
    private lastPongTime = 0; // Timestamp of the last received PONG
    private mode: 'host' | 'presentation' | 'display'; // The role of this particular instance
    private sessionId: string; // The session ID this monitor is for

    /**
     * Private constructor to enforce the singleton pattern.
     * @param sessionId The ID of the current game session.
     * @param mode The role of this instance (host, presentation, or display).
     */
    private constructor(sessionId: string, mode: 'host' | 'presentation' | 'display') {
        this.sessionId = sessionId;
        const channelName = `game-session-${sessionId}`;
        // Obtain the shared BroadcastChannelService instance.
        this.channelService = BroadcastChannelService.getInstance(channelName);
        this.mode = mode;

        // Initialize connection status to 'not initialized'.
        this.connectionStatus = {
            isConnected: false,
            lastPing: 0,
            connectionType: 'unknown',
            error: 'Not initialized'
        };

        this.setupMessageHandling(); // Set up internal message listeners.
        this.startMonitoring(); // Begin monitoring the connection.
        console.log(`[ConnectionMonitor] Initialized for session ${sessionId} in ${mode} mode`);
    }

    /**
     * Retrieves or creates a singleton instance of ConnectionMonitor for a given session.
     * Ensures that if an instance already exists, its 'mode' is consistent.
     * @param sessionId The ID of the current game session.
     * @param mode The role of this instance (host, presentation, or display).
     * @returns The ConnectionMonitor instance.
     */
    public static getInstance(sessionId: string, mode: 'host' | 'presentation' | 'display'): ConnectionMonitor {
        if (!ConnectionMonitor.instances.has(sessionId)) {
            ConnectionMonitor.instances.set(sessionId, new ConnectionMonitor(sessionId, mode));
        } else {
            // If an instance exists, ensure its mode matches. If not, re-initialize.
            const instance = ConnectionMonitor.instances.get(sessionId)!;
            if (instance.mode !== mode) {
                console.warn(`[ConnectionMonitor] Mode mismatch for session ${sessionId}. Destroying old instance and creating new.`);
                instance.destroy(); // Destroy the old instance.
                ConnectionMonitor.instances.set(sessionId, new ConnectionMonitor(sessionId, mode));
            }
        }
        return ConnectionMonitor.instances.get(sessionId)!;
    }

    /**
     * Sets up listeners for internal PING/PONG messages on the BroadcastChannelService.
     * This allows the monitor to react to connection signals from other peers.
     */
    private setupMessageHandling(): void {
        this.channelService.subscribe((message: any) => {
            // Only process messages relevant to this session.
            if (message.sessionId !== this.sessionId) {
                return;
            }

            if (message.type === 'PING') {
                // Respond to PING with PONG, including sender's type and whether video state is requested.
                this.channelService.postMessage({
                    type: 'PONG',
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                    connectionType: message.connectionType, // The type of the peer that sent PING
                    requestVideoState: message.requestVideoState // Pass through if requested by host (e.g., from Presentation)
                });
            } else if (message.type === 'PONG') {
                // Process received PONG, calculate latency, and update connection status.
                const latency = Date.now() - message.timestamp;
                this.lastPongTime = Date.now();
                this.updateConnectionStatus({
                    isConnected: true,
                    lastPing: Date.now(),
                    connectionType: message.connectionType, // The type of the peer that sent PONG
                    latency,
                    error: undefined // Clear any previous error.
                });
                // Clear the connection timeout check as a PONG was received.
                if (this.connectionCheckTimeout) {
                    clearTimeout(this.connectionCheckTimeout);
                    this.connectionCheckTimeout = null;
                }
            } else if (message.type === 'SESSION_ENDED') {
                // Handle session ended signal from the host.
                this.updateConnectionStatus({
                    isConnected: false,
                    lastPing: 0,
                    connectionType: 'unknown',
                    error: 'Session ended by host'
                });
                this.stopMonitoring(); // Stop further monitoring as the session is over.
            }
        });
    }

    /**
     * Starts sending periodic PINGs and setting timeouts to detect unresponsive peers.
     */
    private startMonitoring(): void {
        this.stopMonitoring(); // Ensure no duplicate intervals are running.

        // Send periodic PINGs to probe connection status.
        this.pingInterval = setInterval(() => {
            this.channelService.postMessage({
                type: 'PING',
                sessionId: this.sessionId,
                timestamp: Date.now(),
                connectionType: this.mode,
                requestVideoState: this.mode === 'host' // Host requests video state in pings
            });
            // Set a timeout to check if a PONG is received within the expected time.
            this.connectionCheckTimeout = setTimeout(() => {
                // If no PONG is received within 5 seconds and we were previously connected, mark as disconnected.
                if (Date.now() - this.lastPongTime > 5000 && this.connectionStatus.isConnected) {
                    this.updateConnectionStatus({
                        isConnected: false,
                        connectionType: 'unknown',
                        error: 'Peer unresponsive'
                    });
                }
            }, 5000); // Check 5 seconds after sending ping
        }, 3000); // Send ping every 3 seconds

        // Set initial status to 'connecting'.
        this.updateConnectionStatus({
            isConnected: false,
            connectionType: 'unknown',
            error: 'Connecting...'
        });
    }

    /**
     * Stops all active intervals and timeouts for connection monitoring.
     * Used for cleanup or to temporarily pause monitoring.
     */
    private stopMonitoring(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.connectionCheckTimeout) {
            clearTimeout(this.connectionCheckTimeout);
            this.connectionCheckTimeout = null;
        }
    }

    /**
     * Updates the internal connection status and notifies all registered listeners.
     * Only notifies if a significant aspect of the status (connected state, type, error) has changed.
     * @param newStatus Partial status object to update.
     */
    private updateConnectionStatus(newStatus: Partial<BroadcastConnectionStatus>): void {
        const oldStatus = {...this.connectionStatus};
        this.connectionStatus = {...this.connectionStatus, ...newStatus};

        // Log significant status changes for debugging.
        if (oldStatus.isConnected !== this.connectionStatus.isConnected ||
            oldStatus.connectionType !== this.connectionStatus.connectionType ||
            oldStatus.error !== this.connectionStatus.error) {
            console.log(`[ConnectionMonitor] Status changed:`, this.connectionStatus);
            // Notify all subscribed listeners.
            this.listeners.forEach(listener => {
                try {
                    listener(this.connectionStatus);
                } catch (error) {
                    console.error('[ConnectionMonitor] Error in status listener:', error);
                }
            });
        }
    }

    /**
     * Gets the current connection status.
     * @returns The current BroadcastConnectionStatus.
     */
    public getStatus(): BroadcastConnectionStatus {
        return {...this.connectionStatus};
    }

    /**
     * Registers a listener to be called when the connection status changes.
     * The listener is immediately called with the current status upon subscription.
     * @param listener The callback function.
     * @returns A function to unsubscribe the listener.
     */
    public addStatusListener(listener: ConnectionStatusListener): () => void {
        this.listeners.add(listener);
        listener(this.connectionStatus); // Immediate call with current status.
        return () => this.removeStatusListener(listener);
    }

    /**
     * Removes a previously registered status listener.
     * @param listener The listener function to remove.
     */
    public removeStatusListener(listener: ConnectionStatusListener): void {
        this.listeners.delete(listener);
    }

    /**
     * Force a health check (sends a PING immediately).
     * Useful for manual re-connection attempts.
     */
    public forceHealthCheck(): void {
        console.log(`[ConnectionMonitor] Force health check (${this.mode})`);
        this.channelService.postMessage({
            type: 'PING',
            sessionId: this.sessionId,
            timestamp: Date.now(),
            connectionType: this.mode,
            requestVideoState: this.mode === 'host'
        });
    }

    /**
     * Force a full reconnect (stops and restarts monitoring).
     * This will reset the connection state and retry the monitoring process.
     */
    public forceReconnect(): void {
        console.log(`[ConnectionMonitor] Force reconnect (${this.mode})`);
        this.stopMonitoring();
        this.updateConnectionStatus({
            isConnected: false,
            lastPing: 0,
            connectionType: 'unknown',
            error: 'Reconnecting...'
        });
        this.startMonitoring();
    }

    /**
     * Cleans up resources, stopping intervals and clearing listeners.
     * Removes the instance from the static map.
     * Note: This method does NOT close the underlying `BroadcastChannelService`, as that service
     * might be shared by other managers (e.g., `VideoSyncManager`). The `BroadcastChannelService`
     * should only be closed if no other managers are using it for this specific session ID.
     */
    public destroy(): void {
        this.stopMonitoring();
        this.listeners.clear();
        // Remove the instance from the static map
        ConnectionMonitor.instances.delete(this.sessionId);
        console.log(`[ConnectionMonitor] Destroyed instance for session ${this.sessionId} mode ${this.mode}`);
    }
}
