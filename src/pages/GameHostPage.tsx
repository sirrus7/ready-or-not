// src/pages/GameHostPage.tsx - Updated with Enhanced Video Controls
import React, { useState, useEffect } from 'react';
import HostPanel from '../components/Host/HostPanel.tsx';
import HostControlPanel from '../components/Host/HostControlPanel.tsx';
import VideoSettingsPanel from '../components/Host/VideoSettingsPanel';
import BandwidthTestModal from '../components/Host/BandwidthTestModal';
import {useAppContext} from '../context/AppContext';
import {useVideoSettings} from '../context/VideoSettingsContext';
import {Monitor, AlertCircle, Info, Settings2, Wifi} from 'lucide-react';

const GameHostPage: React.FC = () => {
    const {
        state,
        currentSlideData,
        isStudentWindowOpen,
    } = useAppContext();

    const {
        settings,
        needsBandwidthTest,
        isVideoRecommended,
        getVideoRecommendation
    } = useVideoSettings();

    const [showVideoSettings, setShowVideoSettings] = useState(false);
    const [showInitialBandwidthTest, setShowInitialBandwidthTest] = useState(false);

    const {currentSessionId, gameStructure} = state;

    // Show bandwidth test on first load if needed
    useEffect(() => {
        if (needsBandwidthTest && !settings.bandwidthTestResult) {
            const timer = setTimeout(() => {
                setShowInitialBandwidthTest(true);
            }, 2000); // Give user a moment to see the interface first

            return () => clearTimeout(timer);
        }
    }, [needsBandwidthTest, settings.bandwidthTestResult]);

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle size={48} className="text-orange-500 mb-4"/>
                <h1 className="text-2xl font-semibold text-gray-700">Session Not Fully Loaded</h1>
                <p className="text-gray-600">Please wait for the session to initialize or start/select a game from the dashboard.</p>
                {currentSessionId === 'new' && <p className="text-sm text-gray-500 mt-2">Setting up new game session...</p>}
            </div>
        );
    }

    const isVideoSlide = currentSlideData && (
        currentSlideData.type === 'video' ||
        (currentSlideData.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
        ((currentSlideData.type === 'consequence_reveal' || currentSlideData.type === 'payoff_reveal') && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

    const videoUrl = isVideoSlide ? currentSlideData.source_url : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-3 md:p-4 lg:p-6 overflow-hidden">
            <div className="max-w-screen-2xl mx-auto h-full flex flex-col">
                {/* Header with enhanced video status */}
                <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center flex-shrink-0">
                    <div>
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                            {gameStructure?.name || 'Classroom Decision Simulator'}
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm">
                            Facilitator Control Center (Session: {currentSessionId?.substring(0, 8)}...)
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 sm:mt-0">
                        {/* Student Display Status */}
                        {isStudentWindowOpen ? (
                            <span className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-green-200 flex items-center">
                                <Monitor size={14} className="mr-1.5"/> Student Display Active
                            </span>
                        ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-yellow-200 flex items-center">
                                <Monitor size={14} className="mr-1.5"/> Student Display Inactive
                            </span>
                        )}

                        {/* Video Settings Status */}
                        <button
                            onClick={() => setShowVideoSettings(true)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border flex items-center space-x-1 transition-colors ${
                                settings.hostVideoEnabled
                                    ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            <Settings2 size={14} />
                            <span>Video: {settings.hostVideoEnabled ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Bandwidth Status */}
                        {settings.bandwidthTestResult && (
                            <span className={`text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border flex items-center space-x-1 ${
                                isVideoRecommended
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}>
                                <Wifi size={14} />
                                <span className="capitalize">{settings.bandwidthTestResult.quality}</span>
                            </span>
                        )}

                        {/* Bandwidth Test Needed Warning */}
                        {needsBandwidthTest && !settings.bandwidthTestResult && (
                            <button
                                onClick={() => setShowInitialBandwidthTest(true)}
                                className="text-xs bg-red-100 text-red-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-red-200 hover:bg-red-200 flex items-center space-x-1"
                            >
                                <AlertCircle size={14} />
                                <span>Test Connection</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Performance Recommendation Banner */}
                {settings.bandwidthTestResult && !isVideoRecommended && !settings.userOverride && (
                    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
                        <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="text-sm text-yellow-800">
                                <strong>Performance Tip:</strong> {getVideoRecommendation()}
                            </div>
                            <button
                                onClick={() => setShowVideoSettings(true)}
                                className="text-xs text-yellow-700 underline hover:text-yellow-900 mt-1"
                            >
                                Adjust Video Settings
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
                    {/* Teacher Control Panel */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <HostPanel/>
                    </div>

                    {/* Content Preview Area */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <div className="flex-shrink-0 flex items-center justify-between bg-gray-100 px-4 py-3 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-800 text-sm flex items-center">
                                <Monitor size={16} className="mr-2 opacity-80"/>
                                Content Preview & Controls
                                {!settings.hostVideoEnabled && isVideoSlide && (
                                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                        Video Disabled
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                    {currentSlideData ? `Slide ${currentSlideData.id}: ${currentSlideData.title}` : 'No slide selected'}
                                </span>
                                {isVideoSlide && (
                                    <button
                                        onClick={() => setShowVideoSettings(true)}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        Video Settings
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-grow bg-gray-50 p-4 overflow-y-auto">
                            {!currentSlideData ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    <div className="text-center">
                                        <Info size={48} className="mx-auto mb-3 opacity-50" />
                                        <p>No content loaded</p>
                                        <p className="text-sm mt-1">Navigate to a slide using the journey map</p>
                                    </div>
                                </div>
                            ) : isVideoSlide && videoUrl ? (
                                <div>
                                    <HostControlPanel
                                        slideId={currentSlideData.id}
                                        videoUrl={videoUrl}
                                        isForCurrentSlide={true}
                                    />
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-800">
                                            <Info size={16} className="inline mr-1" />
                                            {settings.hostVideoEnabled
                                                ? 'This video preview syncs with the student display. Controls affect all viewers.'
                                                : 'Host video is disabled. Students see full video on presentation screen. Use controls to manage playback.'
                                            }
                                        </p>
                                        {!settings.hostVideoEnabled && (
                                            <button
                                                onClick={() => setShowVideoSettings(true)}
                                                className="mt-2 text-xs text-blue-700 underline hover:text-blue-900"
                                            >
                                                Enable host video preview
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h3 className="font-semibold text-gray-800 mb-3">
                                        Current Slide Information
                                    </h3>
                                    <dl className="space-y-2 text-sm">
                                        <div>
                                            <dt className="font-medium text-gray-500">Type:</dt>
                                            <dd className="text-gray-800 capitalize">{currentSlideData.type.replace(/_/g, ' ')}</dd>
                                        </div>
                                        {currentSlideData.main_text && (
                                            <div>
                                                <dt className="font-medium text-gray-500">Main Text:</dt>
                                                <dd className="text-gray-800">{currentSlideData.main_text}</dd>
                                            </div>
                                        )}
                                        {currentSlideData.sub_text && (
                                            <div>
                                                <dt className="font-medium text-gray-500">Sub Text:</dt>
                                                <dd className="text-gray-800">{currentSlideData.sub_text}</dd>
                                            </div>
                                        )}
                                        {currentSlideData.teacher_alert && (
                                            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                                                <dt className="font-medium text-yellow-800 mb-1">Teacher Alert:</dt>
                                                <dd className="text-yellow-700 text-sm">{currentSlideData.teacher_alert.message}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600">
                                            <Info size={16} className="inline mr-1" />
                                            {currentSlideData.type === 'image' && 'This image is displayed on the student screen.'}
                                            {currentSlideData.type === 'interactive_choice' && 'Students are making decisions on their devices.'}
                                            {currentSlideData.type === 'interactive_invest' && 'Students are selecting investments on their devices.'}
                                            {currentSlideData.type === 'leaderboard_chart' && 'The leaderboard is displayed on the student screen.'}
                                            {(currentSlideData.type === 'content_page' || currentSlideData.type === 'kpi_summary_instructional') && 'This content is displayed on the student screen.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Settings Panel */}
            <VideoSettingsPanel
                isOpen={showVideoSettings}
                onClose={() => setShowVideoSettings(false)}
            />

            {/* Initial Bandwidth Test Modal */}
            <BandwidthTestModal
                isOpen={showInitialBandwidthTest}
                onClose={() => setShowInitialBandwidthTest(false)}
                showRecommendations={true}
            />
        </div>
    );
};

export default GameHostPage;