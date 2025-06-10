// src/shared/services/MediaManager.ts
import {supabase} from '@shared/services/supabase';

interface CachedUrl {
    url: string;
    expiresAt: number;
}

/**
 * MediaManager is a singleton class responsible for fetching, caching,
 * and refreshing signed URLs for private media from a Supabase bucket ON DEMAND.
 */
class MediaManager {
    private static instance: MediaManager;
    private urlCache = new Map<string, CachedUrl>();
    private readonly BUCKET_NAME = 'slide-content';
    private readonly SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour
    private readonly REFRESH_BUFFER_MS = 60 * 1000; // 1 minute buffer

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
}

export const mediaManager = MediaManager.getInstance();
