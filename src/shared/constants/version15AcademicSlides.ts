/**
 * Set of slides that have version 1.5 variants available in business/version15/ folder
 */
export const VERSION_15_ACADEMIC_SLIDE_PATHS: Set<string> = new Set([
    'Slide_002.jpg',
    'Slide_003.jpg',
    'Slide_004.jpg',
    'Slide_005.jpg',
]);

/**
 * Check if a slide has a version 1.5 variant available
 */
export const hasVersion15Academic = (slidePath: string): boolean => {
    return VERSION_15_ACADEMIC_SLIDE_PATHS.has(slidePath);
};