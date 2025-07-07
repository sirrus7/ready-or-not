// src/views/host/components/CreateGame/RoomSetupStep.tsx
import React, {useState, useEffect} from 'react';
import {RoomSetupStepProps} from './types';
import {
    ArrowLeft,
    ArrowRight,
    MonitorPlay,
    Download,
    Info,
    Tv2,
    LayoutGrid,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import {mediaManager} from '@shared/services/MediaManager';

const RoomSetupStep: React.FC<RoomSetupStepProps> = ({
                                                         gameData,
                                                         onNext,
                                                         onPrevious,
                                                     }) => {
    // State for collapsible sections
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        screenSetup: true, // Start with screen setup expanded as it's most critical
        roomSetup: false,
    });

    // State for the setup image URL
    const [setupImageUrl, setSetupImageUrl] = useState<string>('');

    // Toggle section expansion
    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Load the setup image from Supabase when component mounts
    useEffect(() => {
        const loadSetupImage = async () => {
            try {
                const url = await mediaManager.getSignedUrl('Slide_003.jpg');
                setSetupImageUrl(url);
            } catch (error) {
                console.error('Failed to load setup image:', error);
            }
        };

        loadSetupImage();
    }, []);

    // Path to the How To Host Guide PDF
    const howToHostGuideUrl = "/game-materials/core/how-to-host-guide.pdf";

    return (
        <div className="space-y-6 text-gray-700">
            <div className="bg-game-cream-100 border-l-4 border-game-orange-500 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0 pt-0.5">
                        <Info className="h-5 w-5 text-game-brown-700"/>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-game-brown-700">
                            Proper room and screen setup is key for a smooth simulation. This step outlines the basics.
                            For detailed diagrams, table layouts for different team sizes
                            ({gameData.num_teams} teams, {gameData.num_players} players), and troubleshooting, please
                            refer to the full "How To Host Guide".
                        </p>
                    </div>
                </div>
            </div>

            {/* Screen Setup Requirements Section */}
            <div className="mb-4">
                <button
                    onClick={() => toggleSection('screenSetup')}
                    className="w-full flex items-center justify-between p-3 bg-game-orange-50 hover:bg-game-orange-100 rounded-lg border border-game-orange-200 transition-colors"
                >
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-game-orange-500 rounded-full mr-3"></div>
                        <MonitorPlay size={18} className="mr-2 text-game-orange-600"/>
                        <h4 className="font-medium text-gray-800 text-sm">Screen Setup Requirements</h4>
                        <span className="ml-2 text-xs bg-game-orange-100 text-game-orange-700 px-2 py-1 rounded">Critical</span>
                    </div>
                    {expandedSections.screenSetup ?
                        <ChevronDown size={18} className="text-gray-500"/> :
                        <ChevronRight size={18} className="text-gray-500"/>
                    }
                </button>

                {expandedSections.screenSetup && (
                    <div className="mt-3 p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <ul className="list-disc list-inside space-y-2 text-sm pl-2">
                            <li>
                                <strong className="font-medium">Host Screen (Your Computer):</strong> This is your main
                                control panel. From here, you will:
                                <ul className="list-circle list-inside ml-6 mt-1 text-xs text-gray-600 space-y-0.5">
                                    <li>Navigate through game phases and presentation slides.</li>
                                    <li>Monitor team submissions and decisions in real-time.</li>
                                    <li>Control video playback and display leaderboards.</li>
                                </ul>
                            </li>
                            <li className="mt-1.5">
                                <strong className="font-medium">Presentation Screen (Projector or Large
                                    Monitor):</strong> This
                                screen is for all teams to view. It will mirror:
                                <ul className="list-circle list-inside ml-6 mt-1 text-xs text-gray-600 space-y-0.5">
                                    <li>Instructional slides and introductory videos for each phase.</li>
                                    <li>Timers for decision-making periods.</li>
                                    <li>Consequence and Investment Payoff information.</li>
                                    <li>End-of-round KPIs and Leaderboards.</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-1">Launch this via the "Launch Presentation
                                    Display"
                                    button on your control panel once the game starts.</p>
                            </li>
                            <li className="mt-1.5">
                                <strong className="font-medium">Team Device Access:</strong> Each team will need at
                                least one
                                device (laptop, tablet, or smartphone) to:
                                <ul className="list-circle list-inside ml-6 mt-1 text-xs text-gray-600 space-y-0.5">
                                    <li>Log in with their team name and passcode.</li>
                                    <li>View their team-specific KPIs.</li>
                                    <li>Make investment and choice decisions during interactive phases.</li>
                                </ul>
                            </li>
                        </ul>
                        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                            <p className="text-xs text-gray-600 flex items-center">
                                <Tv2 size={14} className="mr-2 text-gray-500 flex-shrink-0"/>
                                Ensure your Presentation Screen is visible to all participants and that your Host Screen
                                is
                                positioned for your easy control.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Physical Room & Table Setup Section */}
            <div className="mb-4">
                <button
                    onClick={() => toggleSection('roomSetup')}
                    className="w-full flex items-center justify-between p-3 bg-game-orange-50 hover:bg-game-orange-100 rounded-lg border border-game-orange-200 transition-colors"
                >
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-game-orange-500 rounded-full mr-3"></div>
                        <LayoutGrid size={18} className="mr-2 text-game-orange-600"/>
                        <h4 className="font-medium text-gray-800 text-sm">Physical Room & Table Setup</h4>
                        <span className="ml-2 text-xs bg-game-orange-100 text-game-orange-700 px-2 py-1 rounded">Layout Guide</span>
                    </div>
                    {expandedSections.roomSetup ?
                        <ChevronDown size={18} className="text-gray-500"/> :
                        <ChevronRight size={18} className="text-gray-500"/>
                    }
                </button>

                {expandedSections.roomSetup && (
                    <div className="mt-3 p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <p className="text-sm mb-3">
                            Arrange teams at tables or designated areas. The "How To Host Guide" (referenced in the
                            "Print Handouts" step) provides visual examples of table setups for various team sizes
                            (e.g.,
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
                            {setupImageUrl ? (
                                <img
                                    src={setupImageUrl}
                                    alt="Example Game or Table Setup"
                                    className="my-3 rounded-md border border-gray-300 shadow-sm max-w-full sm:max-w-md md:max-w-lg mx-auto"
                                />
                            ) : (
                                <div
                                    className="my-3 h-48 bg-gray-100 rounded-md border border-gray-300 shadow-sm max-w-full sm:max-w-md md:max-w-lg mx-auto flex items-center justify-center">
                                    <div className="text-gray-500 text-sm">Loading setup example...</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* How To Host Guide Download */}
            <div className="text-center mt-4">
                <a
                    href={howToHostGuideUrl}
                    className="inline-flex items-center gap-2 text-game-orange-600 hover:text-game-orange-800 font-semibold text-sm underline focus:outline-none focus:ring-2 focus:ring-game-orange-400 focus:ring-offset-2 p-1 rounded"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Download size={16}/> View Full "How To Host Guide" PDF
                </a>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
                <button
                    type="button"
                    onClick={onPrevious}
                    className="flex items-center gap-2 text-gray-700 hover:text-game-orange-600 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
                >
                    <ArrowLeft size={18}/> Previous
                </button>
                <button
                    type="button"
                    onClick={() => onNext()}
                    className="flex items-center gap-2 bg-game-orange-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-game-orange-700 transition-colors shadow-md"
                >
                    Next: Print Handouts <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default RoomSetupStep;
