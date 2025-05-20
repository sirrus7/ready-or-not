// src/pages/GameHostPage.tsx
import React from 'react';
// No longer needs useParams here, as AppContext will get it via SessionAwareAppProvider
import TeacherPanel from '../components/TeacherHost/TeacherPanel';
import {useAppContext} from '../context/AppContext'; // To get student window status if needed
import {Users2} from 'lucide-react';


const GameHostPage: React.FC = () => {
    // AppContext handles the session logic based on sessionId passed to AppProvider
    // by SessionAwareAppProvider in App.tsx
    const {state} = useAppContext(); // Optional: for things like isStudentWindowOpen
    console.log("GameHostPage: Rendering. Current AppContext Session ID:", state.currentSessionId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-3 md:p-5">
            <div className="max-w-screen-xl mx-auto">
                <header className="mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            {state.gameStructure?.name || 'Classroom Decision Simulator'}
                        </h1>
                        <p className="text-gray-600 text-xs md:text-sm">
                            Facilitator Control
                            Center {state.currentSessionId && state.currentSessionId !== 'new' ? `(Session: ${state.currentSessionId.substring(0, 8)}...)` : '(New Session Setup)'}
                        </p>
                    </div>
                    {state.isStudentWindowOpen && (
                        <span
                            className="mt-2 sm:mt-0 text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium shadow-sm border border-green-200 flex items-center">
              <Users2 size={14} className="mr-1.5"/> Student Display Active
            </span>
                    )}
                </header>

                <div
                    className="h-[calc(100vh-110px)] md:h-[calc(100vh-130px)]"
                >
                    <TeacherPanel/>
                </div>

            </div>
        </div>
    );
};

export default GameHostPage;