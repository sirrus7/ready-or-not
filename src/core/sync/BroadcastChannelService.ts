// src/core/sync/BroadcastChannelService.ts

/**
 * Type for a generic message handler used by the BroadcastChannelService.
 * It receives any message payload.
 */
export type BroadcastMessageHandler = (message: any) => void;

/**
 * A minimalist singleton wrapper around the native BroadcastChannel API.
 * This class handles the basic creation and messaging of a BroadcastChannel.
 * It is intentionally kept lean, without any domain-specific logic, connection
 * monitoring, or message parsing/validation beyond what the native API provides.
 * Higher-level managers (e.g., ConnectionMonitor, VideoSyncManager) will use this service.
 */
export class BroadcastChannelService {
    // A static map to store instances, ensuring a singleton per channel name.
    private static instances: Map<string, BroadcastChannelService> = new Map();
    private channel: BroadcastChannel;
    // A set of handlers for incoming messages. Using a Set allows for easy add/remove and uniqueness.
    private handlers: Set<BroadcastMessageHandler> = new Set();
    private isClosed: boolean = false;

    /**
     * Private constructor to enforce the singleton pattern.
     * @param channelName The name of the broadcast channel.
     */
    private constructor(channelName: string) {
        this.channel = new BroadcastChannel(channelName);
        // Bind the message handler to ensure 'this' context is correct.
        this.channel.onmessage = this.handleMessage.bind(this);
        // Log errors related to message handling.
        this.channel.onmessageerror = (event) => {
            console.error(`[BroadcastChannelService] Message error on channel ${channelName}:`, event);
        };
        console.log(`[BroadcastChannelService] Initialized channel: ${channelName}`);
    }

    /**
     * Retrieves or creates a singleton instance of BroadcastChannelService for a given channel name.
     * This is the public entry point for obtaining a channel service instance.
     * @param channelName The name of the broadcast channel to use.
     * @returns The BroadcastChannelService instance.
     */
    public static getInstance(channelName: string): BroadcastChannelService {
        if (!BroadcastChannelService.instances.has(channelName)) {
            BroadcastChannelService.instances.set(channelName, new BroadcastChannelService(channelName));
        }
        return BroadcastChannelService.instances.get(channelName)!;
    }

    /**
     * Handles incoming messages from the underlying BroadcastChannel.
     * It iterates through all registered handlers and dispatches the message data.
     * Prevents dispatching if the channel has been closed.
     * @param event The MessageEvent from the BroadcastChannel.
     */
    private handleMessage(event: MessageEvent): void {
        if (this.isClosed) return;
        this.handlers.forEach(handler => {
            try {
                handler(event.data);
            } catch (error) {
                console.error('[BroadcastChannelService] Error in message handler:', error);
            }
        });
    }

    /**
     * Posts a message to the BroadcastChannel.
     * Logs a warning if attempting to post to a closed channel.
     * @param message The message payload to send.
     */
    public postMessage(message: any): void {
        if (this.isClosed) {
            console.warn(`[BroadcastChannelService] Attempted to post message to a closed channel.`);
            return;
        }
        try {
            this.channel.postMessage(message);
        } catch (error) {
            console.error(`[BroadcastChannelService] Failed to post message:`, error);
        }
    }

    /**
     * Subscribes a handler function to receive messages from the BroadcastChannel.
     * @param handler The function to call when a message is received.
     * @returns A function to unsubscribe the handler. This allows for easy cleanup.
     */
    public subscribe(handler: BroadcastMessageHandler): () => void {
        this.handlers.add(handler);
        return () => this.unsubscribe(handler);
    }

    /**
     * Unsubscribes a handler function.
     * @param handler The function to unsubscribe.
     */
    public unsubscribe(handler: BroadcastMessageHandler): void {
        this.handlers.delete(handler);
    }

    /**
     * Closes the BroadcastChannel and cleans up resources.
     * Once closed, the channel cannot be reopened. It also removes the instance
     * from the static map to prevent stale references.
     */
    public close(): void {
        if (!this.isClosed) {
            this.channel.close();
            this.handlers.clear();
            this.isClosed = true;
            // Remove the instance from the static map.
            BroadcastChannelService.instances.delete(this.channel.name);
            console.log(`[BroadcastChannelService] Closed channel: ${this.channel.name}`);
        }
    }
}
