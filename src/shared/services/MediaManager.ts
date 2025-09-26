// src/shared/services/MediaManager.ts
// Updated MediaManager with public precacheSingleSlide method

import {supabase} from '@shared/services/supabase';
import {Slide} from '@shared/types/game';
import {UserType} from '@shared/constants/formOptions';
import {hasBusinessVersion} from '@shared/constants/businessSlides';
import {hasVersion15} from "@shared/constants/version15Slides.ts";

interface CachedUrl {
    url: string;
    expiresAt: number;
}

interface BulkDownloadProgress {
    downloaded: number;
    total: number;
    currentFile: string;
    isComplete: boolean;
    errors: string[];
}

interface BulkDownloadOptions {
    gameVersion?: string;
    userType: UserType;
    onProgress?: (progress: BulkDownloadProgress) => void;
    concurrent?: number; // Number of simultaneous downloads
}

/**
 * MediaManager is a singleton class responsible for fetching, caching,
 * and refreshing signed URLs for private media from a Supabase bucket ON DEMAND.
 * Now includes slide precaching functionality.
 */
class MediaManager {
    private static instance: MediaManager;
    private urlCache: Map<string, CachedUrl> = new Map<string, CachedUrl>();
    private static blobCache = new Map<string, {
        blobUrl: string;
        expiresAt: number;
    }>();
    private readonly BUCKET_NAME = 'slide-content';
    private readonly SIGNED_URL_EXPIRY_SECONDS: number = 3600; // 1 hour
    private readonly REFRESH_BUFFER_MS: number = 60 * 1000; // 1 minute buffer
    private readonly DEFAULT_PRECACHE_COUNT: number = 3; // Default number of slides to precache ahead

    // Track precaching operations to avoid duplicates
    private precachingInProgress: Set<string> = new Set<string>();
    private lastPrecacheSlideIndex: number | null = null;

    private bulkDownloadProgress: BulkDownloadProgress | null = null;
    private readonly BULK_DOWNLOAD_STORAGE_KEY = 'media-bulk-download-complete';
    private readonly BULK_DOWNLOAD_VERSION_KEY = 'media-bulk-download-version';

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
     * @param fileName The file name
     * @param skipBlobCache Skip blob caching (useful for precaching to avoid JWT timing issues)
     */
    public async getSignedUrl(fileName: string, skipBlobCache: boolean = false): Promise<string> {
        // Check if this is a video file
        const isVideoFile: boolean = /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);

