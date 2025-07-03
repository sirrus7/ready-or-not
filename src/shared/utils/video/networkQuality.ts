// Network quality detection and adaptive strategies
export interface NetworkQuality {
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
    downlink?: number; // Mbps
    rtt?: number; // Round trip time in ms
    saveData?: boolean;
}

export interface VideoQualitySettings {
    minBufferSeconds: number;
    bufferWaitTimeout: number;
    syncInterval: number;
    preloadStrategy: 'none' | 'metadata' | 'auto';
}

// Network Information API types
interface NetworkInformation extends EventTarget {
    readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
    readonly downlink?: number;
    readonly rtt?: number;
    readonly saveData?: boolean;
    onchange?: ((this: NetworkInformation, ev: Event) => any) | null;
}

declare global {
    interface Navigator {
        connection?: NetworkInformation;
        mozConnection?: NetworkInformation;
        webkitConnection?: NetworkInformation;
    }
}

export class NetworkQualityMonitor {
    private connection: NetworkInformation | undefined;
    private listeners: Set<(quality: NetworkQuality) => void> = new Set();
    private currentQuality: NetworkQuality = { effectiveType: 'unknown' };

    constructor() {
        // Get connection API (with vendor prefixes)
        this.connection = navigator.connection || 
                         (navigator as any).mozConnection || 
                         (navigator as any).webkitConnection;

        if (this.connection) {
            this.updateQuality();
            this.connection.addEventListener('change', this.handleConnectionChange);
        }
    }

    private handleConnectionChange = () => {
        this.updateQuality();
        this.notifyListeners();
    };

    private updateQuality() {
        if (!this.connection) {
            this.currentQuality = { effectiveType: 'unknown' };
            return;
        }

        this.currentQuality = {
            effectiveType: this.connection.effectiveType || 'unknown',
            downlink: this.connection.downlink,
            rtt: this.connection.rtt,
            saveData: this.connection.saveData
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.currentQuality));
    }

    getCurrentQuality(): NetworkQuality {
        return this.currentQuality;
    }

    onQualityChange(callback: (quality: NetworkQuality) => void): () => void {
        this.listeners.add(callback);
        // Return unsubscribe function
        return () => this.listeners.delete(callback);
    }

    // Get recommended settings based on network quality
    getRecommendedSettings(): VideoQualitySettings {
        const { effectiveType, saveData } = this.currentQuality;

        // Data saver mode - most conservative settings
        if (saveData) {
            return {
                minBufferSeconds: 2,
                bufferWaitTimeout: 30000,
                syncInterval: 2000,
                preloadStrategy: 'none'
            };
        }

        // Adaptive settings based on connection type
        switch (effectiveType) {
            case 'slow-2g':
            case '2g':
                return {
                    minBufferSeconds: 2,
                    bufferWaitTimeout: 25000,
                    syncInterval: 1500,
                    preloadStrategy: 'metadata'
                };
            
            case '3g':
                return {
                    minBufferSeconds: 2,
                    bufferWaitTimeout: 20000,
                    syncInterval: 1000,
                    preloadStrategy: 'metadata'
                };
            
            case '4g':
                return {
                    minBufferSeconds: 2,
                    bufferWaitTimeout: 15000,
                    syncInterval: 500,
                    preloadStrategy: 'auto'
                };
            
            default:
                // Conservative defaults for unknown connection
                return {
                    minBufferSeconds: 2,
                    bufferWaitTimeout: 20000,
                    syncInterval: 1000,
                    preloadStrategy: 'metadata'
                };
        }
    }

    // Check if connection is considered "poor" (< 1 Mbps)
    isPoorConnection(): boolean {
        const { effectiveType, downlink } = this.currentQuality;
        
        // Check effective type
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            return true;
        }
        
        // Check actual downlink speed if available
        if (downlink !== undefined && downlink < 1) {
            return true;
        }
        
        return false;
    }

    destroy() {
        if (this.connection) {
            this.connection.removeEventListener('change', this.handleConnectionChange);
        }
        this.listeners.clear();
    }
}