// src/core/interaction/InteractionManager.ts

type InteractionUpdateListener = (isActive: boolean, timerEndTime: number | undefined) => void;

/**
 * InteractionManager is a singleton class that manages the global state and logic
 * for interactive decision phases (e.g., when a timer is active for student submissions).
 * It uses a simple observer pattern to notify subscribers of state changes.
 */
export class InteractionManager {
    private static instance: InteractionManager;

    private _isActive: boolean = false;
    private _timerEndTime: number | undefined = undefined;
    private _countdownInterval: NodeJS.Timeout | null = null;
    private _listeners: Set<InteractionUpdateListener> = new Set();

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    /**
     * Returns the singleton instance of InteractionManager.
     */
    static getInstance(): InteractionManager {
        if (!InteractionManager.instance) {
            InteractionManager.instance = new InteractionManager();
        }
        return InteractionManager.instance;
    }

    /**
     * Activates a decision phase and starts a countdown timer.
     * @param durationSeconds The duration of the decision phase in seconds.
     */
    startDecisionPhase(durationSeconds: number): void {
        console.log('[InteractionManager] Starting decision phase with duration:', durationSeconds);

        // Clear any existing timer
        this.stopDecisionPhase();

        this._isActive = true;
        this._timerEndTime = Date.now() + (durationSeconds * 1000);

        // Start countdown interval to update time and automatically stop
        this._countdownInterval = setInterval(() => {
            const remaining = Math.max(0, this._timerEndTime! - Date.now());
            if (remaining <= 0) {
                this.stopDecisionPhase(); // Auto-stop when time runs out
            }
            this._notifyListeners(); // Notify every second for timer updates
        }, 1000); // Update every second

        this._notifyListeners(); // Initial notification
    }

    /**
     * Deactivates the current decision phase and stops any active timer.
     */
    stopDecisionPhase(): void {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }

        if (this._isActive) {
            console.log('[InteractionManager] Stopping decision phase');
            this._isActive = false;
            this._timerEndTime = undefined;
            this._notifyListeners(); // Final notification
        }
    }

    /**
     * Gets the current active status of the decision phase.
     */
    getIsActive(): boolean {
        return this._isActive;
    }

    /**
     * Gets the end time of the current decision phase timer.
     */
    getTimerEndTime(): number | undefined {
        return this._timerEndTime;
    }

    /**
     * Subscribes a listener function to be called when the decision phase state changes.
     * @param listener The callback function to subscribe.
     * @returns A function to unsubscribe the listener.
     */
    subscribe(listener: InteractionUpdateListener): () => void {
        this._listeners.add(listener);
        // Immediately notify with current state upon subscription
        listener(this._isActive, this._timerEndTime);
        return () => this.unsubscribe(listener);
    }

    /**
     * Unsubscribes a listener function.
     * @param listener The callback function to unsubscribe.
     */
    unsubscribe(listener: InteractionUpdateListener): void {
        this._listeners.delete(listener);
    }

    /**
     * Internal method to notify all subscribed listeners with the current state.
     */
    private _notifyListeners(): void {
        const isActive = this._isActive;
        const timerEndTime = this._timerEndTime;
        this._listeners.forEach(listener => {
            try {
                listener(isActive, timerEndTime);
            } catch (error) {
                console.error("[InteractionManager] Error notifying listener:", error);
            }
        });
    }
}
