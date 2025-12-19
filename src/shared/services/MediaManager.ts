// src/shared/services/MediaManager.ts
// Updated MediaManager with public precacheSingleSlide method

import {supabase} from '@shared/services/supabase';
import {GameVersion, Slide} from '@shared/types/game';
import {UserType} from '@shared/constants/formOptions';
import {hasBusinessVersion} from '@shared/constants/businessSlides';
import {hasVersion15} from "@shared/constants/version15Slides";
import {indexedDBCache} from "@shared/services/IndexedDBCache";
import { hasVersion15Academic } from '@shared/constants/version15AcademicSlides';
import { readyOrNotGame_1_5_ACADEMIC, readyOrNotGame_1_5_DD, readyOrNotGame_1_5_NO_DD, readyOrNotGame_2_0_DD, readyOrNotGame_2_0_NO_DD } from '@core/content/GameStructure';

interface CachedBlobUrl {
    blobUrl: string;
    expiresAt: number;
}

export interface BulkDownloadProgress {
    downloaded: number;
    total: number;
    currentFile: string;
    isComplete: boolean;
    errors: string[];
}

/**
 * MediaManager - Singleton class responsible for fetching and caching
 * images and videos from Supabase storage.
 */
class MediaManager {
    private static instance: MediaManager;
    
    // Single in-memory cache for speed (read-through cache on top of IndexedDB)
    private blobCache = new Map<string, CachedBlobUrl>();
    
    private readonly BUCKET_NAME = 'slide-content';
    private readonly CACHE_EXPIRY_HOURS = 24; // 24 hours for IndexedDB cache
    private readonly CACHE_EXPIRY_MS = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    private readonly DEFAULT_PRECACHE_COUNT = 3;

    // Track precaching operations to avoid duplicates
    private precachingInProgress = new Set<string>();
    private lastPrecacheSlideIndex: number | null = null;

    // Bulk download tracking
    private bulkDownloadProgress: BulkDownloadProgress | null = null;
    private isBulkDownloading = false;
    private bulkDownloadAbortController: AbortController | null = null;
    private readonly BULK_DOWNLOAD_CONTENT_VERSION_KEY = 'media-bulk-download-content-version';
    private readonly BULK_DOWNLOAD_CURRENT_CONTENT_VERSION = '1.3';

    private constructor() {}

    public static getInstance(): MediaManager {
        if (!MediaManager.instance) {
            MediaManager.instance = new MediaManager();
        }
        return MediaManager.instance;
    }

    /**
     * Gets a blob URL for media file with unified caching strategy:
     * 1. Check in-memory cache (instant)
     * 2. Check IndexedDB (persistent, cross-tab)
     * 3. Fetch from Supabase and cache in both layers
     */
    public async getMediaUrl(fileName: string, signal?: AbortSignal): Promise<string> {
        // STEP 1: Check in-memory cache first (fastest)
        const memCached = this.blobCache.get(fileName);
        if (memCached && memCached.expiresAt > Date.now()) {
            console.log(`[MediaManager] Using in-memory cache for ${fileName}`);
            return memCached.blobUrl;
        }

        // STEP 2: Check IndexedDB (persistent, cross-tab)
        try {
            const idbEntry = await indexedDBCache.get(fileName);
            if (idbEntry && idbEntry.expiresAt > Date.now()) {
                console.log(`[MediaManager] Using IndexedDB cache for ${fileName}`);
                
                // Warm up in-memory cache for future access
                this.blobCache.set(fileName, {
                    blobUrl: idbEntry.blobUrl,
                    expiresAt: idbEntry.expiresAt
                });
                
                return idbEntry.blobUrl;
            }
        } catch (error) {
            console.warn(`[MediaManager] IndexedDB lookup failed for ${fileName}:`, error);
        }

        // STEP 3: Fetch from Supabase and cache in both layers
        return await this.fetchAndCacheMedia(fileName, signal);
    }

