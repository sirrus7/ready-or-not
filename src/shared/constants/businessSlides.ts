/**
 * Mapping of slides that have business versions
 * Only slides listed here will attempt to load from business/ folder
 * All others will use the standard academic version
 */
export const BUSINESS_SLIDE_PATHS: Set<string> = new Set([
    'Slide_004.jpg',
    'Slide_005.mp4',
    'Slide_025.mp4',
    'Slide_040.mp4',
    'Slide_055.mp4',
    'Slide_086.mp4',
    'Slide_098.mp4',
    'Slide_113.mp4',
    'Slide_125.mp4',
    'Slide_159.mp4',
    'Slide_170.mp4',
    // 'Slide_185.jpg', // TODO: What do we do with this extra slide?
]);

/**
 * Check if a slide has a business version available
 */
export const hasBusinessVersion = (slidePath: string): boolean => {
    return BUSINESS_SLIDE_PATHS.has(slidePath);
};