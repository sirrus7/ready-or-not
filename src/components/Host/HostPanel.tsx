// src/components/Host/HostPanel.tsx - Updated with Decision Phase Controls
import React from 'react';
import GameMap from './GameMap.tsx';
import HostGameControls from './HostGameControls.tsx';
import TeamSubmissions from './TeamSubmissions.tsx';
import {useAppContext} from '../../context/AppContext';
import {Layers, Info, AlertTriangle, Play, Pause, Clock} from 'lucide-react';

interface HostPanelProps {
    // No props needed as it consumes from AppContext
}

const DecisionPhaseControls: React.FC = () => {
    const {
        currentPhaseNode,
        isDecisionPhaseActive,
        activateDecisionPhase,
        deactivateDecisionPhase
    } = useAppContext();

    const isInteractivePhase = currentPhaseNode?.is_interactive_player_phase || false;

    if (!isInteractivePhase) {
        return null;
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                        Decision Phase: {currentPhaseNode?.label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isDecisionPhaseActive ? (
                        <button
                            onClick={deactivateDecisionPhase}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                        >
                            <Pause size={14} />
                            Stop Decisions
                        </button>
                    ) : (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => activateDecisionPhase(180)} // 3 minutes
                                className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                            >
                                <Play size={14} />
                                3min
                            </button>
                            <button
                                onClick={() => activateDecisionPhase(300)} // 5 minutes
                                className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                            >
                                <Play size={14} />
                                5min
                            </button>
                            <button
                                onClick={() => activateDecisionPhase(600)} // 10 minutes
                                className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                            >
                                <Play size={14} />
                                10min
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isDecisionPhaseActive && (
                <div className="mt-2 text-xs text-blue-700">
                    Students can now make decisions on their devices
                </div>
            )}
        </div>
    );
};

const HostPanel: React.FC<HostPanelProps> = () => {
    const {state, currentPhaseNode} = useAppContext();
    const {gameStructure, currentSessionId, error: appError, isLoading } = state;

    // Determine if the current phase is one where students make interactive decisions
    const isInteractiveStudentPhaseActive = currentPhaseNode?.is_interactive_player_phase || false;

    if (isLoading && !currentSessionId) {
        return (
            <div className="bg-gray-100 p-6 rounded-lg shadow text-center text-gray-600 h-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                <p className="font-semibold">Loading Session Data...</p>
            </div>
        );
    }

    if (appError && !currentSessionId) {
        return (
            <div className="bg-red-50 p-6 rounded-lg shadow text-center text-red-700 h-full flex flex-col items-center justify-center border border-red-200">
                <AlertTriangle size={32} className="mx-auto mb-3 text-red-500"/>
                <p className="font-semibold">Error Loading Session</p>
                <p className="text-sm">{appError}</p>
            </div>
        );
    }

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return (
            <div className="bg-gray-100 p-6 rounded-lg shadow text-center text-gray-600 h-full flex flex-col items-center justify-center">
                <Info size={32} className="mx-auto mb-3 text-blue-500"/>
                <p className="font-semibold">No Active Game Session Loaded</p>
                <p className="text-sm">Please wait for the session to initialize or start/select a game from the dashboard.</p>
                {currentSessionId === 'new' && !isLoading &&
                    <p className="text-xs text-gray-500 mt-2">Finalizing new game setup...</p>}
            </div>
        );
    }

    return (
        <div className="bg-gray-50 h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center">
                    <Layers className="mr-2 text-blue-600" size={22}/>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">
                            Host Control Panel
                        </h2>
                        <p className="text-xs text-gray-500 truncate">
                            Session: {currentSessionId.substring(0,12)}...
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Decision Phase Controls - Only shown when needed */}
                <div className="flex-shrink-0 p-3">
                    <DecisionPhaseControls />
                </div>

                {/* Game Journey Map - Takes up available space */}
                <div className="flex-1 min-h-0 p-3">
                    <GameMap/>
                </div>

                {/* Team Submission Table - Only shown when needed, fixed height */}
                {isInteractiveStudentPhaseActive && (
                    <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                        <div className="max-h-64 overflow-y-auto">
                            <TeamSubmissions/>
                        </div>
                    </div>
                )}

                {/* Controls - Always at bottom */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
                    <HostGameControls/>
                </div>
            </div>
        </div>
    );
};

export default HostPanel;