// src/shared/services/MediaManager.ts
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
     * It will first check the cache, and if the URL is missing or expired,
     * it will fetch a new one from Supabase.
     * @param fileName The name of the file (e.g., 'slide_001.jpg').
     * @returns A promise that resolves to the signed URL string.
     */
    public async getSignedUrl(fileName: string): Promise<string> {
        const cached = this.urlCache.get(fileName);

        // If we have a valid, non-expired URL in the cache, return it immediately.
        if (cached && cached.expiresAt > Date.now()) {
            return cached.url;
        }

        // Otherwise, fetch a new signed URL from Supabase.
        console.log(`[MediaManager] Cache miss or expired for "${fileName}". Fetching new signed URL.`);

        const {data, error} = await supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUrl(fileName, this.SIGNED_URL_EXPIRY_SECONDS);

        if (error) {
            console.error(`[MediaManager] Error creating signed URL for ${fileName}:`, error);
            if (error.message.includes("Object not found")) {
                throw new Error(`Could not get media URL for ${fileName}. The file may not exist at the root of the '${this.BUCKET_NAME}' bucket or you may be missing the required Storage Policy.`);
            }
            throw new Error(`Could not get media URL for ${fileName}: ${error.message}`);
        }

        if (!data?.signedUrl) {
            throw new Error(`No signed URL returned for ${fileName}`);
        }

        // Cache the new URL with its expiry time (plus a safety buffer).
        const expiresAt = Date.now() + (this.SIGNED_URL_EXPIRY_SECONDS * 1000) - this.REFRESH_BUFFER_MS;
        this.urlCache.set(fileName, {
            url: data.signedUrl,
            expiresAt,
        });

        return data.signedUrl;
    }

    /**
     * Precaches signed URLs for upcoming slides to improve loading performance.
     * This method runs in the background and won't block the UI.
     *
     * @param slides Array of all slides in the presentation
     * @param currentSlideIndex The current slide index
     * @param precacheCount Number of slides ahead to precache (default: 3)
     */
    public precacheUpcomingSlides(
        slides: Slide[],
        currentSlideIndex: number,
        precacheCount: number = this.DEFAULT_PRECACHE_COUNT
    ): void {
        // Skip if we already precached for this slide index
        if (this.lastPrecacheSlideIndex === currentSlideIndex) {
            return;
        }

        // Update the last precached slide index
        this.lastPrecacheSlideIndex = currentSlideIndex;

        // Calculate which slides to precache
        const startIndex = currentSlideIndex + 1;
        const endIndex = Math.min(startIndex + precacheCount, slides.length);

        if (startIndex >= slides.length) {
            console.log('[MediaManager] No upcoming slides to precache');
            return;
        }

        console.log(`[MediaManager] Precaching slides ${startIndex} to ${endIndex - 1} (${endIndex - startIndex} slides)`);

        // Precache slides asynchronously without blocking
        for (let i = startIndex; i < endIndex; i++) {
            const slide = slides[i];
            if (!slide?.source_path) continue;

            // Skip if already precaching this file
            if (this.precachingInProgress.has(slide.source_path)) continue;

            // Skip if already cached and not expired
            const cached = this.urlCache.get(slide.source_path);
            if (cached && cached.expiresAt > Date.now()) continue;

            // Start precaching this slide
            this.precachingInProgress.add(slide.source_path);

            this.precacheSingleSlide(slide.source_path)
                .finally(() => {
                    this.precachingInProgress.delete(slide.source_path);
                });
        }
    }

    /**
     * Precaches a single slide's media file in the background.
     * @param fileName The source path of the slide media
     */
    private async precacheSingleSlide(fileName: string): Promise<void> {
        try {
            console.log(`[MediaManager] Precaching slide: ${fileName}`);
            await this.getSignedUrl(fileName);
            console.log(`[MediaManager] Successfully precached: ${fileName}`);
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
        let removedCount = 0;

        for (const [fileName, cached] of this.urlCache.entries()) {
            if (cached.expiresAt <= now) {
                this.urlCache.delete(fileName);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`[MediaManager] Cleaned up ${removedCount} expired cache entries`);
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
        console.log('[MediaManager] Cache cleared');
    }
}

export const mediaManager = MediaManager.getInstance();
