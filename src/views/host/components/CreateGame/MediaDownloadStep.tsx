import React, {useEffect} from 'react';
import {CheckCircle, AlertCircle, Download, Info, ArrowLeft, ArrowRight, X} from 'lucide-react';
import {useBulkMediaDownload} from '@shared/hooks/useBulkMediaDownload';
import {GameVersionManager} from '@core/game/GameVersionManager';
import {BaseWizardStepProps} from './types';
import {UserType} from '@shared/constants/formOptions';

interface MediaDownloadStepProps extends BaseWizardStepProps {
    userType: UserType;
    onNext: () => void;
}

const MediaDownloadStep: React.FC<MediaDownloadStepProps> = ({
                                                                 gameData,
                                                                 userType,
                                                                 onNext,
                                                                 onPrevious,
                                                                 isSubmitting = false
                                                             }) => {
    const gameStructure = GameVersionManager.getGameStructure(gameData.game_version);
    const gameVersionDisplayName = GameVersionManager.getDisplayName(gameData.game_version);

    const {
        isDownloading,
        progress,
        startDownload,
        isDownloadComplete,
        clearCache,
        error
    } = useBulkMediaDownload();

    const downloadComplete = isDownloadComplete(gameData.game_version, userType);
    const progressPercent = progress ? Math.round((progress.downloaded / progress.total) * 100) : 0;
    const [userOptedOut, setUserOptedOut] = React.useState(false);
    const hasAttemptedAutoStart = React.useRef(false);

    // Auto-start download on mount if not already complete and user hasn't opted out
    useEffect(() => {
        // Only attempt once
        if (hasAttemptedAutoStart.current) {
            return;
        }

        if (!downloadComplete && !isDownloading && !error && !userOptedOut) {
            console.log('[MediaDownloadStep] Auto-starting download...');
            hasAttemptedAutoStart.current = true;
            startDownload(gameStructure.slides, userType, gameData.game_version);
        }
    }, [downloadComplete, isDownloading, error, userOptedOut, gameStructure.slides, userType, gameData.game_version, startDownload]);

    const handleSkipAndContinue = (): void => {
        setUserOptedOut(true);
        console.log('[MediaDownloadStep] User skipped download');
    };

    const handleRetry = async (): Promise<void> => {
        setUserOptedOut(false);
        await startDownload(gameStructure.slides, userType, gameData.game_version);
    };

    const handleClearAndRedownload = async (): Promise<void> => {
        clearCache();
        setUserOptedOut(false);
        await startDownload(gameStructure.slides, userType, gameData.game_version);
    };

    const canProceed = downloadComplete || userOptedOut || error;

    return (
        <div className="space-y-6">
            {/* Version Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Preloading content for:</p>
                        <p className="font-bold text-lg text-blue-900">{gameVersionDisplayName}</p>
                    </div>
                    <Download size={32} className="text-blue-600 opacity-50"/>
                </div>
            </div>

            {/* Recommendation Banner */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                    <Info size={20} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5"/>
                    <div>
                        <h3 className="font-semibold text-blue-800 mb-1">
                            Recommended: Preload Content Before Starting
                        </h3>
                        <p className="text-sm text-blue-700">
                            We strongly recommend preloading all presentation content before starting your game.
                            Preloading content speeds up video and slide load times, especially for those with slower connections.
                        </p>
                    </div>
                </div>
            </div>

            {/* Already Downloaded Status */}
            {downloadComplete && !isDownloading && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start">
                        <CheckCircle size={24} className="text-green-600 mr-3 flex-shrink-0 mt-0.5"/>
                        <div className="flex-1">
                            <h3 className="font-semibold text-green-800 mb-1">
                                Content Already Preloaded
                            </h3>
                            <p className="text-sm text-green-700 mb-2">
                                All media for <strong>{gameVersionDisplayName}</strong> has been cached locally.
                            </p>
                            <button
                                onClick={handleClearAndRedownload}
                                className="text-sm text-green-700 underline hover:text-green-800 flex items-center gap-1"
                            >
                                <Download size={14}/>
                                Clear cache & preload again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download in Progress */}
            {isDownloading && progress && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start">
                        <Download size={24} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5 animate-bounce"/>
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-800 mb-2">
                                Downloading Media Files
                            </h3>
                            <p className="text-sm text-blue-700 mb-3">
                                Please wait while we download all presentation content. This may take a minute...
                            </p>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-700 mb-1">
                                    <span className="font-medium">Progress</span>
                                    <span>{progress.downloaded} / {progress.total} files</span>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-3 transition-all duration-300 flex items-center justify-center"
                                        style={{width: `${Math.min(progressPercent, 100)}%`}}
                                    >
                                        {progressPercent > 15 && progressPercent <= 100 && (
                                            <span className="text-xs text-white font-semibold">{progressPercent}%</span>
                                        )}
                                    </div>
                                </div>

                                <p className="text-xs text-gray-600 truncate mt-1">
                                    Current: {progress.currentFile}
                                </p>

                                {progress.errors.length > 0 && (
                                    <p className="text-xs text-yellow-700 mt-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                                        ⚠️ {progress.errors.length} file(s) failed to download (game will continue
                                        anyway)
                                    </p>
                                )}
                            </div>

                            {/* ADD: Continue Anyway button during download */}
                            <div className="mt-4 pt-4 border-t border-blue-200">
                                <button
                                    onClick={handleSkipAndContinue}
                                    className="text-sm text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                                >
                                    <ArrowRight size={14}/>
                                    Continue anyway without waiting (not recommended)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Status */}
            {error && !isDownloading && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start">
                        <AlertCircle size={24} className="text-red-600 mr-3 flex-shrink-0 mt-0.5"/>
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-800 mb-1">
                                Download Error
                            </h3>
                            <p className="text-sm text-red-700 mb-3">
                                {error}
                            </p>
                            <button
                                onClick={handleRetry}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skipped Status */}
            {userOptedOut && !downloadComplete && !isDownloading && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start">
                        <AlertCircle size={24} className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5"/>
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-800 mb-1">
                                Download Skipped
                            </h3>
                            <p className="text-sm text-yellow-700 mb-3">
                                You've chosen to skip the download. Slides will load from the internet, which may cause
                                delays during your presentation.
                            </p>
                            <button
                                onClick={handleRetry}
                                className="text-sm text-yellow-700 underline hover:text-yellow-800 flex items-center gap-1"
                            >
                                <Download size={14}/>
                                Download anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box - Only show if not downloaded and not downloading */}
            {!downloadComplete && !isDownloading && !userOptedOut && !error && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-2 text-sm flex items-center">
                        <Info size={16} className="mr-2"/>
                        Why download content?
                    </h4>
                    <ul className="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
                        <li>Instant slide loading with no delays</li>
                        <li>Smooth video playback without buffering</li>
                        <li>Works even with poor internet connection</li>
                        <li>Better presentation experience overall</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-3 font-medium">
                        💡 Content is shared across all games using <strong>{gameVersionDisplayName}</strong>
                    </p>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={isDownloading || isSubmitting}
                    className="flex items-center gap-2 text-gray-700 hover:text-game-orange-600 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ArrowLeft size={18}/> Previous
                </button>

                <div className="flex gap-3">
                    {!downloadComplete && !userOptedOut && !isDownloading && !error && (
                        <button
                            type="button"
                            onClick={handleSkipAndContinue}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 disabled:opacity-50"
                        >
                            <X size={18}/>
                            Skip (Not Recommended)
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!canProceed || isSubmitting}
                        className="flex items-center gap-2 bg-game-orange-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-game-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next <ArrowRight size={18}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MediaDownloadStep;
