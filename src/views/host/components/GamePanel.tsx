// src/views/host/components/GamePanel.tsx
// Updated to use the new TeamSubmissions component

import React from 'react';
import DecisionHistory from './DecisionHistory';
import HostGameControls from './GameControls';
import {useGameContext} from '@app/providers/GameProvider';
import {Info, AlertTriangle} from 'lucide-react';

const GamePanel: React.FC = () => {
    const {state, currentSlideData} = useGameContext();
    const {gameStructure, currentSessionId, error: appError, isLoading} = state;

    const isInteractiveStudentSlide = !!(currentSlideData?.interactive_data_key) &&
        currentSlideData?.type !== 'double_down_dice_roll';

    if (isLoading && !currentSessionId) {
        return <div className="bg-gray-100 p-6 rounded-lg shadow-md flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-orange-500 mr-3"></div>
            Loading...</div>;
    }
    if (appError && !currentSessionId) {
        return <div className="bg-red-50 p-6 rounded-lg shadow-md flex items-center h-full text-red-700"><AlertTriangle
            className="mr-3"/>Error Loading Session</div>;
    }
    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return <div className="bg-gray-100 p-6 rounded-lg shadow-md flex items-center h-full text-gray-500"><Info
            className="mr-3"/>No Active Game Session Loaded</div>;
    }

    return (
        <>
            <div className="bg-white h-full flex flex-col rounded-lg overflow-hidden shadow-lg border border-gray-200">
                {/* Panel Header */}
                <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 bg-gray-50">
                    <div className="flex items-center">
                        <img
                            src="/images/ready-or-not-logo.png"
                            alt="Ready or Not 2.0"
                            className="h-20 w-auto shadow-sm mr-3 pl-2 pt-1"
                        />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">Host Control Panel</h2>
                        </div>
                    </div>
                </div>

                {/* Single Content Area */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
                    <div className="p-3">
                        <DecisionHistory currentInteractiveSlide={isInteractiveStudentSlide ? currentSlideData : null}/>
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
                    <HostGameControls/>
                </div>
            </div>
        </>
    );
};

export default GamePanel;
