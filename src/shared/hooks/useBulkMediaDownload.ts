import {useState, useCallback} from 'react';
import {mediaManager} from '@shared/services/MediaManager';
import {GameVersion, Slide} from '@shared/types/game';
import {UserType} from '@shared/constants/formOptions';

interface BulkDownloadProgress {
    downloaded: number;
    total: number;
    currentFile: string;
    isComplete: boolean;
    errors: string[];
}

interface UseBulkMediaDownloadReturn {
    isDownloading: boolean;
    progress: BulkDownloadProgress | null;
    startDownload: (slides: Slide[], userType: UserType, gameVersion: GameVersion) => Promise<void>;
    isDownloadComplete: (gameVersion?: GameVersion, userType?: UserType) => boolean;
    clearCache: () => void;
    error: string | null;
}

export const useBulkMediaDownload = (): UseBulkMediaDownloadReturn => {
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<BulkDownloadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cacheCleared, setCacheCleared] = useState<number>(0); // ADD THIS - forces re-render

    const startDownload = useCallback(async (
        slides: Slide[],
        userType: UserType,
        gameVersion?: GameVersion
    ): Promise<void> => {
        setIsDownloading(true);
        setError(null);
        setProgress(null);

        try {
            await mediaManager.bulkDownloadAllMedia(slides, {
                gameVersion,
                userType,
                concurrent: 3,
                onProgress: (progressData) => {
                    setProgress({...progressData});
                }
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error during bulk download';
            setError(errorMessage);
            console.error('[useBulkMediaDownload] Download failed:', err);
        } finally {
            setIsDownloading(false);
        }
    }, []);

    const isDownloadComplete = useCallback((gameVersion?: GameVersion, userType?: UserType): boolean => {
        // The cacheCleared dependency forces this to re-evaluate when cache is cleared
        return mediaManager.isBulkDownloadComplete(gameVersion, userType);
    }, [cacheCleared]); // ADD cacheCleared as dependency

    const clearCache = useCallback((): void => {
        mediaManager.clearBulkDownloadCache();
        setProgress(null);
        setError(null);
        setCacheCleared(prev => prev + 1); // INCREMENT to force re-render
    }, []);

    return {
        isDownloading,
        progress,
        startDownload,
        isDownloadComplete,
        clearCache,
        error
    };
};
