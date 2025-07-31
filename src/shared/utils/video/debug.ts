// Video debug utility for controlling video-related logging
// Set this to true to enable all video debug logs
const VIDEO_DEBUG_ENABLED = false;

export const videoDebug = {
    log: (...args: any[]) => {
        if (VIDEO_DEBUG_ENABLED) {
            console.log(...args);
        }
    },
    
    warn: (...args: any[]) => {
        if (VIDEO_DEBUG_ENABLED) {
            console.warn(...args);
        }
    },
    
    error: (...args: any[]) => {
        // Always log errors, even when debug is disabled
        console.error(...args);
    },
    
    // Helper for video-specific logs
    videoLog: (component: string, message: string, data?: any) => {
        if (VIDEO_DEBUG_ENABLED) {
            if (data) {
                console.log(`[${component}] ${message}`, data);
            } else {
                console.log(`[${component}] ${message}`);
            }
        }
    },
    
    // Helper for broadcast/sync logs
    syncLog: (component: string, message: string, data?: any) => {
        if (VIDEO_DEBUG_ENABLED) {
            if (data) {
                console.log(`[${component}] ${message}`, data);
            } else {
                console.log(`[${component}] ${message}`);
            }
        }
    }
}; 