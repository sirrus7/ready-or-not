// src/shared/services/MediaManager.ts
// Updated MediaManager with public precacheSingleSlide method

import {supabase} from '@shared/services/supabase';
import {Slide} from '@shared/types/game';
import {UserType} from '@shared/constants/formOptions';
import {hasBusinessVersion} from '@shared/constants/businessSlides';
import {hasVersion15} from "@shared/constants/version15Slides";
import {indexedDBCache} from "@shared/services/IndexedDBCache";

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
    private readonly BULK_DOWNLOAD_TIMESTAMP_KEY = 'media-bulk-download-timestamp';
    private readonly BULK_DOWNLOAD_CONTENT_VERSION_KEY = 'media-bulk-download-content-version';
    private readonly BULK_DOWNLOAD_CACHE_EXPIRY_DAYS = 7; // Cache expires after 7 days
    private readonly BULK_DOWNLOAD_CURRENT_CONTENT_VERSION = '1.1'; // Increment when you update slides
    private isBulkDownloading: boolean = false;

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
     * @param forceBlobCache Force blob caching even for non-video files (for bulk download)
     */
    public async getSignedUrl(fileName: string, skipBlobCache: boolean = false, forceBlobCache: boolean = false): Promise<string> {
        // STEP 1: Check IndexedDB first (works across tabs)
        if (!skipBlobCache) {
            try {
                const indexedDBEntry = await indexedDBCache.get(fileName);
                if (indexedDBEntry && indexedDBEntry.expiresAt > Date.now()) {
                    console.log(`[MediaManager] Using IndexedDB cache for ${fileName}`);
                    // Also update in-memory cache for faster subsequent access
                    MediaManager.blobCache.set(fileName, {
                        blobUrl: indexedDBEntry.blobUrl,
                        expiresAt: indexedDBEntry.expiresAt
                    });
                    return indexedDBEntry.blobUrl;
                }
            } catch (error) {
                console.warn(`[MediaManager] IndexedDB lookup failed for ${fileName}, continuing with fallback:`, error);
            }
        }

        // STEP 2: Check in-memory blob cache (fast but tab-specific)
        if (!skipBlobCache) {
            const blobCached = MediaManager.blobCache.get(fileName);
            if (blobCached && blobCached.expiresAt > Date.now()) {
                console.log(`[MediaManager] Using in-memory blob cache for ${fileName}`);
                return blobCached.blobUrl;
            }
        }

        // Check if this is a video file
        const isVideoFile: boolean = /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);

        // Determine if we should create a NEW blob cache entry
        const shouldCreateBlobCache = !skipBlobCache && (isVideoFile || forceBlobCache);

        // If not using blob cache, check URL cache
        if (!shouldCreateBlobCache) {
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

        if (shouldCreateBlobCache) {
            // Try to cache as blob
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
                    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
                }

                const blob: Blob = await response.blob();
                const blobUrl: string = URL.createObjectURL(blob);

                // Store in in-memory cache
                MediaManager.blobCache.set(fileName, {blobUrl, expiresAt});

                // Store in IndexedDB for cross-tab access
                try {
                    await indexedDBCache.set(fileName, blobUrl, blob, expiresAt);
                } catch (idbError) {
                    console.warn(`[MediaManager] Failed to store in IndexedDB for ${fileName}:`, idbError);
                    // Continue anyway, in-memory cache still works
                }

                console.log(`[MediaManager] Cached ${fileName} as blob URL (memory + IndexedDB)`);
                return blobUrl;
            } catch (error) {
                console.error('[MediaManager] Failed to cache as blob:', error);
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
    public async getSignedUrlWithFallback(fileName: string, userType: UserType, gameVersion?: string, skipBlobCache: boolean = false, forceBlobCache: boolean = false): Promise<string> {
        // For version 1.5, try version15 folder first
        if (gameVersion === '1.5') {
            if (hasVersion15(fileName)) {
                const version15Path = `business/version15/${fileName}`;
                return await this.getSignedUrl(version15Path, skipBlobCache, forceBlobCache);
            }
        }

        // If we are a business user or omep override the default content
        if ((userType === 'business' || userType === 'omep') && hasBusinessVersion(fileName)) {
            const businessPath = `business/${fileName}`;
            return await this.getSignedUrl(businessPath, skipBlobCache, forceBlobCache);
        }

        // Get standard content
        return await this.getSignedUrl(fileName, skipBlobCache, forceBlobCache);
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

        // Also cleanup IndexedDB
        indexedDBCache.cleanupExpired().catch(error => {
            console.error('[MediaManager] Failed to cleanup IndexedDB:', error);
        });
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

        // Also clear IndexedDB
        indexedDBCache.clear().catch(error => {
            console.error('[MediaManager] Failed to clear IndexedDB:', error);
        });
    }

    /**
     * Check if cache is valid (not expired and correct version)
     */
    private isCacheValid(gameVersion?: string, userType?: UserType): boolean {
        const isComplete = localStorage.getItem(this.BULK_DOWNLOAD_STORAGE_KEY) === 'true';
        const storedVersion = localStorage.getItem(this.BULK_DOWNLOAD_VERSION_KEY);
        const currentVersion = `${gameVersion || 'default'}-${userType || 'academic'}`;

        if (!isComplete || storedVersion !== currentVersion) {
            return false;
        }

        // Check content version
        const cachedContentVersion = localStorage.getItem(this.BULK_DOWNLOAD_CONTENT_VERSION_KEY);
        if (cachedContentVersion !== this.BULK_DOWNLOAD_CURRENT_CONTENT_VERSION) {
            console.log('[MediaManager] Content version mismatch, cache invalid');
            return false;
        }

        // Check timestamp expiry
        const timestamp = localStorage.getItem(this.BULK_DOWNLOAD_TIMESTAMP_KEY);
        if (timestamp) {
            const cacheAge = Date.now() - parseInt(timestamp);
            const maxAge = this.BULK_DOWNLOAD_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

            if (cacheAge > maxAge) {
                console.log('[MediaManager] Cache expired, needs refresh');
                return false;
            }
        }

        return true;
    }

    /**
     * Get cache info for display purposes
     */
    public getCacheInfo(gameVersion?: string, userType?: UserType): {
        isComplete: boolean;
        isValid: boolean;
        cachedVersion: string | null;
        timestamp: Date | null;
        daysOld: number | null;
        contentVersion: string | null;
    } {
        const storedVersion = localStorage.getItem(this.BULK_DOWNLOAD_VERSION_KEY);
        const timestamp = localStorage.getItem(this.BULK_DOWNLOAD_TIMESTAMP_KEY);
        const contentVersion = localStorage.getItem(this.BULK_DOWNLOAD_CONTENT_VERSION_KEY);
        const isComplete = localStorage.getItem(this.BULK_DOWNLOAD_STORAGE_KEY) === 'true';

        let daysOld = null;
        let timestampDate = null;

        if (timestamp) {
            const ts = parseInt(timestamp);
            timestampDate = new Date(ts);
            daysOld = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
        }

        return {
            isComplete,
            isValid: this.isCacheValid(gameVersion, userType),
            cachedVersion: storedVersion,
            timestamp: timestampDate,
            daysOld,
            contentVersion
        };
    }

    /**
     * Downloads and caches all media files for a game structure locally
     */
    public async bulkDownloadAllMedia(
        slides: Slide[],
        options: BulkDownloadOptions
    ): Promise<void> {
        const {gameVersion, userType, onProgress, concurrent = 5} = options;
        const cacheKey = `${gameVersion || 'default'}-${userType}`;

        // GUARD: Prevent concurrent downloads
        if (this.isBulkDownloading) {
            console.warn('[MediaManager] Download already in progress, ignoring duplicate call');
            return;
        }

        // Check if already downloaded and cache is still valid
        if (this.isCacheValid(gameVersion, userType)) {
            console.log(`[MediaManager] Cache already valid for ${cacheKey}, skipping download`);
            if (onProgress) {
                const mediaFiles = this.extractUniqueMediaPaths(slides, userType, gameVersion);
                onProgress({
                    downloaded: mediaFiles.length,
                    total: mediaFiles.length,
                    currentFile: '',
                    isComplete: true,
                    errors: []
                });
            }
            return;
        }

        // SET FLAG
        this.isBulkDownloading = true;

        try {
            // Get all unique media files (already resolved paths)
            const mediaFiles = this.extractUniqueMediaPaths(slides, userType, gameVersion);

            this.bulkDownloadProgress = {
                downloaded: 0,
                total: mediaFiles.length,
                currentFile: '',
                isComplete: false,
                errors: []
            };

            console.log(`[MediaManager] Starting bulk download of ${mediaFiles.length} files for ${cacheKey}`);

            // Download files in batches to avoid overwhelming the browser
            const batches = this.chunkArray(mediaFiles, concurrent);

            for (const batch of batches) {
                const promises = batch.map(async (filePath) => {
                    try {
                        this.bulkDownloadProgress!.currentFile = filePath;
                        onProgress?.(this.bulkDownloadProgress!);

                        // filePath is already resolved, so call getSignedUrl directly with forceBlobCache
                        await this.getSignedUrl(filePath, false, true);

                        this.bulkDownloadProgress!.downloaded++;
                        onProgress?.(this.bulkDownloadProgress!);

                    } catch (error) {
                        const errorMsg = `Failed to download ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                        this.bulkDownloadProgress!.errors.push(errorMsg);
                        console.warn('[MediaManager] Bulk download error:', errorMsg);
                        // Still increment the counter even on error to maintain accurate progress
                        this.bulkDownloadProgress!.downloaded++;
                        onProgress?.(this.bulkDownloadProgress!);
                    }
                });

                await Promise.all(promises);
            }

            this.bulkDownloadProgress.isComplete = true;
            this.bulkDownloadProgress.currentFile = '';
            onProgress?.(this.bulkDownloadProgress);

            // Mark bulk download as complete with timestamp and version
            localStorage.setItem(this.BULK_DOWNLOAD_STORAGE_KEY, 'true');
            localStorage.setItem(this.BULK_DOWNLOAD_VERSION_KEY, cacheKey);
            localStorage.setItem(this.BULK_DOWNLOAD_TIMESTAMP_KEY, Date.now().toString());
            localStorage.setItem(this.BULK_DOWNLOAD_CONTENT_VERSION_KEY, this.BULK_DOWNLOAD_CURRENT_CONTENT_VERSION);

            console.log(`[MediaManager] Bulk download complete. Downloaded: ${this.bulkDownloadProgress.downloaded}, Errors: ${this.bulkDownloadProgress.errors.length}`);
        } finally {
            // ALWAYS CLEAR FLAG
            this.isBulkDownloading = false;
        }
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
        return this.isCacheValid(gameVersion, userType);
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
        localStorage.removeItem(this.BULK_DOWNLOAD_TIMESTAMP_KEY);
        localStorage.removeItem(this.BULK_DOWNLOAD_CONTENT_VERSION_KEY);
        this.clearCache(); // Clear existing media cache
        this.bulkDownloadProgress = null;
        this.isBulkDownloading = false; // ADD THIS
    }
}

export const mediaManager: MediaManager = MediaManager.getInstance();
