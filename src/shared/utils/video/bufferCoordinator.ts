// Buffer coordination for synchronized video playback across tabs

export interface BufferState {
    tabId: string;
    bufferedRanges: Array<{ start: number; end: number }>;
    currentTime: number;
    duration: number;
    isBuffering: boolean;
    lastUpdate: number;
}

export interface BufferCoordinatorConfig {
    minBufferSeconds: number; // Minimum seconds buffered ahead before playing
    syncInterval: number; // How often to share buffer state (ms)
    bufferWaitTimeout: number; // Max time to wait for other tabs to buffer (ms)
}

const DEFAULT_CONFIG: BufferCoordinatorConfig = {
    minBufferSeconds: 2, // Wait for 2 seconds of buffer
    syncInterval: 500, // Share buffer state every 500ms
    bufferWaitTimeout: 10000, // Wait max 10 seconds for other tabs
};

export class BufferCoordinator {
    private channel: BroadcastChannel;
    private tabId: string;
    private bufferStates: Map<string, BufferState> = new Map();
    private config: BufferCoordinatorConfig;
    private syncIntervalId?: NodeJS.Timeout;
    private onReadyCallback?: () => void;
    private onWaitCallback?: (reason: string) => void;
    private waitTimeoutId?: NodeJS.Timeout;

    constructor(sessionId: string, role: 'host' | 'presentation', config?: Partial<BufferCoordinatorConfig>) {
        this.tabId = `${role}-${Date.now()}`;
        this.channel = new BroadcastChannel(`buffer-sync-${sessionId}`);
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // Listen for buffer updates from other tabs
        this.channel.onmessage = (msg: any) => {
            if (msg.type === 'buffer-update' && msg.tabId !== this.tabId) {
                this.bufferStates.set(msg.tabId, msg.state);
                this.checkBufferReadiness();
            } else if (msg.type === 'tab-closed' && msg.tabId !== this.tabId) {
                this.bufferStates.delete(msg.tabId);
            }
        };

        // Announce presence
        this.broadcastBufferState({
            tabId: this.tabId,
            bufferedRanges: [],
            currentTime: 0,
            duration: 0,
            isBuffering: true,
            lastUpdate: Date.now()
        });
    }

    // Start monitoring video buffer state
    startMonitoring(video: HTMLVideoElement) {
        this.stopMonitoring();

        this.syncIntervalId = setInterval(() => {
            const state = this.getVideoBufferState(video);
            this.broadcastBufferState(state);
            this.checkBufferReadiness();
        }, this.config.syncInterval);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = undefined;
        }
        if (this.waitTimeoutId) {
            clearTimeout(this.waitTimeoutId);
            this.waitTimeoutId = undefined;
        }
    }

    // Get current buffer state from video element
    private getVideoBufferState(video: HTMLVideoElement): BufferState {
        const bufferedRanges: Array<{ start: number; end: number }> = [];
        
        for (let i = 0; i < video.buffered.length; i++) {
            bufferedRanges.push({
                start: video.buffered.start(i),
                end: video.buffered.end(i)
            });
        }

        return {
            tabId: this.tabId,
            bufferedRanges,
            currentTime: video.currentTime,
            duration: video.duration || 0,
            isBuffering: video.readyState < 3, // HAVE_FUTURE_DATA
            lastUpdate: Date.now()
        };
    }

    // Broadcast buffer state to other tabs
    private broadcastBufferState(state: BufferState) {
        this.bufferStates.set(this.tabId, state);
        this.channel.postMessage({
            type: 'buffer-update',
            tabId: this.tabId,
            state
        });
    }

    // Check if all tabs have sufficient buffer
    checkBufferReadiness(): boolean {
        const states = Array.from(this.bufferStates.values());
        
        // Remove stale states (not updated in last 2 seconds)
        const now = Date.now();
        const activeStates = states.filter(state => now - state.lastUpdate < 2000);
        
        if (activeStates.length === 0) return true;

        // Check if all tabs have sufficient buffer
        const allReady = activeStates.every(state => {
            if (state.isBuffering) return false;
            
            // Find buffered range containing current time
            const currentBuffer = state.bufferedRanges.find(range => 
                state.currentTime >= range.start && state.currentTime <= range.end
            );
            
            if (!currentBuffer) return false;
            
            // Check if we have enough buffer ahead
            const bufferAhead = currentBuffer.end - state.currentTime;
            return bufferAhead >= this.config.minBufferSeconds;
        });

        if (allReady && this.onReadyCallback) {
            this.clearWaitTimeout();
            this.onReadyCallback();
        } else if (!allReady && this.onWaitCallback) {
            this.startWaitTimeout();
            const waitingTabs = activeStates
                .filter(state => state.isBuffering || !this.hasMinBuffer(state))
                .map(state => state.tabId);
            console.log(`[BufferCoordinator] Waiting for tabs to buffer: ${waitingTabs.join(', ')}`);
            this.onWaitCallback(`Waiting for tabs to buffer: ${waitingTabs.join(', ')}`);
        }

        return allReady;
    }

    // Check if a state has minimum buffer
    private hasMinBuffer(state: BufferState): boolean {
        const currentBuffer = state.bufferedRanges.find(range => 
            state.currentTime >= range.start && state.currentTime <= range.end
        );
        
        if (!currentBuffer) return false;
        
        const bufferAhead = currentBuffer.end - state.currentTime;
        return bufferAhead >= this.config.minBufferSeconds;
    }

    // Start timeout for waiting
    private startWaitTimeout() {
        if (this.waitTimeoutId) return;
        
        this.waitTimeoutId = setTimeout(() => {
            console.warn('[BufferCoordinator] Buffer wait timeout reached, proceeding anyway');
            if (this.onReadyCallback) {
                this.onReadyCallback();
            }
        }, this.config.bufferWaitTimeout);
    }

    // Clear wait timeout
    private clearWaitTimeout() {
        if (this.waitTimeoutId) {
            clearTimeout(this.waitTimeoutId);
            this.waitTimeoutId = undefined;
        }
    }

    // Set callbacks for buffer ready/wait events
    onBufferReady(callback: () => void) {
        this.onReadyCallback = callback;
    }

    onBufferWait(callback: (reason: string) => void) {
        this.onWaitCallback = callback;
    }

    // Update configuration
    updateConfig(config: Partial<BufferCoordinatorConfig>) {
        this.config = { ...this.config, ...config };
    }

    // Get current buffer status summary
    getBufferStatus(): { ready: boolean; states: BufferState[] } {
        const states = Array.from(this.bufferStates.values());
        const ready = this.checkBufferReadiness();
        return { ready, states };
    }

    // Cleanup
    destroy() {
        this.stopMonitoring();
        this.channel.postMessage({
            type: 'tab-closed',
            tabId: this.tabId
        });
        this.channel.close();
    }
}