// src/pages/GameHostPage.tsx
import React from 'react';
import TeacherPanel from '../components/TeacherHost/TeacherPanel';
import VideoControlPanel from '../components/TeacherHost/VideoControlPanel';
import {useAppContext} from '../context/AppContext';
import {Monitor, AlertCircle, Info} from 'lucide-react';

const GameHostPage: React.FC = () => {
    const {
        state,
        currentSlideData,
        isStudentWindowOpen,
    } = useAppContext();

    const {currentSessionId, gameStructure} = state;

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
                        {isStudentWindowOpen ? (
                            <span className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-green-200 flex items-center">
                                <Monitor size={14} className="mr-1.5"/> Student Display Active
                            </span>
                        ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-yellow-200 flex items-center">
                                <Monitor size={14} className="mr-1.5"/> Student Display Inactive
                            </span>
                        )}
                    </div>
                </header>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
                    {/* Teacher Control Panel */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <TeacherPanel/>
                    </div>

                    {/* Content Preview Area */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <div className="flex-shrink-0 flex items-center justify-between bg-gray-100 px-4 py-3 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-800 text-sm flex items-center">
                                <Monitor size={16} className="mr-2 opacity-80"/>
                                Content Preview & Controls
                            </h2>
                            <span className="text-xs text-gray-500">
                                {currentSlideData ? `Slide ${currentSlideData.id}: ${currentSlideData.title}` : 'No slide selected'}
                            </span>
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
                                    <VideoControlPanel
                                        slideId={currentSlideData.id}
                                        videoUrl={videoUrl}
                                        isForCurrentSlide={true}
                                    />
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-800">
                                            <Info size={16} className="inline mr-1" />
                                            This video preview is synchronized with the student display.
                                            Use the controls above to manage playback for all viewers.
                                        </p>
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
        </div>
    );
};

export default GameHostPage;