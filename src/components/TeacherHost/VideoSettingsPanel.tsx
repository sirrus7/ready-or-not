// src/components/TeacherHost/VideoSettingsPanel.tsx
import React, { useState } from 'react';
import {
    Monitor,
    MonitorOff,
    Wifi,
    WifiOff,
    Settings2,
    Eye,
    EyeOff,
    Activity,
    Info,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { useVideoSettings } from '../../context/VideoSettingsContext';
import BandwidthTestModal from './BandwidthTestModal';

interface VideoSettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({ isOpen, onClose }) => {
    const [showBandwidthTest, setShowBandwidthTest] = useState(false);

    const {
        settings,
        updateSettings,
        toggleHostVideo,
        needsBandwidthTest,
        isVideoRecommended,
        getVideoRecommendation
    } = useVideoSettings();

    if (!isOpen) return null;

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case 'excellent':
                return 'text-green-600';
            case 'good':
                return 'text-blue-600';
            case 'fair':
                return 'text-yellow-600';
            case 'poor':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getQualityIcon = (quality: string) => {
        switch (quality) {
            case 'excellent':
            case 'good':
                return <Wifi size={16} className={getQualityColor(quality)} />;
            case 'fair':
                return <Activity size={16} className={getQualityColor(quality)} />;
            case 'poor':
                return <WifiOff size={16} className={getQualityColor(quality)} />;
            default:
                return <Activity size={16} className={getQualityColor(quality)} />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <Settings2 size={20} className="mr-2" />
                            Video Settings
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Host Video Toggle */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <Monitor size={18} className="text-gray-600" />
                                    <span className="font-medium text-gray-800">Host Video Preview</span>
                                </div>
                                <button
                                    onClick={toggleHostVideo}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        settings.hostVideoEnabled
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                >
                                    {settings.hostVideoEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                                    <span>{settings.hostVideoEnabled ? 'Enabled' : 'Disabled'}</span>
                                </button>
                            </div>

                            <p className="text-sm text-gray-600">
                                {settings.hostVideoEnabled
                                    ? 'You\'ll see video preview on your control screen (may use more bandwidth)'
                                    : 'Video disabled on your screen to save bandwidth. Use presentation screen for video content.'
                                }
                            </p>
                        </div>

                        {/* Video Quality Setting */}
                        {settings.hostVideoEnabled && (
                            <div className="border border-gray-200 rounded-lg p-4">
                                <div className="mb-3">
                                    <span className="font-medium text-gray-800">Video Quality</span>
                                </div>

                                <div className="space-y-2">
                                    {['high', 'medium', 'low'].map((quality) => (
                                        <label key={quality} className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="videoQuality"
                                                value={quality}
                                                checked={settings.videoQuality === quality}
                                                onChange={(e) => updateSettings({ videoQuality: e.target.value as any })}
                                                className="form-radio text-blue-600"
                                            />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-700 capitalize">
                                                    {quality} Quality
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {quality === 'high' && 'Full resolution (uses more bandwidth)'}
                                                    {quality === 'medium' && 'Reduced resolution (balanced)'}
                                                    {quality === 'low' && 'Lower resolution (saves bandwidth)'}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Connection Status */}
                        {settings.bandwidthTestResult && (
                            <div className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-medium text-gray-800">Connection Status</span>
                                    {getQualityIcon(settings.bandwidthTestResult.quality)}
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                                    <div className="bg-gray-50 rounded p-2">
                                        <div className="text-lg font-semibold text-gray-800">
                                            {settings.bandwidthTestResult.downloadSpeedMbps}
                                        </div>
                                        <div className="text-xs text-gray-600">Mbps Down</div>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <div className="text-lg font-semibold text-gray-800">
                                            {settings.bandwidthTestResult.uploadSpeedMbps}
                                        </div>
                                        <div className="text-xs text-gray-600">Mbps Up</div>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <div className="text-lg font-semibold text-gray-800">
                                            {settings.bandwidthTestResult.latencyMs}
                                        </div>
                                        <div className="text-xs text-gray-600">ms Latency</div>
                                    </div>
                                </div>

                                <div className="text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      settings.bandwidthTestResult.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                          settings.bandwidthTestResult.quality === 'good' ? 'bg-blue-100 text-blue-800' :
                              settings.bandwidthTestResult.quality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                  }`}>
                    {settings.bandwidthTestResult.quality} Connection
                  </span>
                                </div>

                                {settings.lastTestedAt && (
                                    <div className="text-xs text-gray-500 text-center mt-2">
                                        Tested {new Date(settings.lastTestedAt).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bandwidth Test */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-800">Speed Test</span>
                                {needsBandwidthTest && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Recommended
                  </span>
                                )}
                            </div>

                            <p className="text-sm text-gray-600 mb-3">
                                {needsBandwidthTest
                                    ? 'Test your connection to get personalized video recommendations.'
                                    : 'Retest your connection if you\'re experiencing performance issues.'
                                }
                            </p>

                            <button
                                onClick={() => setShowBandwidthTest(true)}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                {needsBandwidthTest ? 'Run Speed Test' : 'Test Again'}
                            </button>
                        </div>

                        {/* Recommendations */}
                        {settings.bandwidthTestResult && (
                            <div className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-2">
                                    {isVideoRecommended ? (
                                        <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div>
                                        <div className="font-medium text-gray-800 mb-1">
                                            {isVideoRecommended ? 'Recommendations' : 'Performance Tips'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {getVideoRecommendation()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Important Notes */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-700">
                                    <div className="font-medium mb-1">Important Notes:</div>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Students always see full-quality video on the presentation screen</li>
                                        <li>• Host video may be 1-2 seconds behind (audio stays synced)</li>
                                        <li>• You can change these settings anytime during the game</li>
                                        <li>• When host video is off, use the presentation screen for video content</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Close Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>

            {/* Bandwidth Test Modal */}
            <BandwidthTestModal
                isOpen={showBandwidthTest}
                onClose={() => setShowBandwidthTest(false)}
                showRecommendations={true}
            />
        </div>
    );
};

export default VideoSettingsPanel;