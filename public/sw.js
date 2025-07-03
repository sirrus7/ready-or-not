// Service Worker for Ready Or Not - Video Caching Strategy
// This service worker caches video chunks to enable sharing between tabs,
// reducing bandwidth usage and improving load times on poor connections

const CACHE_VERSION = 'v1';
const VIDEO_CACHE = 'ready-or-not-videos-v1';
const STATIC_CACHE = 'ready-or-not-static-v1';

// Video file extensions to cache
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

// Helper to check if URL is a video
function isVideoUrl(url) {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

// Helper to check if URL is from Supabase storage
function isSupabaseStorage(url) {
    return url.includes('/storage/v1/object/');
}

// Install event - claim clients immediately
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName.startsWith('ready-or-not-') &&
                                   cacheName !== VIDEO_CACHE &&
                                   cacheName !== STATIC_CACHE;
                        })
                        .map(cacheName => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            // Take control of all clients
            clients.claim()
        ])
    );
});

// Fetch event - intercept and cache video requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle video requests from Supabase storage
    if (!isSupabaseStorage(request.url) || !isVideoUrl(request.url)) {
        return;
    }

    // Handle range requests (video streaming)
    if (request.headers.has('range')) {
        event.respondWith(handleRangeRequest(request));
    } else {
        // Handle full video requests
        event.respondWith(handleVideoRequest(request));
    }
});

// Handle full video requests
async function handleVideoRequest(request) {
    const cache = await caches.open(VIDEO_CACHE);
    
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        console.log('[SW] Serving video from cache:', request.url);
        // Return cached response and update in background
        fetchAndCache(request, cache);
        return cachedResponse;
    }

    // Not in cache, fetch from network
    console.log('[SW] Fetching video from network:', request.url);
    return fetchAndCache(request, cache);
}

// Fetch and cache video
async function fetchAndCache(request, cache) {
    try {
        const response = await fetch(request);
        
        // Only cache successful responses
        if (response.ok) {
            // Clone response before caching (can only read body once)
            const responseToCache = response.clone();
            
            // Cache asynchronously
            cache.put(request, responseToCache).then(() => {
                console.log('[SW] Cached video:', request.url);
            }).catch(err => {
                console.error('[SW] Failed to cache video:', err);
            });
        }
        
        return response;
    } catch (error) {
        console.error('[SW] Network request failed:', error);
        throw error;
    }
}

// Handle range requests for video streaming
async function handleRangeRequest(request) {
    const cache = await caches.open(VIDEO_CACHE);
    const url = request.url.split('?')[0]; // Remove query params for cache key
    
    // Create a request without range header to check cache
    const cacheRequest = new Request(url);
    const cachedResponse = await cache.match(cacheRequest);
    
    if (cachedResponse) {
        console.log('[SW] Serving range request from cache:', request.url);
        return createRangeResponse(request, cachedResponse);
    }
    
    // Not in cache, need to fetch
    console.log('[SW] Range request not in cache, fetching:', request.url);
    
    // First, try to fetch the full video to cache it
    try {
        const fullResponse = await fetch(new Request(url));
        if (fullResponse.ok) {
            const responseToCache = fullResponse.clone();
            await cache.put(cacheRequest, responseToCache);
            console.log('[SW] Cached full video from range request:', url);
            
            // Now create range response from the cached version
            const newCachedResponse = await cache.match(cacheRequest);
            if (newCachedResponse) {
                return createRangeResponse(request, newCachedResponse);
            }
        }
    } catch (error) {
        console.error('[SW] Failed to fetch full video:', error);
    }
    
    // Fallback: just forward the range request
    return fetch(request);
}

// Create a range response from a cached response
async function createRangeResponse(request, cachedResponse) {
    const range = request.headers.get('range');
    if (!range) {
        return cachedResponse;
    }

    const bytes = range.match(/bytes=(\d+)-(\d*)/);
    if (!bytes) {
        return cachedResponse;
    }

    const start = Number(bytes[1]);
    const end = bytes[2] ? Number(bytes[2]) : undefined;

    // Get the full blob from cache
    const blob = await cachedResponse.blob();
    const size = blob.size;

    // Calculate actual end
    const actualEnd = end !== undefined ? Math.min(end, size - 1) : size - 1;

    // Slice the blob
    const slicedBlob = blob.slice(start, actualEnd + 1);

    // Create proper range response
    return new Response(slicedBlob, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
            'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
            'Content-Length': slicedBlob.size,
            'Content-Range': `bytes ${start}-${actualEnd}/${size}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=3600'
        }
    });
}

// Message handler for cache management
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_VIDEO_CACHE') {
        caches.delete(VIDEO_CACHE).then(() => {
            console.log('[SW] Video cache cleared');
            if (event.ports[0]) {
                event.ports[0].postMessage({ success: true });
            }
        });
    }
    
    if (event.data && event.data.type === 'CACHE_STATUS') {
        caches.open(VIDEO_CACHE).then(cache => {
            cache.keys().then(keys => {
                if (event.ports[0]) {
                    event.ports[0].postMessage({ 
                        cached: keys.length,
                        urls: keys.map(req => req.url)
                    });
                }
            });
        });
    }
});