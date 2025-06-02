// src/core/sync/VideoSyncManager.ts
import {BroadcastChannelService} from './BroadcastChannelService';
import {VideoState} from '@shared/types/video';
import {HostBroadcastPayload} from '@shared/types/sync';
import {Slide} from '@shared/types/game';

/**
 * Defines the types of messages handled by the VideoSyncManager.
 * These are specific event types used for video synchronization and game state updates.
 */
export type VideoSyncEventType =
    | 'VIDEO_CONTROL'           // Host to Presentation: play, pause, seek
    | 'VIDEO_STATE_UPDATE'      // Presentation to Host: current video state for sync correction
    | 'SLIDE_UPDATE'            // Host to Presentation: new slide content
    | 'INITIAL_VIDEO_STATE'     // Presentation to Host: initial video state when connected
    | 'PRESENTATION_READY'      // Presentation to Host: Presentation display is open and ready
    | 'REQUEST_CURRENT_STATE'   // Presentation to Host: Request current slide/video state from host
    | 'PRESENTATION_HEARTBEAT'  // Presentation to Host: Periodic signal that display is active
    | 'COORDINATED_AUTOPLAY'    // Host to Presentation: Signal to start video playback simultaneously
    | 'SESSION_ENDED'           // Host to all: Session has ended
    | 'teacher_state_update';   // Host to Team: Current teacher state, decision phase, etc.

/**
 * Type for a listener that reacts to specific video synchronization events.
 * It receives the full message payload.
 */
export type VideoSyncEventListener = (message: any) => void;

/**
 * A singleton class responsible for managing video synchronization and slide progression
 * messages over a BroadcastChannel. It acts as a central hub for UI components
 * to send and receive video-related commands and state updates.
 */
export class VideoSyncManager {
    // Static map to store instances, ensuring a singleton per session ID.
    private static instances: Map<string, VideoSyncManager> = new Map();
    private channelService: BroadcastChannelService;
    // Map to store handlers for different event types.
    private eventHandlers: Map<VideoSyncEventType, Set<VideoSyncEventListener>> = new Map();
    private sessionId: string; // The session ID this manager is for

    /**
     * Private constructor to enforce the singleton pattern.
     * @param sessionId The ID of the current game session.
     */
    private constructor(sessionId: string) {
        this.sessionId = sessionId;
        const channelName = `game-session-${sessionId}`;
        // Obtain the shared BroadcastChannelService instance.
        this.channelService = BroadcastChannelService.getInstance(channelName);
        this.setupInternalMessageHandling(); // Set up primary message handling.
        console.log(`[VideoSyncManager] Initialized for session ${sessionId}`);
    }

    /**
     * Retrieves or creates a singleton instance of VideoSyncManager for a given session.
     * @param sessionId The ID of the current game session.
     * @returns The VideoSyncManager instance.
     */
    public static getInstance(sessionId: string): VideoSyncManager {
        if (!VideoSyncManager.instances.has(sessionId)) {
            VideoSyncManager.instances.set(sessionId, new VideoSyncManager(sessionId));
        }
        return VideoSyncManager.instances.get(sessionId)!;
    }

    /**
     * Sets up the primary message handler for the BroadcastChannelService.
     * This handler receives all messages and dispatches them to the correct
     * event-specific listeners based on `message.type` and `message.sessionId`.
     */
    private setupInternalMessageHandling(): void {
        this.channelService.subscribe((message: any) => {
            const eventType = message.type as VideoSyncEventType;
            // Only process messages relevant to this session.
            if (message.sessionId !== this.sessionId) {
                return;
            }

            const handlers = this.eventHandlers.get(eventType);
            if (handlers) {
                // Dispatch message to all registered handlers for this event type.
                handlers.forEach(handler => {
                    try {
                        handler(message);
                    } catch (error) {
                        console.error(`[VideoSyncManager] Error in handler for event ${eventType}:`, error);
                    }
                });
            }
        });
    }

    /**
     * Posts a message to the BroadcastChannel with the session ID and timestamp.
     * This is a private helper used by all public `send` methods.
     * @param eventType The type of the event.
     * @param data Additional payload for the message.
     */
    private postMessage(eventType: VideoSyncEventType, data: any = {}): void {
        const message = {
            type: eventType,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            ...data
        };
        this.channelService.postMessage(message);
    }

