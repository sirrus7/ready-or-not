// src/views/host/HostApp.tsx - REFACTOR: Fixed navigation logic
import React, {useEffect} from 'react';
import GamePanel from '@views/host/components/GamePanel';
import {useGameContext} from '@app/providers/GameProvider';
import {AlertCircle, Info, ChevronLeft, ChevronRight} from 'lucide-react';
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import PresentationButton from '@views/host/components/GameControls/PresentationButton';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';

const HostApp: React.FC = () => {
    const {
        state,
        currentSlideData,
        previousSlide,
        nextSlide,
        setCurrentHostAlertState,
    } = useGameContext();

    const {currentSessionId, gameStructure, current_slide_index} = state;

    useEffect(() => {
        if (!currentSessionId || currentSessionId === 'new' || !currentSlideData) return;
        const broadcastManager = SimpleBroadcastManager.getInstance(currentSessionId, 'host');
        broadcastManager.sendSlideUpdate(currentSlideData);
    }, [currentSessionId, currentSlideData]);

    const handleVideoEnd = () => {
        if (!currentSlideData) return;
        if (currentSlideData.host_alert) {
            setCurrentHostAlertState(currentSlideData.host_alert);
        } else {
            nextSlide();
        }
    };

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return <div className="min-h-screen ..."><AlertCircle/>Session Not Fully Loaded</div>;
    }

    // REFACTOR: Simplified navigation boundary checks
    const isFirstSlideOverall = current_slide_index === 0;
    const isLastSlideOverall = current_slide_index === (gameStructure.slides.length - 1);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-200 to-gray-400 p-3 md:p-4 lg:p-6 overflow-hidden">
            <div className="max-w-screen-2xl mx-auto h-full flex flex-col">
                <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-xl ...">{gameStructure?.name || 'Game'}</h1>
                        <p className="text-gray-500 text-xs ...">Session: {currentSessionId?.substring(0, 8)}...</p>
                    </div>
                </header>
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
                    <div className="lg:col-span-1 ... max-h-[calc(100vh-120px)]">
                        <GamePanel/>
                    </div>
                    <div className="lg:col-span-2 ... max-h-[calc(100vh-120px)]">
                        <div className="flex-grow bg-gray-50 overflow-hidden relative">
                            {!currentSlideData ? (
                                <div className="h-full flex items-center justify-center text-gray-400"><Info/> No
                                    content loaded</div>
                            ) : (
                                <>
                                    <div className="h-full"><SlideRenderer slide={currentSlideData}
                                                                           sessionId={currentSessionId} isHost={true}
                                                                           onVideoEnd={handleVideoEnd}/></div>
                                    <div className="absolute top-3 right-3 z-50 w-48"><PresentationButton/></div>
                                    {currentSlideData.interactive_data_key && (
                                        <div
                                            className="absolute bottom-3 left-3 ...">Interactive: {currentSlideData.type}</div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex-shrink-0 bg-white border-t p-4">
                            <div className="flex items-center justify-center gap-6">
                                <button onClick={previousSlide} disabled={isFirstSlideOverall}
                                        className="w-12 h-12 ..."><ChevronLeft/></button>
                                <div className="flex-1 text-center">
                                    <div className="text-sm ...">
                                        {currentSlideData ? `Slide ${currentSlideData.id}: ${currentSlideData.title}` : 'No Slide Selected'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {currentSlideData && current_slide_index !== null && (
                                            <span>({current_slide_index + 1} of {gameStructure.slides.length})</span>
                                        )}
                                        {currentSlideData?.interactive_data_key &&
                                            <span className="ml-2 text-green-600 font-medium">• Interactive</span>}
                                    </div>
                                </div>
                                <button onClick={nextSlide} disabled={isLastSlideOverall} className="w-12 h-12 ...">
                                    <ChevronRight/></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostApp;
