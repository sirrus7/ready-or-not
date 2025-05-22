// src/components/TeacherHost/TeacherPanel.tsx
import React from 'react';
import GameJourneyMap from './GameJourneyMap';
import TeacherGameControls from './TeacherGameControls';
import TeamSubmissionTable from './TeamSubmissionTable';
import {useAppContext} from '../../context/AppContext';
import {Layers, Info, AlertTriangle} from 'lucide-react'; // Added AlertTriangle

interface TeacherPanelProps {
    // No props needed as it consumes from AppContext
}

const TeacherPanel: React.FC<TeacherPanelProps> = () => {
    const {state, currentPhaseNode} = useAppContext(); // Use currentPhaseNode
    const {gameStructure, currentSessionId, error: appError, isLoading } = state; // Get appError and isLoading

    // Determine if the current phase is one where students make interactive decisions
    const isInteractiveStudentPhaseActive = currentPhaseNode?.is_interactive_student_phase || false;

    if (isLoading && !currentSessionId) { // Show loading if initial session load is in progress
        return (
            <div className="bg-gray-100 p-6 rounded-lg shadow text-center text-gray-600 h-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                <p className="font-semibold">Loading Session Data...</p>
            </div>
        );
    }

    if (appError && !currentSessionId) { // Show error if session loading failed
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
                <p className="text-sm">Please start a new game or select an existing one from your dashboard.</p>
                {currentSessionId === 'new' && !isLoading &&
                    <p className="text-xs text-gray-500 mt-2">Finalizing new game setup...</p>}
            </div>
        );
    }

    return (
        <div
            className="bg-gray-100 p-4 md:p-5 rounded-xl shadow-xl border border-gray-200 space-y-4 h-full flex flex-col"> {/* Reduced padding slightly, space-y */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-300 flex-shrink-0">
                <div className="flex items-center">
                    <Layers className="mr-2 md:mr-3 text-blue-600" size={26}/> {/* Slightly smaller icon */}
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">
                            Teacher Control Panel
                        </h2>
                        <p className="text-xs text-gray-500">Session ID: {currentSessionId.substring(0,12)}...</p>
                    </div>
                </div>
            </div>

            <div
                className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 rounded-lg pr-1">
                <GameJourneyMap/>
            </div>

            {isInteractiveStudentPhaseActive && (
                <div className="flex-shrink-0 max-h-[30vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {/* Added max-h and overflow for submission table if it gets too long */}
                    <TeamSubmissionTable/>
                </div>
            )}

            <div className="mt-auto flex-shrink-0 pt-3 border-t border-gray-300"> {/* Reduced pt */}
                <TeacherGameControls/>
            </div>
        </div>
    );
};

export default TeacherPanel;