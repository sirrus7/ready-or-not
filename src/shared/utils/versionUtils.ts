// src/shared/utils/versionUtils.ts

/**
 * Determines if auto-advance should be enabled based on game version and slide configuration
 * 
 * @param gameVersion - The game version (e.g., "1.5", "2.0")
 * @param slideAutoAdvance - The slide's auto_advance_after_video setting
 * @returns true if auto-advance should occur, false otherwise
 */
export function shouldAutoAdvance(gameVersion: string, slideAutoAdvance?: boolean): boolean {
    // If slide doesn't have auto-advance enabled, never auto-advance
    if (!slideAutoAdvance) {
        return false;
    }
    
    // For version 1.5, disable all auto-advance regardless of slide setting
    if (gameVersion === '1.5') {
        return false;
    }
    
    // For all other versions, use the slide's auto-advance setting
    return slideAutoAdvance;
}

/**
 * Determines if videos should autoplay based on game version
 * 
 * @param gameVersion - The game version (e.g., "1.5", "2.0")
 * @returns true if videos should autoplay when ready, false otherwise
 */
export function shouldAutoplayVideos(gameVersion: string): boolean {
    // For version 1.5, disable autoplay
    if (gameVersion === '1.5') {
        return false;
    }
    
    // For all other versions, enable autoplay
    return true;
}