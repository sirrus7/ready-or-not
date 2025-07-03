// Service Worker utilities for video caching

export interface CacheStatus {
    available: boolean;
    cachedCount: number;
    cachedUrls: string[];
}

export class ServiceWorkerManager {
    private static instance: ServiceWorkerManager;
    private registration: ServiceWorkerRegistration | null = null;

    private constructor() {
        this.init();
    }

    static getInstance(): ServiceWorkerManager {
        if (!ServiceWorkerManager.instance) {
            ServiceWorkerManager.instance = new ServiceWorkerManager();
        }
        return ServiceWorkerManager.instance;
    }

    private async init() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.ready;
                console.log('[ServiceWorkerManager] Service worker is ready');
            } catch (error) {
                console.error('[ServiceWorkerManager] Service worker not available:', error);
            }
        }
    }

    // Check if service worker is available and active
    isAvailable(): boolean {
        return !!(this.registration && this.registration.active);
    }

    // Get cache status
    async getCacheStatus(): Promise<CacheStatus> {
        if (!this.isAvailable()) {
            return { available: false, cachedCount: 0, cachedUrls: [] };
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            
            messageChannel.port1.onmessage = (event) => {
                resolve({
                    available: true,
                    cachedCount: event.data.cached || 0,
                    cachedUrls: event.data.urls || []
                });
            };

            this.registration!.active!.postMessage(
                { type: 'CACHE_STATUS' },
                [messageChannel.port2]
            );

            // Timeout after 2 seconds
            setTimeout(() => {
                resolve({ available: true, cachedCount: 0, cachedUrls: [] });
            }, 2000);
        });
    }

    // Clear video cache
    async clearVideoCache(): Promise<boolean> {
        if (!this.isAvailable()) {
            return false;
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data.success === true);
            };

            this.registration!.active!.postMessage(
                { type: 'CLEAR_VIDEO_CACHE' },
                [messageChannel.port2]
            );

            // Timeout after 2 seconds
            setTimeout(() => {
                resolve(false);
            }, 2000);
        });
    }

    // Preload a video URL
    async preloadVideo(url: string): Promise<void> {
        if (!this.isAvailable() || !url) return;

        try {
            // Make a fetch request which will be intercepted by the service worker
            const response = await fetch(url, {
                method: 'GET',
                cache: 'force-cache'
            });
            
            if (response.ok) {
                console.log('[ServiceWorkerManager] Video preloaded:', url);
            }
        } catch (error) {
            console.error('[ServiceWorkerManager] Failed to preload video:', error);
        }
    }

    // Force update service worker
    async update(): Promise<void> {
        if (this.registration) {
            try {
                await this.registration.update();
                console.log('[ServiceWorkerManager] Service worker update check completed');
            } catch (error) {
                console.error('[ServiceWorkerManager] Service worker update failed:', error);
            }
        }
    }
}