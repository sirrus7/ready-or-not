// src/components/TeacherHost/CreateGameWizard/Step4_PrintHandouts.tsx
import React, {useState, useMemo} from 'react';
import {NewGameData} from '../../../types'; // Ensure path is correct
import { generateTeamNameCardsPDF } from '../../../utils/generateTeamNameCards';
import {ArrowLeft, ArrowRight, Download, Printer as PrinterIcon, ShoppingCart, Mail, Info} from 'lucide-react';

interface Step2Props {
    gameData: NewGameData;
    onNext: () => void;
    onPrevious: () => void;
}

const Step2PrintHandouts: React.FC<Step2Props> = ({gameData, onNext, onPrevious}) => {
    const [selectedOption, setSelectedOption] = useState<'order' | 'diy'>('diy');

    const {num_players, num_teams, name: gameName, game_version} = gameData;

    const calculatedMaterials = useMemo(() => {
        const teams = num_teams > 0 ? num_teams : 1; // Default to 1 team if 0
        const players = num_players > 0 ? num_players : 2; // Default to 2 players if 0

        // These are example calculations and should match your game's actual needs
        const gameBoards = teams;
        const briefingPackets = players;
        const vocabSheets = teams;
        const rd1PosSheets = teams;
        const teamNameCards = teams;
        const rd1InvestCards = teams;
        const rd1SummarySheets = teams;
        const rd2PosSheets = teams;
        const rd2InvestCards = teams;
        const rd2SummarySheets = teams;
        const rd3InvestCards = teams;
        const rd3SummarySheets = teams;
        const kpiImpactCards = Math.ceil(teams * 0.6); // Example: ~3 for 5 teams
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
        // Generate team name cards
        generateTeamNameCardsPDF(gameData.teams_config);

        // Open other static PDFs
        const staticPdfs = [
            '/game-materials/core/game-board.pdf',
            '/game-materials/core/briefing-packet.pdf',
            '/game-materials/core/vocabulary-definitions.pdf',
            '/game-materials/core/permanent-kpi-impact-cards.pdf',
            '/game-materials/core/biz-growth-strategy-report.pdf',
            '/game-materials/round-1/rd1-position-sheet.pdf',
            '/game-materials/round-1/rd1-investment-cards.pdf',
            '/game-materials/round-1/rd1-team-summary-sheet.pdf',
            '/game-materials/round-2/rd2-position-sheet.pdf',
            '/game-materials/round-2/rd2-investment-cards.pdf',
            '/game-materials/round-2/rd2-team-summary-sheet.pdf',
            '/game-materials/round-3/rd3-investment-cards.pdf',
            '/game-materials/round-3/rd3-team-summary-sheet.pdf'
        ];

        // Open each PDF with a delay to avoid popup blockers
        staticPdfs.forEach((pdf, index) => {
            setTimeout(() => {
                window.open(pdf, '_blank');
            }, (index + 1) * 500); // Start after team cards
        });
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600 mb-1">
                This simulation requires physical handouts for player interaction. Choose your preferred method to
                obtain them:
            </p>
            <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-md mb-6">
                <div className="flex">
                    <div className="flex-shrink-0 pt-0.5">
                        <Info className="h-5 w-5 text-sky-700"/>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-sky-700">
                            The "DIY Printing" section below dynamically lists material quantities based on the <strong
                            className="font-medium">{gameData.num_players} players</strong> and <strong
                            className="font-medium">{gameData.num_teams} teams</strong> you specified in Step 1.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                    onClick={() => setSelectedOption('order')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all border-2 flex items-center justify-center gap-2
                        ${selectedOption === 'order' ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-105' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
                >
                    <ShoppingCart size={18}/> Order from Printing Partner
                </button>
                <button
                    onClick={() => setSelectedOption('diy')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all border-2 flex items-center justify-center gap-2
                        ${selectedOption === 'diy' ? 'bg-green-600 text-white border-green-700 shadow-lg scale-105' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'}`}
                >
                    <PrinterIcon size={18}/> DIY or Print Locally
                </button>
            </div>

            {selectedOption === 'order' && (
                <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm animate-fadeIn">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Order from Pioneer Press (Official
                        Partner)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Pioneer Press offers pre-sorted, professionally printed game packets. This is often the easiest
                        way to get high-quality, laminated materials ready for your game. Pricing varies based on game
                        size and specific components chosen.
                    </p>
                    <div className="text-sm text-gray-700 bg-white p-4 rounded-md border border-gray-300">
                        <p className="font-medium text-gray-800 mb-1">Typical Packet Contents (scales with game
                            size):</p>
                        <ul className="list-disc list-inside ml-4 mb-3 text-gray-600 text-xs space-y-0.5">
                            <li>Professionally printed & laminated Game Boards</li>
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
                            <Mail size={15}/> Compose Order Email (Pre-filled)
                        </a>
                        <p className="mt-3 text-xs text-gray-500">Mention your game setup details (players, teams) from
                            Step 1 when contacting.</p>
                    </div>
                </div>
            )}

            {selectedOption === 'diy' && (
                <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm animate-fadeIn">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">DIY Printing Instructions</h3>
                    <p className="text-sm text-gray-600 mb-1">
                        Quantities below are based on <strong
                        className="text-slate-700">{calculatedMaterials.totalPlayers} players</strong> and <strong
                        className="text-slate-700">{calculatedMaterials.totalTeams} teams</strong>.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                        All materials should be printed on standard 8.5" x 11" paper unless otherwise noted. Refer to
                        the main "How To Host Guide" PDF for detailed assembly.
                    </p>
                    <div
                        className="text-sm text-gray-700 bg-white p-4 rounded-md border border-gray-300 max-h-80 overflow-y-auto scrollbar-thin pr-2">
                        <h4 className="font-medium text-gray-800 mb-2 text-base">Core Game Components:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4 mb-3">
                            <li>Game Boards: {calculatedMaterials.gameBoards} <span className="text-xs text-gray-500">(Recommend 11x17/12x18, color, laminated)</span>
                            </li>
                            <li>Briefing Packets: {calculatedMaterials.briefingPackets} <span
                                className="text-xs text-gray-500">(1 per player, double-sided, color)</span></li>
                            <li>Vocabulary Definitions: {calculatedMaterials.vocabSheets} <span
                                className="text-xs text-gray-500">(1 per team, double-sided B&W)</span></li>
                            <li>Team Name Cards: {calculatedMaterials.teamNameCards} <span
                                className="text-xs text-gray-500">(1 per team, heavy card stock, color)</span></li>
                        </ul>
                        <h4 className="font-medium text-gray-800 mb-2 mt-4 text-base">Round 1 Materials:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4 mb-3">
                            <li>RD-1 Position Sheets: {calculatedMaterials.rd1PosSheets} sets <span
                                className="text-xs text-gray-500">(1 per team, single-sided, color)</span></li>
                            <li>RD-1 Investment Cards: {calculatedMaterials.rd1InvestCards} sets <span
                                className="text-xs text-gray-500">(1 per team, single-sided, color)</span></li>
                            <li>RD-1 Team Summary Sheets: {calculatedMaterials.rd1SummarySheets} <span
                                className="text-xs text-gray-500">(1 per team, single-sided, color)</span></li>
                        </ul>
                        <h4 className="font-medium text-gray-800 mb-2 mt-4 text-base">Round 2 Materials:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4 mb-3">
                            <li>RD-2 Position Sheets: {calculatedMaterials.rd2PosSheets} sets <span
                                className="text-xs text-gray-500">(1 per team)</span></li>
                            <li>RD-2 Investment Cards: {calculatedMaterials.rd2InvestCards} sets <span
                                className="text-xs text-gray-500">(1 per team)</span></li>
                            <li>RD-2 Team Summary Sheets: {calculatedMaterials.rd2SummarySheets} <span
                                className="text-xs text-gray-500">(1 per team)</span></li>
                        </ul>
                        <h4 className="font-medium text-gray-800 mb-2 mt-4 text-base">Round 3 Materials:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4 mb-3">
                            <li>RD-3 Investment Cards: {calculatedMaterials.rd3InvestCards} sets <span
                                className="text-xs text-gray-500">(1 per team)</span></li>
                            <li>RD-3 Team Summary Sheets: {calculatedMaterials.rd3SummarySheets} <span
                                className="text-xs text-gray-500">(1 per team)</span></li>
                        </ul>
                        <h4 className="font-medium text-gray-800 mb-2 mt-4 text-base">Special Handouts:</h4>
                        <ul className="list-disc list-inside space-y-1.5 pl-4">
                            <li>Permanent KPI Impact Cards: {calculatedMaterials.kpiImpactCards} <span
                                className="text-xs text-gray-500">(Print file, cut as needed, color)</span></li>
                            <li>Biz Growth Strategy Reports: {calculatedMaterials.bizGrowthReports} <span
                                className="text-xs text-gray-500">(1 per team, B&W)</span></li>
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
                    onClick={onNext}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Finalize & Start <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step2PrintHandouts;