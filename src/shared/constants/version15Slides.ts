/**
 * Set of slides that have version 1.5 variants available in business/version15/ folder
 */
export const VERSION_15_SLIDE_PATHS: Set<string> = new Set([
    'Slide_001.jpg',
    'Slide_002.jpg',
    'Slide_003.jpg',
    'Slide_004.jpg',
    'Slide_005.jpg',
    'Slide_006.jpg',
    'Slide_007.jpg',
    // Add any other slides that actually exist in your business/version15/ folder
]);

/**
 * Check if a slide has a version 1.5 variant available
 */
export const hasVersion15 = (slidePath: string): boolean => {
    return VERSION_15_SLIDE_PATHS.has(slidePath);
};