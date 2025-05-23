// src/pages/GameHostPage.tsx
import React from 'react';
import TeacherPanel from '../components/TeacherHost/TeacherPanel';
import StudentDisplayView from '../components/StudentDisplay/StudentDisplayView';
import {useAppContext} from '../context/AppContext';
import {Users2, Tv2, AlertCircle} from 'lucide-react';

const GameHostPage: React.FC = () => {
    const {
        state,
        currentSlideData,
        isPlayingVideo,
        videoCurrentTime,
        triggerVideoSeek,
        setVideoPlaybackStateFromPreview,
        reportVideoDuration,
        handlePreviewVideoEnded,
    } = useAppContext();

    const {currentSessionId, gameStructure, isStudentWindowOpen} = state;

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle size={48} className="text-orange-500 mb-4"/>
                <h1 className="text-2xl font-semibold text-gray-700">Session Not Fully Loaded</h1>
                <p className="text-gray-600">Please wait for the session to initialize or start/select a game from the
                    dashboard.</p>
                {currentSessionId === 'new' &&
                    <p className="text-sm text-gray-500 mt-2">Setting up new game session...</p>}
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-3 md:p-4 lg:p-6 overflow-hidden">
            <div className="max-w-screen-2xl mx-auto h-full flex flex-col">
                <header
                    className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center flex-shrink-0">
                    <div>
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">
                            {gameStructure?.name || 'Classroom Decision Simulator'}
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm">
                            Facilitator Control Center (Session: {currentSessionId?.substring(0, 8)}...)
                        </p>
                    </div>
                    {isStudentWindowOpen && (
                        <span
                            className="mt-2 sm:mt-0 text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-green-200 flex items-center">
                            <Users2 size={14} className="mr-1.5"/> External Student Display Active
                        </span>
                    )}
                </header>


                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
                    <div
                        className="lg:col-span-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-150px)]">
                        <TeacherPanel/>
                    </div>

                    <div
                        className="lg:col-span-2 bg-black rounded-xl shadow-xl border border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-150px)]">
                        <div
                            className="flex-shrink-0 flex items-center justify-between bg-gray-700 px-4 py-2 border-b border-gray-600">
                            <h2 className="font-semibold text-gray-100 text-sm flex items-center">
                                <Tv2 size={16} className="mr-2 opacity-80"/>
                                Student Display Preview
                            </h2>
                        </div>
                        <div className="flex-grow bg-gray-800 min-h-0">
                            <StudentDisplayView
                                slide={currentSlideData}
                                isPlayingTarget={isPlayingVideo}
                                videoTimeTarget={videoCurrentTime}
                                triggerSeekEvent={triggerVideoSeek}
                                isForTeacherPreview={true}
                                onPreviewVideoStateChange={setVideoPlaybackStateFromPreview}
                                onPreviewVideoDuration={reportVideoDuration}
                                onPreviewVideoEnded={handlePreviewVideoEnded}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default GameHostPage;