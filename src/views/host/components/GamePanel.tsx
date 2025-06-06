// src/views/host/components/GamePanel.tsx
import React from 'react';
import DecisionHistory from './DecisionHistory';
import HostGameControls from './GameControls';
import TeamSubmissions from './TeamMonitor';
import {useGameContext} from '@app/providers/GameProvider';
import {Layers, Info, AlertTriangle} from 'lucide-react';

const GamePanel: React.FC = () => {
    const {state, currentSlideData, processInvestmentPayoffs, setCurrentHostAlertState} = useGameContext();
    const {gameStructure, currentSessionId, error: appError, isLoading} = state;

    const isInteractiveStudentSlide = !!currentSlideData?.interactive_data_key;

    if (isLoading && !currentSessionId) {
        return (
            <div
                className="bg-gray-100 p-6 rounded-lg shadow text-center text-gray-600 h-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                <p className="font-semibold">Loading Session Data...</p>
            </div>
        );
    }

    if (appError && !currentSessionId) {
        return (
            <div
                className="bg-red-50 p-6 rounded-lg shadow text-center text-red-700 h-full flex flex-col items-center justify-center border border-red-200">
                <AlertTriangle size={32} className="mx-auto mb-3 text-red-500"/>
                <p className="font-semibold">Error Loading Session</p>
                <p className="text-sm">{appError}</p>
            </div>
        );
    }

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return (
            <div
                className="bg-gray-100 p-6 rounded-lg shadow text-center text-gray-600 h-full flex flex-col items-center justify-center">
                <Info size={32} className="mx-auto mb-3 text-blue-500"/>
                <p className="font-semibold">No Active Game Session Loaded</p>
                <p className="text-sm">Please wait for the session to initialize or start/select a game from the
                    dashboard.</p>
            </div>
        );
    }

    const handlePayoffProcessing = async (roundNumber: 1 | 2 | 3) => {
        try {
            console.log(`[GamePanel] Processing investment payoffs for round ${roundNumber}`);
            await processInvestmentPayoffs(roundNumber);
            setCurrentHostAlertState({
                title: 'Investment Processing Complete',
                message: `Round ${roundNumber} investment payoffs have been applied to all teams.`
            });
        } catch (error) {
            console.error('[GamePanel] Failed to process investment payoffs:', error);
        }
    };

    return (
        <div className="bg-gray-50 h-full flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center">
                    <Layers className="mr-2 text-blue-600" size={22}/>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">Host Control Panel</h2>
                        <p className="text-xs text-gray-500 truncate">Session: {currentSessionId.substring(0, 12)}...</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 p-3">
                    {/* REFACTOR: Using DecisionHistory instead of GameMap */}
                    <DecisionHistory/>
                </div>
                {isInteractiveStudentSlide && (
                    <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                        <div className="max-h-64 overflow-y-auto">
                            <TeamSubmissions/>
                        </div>
                    </div>
                )}
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
                    {currentSlideData?.type === 'payoff_reveal' && currentSlideData.round_number > 0 && (
                        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                            <button
                                onClick={() => handlePayoffProcessing(currentSlideData.round_number as 1 | 2 | 3)}
                                className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                                Process RD-{currentSlideData.round_number} Investment Payoffs
                            </button>
                            <p className="text-xs text-blue-600 mt-1 text-center">
                                Click to apply investment effects to all teams
                            </p>
                        </div>
                    )}
                    <HostGameControls/>
                </div>
            </div>
        </div>
    );
};

export default GamePanel;
