import {useState, useCallback } from 'react';
import {BulkDownloadProgress, mediaManager} from '@shared/services/MediaManager';
import {GameVersion} from '@shared/types/game';
import {UserType} from '@shared/constants/formOptions';

interface UseBulkMediaDownloadReturn {
    isDownloading: boolean;
    progress: BulkDownloadProgress | null;
    startDownload: (gameVersion: GameVersion, userType: UserType) => Promise<void>;
    cancelDownload: () => void;
    clearCache: () => void;
    error: string | null;
}

export const useBulkMediaDownload = (): UseBulkMediaDownloadReturn => {
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<BulkDownloadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cacheCleared, setCacheCleared] = useState<number>(0); // ADD THIS - forces re-render

    const startDownload = useCallback(async (
        gameVersion: GameVersion,
        userType: UserType
    ): Promise<void> => {
        
        if (mediaManager.isBulkDownloadInProgress()) return;
        setIsDownloading(true);
        setError(null);
        setProgress(null);

        try {
            await mediaManager.ensureAllMediaIsCached(
                gameVersion,
                userType,
                (progressData: BulkDownloadProgress) => { setProgress({ ...progressData }); },
                3);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error during bulk download';
            setError(errorMessage);
            console.error('[useBulkMediaDownload] Download failed:', err);
        } finally {
            setIsDownloading(false);
        }
    }, []);

    const cancelDownload = useCallback((): void => mediaManager.cancelBulkDownload(), []);

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
        cancelDownload,
        clearCache,
        error
    };
};
