// src/components/Host/CreateGameWizard/Step3_RoomSetup.tsx
import React from 'react';
import {NewGameData} from '@shared/types/common.ts';
import {ArrowLeft, ArrowRight, MonitorPlay, Download, Info, Tv2, LayoutGrid} from 'lucide-react';

interface Step4Props {
    gameData: NewGameData; // May be used for dynamic instructions based on player/team count later
    onNext: () => void;
    onPrevious: () => void;
}

const RoomSetupStep: React.FC<Step4Props> = ({gameData, onNext, onPrevious}) => {
    // Placeholder for the actual PDF link. This should be an asset or a configurable URL.
    const howToHostGuideUrl = "/path-to-your/how-to-host-guide.pdf"; // REPLACE THIS

    return (
        <div className="space-y-6 text-gray-700">
            <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0 pt-0.5">
                        <Info className="h-5 w-5 text-sky-700"/>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-sky-700">
                            Proper room and screen setup is key for a smooth simulation. This step outlines the basics.
                            For detailed diagrams, table layouts for different team sizes
                            ({gameData.num_teams} teams, {gameData.num_players} players), and troubleshooting, please
                            refer to the full "How To Host Guide".
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3 text-lg flex items-center">
                    <MonitorPlay size={22} className="mr-2.5 text-blue-600 flex-shrink-0"/> Screen Setup Requirements
                </h4>
                <ul className="list-disc list-inside space-y-2 text-sm pl-2">
                    <li>
                        <strong className="font-medium">Facilitator Screen (Your Computer):</strong> This is your main
                        control panel. From here, you will:
                        <ul className="list-circle list-inside ml-6 mt-1 text-xs text-gray-600 space-y-0.5">
                            <li>Navigate through game phases and presentation slides.</li>
                            <li>Monitor team submissions and decisions in real-time.</li>
                            <li>Control video playback and display leaderboards.</li>
                        </ul>
                    </li>
                    <li className="mt-1.5">
                        <strong className="font-medium">Presentation Screen (Projector or Large Monitor):</strong> This
                        screen is for all students to view. It will mirror:
                        <ul className="list-circle list-inside ml-6 mt-1 text-xs text-gray-600 space-y-0.5">
                            <li>Instructional slides and introductory videos for each phase.</li>
                            <li>Timers for decision-making periods.</li>
                            <li>Consequence and Investment Payoff information.</li>
                            <li>End-of-round KPIs and Leaderboards.</li>
                        </ul>
                        <p className="text-xs text-gray-500 mt-1">Launch this via the "Launch Student Display" button on
                            your control panel once the game starts.</p>
                    </li>
                    <li className="mt-1.5">
                        <strong className="font-medium">Student Device Access:</strong> Each team will need at least one
                        device (laptop, tablet, or smartphone) to:
                        <ul className="list-circle list-inside ml-6 mt-1 text-xs text-gray-600 space-y-0.5">
                            <li>Log in with their team name and passcode.</li>
                            <li>View their team-specific KPIs.</li>
                            <li>Make investment and choice decisions during interactive phases.</li>
                        </ul>
                    </li>
                </ul>
                <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-xs text-gray-600 flex items-center"><Tv2 size={14}
                                                                                className="mr-2 text-gray-500 flex-shrink-0"/>Ensure
                        your Presentation Screen is visible to all participants and that your Facilitator Screen is
                        positioned for your easy control.</p>
                </div>
            </div>

            <div className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3 text-lg flex items-center">
                    <LayoutGrid size={22} className="mr-2.5 text-green-600 flex-shrink-0"/> Physical Room & Table Setup
                </h4>
                <p className="text-sm mb-3">
                    Arrange student teams at tables or designated areas. The "How To Host Guide" (referenced in the
                    "Print Handouts" step) provides visual examples of table setups for various team sizes (e.g.,
                    8-player teams, 4-player teams, etc.) showing optimal placement of game boards and handouts.
                </p>
                <p className="text-sm mb-2">Typically, each team's table will need:</p>
                <ul className="list-disc list-inside space-y-1.5 text-sm pl-2">
                    <li>1x Physical Game Board (with sticky arrows if used).</li>
                    <li>1x Team Name Tent/Card.</li>
                    <li>Briefing Packets (1 per player).</li>
                    <li>Position Sheets (as per game rules, usually 1-2 per player).</li>
                    <li>Access to their team's decision-making device.</li>
                </ul>
                <div className="mt-3 text-center">
                    <img
                        src="https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_003.jpg?alt=media" // Example image
                        alt="Example Classroom or Table Setup"
                        className="my-3 rounded-md border border-gray-300 shadow-sm max-w-full sm:max-w-md md:max-w-lg mx-auto"
                    />
                </div>
            </div>

            <div className="text-center mt-4">
                <a
                    href={howToHostGuideUrl}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm underline focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 p-1 rounded"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Download size={16}/> View Full "How To Host Guide" PDF
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
                    onClick={onNext}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Print Handouts <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default RoomSetupStep;