// src/views/host/HostApp.tsx - REFACTOR: Final, stable layout fix
import React, {useEffect} from 'react';
import GamePanel from '@views/host/components/GamePanel';
import {useGameContext} from '@app/providers/GameProvider';
import {AlertCircle, ChevronLeft, ChevronRight} from 'lucide-react';
import SlideRenderer from '@shared/components/Video/SlideRenderer';
import PresentationButton from '@views/host/components/GameControls/PresentationButton';
import {SimpleBroadcastManager} from '@core/sync/SimpleBroadcastManager';
import BusinessGrowthStrategyNotifications from '@views/host/components/BusinessGrowthStrategyNotifications';

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
        document.title = "Ready or Not - Host";
    }, []);

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

    const isFirstSlideOverall = current_slide_index === 0;
    const isLastSlideOverall = current_slide_index === (gameStructure.slides.length - 1);

    return (
        <div
            className="h-screen w-screen bg-gradient-to-br from-gray-200 to-gray-400 p-4 flex flex-col overflow-hidden">
            <header
                className="flex-shrink-0 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">{gameStructure?.name || 'Game'}</h1>
                    <p className="text-gray-500 text-sm md:text-base">Session: {currentSessionId?.substring(0, 8)}...</p>
                </div>

                {/* Add the Business Growth Strategy notifications in the header */}
                <div className="flex items-center gap-3 mt-2 sm:mt-0">
                    <BusinessGrowthStrategyNotifications />
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
                <div className="lg:col-span-4 xl:col-span-3 min-h-0">
                    <GamePanel/>
                </div>
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0">
                    {/* Stable Slide Display Area with fixed aspect ratio */}
                    <div className="flex-grow relative w-full bg-black rounded-t-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-full">
                                <SlideRenderer slide={currentSlideData} sessionId={currentSessionId} isHost={true}
                                               onVideoEnd={handleVideoEnd}/>
                            </div>
                        </div>
                        {currentSlideData && (
                            <div className="absolute top-3 right-3 z-50 w-48">
                                <PresentationButton/>
                            </div>
                        )}
                    </div>
                    {/* Stable Navigation Area */}
                    <div className="flex-shrink-0 bg-white border-t border-gray-200 p-3 lg:p-4 rounded-b-lg shadow-md">
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={previousSlide} disabled={isFirstSlideOverall}
                                    className="p-3 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft size={24}/>
                            </button>
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-sm md:text-base font-semibold text-gray-800 truncate">
                                    {currentSlideData ? `Slide ${currentSlideData.id}: ${currentSlideData.title}` : 'No Slide Selected'}
                                </div>
                                <div className="text-xs md:text-sm text-gray-500">
                                    {currentSlideData && current_slide_index !== null && (
                                        <span>({current_slide_index + 1} of {gameStructure.slides.length})</span>
                                    )}
                                    {currentSlideData?.interactive_data_key &&
                                        <span className="ml-2 text-green-600 font-medium">• Interactive</span>}
                                </div>
                            </div>
                            <button onClick={nextSlide} disabled={isLastSlideOverall}
                                    className="p-3 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight size={24}/>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HostApp;
