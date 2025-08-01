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
    'Slide_006_1.mp4',
    'Slide_006_2.jpg',
    'Slide_006_3.jpg',
    'Slide_006_4.jpg',
    'Slide_006_5.jpg',
    'Slide_006_6.jpg',
    'Slide_006_7.jpg',
    'Slide_006_8.jpg',
    'Slide_006_9.jpg',
    'Slide_006_10.jpg',
    'Slide_007.jpg',
    'Slide_008.jpg',
    'Slide_009.jpg',
    'Slide_010.jpg',
    'Slide_012.jpg',
    'Slide_013.jpg',
    'Slide_014.jpg',
    'Slide_015.jpg',
    'Slide_016.jpg',
    'Slide_017.jpg',
]);

/**
 * Check if a slide has a version 1.5 variant available
 */
export const hasVersion15 = (slidePath: string): boolean => {
    return VERSION_15_SLIDE_PATHS.has(slidePath);
};