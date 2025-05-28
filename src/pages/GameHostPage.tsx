// src/pages/GameHostPage.tsx - Simplified Perfect Sync Version
import React from 'react';
import HostPanel from '../components/Host/HostPanel.tsx';
import { useAppContext } from '../context/AppContext';
import { Monitor, AlertCircle, Info, Video } from 'lucide-react';
import DisplayView from '../components/Display/DisplayView';

const GameHostPage: React.FC = () => {
    const {
        state,
        currentSlideData,
    } = useAppContext();

    const { currentSessionId, gameStructure } = state;

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
        ((currentSlideData.type === 'consequence_reveal' || currentSlideData.type === 'payoff_reveal') &&
            currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i))
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-3 md:p-4 lg:p-6 overflow-hidden">
            <div className="max-w-screen-2xl mx-auto h-full flex flex-col">
                {/* Header */}
                <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center flex-shrink-0">
                    <div>
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                            {gameStructure?.name || 'Classroom Decision Simulator'}
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm">
                            Facilitator Control Center (Session: {currentSessionId?.substring(0, 8)}...)
                        </p>
                    </div>
                </header>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
                    {/* Teacher Control Panel */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <HostPanel />
                    </div>

                    {/* Content Preview Area */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <div className="flex-shrink-0 flex items-center justify-between bg-gray-100 px-4 py-3 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-800 text-sm flex items-center">
                                <Monitor size={16} className="mr-2 opacity-80"/>
                                Content Preview
                                {isVideoSlide && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
                                        <Video size={12} className="mr-1"/>
                                        Video Slide
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                    {currentSlideData ? `Slide ${currentSlideData.id}: ${currentSlideData.title}` : 'No slide selected'}
                                </span>
                            </div>
                        </div>

                        <div className="flex-grow bg-gray-50 overflow-hidden">
                            {!currentSlideData ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    <div className="text-center">
                                        <Info size={48} className="mx-auto mb-3 opacity-50" />
                                        <p>No content loaded</p>
                                        <p className="text-sm mt-1">Navigate to a slide using the journey map</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full">
                                    <DisplayView
                                        slide={currentSlideData}
                                        isPlayingTarget={false}
                                        videoTimeTarget={0}
                                        triggerSeekEvent={false}
                                    />
                                    {isVideoSlide && (
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <div className="bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
                                                <div className="flex items-center mb-2">
                                                    <Video size={16} className="mr-2 text-blue-300"/>
                                                    <span className="font-semibold">Video Slide Active</span>
                                                </div>
                                                <p className="text-blue-200 text-xs">
                                                    🎥 This is a preview only. Launch the Student Display to show synchronized content to students.
                                                    <br/>
                                                    🎵 Audio and video controls will be perfectly synced between this preview and the student display.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameHostPage;