// src/components/TeacherHost/CreateGameWizard/Step2_PrintHandouts.tsx
import React, {useState, useMemo} from 'react';
import {NewGameData} from '../../../types';
import {
    ArrowLeft,
    ArrowRight,
    Download,
    Printer as PrinterIcon,
    ShoppingCart,
    Mail,
    Info
} from 'lucide-react';

interface Step2Props {
    gameData: NewGameData;
    onNext: () => void; // No data needs to be passed from this step
    onPrevious: () => void;
}

const Step2PrintHandouts: React.FC<Step2Props> = ({gameData, onNext, onPrevious}) => {
    const [selectedOption, setSelectedOption] = useState<'order' | 'diy'>('diy');

    const {num_players, num_teams, name: gameName, game_version} = gameData;

    const calculatedMaterials = useMemo(() => {
        // This logic should closely match the original game's handout requirements.
        // The numbers here are examples and should be adjusted based on the actual game rules.
        const teams = num_teams || 1;
        const players = num_players || 2;

        const gameBoards = teams;
        const briefingPackets = players; // 1 per player
        const vocabSheets = teams; // 1 per team
        const rd1PosSheets = teams;
        const teamNameCards = teams; // Usually 1 per team

        // Example: RD-1 Investment cards - often 1 set per team.
        const rd1InvestCards = teams;
        const rd1SummarySheets = teams;

        // RD-2
        const rd2PosSheets = teams;
        const rd2InvestCards = teams;
        const rd2SummarySheets = teams;

        // RD-3
        const rd3InvestCards = teams;
        const rd3SummarySheets = teams;

        // Special Handouts
        const kpiImpactCards = Math.ceil(teams / 2); // Example: 3 for 5-6 teams, maybe based on game events
        const bizGrowthReports = teams;

        return {
            gameBoards, briefingPackets, vocabSheets, rd1PosSheets, teamNameCards,
            rd1InvestCards, rd1SummarySheets,
            rd2PosSheets, rd2InvestCards, rd2SummarySheets,
            rd3InvestCards, rd3SummarySheets,
            kpiImpactCards, bizGrowthReports,
            totalPlayers: players,
            totalTeams: teams,
        };
    }, [num_players, num_teams]);

    const pioneerPressEmailSubject = `Ready or Not ${game_version === '2.0_dd' ? '2.0' : '1.5'} Game Packet Order - "${gameName || 'Untitled Game'}"`;
    const pioneerPressEmailBody = `
Hello Pioneer Press,

Please prepare a game packet order for our upcoming "Ready or Not" session with the following details:

Game Name: ${gameName || 'N/A'}
Game Version: ${game_version === '2.0_dd' ? '2.0 with Double Down' : '1.5 with Double Down'}
Number of Teams: ${num_teams || 'N/A'}
Number of Players: ${num_players || 'N/A'}

We will need materials for approximately ${calculatedMaterials.totalTeams} teams and ${calculatedMaterials.totalPlayers} players.

Please provide a quote and estimated delivery timeline.

Contact Name: [Your Name]
Contact Phone: [Your Phone]
School/Organization: [Your School/Organization]
Shipping Address: 
[Your Street Address]
[City, State, Zip]

Preferred Payment Method: [Credit Card / Check / PO#]

Thank you,
[Your Name]
  `.trim();

    const handleDownloadAllPDFs = () => {
        // In a real application, this would trigger a download of a ZIP file
        // or provide links to individual PDFs hosted elsewhere.
        alert("Placeholder: Download All Printable PDFs functionality to be implemented. This would typically provide links to or download actual PDF files for each handout type.");
        // Example of opening a known PDF link (replace with your actual PDF URL)
        // window.open('path_to_your_master_handout_guide.pdf', '_blank');
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600 mb-1">
                To run the simulation, you'll need physical handouts for each team and player. You have two main options
                to obtain these:
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-700"/>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            The quantities listed in the "DIY Printing" section are dynamically calculated based on the
                            number of players and teams you entered in Step 1.
                        </p>
                    </div>
                </div>
            </div>


            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                    onClick={() => setSelectedOption('order')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all border-2
                        ${selectedOption === 'order' ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-105' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
                >
                    <ShoppingCart size={18} className="inline mr-2"/> Order from Printing Partner
                </button>
                <button
                    onClick={() => setSelectedOption('diy')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all border-2
                        ${selectedOption === 'diy' ? 'bg-green-600 text-white border-green-700 shadow-lg scale-105' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'}`}
                >
                    <PrinterIcon size={18} className="inline mr-2"/> DIY or Print Locally
                </button>
            </div>

            {selectedOption === 'order' && (
                <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm animate-fadeIn">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Order from Pioneer Press (Official
                        Partner)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Pioneer Press offers pre-sorted, professionally printed game packets. This is the easiest way to
                        get high-quality, laminated materials ready for your game.
                        Pricing varies based on the number of players and specific game components.
                    </p>
                    <div className="text-sm text-gray-700 bg-white p-4 rounded-md border border-gray-300">
                        <p className="font-medium text-gray-800 mb-1">What's typically included (per standard packet,
                            scales with game size):</p>
                        <ul className="list-disc list-inside ml-4 mb-3 text-gray-600 text-xs">
                            <li>Laminated Game Boards</li>
                            <li>Pre-sorted Team Folders with all necessary cards and sheets</li>
                            <li>Sticky Arrows, Team Name Tents, and other game pieces</li>
                        </ul>
                        <p className="font-medium text-gray-800 mb-1">Contact for Quote & Order:</p>
                        <p className="text-gray-600">Phone: <a href="tel:5412655214"
                                                               className="text-blue-600 hover:underline">(541)
                            265-5214</a></p>
                        <p className="text-gray-600 mb-3">Email: <a href="mailto:ppinfo@pioneerprinting.org"
                                                                    className="text-blue-600 hover:underline">ppinfo@pioneerprinting.org</a>
                        </p>
                        <a
                            href={`mailto:ppinfo@pioneerprinting.org?subject=${encodeURIComponent(pioneerPressEmailSubject)}&body=${encodeURIComponent(pioneerPressEmailBody)}`}
                            className="inline-flex items-center gap-2 bg-blue-500 text-white text-xs font-semibold py-2.5 px-4 rounded-md hover:bg-blue-600 transition-colors shadow hover:shadow-md"
                        >
                            <Mail size={15}/> Compose Order Email
                        </a>
                        <p className="mt-3 text-xs text-gray-500">Mention you're using the "Ready or Not" simulation and
                            provide your game setup details (players, teams) from Step 1.</p>
                    </div>
                </div>
            )}

            {selectedOption === 'diy' && (
                <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm animate-fadeIn">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">DIY Printing Instructions</h3>
                    <p className="text-sm text-gray-600 mb-1">
                        If you prefer to print materials yourself, here's a list of components.
                        Quantities are based on <strong
                        className="text-slate-700">{calculatedMaterials.totalPlayers} players</strong> and <strong
                        className="text-slate-700">{calculatedMaterials.totalTeams} teams</strong>.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                        All materials should be printed on standard 8.5" x 11" paper unless otherwise noted. Refer to
                        the "How To Host Guide" PDF for detailed assembly instructions.
                    </p>
                    <div
                        className="text-sm text-gray-700 bg-white p-4 rounded-md border border-gray-300 max-h-96 overflow-y-auto scrollbar-thin">
                        <h4 className="font-medium text-gray-800 mb-2">Core Game Components:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4 mb-3">
                            <li>Game Boards: {calculatedMaterials.gameBoards} (Recommend 11x17 or 12x18, color,
                                laminated if possible)
                            </li>
                            <li>Briefing Packets: {calculatedMaterials.briefingPackets} (1 per player, double-sided,
                                color)
                            </li>
                            <li>Vocabulary Definitions: {calculatedMaterials.vocabSheets} (1 per team, double-sided
                                B&W)
                            </li>
                            <li>Team Name Cards: {calculatedMaterials.teamNameCards} (1 per team, heavy card stock,
                                color)
                            </li>
                        </ul>
                        <h4 className="font-medium text-gray-800 mb-2 mt-3">Round 1 Materials:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4 mb-3">
                            <li>RD-1 Position Sheets: {calculatedMaterials.rd1PosSheets} sets (1 per team, single-sided,
                                color)
                            </li>
                            <li>RD-1 Investment Cards: {calculatedMaterials.rd1InvestCards} sets (1 per team,
                                single-sided, color)
                            </li>
                            <li>RD-1 Team Summary Sheets: {calculatedMaterials.rd1SummarySheets} (1 per team,
                                single-sided, color)
                            </li>
                        </ul>
                        {/* Add placeholders for RD-2 and RD-3 materials similarly */}
                        <h4 className="font-medium text-gray-800 mb-2 mt-3">Special Handouts:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4">
                            <li>Permanent KPI Impact Cards: {calculatedMaterials.kpiImpactCards} (Print file multiple
                                times as needed, single-sided, color)
                            </li>
                            <li>Biz Growth Strategy Reports: {calculatedMaterials.bizGrowthReports} (1 per team,
                                single-sided, B&W)
                            </li>
                        </ul>
                    </div>
                    <button
                        onClick={handleDownloadAllPDFs}
                        className="mt-4 inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold py-2.5 px-4 rounded-md hover:bg-green-700 transition-colors shadow hover:shadow-md"
                    >
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
                    onClick={onNext} // No data is passed from this step, gameData already has necessary info
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Team Setup <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step2PrintHandouts;