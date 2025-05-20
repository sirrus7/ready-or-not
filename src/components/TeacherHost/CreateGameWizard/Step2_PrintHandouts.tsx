// src/components/TeacherHost/CreateGameWizard/Step2_PrintHandouts.tsx
import React, {useState} from 'react';
import {NewGameData} from '../../../pages/CreateGamePage';
import {ArrowLeft, ArrowRight, Download, Printer as PrinterIcon, ShoppingCart, Mail} from 'lucide-react';

interface Step2Props {
    gameData: NewGameData;
    onNext: (dataFromStep?: Partial<NewGameData>) => void;
    onPrevious: () => void;
}

const Step2PrintHandouts: React.FC<Step2Props> = ({gameData, onNext, onPrevious}) => {
    const [selectedOption, setSelectedOption] = useState<'order' | 'diy'>('diy');

    // Placeholder for dynamic handout quantities based on gameData.num_teams and gameData.num_players
    // This would involve more complex logic to match the demo's detailed breakdown.
    const getDIYInstructions = () => {
        const teams = gameData.num_teams || 1;
        const players = gameData.num_players || 2;
        // Example:
        const gameBoards = teams;
        const briefingPackets = players;
        // ... and so on for all materials listed in the demo's DIY section.

        return (
            <>
                <p className="mb-2 text-sm">Based on {players} players and {teams} teams:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>{gameBoards}x Game Boards (12x18 or 11x17, Color, 1 per team)</li>
                    <li>{briefingPackets}x Briefing Packets (Double-sided, color, 1 staple, 1 per player)</li>
                    <li>{teams}x Sets of Vocabulary Definitions (Double-sided B&W, 1 staple, 1 per team)</li>
                    <li>{teams}x Sets of RD-1 Position Sheets (Single-sided, Color, No staple, 1 set per team)</li>
                    <li>{teams}x Sets of Team Name Cards (Print first 5 pages, Heavy Card Stock, Single-sided, color, 1
                        per team)
                    </li>
                    <li className="font-semibold mt-2">Round 1 Folder:</li>
                    <li>{teams}x Sets of RD-1 Investment Cards (Single-sided, color, 1 set per team)</li>
                    <li>{teams}x RD-1 Team Summary Sheets (Single-sided, color, 1 per team)</li>
                    <li className="font-semibold mt-2">Round 2 Folder:</li>
                    <li>... (Similar for RD-2 materials)</li>
                    <li className="font-semibold mt-2">Round 3 Folder:</li>
                    <li>... (Similar for RD-3 materials)</li>
                    <li className="font-semibold mt-2">Special Handouts Folder:</li>
                    <li>3x Copies of Permanent KPI Impact card file (Single-sided, color)</li>
                    <li>{teams}x Biz Growth Strategy Reports (Single-sided, B&W, 1 per team)</li>
                </ul>
                <p className="mt-3 text-xs text-gray-500">Note: Print everything on 8.5x11" unless indicated.
                    Instructions adjust based on your game setup.</p>
            </>
        );
    };

    const pioneerPressEmailBody = `Subject: Ready or Not ${gameData.game_version === '2.0_dd' ? '2.0' : '1.5'} Game Packet Order - ${gameData.name}\n
Body:
Please prepare a game packet order for our upcoming session.
Game Name: ${gameData.name}
Game Version: ${gameData.game_version}
Number of Teams: ${gameData.num_teams}
Number of Players: ${gameData.num_players}

Contact Name: [Your Name]
Contact Phone: [Your Phone]
Shipping Address: [Your Address]

Please confirm pricing and estimated delivery. We prefer to pay by [Credit Card/Check].

Thank you!`;


    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600">
                You have two options for getting the handouts required for the game.
                The materials needed will adjust based on the number of players and teams from Step 1.
            </p>

            <div className="flex space-x-4 mb-6 border-b pb-4">
                <button
                    onClick={() => setSelectedOption('order')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all
                        ${selectedOption === 'order' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    <ShoppingCart size={18} className="inline mr-2"/> Order from Printing Partner
                </button>
                <button
                    onClick={() => setSelectedOption('diy')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all
                        ${selectedOption === 'diy' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    <PrinterIcon size={18} className="inline mr-2"/> DIY or Order from Own Printer
                </button>
            </div>

            {selectedOption === 'order' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-700 mb-2">Order from Pioneer Press (Fast, Easy &
                        Pre-Sorted)</h3>
                    <p className="text-sm text-gray-700 mb-3">
                        One standard packet includes all materials needed for up to 5 Teams & 40 Players.
                        (Pricing and packet contents adjust for larger games - this is a simplified example).
                    </p>
                    <div className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-300">
                        <p className="font-semibold mb-1">Example: ONE STANDARD PACKET (adjusts based on your
                            player/team count)</p>
                        <ul className="list-disc list-inside ml-4 mb-2">
                            <li>Professionally printed, color, laminated game boards.</li>
                            <li>Sticky arrows for game boards.</li>
                            <li>Handouts pre-sorted into files, labeled folders for players.</li>
                        </ul>
                        <p className="font-semibold mb-1">CONTACT PIONEER PRESS:</p>
                        <p>Phone: (541) 265-5214</p>
                        <p className="mb-2">Email: <a href="mailto:ppinfo@pioneerprinting.org"
                                                      className="text-blue-600 hover:underline">ppinfo@pioneerprinting.org</a>
                        </p>
                        <a
                            href={`mailto:ppinfo@pioneerprinting.org?subject=${encodeURIComponent(`Ready or Not ${gameData.game_version === '2.0_dd' ? '2.0' : '1.5'} Game Packet Order - ${gameData.name}`)}&body=${encodeURIComponent(pioneerPressEmailBody)}`}
                            className="inline-flex items-center gap-2 bg-blue-500 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-blue-600 transition-colors"
                        >
                            <Mail size={14}/> Email Order Details
                        </a>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Details like pricing per packet would be confirmed with
                        Pioneer Press.</p>
                </div>
            )}

            {selectedOption === 'diy' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-700 mb-3">DIY Printing Instructions</h3>
                    <div className="bg-white p-3 rounded border border-gray-300">
                        {getDIYInstructions()}
                    </div>
                    <button
                        className="mt-4 flex items-center gap-2 bg-green-500 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-green-600 transition-colors">
                        <Download size={16}/> Download All Printable PDFs (Placeholder)
                    </button>
                </div>
            )}

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
                    onClick={() => onNext()} // No specific data from this step, gameData already has player/team count
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Team Setup <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step2PrintHandouts;