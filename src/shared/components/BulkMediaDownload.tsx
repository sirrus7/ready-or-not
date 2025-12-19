import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X} from 'lucide-react';
import {useBulkMediaDownload} from '@shared/hooks/useBulkMediaDownload';
import {GameVersion} from '@shared/types/game';
import {UserType} from '@shared/constants/formOptions';

interface BulkMediaDownloadProps {
    gameVersion: GameVersion,
    userType: UserType,
    onClose?: () => void,
}

export const BulkMediaDownload: React.FC<BulkMediaDownloadProps> = ({
                                                                        gameVersion,
                                                                        userType,
                                                                        onClose,
                                                                    }) => {
    const {
        isDownloading,
        progress,
        startDownload,
        cancelDownload,
        clearCache,
        error
    } = useBulkMediaDownload();    

    useEffect(() => {
        startDownload(gameVersion, userType);
    }, [])

    const progressPercent = progress ? Math.round((progress.downloaded / progress.total) * 100) : 0;

    const handleStartDownload = async (): Promise<void> => {
        await startDownload(gameVersion, userType);
    };

    const handleClearCache = async (): Promise<void> => {
        clearCache();
        await handleStartDownload();
    };

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-md mx-auto">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Preload Media</h3>
                {onClose &&(
                    <button
                        onClick={() => {cancelDownload(); onClose();}}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={20}/>
                    </button>
                )}
            </div>

            {progress?.isComplete && !isDownloading && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center text-green-800">
                        <CheckCircle size={20} className="mr-2"/>
                        <span className="font-medium">All media preloaded and cached locally!</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start text-red-800">
                        <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5"/>
                        <div>
                            <span className="font-medium">Preload Error:</span>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {isDownloading && progress && (
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Loading media files...</span>
                        <span>{progress.downloaded} / {progress.total}</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div
                            className="bg-game-orange-500 h-2.5 rounded-full transition-all duration-300"
                            style={{width: `${progressPercent}%`}}
                        />
                    </div>

                    <p className="text-xs text-gray-500 truncate">
                        Current: {progress.currentFile}
                    </p>

                    {progress.errors.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                            Errors: {progress.errors.length}
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {(error) || progress?.isComplete && (
                    <button
                        onClick={handleClearCache}
                        className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                        disabled={isDownloading}
                    >
                        Clear Cache & Preload again
                    </button>
                )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
                <p>This will preload all presentation media to your device for faster loading.</p>
                {progress?.isComplete && (
                    <p className="mt-1 text-green-600">✓ Files cached locally - Playback is not dependent on internet speed</p>
                )}
            </div>
        </div>
    );
};
