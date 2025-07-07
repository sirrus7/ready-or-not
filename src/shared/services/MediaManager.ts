// src/shared/services/MediaManager.ts
// Updated MediaManager with public precacheSingleSlide method

import {supabase} from '@shared/services/supabase';
import {Slide} from '@shared/types/game';

interface CachedUrl {
    url: string;
    expiresAt: number;
}

/**
 * MediaManager is a singleton class responsible for fetching, caching,
 * and refreshing signed URLs for private media from a Supabase bucket ON DEMAND.
 * Now includes slide precaching functionality.
 */
class MediaManager {
    private static instance: MediaManager;
    private urlCache = new Map<string, CachedUrl>();
    private static blobCache = new Map<string, {
        blobUrl: string;
        expiresAt: number;
    }>();
    private readonly BUCKET_NAME = 'slide-content';
    private readonly SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour
    private readonly REFRESH_BUFFER_MS = 60 * 1000; // 1 minute buffer
    private readonly DEFAULT_PRECACHE_COUNT = 3; // Default number of slides to precache ahead

    // Track precaching operations to avoid duplicates
    private precachingInProgress = new Set<string>();
    private lastPrecacheSlideIndex: number | null = null;

    private constructor() {
    }

    public static getInstance(): MediaManager {
        if (!MediaManager.instance) {
            MediaManager.instance = new MediaManager();
        }
        return MediaManager.instance;
    }

    /**
     * Asynchronously gets a valid signed URL for a given media file.
     * For video files, returns a cached blob URL to reduce bandwidth.
     * For other files, returns the regular signed URL.
     */
    public async getSignedUrl(fileName: string): Promise<string> {
        // Check if this is a video file
        const isVideoFile = /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);

        if (isVideoFile) {
            // For video files, use blob cache
            const cached = MediaManager.blobCache.get(fileName);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.blobUrl;
            }
        } else {
            // For non-video files, use regular URL cache
            const cached = this.urlCache.get(fileName);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.url;
            }
        }

        // Fetch new signed URL
        const {data, error} = await supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUrl(fileName, this.SIGNED_URL_EXPIRY_SECONDS);

        if (error) {
            console.error(`[MediaManager] Error creating signed URL for ${fileName}:`, error);
            if (error.message.includes("Object not found")) {
                throw new Error(`Could not get media URL for ${fileName}. The file may not exist at the root of the '${this.BUCKET_NAME}' bucket or you may be missing the required Storage Policy.`);
            }
            if (error.message.includes("Failed to fetch")) {
                throw new Error(`Network error while fetching ${fileName}. Please check your internet connection and try again.`);
            }
            throw new Error(`Could not get media URL for ${fileName}: ${error.message}`);
        }

        if (!data?.signedUrl) {
            throw new Error(`No signed URL returned for ${fileName}`);
        }

        const expiresAt = Date.now() + (this.SIGNED_URL_EXPIRY_SECONDS * 1000) - this.REFRESH_BUFFER_MS;

        if (isVideoFile) {
            // For video files, fetch and cache as blob
            try {
                const response = await fetch(data.signedUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                MediaManager.blobCache.set(fileName, { blobUrl, expiresAt });
                console.log(`[MediaManager] Successfully cached video blob for ${fileName}`);
                return blobUrl;
            } catch (error) {
                console.error('[MediaManager] Failed to cache video blob:', error);
                // Fallback to signed URL
                this.urlCache.set(fileName, { url: data.signedUrl, expiresAt });
                console.log(`[MediaManager] Using signed URL fallback for ${fileName}`);
                return data.signedUrl;
            }
        } else {
            // For non-video files, cache the signed URL
            this.urlCache.set(fileName, { url: data.signedUrl, expiresAt });
            return data.signedUrl;
        }
    }

    /**
     * Precaches signed URLs for current and upcoming slides to improve loading performance.
     * @param slides Array of all slides in the presentation
     * @param currentSlideIndex The current slide index
     * @param precacheCount Number of slides ahead to precache (default: 3)
     * @param includeCurrent Whether to precache the current slide (default: true)
     */
    public precacheUpcomingSlides(
        slides: Slide[],
        currentSlideIndex: number,
        precacheCount: number = this.DEFAULT_PRECACHE_COUNT,
        includeCurrent: boolean = true
    ): void {
        // Skip if we already precached for this slide index
        if (this.lastPrecacheSlideIndex === currentSlideIndex) {
            return;
        }

        // Update the last precached slide index
        this.lastPrecacheSlideIndex = currentSlideIndex;

        // Precache current slide first if requested
        if (includeCurrent && currentSlideIndex >= 0 && currentSlideIndex < slides.length) {
            const currentSlide = slides[currentSlideIndex];
            if (currentSlide?.source_path) {
                const sourcePath = currentSlide.source_path;
                // Skip if already precaching this file
                if (!this.precachingInProgress.has(sourcePath)) {
                    // Skip if already cached and not expired
                    const cached = this.urlCache.get(sourcePath);
                    if (!cached || cached.expiresAt <= Date.now()) {
                        this.precachingInProgress.add(sourcePath);
                        this.precacheSingleSlide(sourcePath)
                            .finally(() => {
                                this.precachingInProgress.delete(sourcePath);
                            });
                    }
                }
            }
        }

        // Calculate which upcoming slides to precache
        const startIndex = currentSlideIndex + 1;
        const endIndex = Math.min(startIndex + precacheCount, slides.length);

        if (startIndex >= slides.length) return;

        // Precache upcoming slides asynchronously without blocking
        for (let i = startIndex; i < endIndex; i++) {
            const slide = slides[i];
            if (!slide?.source_path) continue;

            const sourcePath = slide.source_path;
            // Skip if already precaching this file
            if (this.precachingInProgress.has(sourcePath)) continue;

            // Skip if already cached and not expired
            const cached = this.urlCache.get(sourcePath);
            if (cached && cached.expiresAt > Date.now()) continue;

            // Start precaching this slide
            this.precachingInProgress.add(sourcePath);

            this.precacheSingleSlide(sourcePath)
                .finally(() => {
                    this.precachingInProgress.delete(sourcePath);
                });
        }
    }

    /**
     * Precaches a single slide's media file immediately.
     * This is useful for precaching the current slide when navigating.
     * @param fileName The source path of the slide media
     */
    public async precacheSingleSlide(fileName: string): Promise<void> {
        try {
            await this.getSignedUrl(fileName);
        } catch (error) {
            console.warn(`[MediaManager] Failed to precache ${fileName}:`,
                error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Clears expired URLs from the cache to free up memory.
     * This can be called periodically to maintain cache health.
     */
    public cleanupExpiredCache(): void {
        const now = Date.now();
        for (const [fileName, cached] of this.urlCache.entries()) {
            if (cached.expiresAt <= now) {
                this.urlCache.delete(fileName);
            }
        }
    }

    /**
     * Returns cache statistics for debugging/monitoring.
     */
    public getCacheStats(): {
        totalCached: number;
        expiredCount: number;
        precachingInProgress: number;
    } {
        const now = Date.now();
        let expiredCount = 0;

        for (const cached of this.urlCache.values()) {
            if (cached.expiresAt <= now) {
                expiredCount++;
            }
        }

        return {
            totalCached: this.urlCache.size,
            expiredCount,
            precachingInProgress: this.precachingInProgress.size,
        };
    }

    /**
     * Manually clears all cache (useful for testing or troubleshooting).
     */
    public clearCache(): void {
        this.urlCache.clear();
        this.precachingInProgress.clear();
        this.lastPrecacheSlideIndex = null;
    }
}

export const mediaManager = MediaManager.getInstance();