    /**
     * Subscribes a listener to a specific video synchronization event type.
     * @param eventType The type of event to listen for.
     * @param listener The callback function to execute when the event occurs.
     * @returns A function to unsubscribe the listener, allowing for proper cleanup.
     */
    public subscribe(eventType: VideoSyncEventType, listener: VideoSyncEventListener): () => void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(listener);
        return () => this.unsubscribe(eventType, listener);
    }

    /**
     * Unsubscribes a listener from a specific video synchronization event type.
     * @param eventType The type of event to unsubscribe from.
     * @param listener The listener function to remove.
     */
    public unsubscribe(eventType: VideoSyncEventType, listener: VideoSyncEventListener): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.delete(listener);
        }
    }

    // --- Specific Message Senders ---

    /**
     * Sends a video control command (play, pause, seek, or coordinated autoplay).
     * @param action The control action.
     * @param value The value associated with the action (e.g., seek time).
     * @param connectionType The type of the sender, for contextual filtering by receivers.
     */
    public sendVideoControl(action: 'play' | 'pause' | 'seek' | 'COORDINATED_AUTOPLAY', value?: number, connectionType?: 'host' | 'presentation'): void {
        // Use 'COORDINATED_AUTOPLAY' as the event type if the action is specifically that.
        this.postMessage(action === 'COORDINATED_AUTOPLAY' ? 'COORDINATED_AUTOPLAY' : 'VIDEO_CONTROL', {
            action,
            value,
            connectionType
        });
    }

    /**
     * Sends an update about the current video state.
     * @param videoState The current video state.
     */
    public sendVideoStateUpdate(videoState: VideoState): void {
        this.postMessage('VIDEO_STATE_UPDATE', {videoState});
    }

    /**
     * Sends a slide update to connected displays.
     * @param slide The slide data.
     */
    public sendSlideUpdate(slide: Slide): void {
        this.postMessage('SLIDE_UPDATE', {slide});
    }

    /**
     * Sends the initial video state upon connection.
     * Used by a newly connected peer to synchronize with an existing one.
     * @param videoState The initial video state.
     */
    public sendInitialVideoState(videoState: VideoState): void {
        this.postMessage('INITIAL_VIDEO_STATE', {videoState});
    }

    /**
     * Announces that the presentation display is ready to receive content.
     */
    public announcePresentationReady(): void {
        this.postMessage('PRESENTATION_READY', {connectionType: 'presentation'});
    }

    /**
     * Requests the current game state from the host.
     * Typically sent by newly connected displays.
     */
    public requestCurrentState(): void {
        this.postMessage('REQUEST_CURRENT_STATE', {});
    }

    /**
     * Sends a periodic heartbeat from the presentation display.
     * Used to confirm that the display tab is still open and active.
     */
    public sendPresentationHeartbeat(): void {
        this.postMessage('PRESENTATION_HEARTBEAT', {connectionType: 'presentation'});
    }

    /**
     * Sends a comprehensive update of the teacher's current game state.
     * This is the primary message for keeping student and presentation displays synchronized with the host.
     * @param payload The payload containing teacher/game state information.
     */
    public sendTeacherStateUpdate(payload: HostBroadcastPayload): void {
        this.postMessage('teacher_state_update', {payload});
    }

    /**
     * Broadcasts that the session has ended.
     * Sent by the host to signal all connected clients to clean up.
     */
    public sendSessionEnded(): void {
        this.postMessage('SESSION_ENDED', {});
    }

    /**
     * Cleans up resources, clearing all event handlers and removing the instance from the static map.
     * Note: This method does NOT close the underlying `BroadcastChannelService`, as that service
     * might be shared by other managers (e.g., `ConnectionMonitor`). The `BroadcastChannelService`
     * should be closed by a higher-level orchestrator or when the entire application/session ends.
     */
    public destroy(): void {
        this.eventHandlers.forEach(handlers => handlers.clear());
        this.eventHandlers.clear();
        VideoSyncManager.instances.delete(this.sessionId); // Remove from static map.
        console.log(`[VideoSyncManager] Destroyed instance for session ${this.sessionId}`);
    }
}
