import {useState, useCallback} from 'react';
import {mediaManager} from '@shared/services/MediaManager';
import {Slide} from '@shared/types/game';
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
    startDownload: (slides: Slide[], userType: UserType, gameVersion?: string) => Promise<void>;
    isDownloadComplete: (gameVersion?: string, userType?: UserType) => boolean;
    clearCache: () => void;
    error: string | null;
}

export const useBulkMediaDownload = (): UseBulkMediaDownloadReturn => {
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<BulkDownloadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startDownload = useCallback(async (
        slides: Slide[],
        userType: UserType,
        gameVersion?: string
    ): Promise<void> => {
        setIsDownloading(true);
        setError(null);
        setProgress(null);

        try {
            await mediaManager.bulkDownloadAllMedia(slides, {
                gameVersion,
                userType,
                concurrent: 3, // Limit concurrent downloads to avoid browser throttling
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

    const isDownloadComplete = useCallback((gameVersion?: string, userType?: UserType): boolean => {
        return mediaManager.isBulkDownloadComplete(gameVersion, userType);
    }, []);

    const clearCache = useCallback((): void => {
        mediaManager.clearBulkDownloadCache();
        setProgress(null);
        setError(null);
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