        if (isVideoFile && !skipBlobCache) {
            // For video files, use blob cache (only if not skipping)
            const cached = MediaManager.blobCache.get(fileName);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.blobUrl;
            }
        } else {
            // For non-video files, or when skipping blob cache, use regular URL cache
            const cached: CachedUrl | undefined = this.urlCache.get(fileName);
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
            throw new Error(`Could not get media URL for ${fileName}: ${error.message}`);
        }

        if (!data?.signedUrl) {
            throw new Error(`No signed URL returned for ${fileName}`);
        }

        const expiresAt: number = Date.now() + (this.SIGNED_URL_EXPIRY_SECONDS * 1000) - this.REFRESH_BUFFER_MS;

        if (isVideoFile && !skipBlobCache) {
            // Try to cache as blob (only if not skipping)
            try {
                const response: Response = await fetch(data.signedUrl);
                if (!response.ok) {
                    let errorBody = '';
                    try {
                        errorBody = await response.text();
                    } catch (error) {
                        errorBody = 'Could not read error response' + error;
                    }

                    console.error(`[MediaManager] Fetch failed with status ${response.status} for ${fileName}:`, {
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        url: data.signedUrl,
                        errorBody: errorBody
                    });
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }

                const blob: Blob = await response.blob();
                const blobUrl: string = URL.createObjectURL(blob);

                MediaManager.blobCache.set(fileName, {blobUrl, expiresAt});
                return blobUrl;
            } catch (error) {
                console.error('[MediaManager] Failed to cache video blob:', error);
                // Fallback to signed URL
                this.urlCache.set(fileName, {url: data.signedUrl, expiresAt});
                return data.signedUrl;
            }
        } else {
            // For non-video files or when skipping blob cache, cache the signed URL
            this.urlCache.set(fileName, {url: data.signedUrl, expiresAt});
            return data.signedUrl;
        }
    }

    /**
     * Gets signed URL with version hierarchy fallback logic
     * Version 1.5: version15 slides → business slides → standard slides
     * Business users: business slides → standard slides
     * Academic users: standard slides only
     */
    public async getSignedUrlWithFallback(fileName: string, userType: UserType, gameVersion?: string, skipBlobCache: boolean = false): Promise<string> {
        // For version 1.5, try version15 folder first
        if (gameVersion === '1.5') {
            if (hasVersion15(fileName)) {
                const version15Path = `business/version15/${fileName}`;
                return await this.getSignedUrl(version15Path, skipBlobCache);
            }
        }

        // If we are a business user or omep override the default content
        if ((userType === 'business' || userType === 'omep') && hasBusinessVersion(fileName)) {
            const businessPath = `business/${fileName}`;
            return await this.getSignedUrl(businessPath, skipBlobCache);
        }

        // Get standard content
        return await this.getSignedUrl(fileName, skipBlobCache);
    }

    /**
     * Precaches signed URLs for current and upcoming slides to improve loading performance.
     * @param slides Array of all slides in the presentation
     * @param currentSlideIndex The current slide index
     * @param userType Business or Academic
     * @param gameVersion The version to use
     * @param precacheCount Number of slides ahead to precache (default: 3)
     * @param includeCurrent Whether to precache the current slide (default: true)
     */
    public precacheUpcomingSlides(
        slides: Slide[],
        currentSlideIndex: number,
        userType: UserType,
        gameVersion?: string,
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
                        this.precacheSingleSlide(sourcePath, userType, gameVersion)
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

            this.precacheSingleSlide(sourcePath, userType, gameVersion)
                .finally(() => {
                    this.precachingInProgress.delete(sourcePath);
                });
        }
    }

    /**
     * Precaches a single slide's media file immediately.
     * This is useful for precaching the current slide when navigating.
     * @param fileName The source path of the slide media
     * @param userType The user type for business/academic path resolution
     * @param gameVersion the version to load
     */
    public async precacheSingleSlide(fileName: string, userType: UserType, gameVersion?: string): Promise<void> {
        try {
            // Skip blob caching for precaching to avoid JWT timing issues
            await this.getSignedUrlWithFallback(fileName, userType, gameVersion, true);
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

    /**
     * Downloads and caches all media files for a game structure locally
     */
    public async bulkDownloadAllMedia(
        slides: Slide[],
        options: BulkDownloadOptions
    ): Promise<void> {
        const { gameVersion, userType, onProgress, concurrent = 5 } = options;

        // Get all unique media files
        const mediaFiles = this.extractUniqueMediaPaths(slides, userType, gameVersion);

        this.bulkDownloadProgress = {
            downloaded: 0,
            total: mediaFiles.length,
            currentFile: '',
            isComplete: false,
            errors: []
        };

        console.log(`[MediaManager] Starting bulk download of ${mediaFiles.length} files`);

        // Download files in batches to avoid overwhelming the browser
        const batches = this.chunkArray(mediaFiles, concurrent);

        for (const batch of batches) {
            const promises = batch.map(async (filePath) => {
                try {
                    this.bulkDownloadProgress!.currentFile = filePath;
                    onProgress?.(this.bulkDownloadProgress!);

                    // Force download and cache the file
                    await this.getSignedUrlWithFallback(filePath, userType, gameVersion, false);

                    this.bulkDownloadProgress!.downloaded++;
                    onProgress?.(this.bulkDownloadProgress!);

                } catch (error) {
                    const errorMsg = `Failed to download ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    this.bulkDownloadProgress!.errors.push(errorMsg);
                    console.warn('[MediaManager] Bulk download error:', errorMsg);
                }
            });

            await Promise.all(promises);
        }

        this.bulkDownloadProgress.isComplete = true;
        this.bulkDownloadProgress.currentFile = '';
        onProgress?.(this.bulkDownloadProgress);

        // Mark bulk download as complete in localStorage
        localStorage.setItem(this.BULK_DOWNLOAD_STORAGE_KEY, 'true');
        localStorage.setItem(this.BULK_DOWNLOAD_VERSION_KEY, `${gameVersion || 'default'}-${userType}`);

        console.log(`[MediaManager] Bulk download complete. Downloaded: ${this.bulkDownloadProgress.downloaded}, Errors: ${this.bulkDownloadProgress.errors.length}`);
    }

    /**
     * Extracts all unique media file paths from slides considering version hierarchy
     */
    private extractUniqueMediaPaths(slides: Slide[], userType: UserType, gameVersion?: string): string[] {
        const mediaPaths = new Set<string>();

        slides.forEach(slide => {
            if (slide.source_path) {
                // Get the actual file path that would be used based on version hierarchy
                const resolvedPath = this.resolveMediaPath(slide.source_path, userType, gameVersion);
                mediaPaths.add(resolvedPath);
            }
        });

        return Array.from(mediaPaths);
    }

    /**
     * Resolves the actual media path based on version hierarchy logic
     */
    private resolveMediaPath(fileName: string, userType: UserType, gameVersion?: string): string {
        // For version 1.5, try version15 folder first
        if (gameVersion === '1.5') {
            if (hasVersion15(fileName)) {
                return `business/version15/${fileName}`;
            }
        }

        // If we are a business user or omep override the default content
        if ((userType === 'business' || userType === 'omep') && hasBusinessVersion(fileName)) {
            return `business/${fileName}`;
        }

        // Get standard content
        return fileName;
    }

    /**
     * Helper to chunk array into smaller arrays
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Check if bulk download is complete for current version/user type
     */
    public isBulkDownloadComplete(gameVersion?: string, userType?: UserType): boolean {
        const isComplete = localStorage.getItem(this.BULK_DOWNLOAD_STORAGE_KEY) === 'true';
        const storedVersion = localStorage.getItem(this.BULK_DOWNLOAD_VERSION_KEY);
        const currentVersion = `${gameVersion || 'default'}-${userType || 'academic'}`;

        return isComplete && storedVersion === currentVersion;
    }

    /**
     * Get current bulk download progress
     */
    public getBulkDownloadProgress(): BulkDownloadProgress | null {
        return this.bulkDownloadProgress;
    }

    /**
     * Clear bulk download cache and reset completion status
     */
    public clearBulkDownloadCache(): void {
        localStorage.removeItem(this.BULK_DOWNLOAD_STORAGE_KEY);
        localStorage.removeItem(this.BULK_DOWNLOAD_VERSION_KEY);
        this.clearCache(); // Clear existing media cache
        this.bulkDownloadProgress = null;
    }
}

export const mediaManager: MediaManager = MediaManager.getInstance();