    /**
     * Fetches media from Supabase and stores in both cache layers
     */
    private async fetchAndCacheMedia(fileName: string, signal?: AbortSignal): Promise<string> {
        console.log(`[MediaManager] Fetching ${fileName} from Supabase`);

        // Get signed URL from Supabase
        const {data, error} = await supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUrl(fileName, 3600); // 1 hour signed URL validity

        if (error) {
            console.error(`[MediaManager] Error creating signed URL for ${fileName}:`, error);
            if (error.message.includes("Object not found")) {
                throw new Error(
                    `Could not get media URL for ${fileName}. ` +
                    `The file may not exist in the '${this.BUCKET_NAME}' bucket.`
                );
            }
            throw new Error(`Could not get media URL for ${fileName}: ${error.message}`);
        }

        if (!data?.signedUrl) {
            throw new Error(`No signed URL returned for ${fileName}`);
        }

        // Fetch the actual file as a blob
        const response = await fetch(data.signedUrl, { signal });
        if (!response.ok) {
            throw new Error(
                `Failed to fetch ${fileName}: ${response.status} ${response.statusText}`
            );
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const expiresAt = Date.now() + this.CACHE_EXPIRY_MS;

        // Store in both caches
        const cacheEntry = {blobUrl, expiresAt};
        this.blobCache.set(fileName, cacheEntry);

        try {
            await indexedDBCache.set(fileName, blobUrl, blob, expiresAt);
            console.log(`[MediaManager] Cached ${fileName} in memory + IndexedDB`);
        } catch (idbError) {
            console.warn(`[MediaManager] Failed to store in IndexedDB for ${fileName}:`, idbError);
            // Continue anyway - in-memory cache still works
        }

        return blobUrl;
    }

    /**
     * Gets media URL with version hierarchy fallback logic
     * Version 1.5: version15 slides → business slides → standard slides
     * Business users: business slides → standard slides
     * Academic users: standard slides only
     */
    public async getMediaUrlWithFallback(
        fileName: string,
        userType: UserType,
        gameVersion?: GameVersion
    ): Promise<string> {
        const resolvedPath = this.resolveMediaPath(fileName, userType, gameVersion);
        return await this.getMediaUrl(resolvedPath);
    }

    /**
     * Resolves the actual media path based on version hierarchy logic
     */
    private resolveMediaPath(
        fileName: string,
        userType: UserType,
        gameVersion?: GameVersion
    ): string {
        // For version 1.5, try version15 folder first
        if (gameVersion?.includes('1.5')) {
            if (gameVersion === GameVersion.V1_5_ACADEMIC && hasVersion15Academic(fileName)) {
                return `business/version15/academic/${fileName}`;
            }

            if (hasVersion15(fileName)) {
                return `business/version15/${fileName}`;
            }
        }

        // If business user or omep, try business folder (exclude 1.5 academic)
        if (
            (userType === 'business' || userType === 'omep') &&
            hasBusinessVersion(fileName) &&
            gameVersion !== GameVersion.V1_5_ACADEMIC
        ) {
            return `business/${fileName}`;
        }

        // Standard content
        return fileName;
    }

    /**
     * Precaches upcoming slides into memory from IndexedDB or Supabase
     * - Loads current slide + next N slides
     * - Checks memory first, then IndexedDB, then Supabase
     * - Non-blocking background operation
     */
    public precacheUpcomingSlides(
        slides: Slide[],
        currentSlideIndex: number,
        userType: UserType,
        gameVersion?: GameVersion,
        precacheCount: number = this.DEFAULT_PRECACHE_COUNT,
        includeCurrent = true
    ): void {
        // Skip if we already precached for this slide index
        if (this.lastPrecacheSlideIndex === currentSlideIndex) {
            return;
        }

        this.lastPrecacheSlideIndex = currentSlideIndex;

        // Precache current slide first if requested
        if (includeCurrent && currentSlideIndex >= 0 && currentSlideIndex < slides.length) {
            const currentSlide = slides[currentSlideIndex];
            if (currentSlide?.source_path) {
                this.precacheSingleSlide(currentSlide.source_path, userType, gameVersion);
            }
        }

        // Calculate which upcoming slides to precache
        const startIndex = currentSlideIndex + 1;
        const endIndex = Math.min(startIndex + precacheCount, slides.length);

        if (startIndex >= slides.length) return;

        // Precache upcoming slides asynchronously
        for (let i = startIndex; i < endIndex; i++) {
            const slide = slides[i];
            if (!slide?.source_path) continue;

            this.precacheSingleSlide(slide.source_path, userType, gameVersion);
        }
    }

    /**
     * Precaches a single slide's media into memory
     * Checks: memory → IndexedDB → Supabase
     */
    public async precacheSingleSlide(
        fileName: string,
        userType: UserType,
        gameVersion?: GameVersion
    ): Promise<void> {
        const resolvedPath = this.resolveMediaPath(fileName, userType, gameVersion);

        // Skip if already precaching this file
        if (this.precachingInProgress.has(resolvedPath)) {
            return;
        }

        // Skip if already in memory cache and not expired
        const memCached = this.blobCache.get(resolvedPath);
        if (memCached && memCached.expiresAt > Date.now()) {
            return;
        }

        this.precachingInProgress.add(resolvedPath);

        try {
            await this.getMediaUrl(resolvedPath);
        } catch (error) {
            console.warn(
                `[MediaManager] Failed to precache ${resolvedPath}:`,
                error instanceof Error ? error.message : 'Unknown error'
            );
        } finally {
            this.precachingInProgress.delete(resolvedPath);
        }
    }

    /**
     * Bulk downloads all slides to IndexedDB for offline use
     * Validates existing content
     */
    public async ensureAllMediaIsCached(
        gameVersion: GameVersion,
        userType: UserType,
        onProgress: (progress: BulkDownloadProgress) => void,
        concurrent: number = 5
    ): Promise<void> {
        // Prevent concurrent downloads
        if (this.isBulkDownloading) {
            console.warn('[MediaManager] Download already in progress');
            return;
        }
        this.isBulkDownloading = true;
        this.bulkDownloadAbortController = new AbortController();

        try {
            // Check our content version, if we are expired, lets clear everything and reupdate
            const cachedContentVersion = localStorage.getItem(this.BULK_DOWNLOAD_CONTENT_VERSION_KEY);
            if (cachedContentVersion !== this.BULK_DOWNLOAD_CURRENT_CONTENT_VERSION) {
                console.log('[MediaManager] Content version outdated, clearing cache');
                await this.clearCache();
            }

            // Check if already downloaded and cache is still valid
            const filePaths = this.getSlidePathsFromVersion(gameVersion, userType);
            const missingPaths = await this.checkCacheForPaths(filePaths);
            if (missingPaths.length === 0) {
                console.log(`[MediaManager] Cache already has content`);
                if (onProgress) {
                    onProgress({
                        downloaded: filePaths.length,
                        total: filePaths.length,
                        currentFile: '',
                        isComplete: true,
                        errors: []
                    });
                }
                this.isBulkDownloading = false;
                return;
            }

            this.bulkDownloadProgress = {
                downloaded: filePaths.length - missingPaths.length,
                total: filePaths.length,
                currentFile: '',
                isComplete: false,
                errors: []
            };

            console.log(`[MediaManager] Bulk downloading ${filePaths.length} files`);

            // Download in batches to avoid overwhelming the browser
            const batches = this.chunkArray(missingPaths, concurrent);

            for (const batch of batches) {
                if (this.bulkDownloadAbortController.signal.aborted) {
                    break;
                }

                const promises = batch.map(async (filePath) => {
                    try {
                        this.bulkDownloadProgress!.currentFile = filePath;
                        onProgress?.(this.bulkDownloadProgress!);

                        await this.getMediaUrl(filePath, this.bulkDownloadAbortController!.signal);

                        this.bulkDownloadProgress!.downloaded++;
                        onProgress?.(this.bulkDownloadProgress!);
                    } catch (error) {
                        if (error instanceof DOMException && error.name === 'AbortError') {
                            console.log(`[MediaManager] Download of ${filePath} cancelled`);
                            return;
                        }

                        const errorMsg = `Failed to download ${filePath}: ${
                            error instanceof Error ? error.message : 'Unknown error'
                        }`;
                        this.bulkDownloadProgress!.errors.push(errorMsg);
                        console.warn('[MediaManager] Bulk download error:', errorMsg);
                        
                        this.bulkDownloadProgress!.downloaded++;
                        onProgress?.(this.bulkDownloadProgress!);
                    }
                });

                await Promise.all(promises);
            }

            
            if (this.bulkDownloadAbortController.signal.aborted) {
                console.log('[MediaManager] Bulk download canceled');
                this.bulkDownloadProgress.currentFile = 'cancelled';
                onProgress?.(this.bulkDownloadProgress);
                return;
            }
            
            this.bulkDownloadProgress.isComplete = true;
            this.bulkDownloadProgress.currentFile = '';
            onProgress?.(this.bulkDownloadProgress);

            // Mark bulk download as complete
            localStorage.setItem(this.BULK_DOWNLOAD_CONTENT_VERSION_KEY, this.BULK_DOWNLOAD_CURRENT_CONTENT_VERSION);

            console.log(
                `[MediaManager] Bulk download complete. ` +
                `Downloaded: ${this.bulkDownloadProgress.downloaded}, ` +
                `Errors: ${this.bulkDownloadProgress.errors.length}`
            );
        } finally {
            this.isBulkDownloading = false;
            this.bulkDownloadAbortController = null;
        }
    }

    /**
     * Get slides array for a specific game version
     */
    private getSlidePathsFromVersion(gameVersion: GameVersion, userType: UserType): string[] {
        let slides: Slide[];
        switch (gameVersion) {
            case GameVersion.V1_5_DD:
                 slides = readyOrNotGame_1_5_DD.slides;
                 break;
            case GameVersion.V1_5_NO_DD:
                slides = readyOrNotGame_1_5_NO_DD.slides;
                 break;
            case GameVersion.V1_5_ACADEMIC:
                slides = readyOrNotGame_1_5_ACADEMIC.slides;
                 break;
            case GameVersion.V2_0_NO_DD:
                slides = readyOrNotGame_2_0_NO_DD.slides;
                 break;
            case GameVersion.V2_0_DD:
            default:
                slides = readyOrNotGame_2_0_DD.slides;
                 break;
        }

        const mediaPaths = new Set<string>();
        slides.forEach(slide => {
            if (slide.source_path) {
                const resolvedPath = this.resolveMediaPath(
                    slide.source_path,
                    userType,
                    gameVersion
                );
                mediaPaths.add(resolvedPath);
            }
        });

        return Array.from(mediaPaths);    }

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
     * Check if bulk download cache contains given slidepaths.
     */
    private async checkCacheForPaths(slidePaths: string[]): Promise<string[]> {
        // Run cleanup first to avoid validating expired content
        this.cleanupExpiredCache();

        // Check our content version, if we are expired, everything needs to be redownloaded
        const cachedContentVersion = localStorage.getItem(this.BULK_DOWNLOAD_CONTENT_VERSION_KEY);
        if (cachedContentVersion !== this.BULK_DOWNLOAD_CURRENT_CONTENT_VERSION) {
            return slidePaths;
        }

        // Get all keys currently in IndexedDB
        const cachedKeys = await indexedDBCache.getAllKeys();
        const cachedKeysSet = new Set(cachedKeys);
        
        // Find missing files
        const missingFiles: string[] = [];
        for (const filePath of slidePaths) {
            if (!cachedKeysSet.has(filePath)) {
                missingFiles.push(filePath);
            }
        }

        return missingFiles;
    }

    public isBulkDownloadInProgress(){
        return this.isBulkDownloading;
    }

    /**
     * Get current bulk download progress
     */
    public getBulkDownloadProgress(): BulkDownloadProgress | null {
        return this.bulkDownloadProgress;
    }

    /**
     * Returns cache statistics for debugging
     */
    public getCacheStats(): {
        memoryCached: number;
        precachingInProgress: number;
    } {
        return {
            memoryCached: this.blobCache.size,
            precachingInProgress: this.precachingInProgress.size,
        };
    }

    /**
     * Clears all caches (memory + IndexedDB)
     */
    public clearCache(): void {
        this.blobCache.clear();
        this.precachingInProgress.clear();
        this.lastPrecacheSlideIndex = null;

        indexedDBCache.clear().catch(error => {
            console.error('[MediaManager] Failed to clear IndexedDB:', error);
        });
    }

    /**
     * Clear bulk download cache and reset completion status
     */
    public clearBulkDownloadCache(): void {
        this.clearCache();
        this.bulkDownloadProgress = null;
        this.isBulkDownloading = false;
    }

    /**
     * Cleans up expired entries from IndexedDB
     */
    public cleanupExpiredCache(): void {
        // Cleanup IndexedDB
        indexedDBCache.cleanupExpired().catch(error => {
            console.error('[MediaManager] Failed to cleanup IndexedDB:', error);
        });
    }

    public cancelBulkDownload(): void {
        if (this.bulkDownloadAbortController) {
            this.bulkDownloadAbortController.abort();
        }
    }
}

export const mediaManager = MediaManager.getInstance();