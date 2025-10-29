// src/shared/services/IndexedDBCache.ts
// IndexedDB wrapper for cross-tab blob URL caching

interface CachedBlobEntry {
    fileName: string;
    blobUrl: string;
    expiresAt: number;
    blobData: Blob;
}

/**
 * IndexedDBCache - Manages blob URL storage across tabs/windows using IndexedDB
 * This allows the presentation display (separate window) to access cached media
 */
class IndexedDBCache {
    private static instance: IndexedDBCache;
    private readonly DB_NAME = 'MediaCache';
    private readonly DB_VERSION = 1;
    private readonly STORE_NAME = 'blobs';
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    private constructor() {
    }

    public static getInstance(): IndexedDBCache {
        if (!IndexedDBCache.instance) {
            IndexedDBCache.instance = new IndexedDBCache();
        }
        return IndexedDBCache.instance;
    }

    /**
     * Initialize the IndexedDB database
     */
    private async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('[IndexedDBCache] Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[IndexedDBCache] Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const objectStore = db.createObjectStore(this.STORE_NAME, {keyPath: 'fileName'});
                    objectStore.createIndex('expiresAt', 'expiresAt', {unique: false});
                    console.log('[IndexedDBCache] Object store created');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Store a blob in IndexedDB
     */
    public async set(fileName: string, blobUrl: string, blob: Blob, expiresAt: number): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);

            const entry: CachedBlobEntry = {
                fileName,
                blobUrl,
                expiresAt,
                blobData: blob
            };

            const request = store.put(entry);

            request.onsuccess = () => {
                console.log(`[IndexedDBCache] Stored ${fileName} in IndexedDB`);
                resolve();
            };

            request.onerror = () => {
                console.error(`[IndexedDBCache] Failed to store ${fileName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Retrieve a blob from IndexedDB and recreate the blob URL
     */
    public async get(fileName: string): Promise<{ blobUrl: string; expiresAt: number } | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(fileName);

            request.onsuccess = () => {
                const entry = request.result as CachedBlobEntry | undefined;

                if (!entry) {
                    resolve(null);
                    return;
                }

                // Check if expired
                if (entry.expiresAt <= Date.now()) {
                    console.log(`[IndexedDBCache] ${fileName} expired, removing`);
                    this.delete(fileName).catch(console.error);
                    resolve(null);
                    return;
                }

                // Recreate blob URL from stored blob data
                const newBlobUrl = URL.createObjectURL(entry.blobData);
                console.log(`[IndexedDBCache] Retrieved ${fileName} from IndexedDB`);

                resolve({
                    blobUrl: newBlobUrl,
                    expiresAt: entry.expiresAt
                });
            };

            request.onerror = () => {
                console.error(`[IndexedDBCache] Failed to retrieve ${fileName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Delete a blob from IndexedDB
     */
    public async delete(fileName: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.delete(fileName);

            request.onsuccess = () => {
                console.log(`[IndexedDBCache] Deleted ${fileName} from IndexedDB`);
                resolve();
            };

            request.onerror = () => {
                console.error(`[IndexedDBCache] Failed to delete ${fileName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Clear all expired entries from IndexedDB
     */
    public async cleanupExpired(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const index = store.index('expiresAt');
            const now = Date.now();

            const request = index.openCursor();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

                if (cursor) {
                    const entry = cursor.value as CachedBlobEntry;
                    if (entry.expiresAt <= now) {
                        cursor.delete();
                        console.log(`[IndexedDBCache] Cleaned up expired entry: ${entry.fileName}`);
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => {
                console.error('[IndexedDBCache] Failed to cleanup expired entries:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Clear all entries from IndexedDB
     */
    public async clear(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[IndexedDBCache] Cleared all entries from IndexedDB');
                resolve();
            };

            request.onerror = () => {
                console.error('[IndexedDBCache] Failed to clear IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }
}

export const indexedDBCache = IndexedDBCache.getInstance();
