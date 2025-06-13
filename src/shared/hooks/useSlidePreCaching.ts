// src/shared/hooks/useSlidePreCaching.ts
import {useEffect} from 'react';
import {mediaManager} from '@shared/services/MediaManager';
import {Slide} from '@shared/types/game';

interface UseSlidePreCachingOptions {
    /** Number of slides ahead to precache (default: 3) */
    precacheCount?: number;
    /** Whether precaching is enabled (default: true) */
    enabled?: boolean;
}

/**
 * Hook to automatically precache upcoming slides when the current slide changes.
 * This should be used in components that handle slide navigation (like useGameController).
 *
 * @param slides Array of all slides in the presentation
 * @param currentSlideIndex The current slide index
 * @param options Precaching configuration options
 */
export const useSlidePreCaching = (
    slides: Slide[] | null,
    currentSlideIndex: number | null,
    options: UseSlidePreCachingOptions = {}
): void => {
    const {
        precacheCount = 3,
        enabled = true
    } = options;

    useEffect(() => {
        // Skip if precaching is disabled
        if (!enabled) return;

        // Skip if we don't have the required data
        if (!slides || currentSlideIndex === null) return;

        // Skip if current slide index is invalid
        if (currentSlideIndex < 0 || currentSlideIndex >= slides.length) return;

        // Trigger precaching for upcoming slides
        mediaManager.precacheUpcomingSlides(slides, currentSlideIndex, precacheCount);

    }, [slides, currentSlideIndex, precacheCount, enabled]);
};

/**
 * Hook variant that also provides cache management utilities.
 * Useful for debugging or advanced cache management scenarios.
 */
export const useSlidePreCachingWithStats = (
    slides: Slide[] | null,
    currentSlideIndex: number | null,
    options: UseSlidePreCachingOptions = {}
) => {
    // Use the main precaching hook
    useSlidePreCaching(slides, currentSlideIndex, options);

    // Return cache management utilities
    return {
        getCacheStats: () => mediaManager.getCacheStats(),
        cleanupExpiredCache: () => mediaManager.cleanupExpiredCache(),
        clearCache: () => mediaManager.clearCache(),
    };
};
