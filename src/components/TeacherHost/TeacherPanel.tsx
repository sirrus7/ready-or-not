// src/components/TeacherHost/TeacherPanel.tsx
import React from 'react';
import GameJourneyMap from './GameJourneyMap';
import TeacherGameControls from './TeacherGameControls'; // New controls
import TeamSubmissionTable from './TeamSubmissionTable'; // New table
import {useAppContext} from '../../context/AppContext';
import {Layers, Info} from 'lucide-react';

interface TeacherPanelProps {
    // onOpenStudentDisplay is now handled within TeacherGameControls if it directly calls the util
    // Or, if GameHostPage still needs to manage the window object, pass it down.
    // For simplicity now, let's assume TeacherGameControls will call the window util directly.
}

const TeacherPanel: React.FC<TeacherPanelProps> = () => {
    const {state, currentPhase} = useAppContext();
    const {gameStructure, currentSessionId} = state;

    const isInteractiveStudentPhaseActive = currentPhase?.is_interactive_student_phase || false;

    if (!gameStructure || !currentSessionId || currentSessionId === 'new') {
        return (
            <div className="bg-gray-100 p-6 rounded-lg shadow text-center text-gray-600">
                <Info size={32} className="mx-auto mb-3 text-blue-500"/>
                <p className="font-semibold">No active game session loaded.</p>
                <p className="text-sm">Please start a new game or load an existing one.</p>
                {/* Optionally, a button to navigate to /classroom/new could be here if not handled by router default */}
            </div>
        );
    }

    return (
        <div
            className="bg-gray-100 p-4 md:p-6 rounded-xl shadow-lg border border-gray-200 space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-300">
                <div className="flex items-center">
                    <Layers className="mr-3 text-blue-600" size={28}/>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                            Teacher Control Panel
                        </h2>
                        <p className="text-xs text-gray-500">Session ID: {currentSessionId}</p>
                    </div>
                </div>
                {/* Game Version could be displayed here if needed */}
                {/* <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-lg shadow-sm border">
          {gameStructure.name}
        </div> */}
            </div>

            {/* Game Journey Map takes up available space, might need to adjust flex properties if content below it is too squished */}
            <div
                className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 rounded-lg">
                <GameJourneyMap/>
            </div>

            {/* Team Submission Table - Conditional */}
            {isInteractiveStudentPhaseActive && (
                <div className="mt-0 flex-shrink-0"> {/* flex-shrink-0 prevents it from shrinking if map is too tall */}
                    <TeamSubmissionTable/>
                </div>
            )}

            {/* Controls at the bottom */}
            <div className="mt-auto flex-shrink-0 pt-4 border-t border-gray-300">
                {/* Pass any necessary props to TeacherGameControls if GameHostPage isn't handling student window directly */}
                <TeacherGameControls/>
            </div>
        </div>
    );
};

export default TeacherPanel;