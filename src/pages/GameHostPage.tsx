// src/pages/GameHostPage.tsx
import React from 'react';
import TeacherPanel from '../components/TeacherHost/TeacherPanel';
import {useAppContext} from '../context/AppContext'; // To get session status for conditional rendering
import {Cog, ServerCrash, Users2} from 'lucide-react'; // Icons for potential dashboard elements

const GameHostPage: React.FC = () => {
    const {state} = useAppContext();
    const {currentSessionId, gameStructure, error, isLoading} = state;

    // This page is the main view when a session is active or being created.
    // The actual game hosting UI is within TeacherPanel.

    if (isLoading && !currentSessionId) { // Initial loading before session ID is known or new one created
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6"></div>
                <h1 className="text-2xl font-semibold text-gray-700">Loading Classroom Simulator...</h1>
                <p className="text-gray-500">Please wait a moment.</p>
            </div>
        );
    }

    if (error && (!currentSessionId || currentSessionId === 'new')) { // Error during initial session load/creation
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-red-100 via-red-200 to-red-300 flex flex-col items-center justify-center p-4 text-center">
                <ServerCrash size={64} className="text-red-500 mb-4"/>
                <h1 className="text-3xl font-bold text-red-700 mb-2">Oops! Session Error</h1>
                <p className="text-red-600 mb-6 max-w-md">{error}</p>
                <a
                    href="/classroom/new" // Provide a clear way to try again or start new
                    className="bg-blue-600 text-white py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm font-medium"
                >
                    Try Starting a New Game
                </a>
            </div>
        );
    }


    // If sessionId is 'new' but gameStructure hasn't loaded, or user isn't ready for session creation in AppContext
    // This can happen briefly during the redirect from /login or if /classroom/new is hit directly
    if (currentSessionId === 'new' && !gameStructure && !error) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex flex-col items-center justify-center p-4">
                <Cog size={60} className="text-blue-500 mb-6 animate-spin-slow"/>
                <h1 className="text-2xl font-semibold text-gray-700">Preparing Your New Game Session...</h1>
                <p className="text-gray-500">This should only take a moment.</p>
            </div>
        );
    }


    // Main game hosting view
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-3 md:p-5">
            <div className="max-w-screen-xl mx-auto"> {/* Wider for more content */}
                <header className="mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            {gameStructure?.name || 'Classroom Decision Simulator'}
                        </h1>
                        <p className="text-gray-600 text-xs md:text-sm">
                            Facilitator Control Center
                        </p>
                    </div>
                    {/* Optional: Could add user info or logout button here from AuthContext */}
                    {state.isStudentWindowOpen && (
                        <span
                            className="mt-2 sm:mt-0 text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-green-200 flex items-center">
              <Users2 size={14} className="mr-1.5"/> Student Display Active
            </span>
                    )}
                </header>

                {/*
          The TeacherPanel now encapsulates the main game running interface.
          The student display preview is removed from here as the teacher will use the separate window.
          This simplifies GameHostPage to be primarily a container for the TeacherPanel during an active game.
        */}
                <div
                    className="h-[calc(100vh-110px)] md:h-[calc(100vh-130px)]" // Adjusted height calculation
                >
                    <TeacherPanel/>
                </div>

            </div>
        </div>
    );
};

export default GameHostPage;