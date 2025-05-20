// src/components/TeacherHost/CreateGameWizard/Step5_Finalize.tsx
import React from 'react';
import {NewGameData} from '../../../types'; // Ensure correct path to types
import {ArrowLeft, Rocket, CheckCircle} from 'lucide-react';

interface Step5Props {
    gameData: NewGameData;
    onFinalize: () => void;
    onPrevious: () => void;
    isSubmitting: boolean;
}

const Step5Finalize: React.FC<Step5Props> = ({gameData, onFinalize, onPrevious, isSubmitting}) => {
    return (
        <div className="space-y-6 text-gray-700">
            <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
                <h3 className="text-2xl font-bold text-green-700 mb-2">Ready to Launch!</h3>
                <p className="text-gray-600">
                    You've configured your "Ready or Not" game session. Please review the details below.
                </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow">
                <h4 className="font-semibold text-gray-800 mb-3 text-lg">Game Summary:</h4>
                <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                        <dt className="font-medium text-gray-500">Game Name:</dt>
                        <dd className="col-span-2 text-gray-800 font-semibold">{gameData.name || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                        <dt className="font-medium text-gray-500">Version:</dt>
                        <dd className="col-span-2 text-gray-800">{gameData.game_version === '2.0_dd' ? '2.0 with Double Down' : '1.5 with Double Down'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                        <dt className="font-medium text-gray-500">Class/Group:</dt>
                        <dd className="col-span-2 text-gray-800">{gameData.class_name || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                        <dt className="font-medium text-gray-500">Grade Level:</dt>
                        <dd className="col-span-2 text-gray-800">{gameData.grade_level}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                        <dt className="font-medium text-gray-500">Players:</dt>
                        <dd className="col-span-2 text-gray-800">{gameData.num_players}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5">
                        <dt className="font-medium text-gray-500">Teams:</dt>
                        <dd className="col-span-2 text-gray-800">{gameData.num_teams}</dd>
                    </div>
                </dl>
            </div>

            <p className="text-xs text-gray-500 text-center">
                Clicking "Finalize & Start Game" will create the session and take you to the game control panel.
                Team passcodes will be finalized and can be distributed from the control panel.
            </p>

            <div className="mt-8 flex justify-between">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 disabled:opacity-50"
                >
                    <ArrowLeft size={18}/> Previous
                </button>
                <button
                    type="button"
                    onClick={() => {
                        console.log("Step5Finalize: Finalize button clicked"); // ADD THIS LOG
                        onFinalize();
                    }}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70 min-w-[200px]"
                >
                    {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <Rocket size={20}/>
                    )}
                    <span className="ml-1">{isSubmitting ? 'Finalizing...' : 'Finalize & Start Game'}</span>
                </button>
            </div>
        </div>
    );
};

export default Step5Finalize;