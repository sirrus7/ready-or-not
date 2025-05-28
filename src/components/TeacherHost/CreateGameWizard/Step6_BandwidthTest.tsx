// src/components/TeacherHost/CreateGameWizard/Step6_BandwidthTest.tsx
import React, { useState, useEffect } from 'react';
import { NewGameData } from '../../../types';
import {
    ArrowLeft,
    ArrowRight,
    Wifi,
    Activity,
    CheckCircle,
    AlertTriangle,
    Info,
    Monitor,
    Eye,
    EyeOff
} from 'lucide-react';
import {
    BandwidthTester,
    BandwidthTestResult,
    BandwidthTestProgress
} from '../../../utils/bandwidthTest';
import { useVideoSettings } from '../../../context/VideoSettingsContext';

interface Step6Props {
    gameData: NewGameData;
    onNext: () => void;
    onPrevious: () => void;
}

const Step6BandwidthTest: React.FC<Step6Props> = ({ gameData, onNext, onPrevious }) => {
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [testProgress, setTestProgress] = useState<BandwidthTestProgress | null>(null);
    const [testResult, setTestResult] = useState<BandwidthTestResult | null>(null);
    const [hasRunTest, setHasRunTest] = useState(false);
    const [userWantsToSkip, setUserWantsToSkip] = useState(false);

    const { settings, updateSettings, toggleHostVideo } = useVideoSettings();

    // Check if we have a recent test result
    useEffect(() => {
        if (settings.bandwidthTestResult && settings.lastTestedAt) {
            const testAge = Date.now() - settings.lastTestedAt;
            // If test is less than 10 minutes old, use it
            if (testAge < 10 * 60 * 1000) {
                setTestResult(settings.bandwidthTestResult);
                setHasRunTest(true);
            }
        }
    }, [settings.bandwidthTestResult, settings.lastTestedAt]);

    const runBandwidthTest = async () => {
        setIsTestRunning(true);
        setTestProgress(null);
        setTestResult(null);

        try {
            const tester = new BandwidthTester((progress) => {
                setTestProgress(progress);
            });

            const result = await tester.testBandwidth();

            setTestResult(result);
            setHasRunTest(true);

            // Update video settings with test result
            updateSettings({
                bandwidthTestResult: result,
                lastTestedAt: Date.now()
            });
        } catch (error) {
            console.error('Bandwidth test failed:', error);
            // Continue with conservative settings on error
            setUserWantsToSkip(true);
        } finally {
            setIsTestRunning(false);
            setTestProgress(null);
        }
    };

    const getPhaseIcon = (phase: string, isActive: boolean) => {
        const iconProps = {
            size: 18,
            className: isActive ? 'text-blue-500 animate-pulse' : 'text-gray-400'
        };

        switch (phase) {
            case 'download':
                return <Activity {...iconProps} />;
            case 'upload':
                return <Wifi {...iconProps} />;
            case 'latency':
                return <Activity {...iconProps} />;
            case 'complete':
                return <CheckCircle {...iconProps} className="text-green-500" />;
            default:
                return <Activity {...iconProps} />;
        }
    };

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case 'excellent':
                return 'text-green-700 bg-green-50 border-green-200';
            case 'good':
                return 'text-blue-700 bg-blue-50 border-blue-200';
            case 'fair':
                return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            case 'poor':
                return 'text-red-700 bg-red-50 border-red-200';
            default:
                return 'text-gray-700 bg-gray-50 border-gray-200';
        }
    };

    const handleApplyRecommendations = () => {
        if (testResult) {
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
    };

    const canProceed = hasRunTest || userWantsToSkip;

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0 pt-0.5">
                        <Info className="h-5 w-5 text-blue-700" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            Test your internet connection to optimize video performance during your game.
                            This helps ensure smooth video playback for both you and your students.
                        </p>
                    </div>
                </div>
            </div>

            {!hasRunTest && !userWantsToSkip && (
                <div className="text-center">
                    <div className="mb-6">
                        <Activity size={48} className="mx-auto text-blue-500 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Internet Speed Test</h3>
                        <p className="text-gray-600">
                            We'll test your connection speed to provide personalized recommendations for video settings.
                        </p>
                    </div>

                    {!isTestRunning ? (
                        <div className="space-y-4">
                            <button
                                onClick={runBandwidthTest}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Test My Connection
                            </button>

                            <div className="text-sm text-gray-500">
                                <p>This test takes about 30 seconds and measures:</p>
                                <div className="flex justify-center space-x-6 mt-2">
                                    <span>Download Speed</span>
                                    <span>Upload Speed</span>
                                    <span>Latency</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => setUserWantsToSkip(true)}
                                    className="text-gray-600 hover:text-gray-800 text-sm underline"
                                >
                                    Skip test (use conservative settings)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Testing Your Connection...</h3>

                                {/* Progress Steps */}
                                <div className="flex justify-center space-x-8 mb-6">
                                    <div className="flex flex-col items-center">
                                        {getPhaseIcon('download', testProgress?.phase === 'download')}
                                        <span className="text-xs mt-1 text-gray-600">Download</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        {getPhaseIcon('upload', testProgress?.phase === 'upload')}
                                        <span className="text-xs mt-1 text-gray-600">Upload</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        {getPhaseIcon('latency', testProgress?.phase === 'latency')}
                                        <span className="text-xs mt-1 text-gray-600">Latency</span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full max-w-md mx-auto">
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                            style={{ width: `${testProgress?.progress || 0}%` }}
                                        />
                                    </div>

                                    {testProgress?.currentSpeedMbps && (
                                        <div className="text-center mt-2">
                                            <p className="text-sm text-gray-600">
                                                Current Speed: <span className="font-mono font-semibold">
                          {testProgress.currentSpeedMbps.toFixed(1)} Mbps
                        </span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {testResult && (
                <div className="space-y-4">
                    <div className="text-center">
                        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Test Complete!</h3>
                    </div>

                    {/* Results Summary */}
                    <div className={`border rounded-lg p-4 ${getQualityColor(testResult.quality)}`}>
                        <div className="grid grid-cols-3 gap-4 text-center mb-3">
                            <div>
                                <div className="text-2xl font-bold">{testResult.downloadSpeedMbps}</div>
                                <div className="text-sm">Mbps Download</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{testResult.uploadSpeedMbps}</div>
                                <div className="text-sm">Mbps Upload</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{testResult.latencyMs}</div>
                                <div className="text-sm">ms Latency</div>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="font-semibold capitalize text-lg">
                                Connection Quality: {testResult.quality}
                            </div>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <Info className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
                            <div>
                                <h4 className="text-blue-800 font-medium mb-2">Recommendation</h4>
                                <p className="text-blue-700 text-sm mb-3">{testResult.recommendation}</p>

                                {!testResult.canHandleVideo && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                                        <div className="flex items-center">
                                            <AlertTriangle size={16} className="text-yellow-600 mr-2" />
                                            <span className="text-yellow-800 font-medium text-sm">
                        We recommend disabling host video preview for optimal performance
                      </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Video Settings Preview */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                            <Monitor size={18} className="mr-2" />
                            Video Settings for Your Game
                        </h4>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Host Video Preview</span>
                                <div className="flex items-center space-x-2">
                                    {settings.hostVideoEnabled ? (
                                        <Eye size={16} className="text-green-600" />
                                    ) : (
                                        <EyeOff size={16} className="text-red-600" />
                                    )}
                                    <span className={`text-sm font-medium ${
                                        settings.hostVideoEnabled ? 'text-green-600' : 'text-red-600'
                                    }`}>
                    {settings.hostVideoEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                                    <button
                                        onClick={toggleHostVideo}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Video Quality</span>
                                <span className="text-sm font-medium capitalize text-gray-800">
                  {settings.videoQuality}
                </span>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
                            <strong>Note:</strong> Students will always see full-quality video on the presentation screen.
                            These settings only affect your host preview.
                        </div>
                    </div>

                    {/* Apply Recommendations Button */}
                    {!settings.userOverride && (
                        <div className="text-center">
                            <button
                                onClick={handleApplyRecommendations}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Apply Recommended Settings
                            </button>
                        </div>
                    )}
                </div>
            )}

            {userWantsToSkip && !testResult && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertTriangle className="text-yellow-500 mt-0.5 mr-3" size={20} />
                        <div>
                            <h4 className="text-yellow-800 font-medium mb-1">Using Conservative Settings</h4>
                            <p className="text-yellow-700 text-sm mb-3">
                                Since you skipped the bandwidth test, we'll use conservative video settings that work well on most connections.
                            </p>
                            <div className="text-sm text-yellow-700">
                                <p><strong>Host Video:</strong> Disabled (you can enable it later if needed)</p>
                                <p><strong>Recommendation:</strong> Position yourself to see the presentation screen during video segments</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-between">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={isTestRunning}
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 disabled:opacity-50"
                >
                    <ArrowLeft size={18} /> Previous
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canProceed || isTestRunning}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next: Finalize & Start <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default Step6BandwidthTest;