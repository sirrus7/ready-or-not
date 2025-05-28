// src/components/TeacherHost/BandwidthTestModal.tsx
import React, { useState, useCallback } from 'react';
import {
    Wifi,
    WifiOff,
    Activity,
    CheckCircle,
    AlertTriangle,
    Info,
    Gauge,
    Signal,
    Timer
} from 'lucide-react';
import Modal from '../UI/Modal';
import {
    BandwidthTester,
    BandwidthTestResult,
    BandwidthTestProgress
} from '../../utils/bandwidthTest';
import { useVideoSettings } from '../../context/VideoSettingsContext';

interface BandwidthTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete?: (result: BandwidthTestResult) => void;
    showRecommendations?: boolean;
}

const BandwidthTestModal: React.FC<BandwidthTestModalProps> = ({
                                                                   isOpen,
                                                                   onClose,
                                                                   onComplete,
                                                                   showRecommendations = true
                                                               }) => {
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [testProgress, setTestProgress] = useState<BandwidthTestProgress | null>(null);
    const [testResult, setTestResult] = useState<BandwidthTestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { updateSettings, settings } = useVideoSettings();

    const runBandwidthTest = useCallback(async () => {
        setIsTestRunning(true);
        setTestProgress(null);
        setTestResult(null);
        setError(null);

        try {
            const tester = new BandwidthTester((progress) => {
                setTestProgress(progress);
            });

            const result = await tester.testBandwidth();

            setTestResult(result);

            // Update video settings with test result
            updateSettings({
                bandwidthTestResult: result,
                lastTestedAt: Date.now()
            });

            if (onComplete) {
                onComplete(result);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Bandwidth test failed';
            setError(errorMessage);
            console.error('Bandwidth test error:', err);
        } finally {
            setIsTestRunning(false);
            setTestProgress(null);
        }
    }, [updateSettings, onComplete]);

    const getPhaseIcon = (phase: string, isActive: boolean) => {
        const iconProps = {
            size: 20,
            className: isActive ? 'text-blue-500 animate-pulse' : 'text-gray-400'
        };

        switch (phase) {
            case 'download':
                return <Activity {...iconProps} />;
            case 'upload':
                return <Signal {...iconProps} />;
            case 'latency':
                return <Timer {...iconProps} />;
            case 'complete':
                return <CheckCircle {...iconProps} className="text-green-500" />;
            default:
                return <Gauge {...iconProps} />;
        }
    };

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case 'excellent':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'good':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'fair':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'poor':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getQualityIcon = (quality: string) => {
        switch (quality) {
            case 'excellent':
                return <Wifi className="text-green-600" size={24} />;
            case 'good':
                return <Wifi className="text-blue-600" size={24} />;
            case 'fair':
                return <Activity className="text-yellow-600" size={24} />;
            case 'poor':
                return <WifiOff className="text-red-600" size={24} />;
            default:
                return <Activity className="text-gray-600" size={24} />;
        }
    };

    const handleClose = () => {
        if (!isTestRunning) {
            onClose();
        }
    };

    const handleApplyRecommendations = () => {
        if (testResult && showRecommendations) {
            const { canHandleVideo, quality } = testResult;

            const newSettings: any = {};

            if (!canHandleVideo) {
                newSettings.hostVideoEnabled = false;
            }

            // Adjust quality based on connection
            if (quality === 'poor') {
                newSettings.videoQuality = 'disabled';
                newSettings.hostVideoEnabled = false;
            } else if (quality === 'fair') {
                newSettings.videoQuality = 'low';
                newSettings.hostVideoEnabled = false;
            } else if (quality === 'good') {
                newSettings.videoQuality = 'medium';
            } else if (quality === 'excellent') {
                newSettings.videoQuality = 'high';
            }

            if (Object.keys(newSettings).length > 0) {
                updateSettings({ ...newSettings, userOverride: false });
            }
        }

        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Internet Speed Test"
            size="lg"
            hideCloseButton={isTestRunning}
        >
            <div className="p-2">
                {!testResult && !error && (
                    <div className="text-center mb-6">
                        <div className="mb-4">
                            <Activity size={48} className="mx-auto text-blue-500 mb-2" />
                            <p className="text-gray-600">
                                Test your internet connection to optimize video performance during your game session.
                            </p>
                        </div>

                        {!isTestRunning && (
                            <button
                                onClick={runBandwidthTest}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Start Speed Test
                            </button>
                        )}
                    </div>
                )}

                {isTestRunning && testProgress && (
                    <div className="mb-6">
                        <div className="text-center mb-4">
                            <h3 className="text-lg font-semibold mb-2">Testing Connection...</h3>
                            <p className="text-gray-600 text-sm">
                                Please wait while we test your internet speed
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Progress Steps */}
                            <div className="flex justify-center space-x-8">
                                <div className="flex flex-col items-center">
                                    {getPhaseIcon('download', testProgress.phase === 'download')}
                                    <span className="text-xs mt-1">Download</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    {getPhaseIcon('upload', testProgress.phase === 'upload')}
                                    <span className="text-xs mt-1">Upload</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    {getPhaseIcon('latency', testProgress.phase === 'latency')}
                                    <span className="text-xs mt-1">Latency</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${testProgress.progress}%` }}
                                />
                            </div>

                            {/* Current Speed */}
                            {testProgress.currentSpeedMbps && (
                                <div className="text-center">
                                    <p className="text-sm text-gray-600">
                                        Current Speed: <span className="font-mono font-semibold">
                      {testProgress.currentSpeedMbps.toFixed(1)} Mbps
                    </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertTriangle className="text-red-500 mt-0.5 mr-3" size={20} />
                                <div>
                                    <h4 className="text-red-800 font-medium">Test Failed</h4>
                                    <p className="text-red-600 text-sm mt-1">{error}</p>
                                    <p className="text-red-600 text-sm mt-2">
                                        Consider disabling host video for better performance.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={runBandwidthTest}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {testResult && (
                    <div className="mb-6">
                        <div className="text-center mb-4">
                            <div className="flex justify-center mb-2">
                                {getQualityIcon(testResult.quality)}
                            </div>
                            <h3 className="text-lg font-semibold">Test Complete</h3>
                        </div>

                        {/* Results Summary */}
                        <div className={`border rounded-lg p-4 mb-4 ${getQualityColor(testResult.quality)}`}>
                            <div className="grid grid-cols-3 gap-4 text-center mb-3">
                                <div>
                                    <div className="text-lg font-bold">{testResult.downloadSpeedMbps}</div>
                                    <div className="text-xs">Mbps Download</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold">{testResult.uploadSpeedMbps}</div>
                                    <div className="text-xs">Mbps Upload</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold">{testResult.latencyMs}</div>
                                    <div className="text-xs">ms Latency</div>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="font-semibold capitalize mb-1">
                                    Connection Quality: {testResult.quality}
                                </div>
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start">
                                <Info className="text-blue-500 mt-0.5 mr-3" size={20} />
                                <div>
                                    <h4 className="text-blue-800 font-medium mb-1">Recommendation</h4>
                                    <p className="text-blue-700 text-sm">{testResult.recommendation}</p>
                                </div>
                            </div>
                        </div>

                        {/* Current Settings Status */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                            <div className="text-sm">
                                <div className="font-medium text-gray-700 mb-1">Current Settings:</div>
                                <div className="text-gray-600">
                                    Host Video: {settings.hostVideoEnabled ? 'Enabled' : 'Disabled'} |
                                    Quality: {settings.videoQuality}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3">
                            {showRecommendations && (
                                <button
                                    onClick={handleApplyRecommendations}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Apply Recommendations
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                {showRecommendations ? 'Keep Current Settings' : 'Close'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default BandwidthTestModal;