// src/components/TeacherHost/CreateGameWizard/Step4_RoomSetup.tsx
import React from 'react';
import {NewGameData} from '../../../pages/CreateGamePage';
import {ArrowLeft, ArrowRight, Download, MonitorPlay, Rows} from 'lucide-react';

interface Step4Props {
    gameData: NewGameData; // Might be used for conditional instructions later
    onNext: (dataFromStep?: Partial<NewGameData>) => void;
    onPrevious: () => void;
}

const Step4RoomSetup: React.FC<Step4Props> = ({onNext, onPrevious}) => {
    // This component mostly displays static instructional content from the demo.
    // The "How To Host Guide" PDF link would be useful here.

    return (
        <div className="space-y-6 text-gray-700">
            <p className="text-sm">
                This step provides guidance on setting up your physical classroom and the necessary digital screens for
                the game.
                Refer to the "How To Host Guide" PDF for detailed diagrams and instructions.
            </p>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center"><MonitorPlay size={20}
                                                                                                className="mr-2 text-blue-600"/> Screen
                    Setup</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                        <strong>Game Host Screen (Your Computer):</strong> This is your main control panel.
                        You'll navigate game phases, monitor team submissions, and control the presentation.
                    </li>
                    <li>
                        <strong>Presentation Screen (Projector/Large Monitor):</strong> This screen is for students to
                        view.
                        It will mirror the instructional slides, videos, timers, consequences, payoffs, and leaderboards
                        you present.
                        Launch this using the "Launch Student Display" button in your controls.
                    </li>
                    <li>Ensure you can work from both your computer screen and view the presentation screen throughout
                        the game.
                    </li>
                </ul>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center"><Rows size={20}
                                                                                         className="mr-2 text-green-600"/> Table
                    Setup</h4>
                <p className="text-sm mb-2">Arrange student teams at tables. Each table typically needs:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>1x Game Board with 4 Sticky Arrows.</li>
                    <li>1x Team Name Tent.</li>
                    <li>1x Briefing Packet per player.</li>
                    <li>1-2x Position Sheets per player (depending on team size and game version).</li>
                </ul>
                <p className="text-sm mt-2">
                    The "How To Host Guide" (referenced in "Print Handouts" step) contains visual examples of table
                    setups for different player counts (e.g., 8-player, 7-player teams).
                </p>
                <img
                    src="https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_002.jpg?alt=media" // Example table setup image
                    alt="Example Table Setup"
                    className="mt-3 rounded-md border border-gray-300 shadow-sm max-w-sm mx-auto"
                />
            </div>

            <div className="text-center mt-4">
                <a
                    href="#" // Replace with actual link to "How To Host Guide" PDF
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Download size={16}/> View Full "How To Host Guide" PDF (Placeholder Link)
                </a>
            </div>


            <div className="mt-8 flex justify-between">
                <button
                    type="button"
                    onClick={onPrevious}
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
                >
                    <ArrowLeft size={18}/> Previous
                </button>
                <button
                    type="button"
                    onClick={() => onNext()}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Finalize & Start <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step4RoomSetup;