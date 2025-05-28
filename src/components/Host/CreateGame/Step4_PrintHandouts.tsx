// src/components/Host/CreateGameWizard/Step4_PrintHandouts.tsx
import React, {useState, useMemo} from 'react';
import {NewGameData} from '../../../types'; // Ensure path is correct
import { generateTeamNameCardsPDF } from '../../../utils/generateTeamNameCards';
import {ArrowLeft, ArrowRight, Download, Printer as PrinterIcon, ShoppingCart, Mail, Info, ChevronDown, ChevronUp} from 'lucide-react';

interface Step4Props {
    gameData: NewGameData;
    onNext: () => void;
    onPrevious: () => void;
}

const Step4PrintHandouts: React.FC<Step4Props> = ({gameData, onNext, onPrevious}) => {
    const [selectedOption, setSelectedOption] = useState<'order' | 'diy'>('diy');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        core: false,
        round1: false,
        round2: false,
        round3: false,
        special: false
    });

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

    const downloadItem = (url: string, filename?: string) => {
        if (filename === 'team-name-cards') {
            // Generate team name cards PDF - this will automatically download
            generateTeamNameCardsPDF(gameData.teams_config);
        } else {
            // Open other PDFs in new tab like the rest
            window.open(url, '_blank');
        }
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const handleDownloadAllPDFs = () => {
        // Generate team name cards first
        generateTeamNameCardsPDF(gameData.teams_config);

        // Download all static PDFs directly (no new tabs)
        const staticPdfs = [
            { url: '/game-materials/core/game-board.pdf', filename: 'game-board.pdf' },
            { url: '/game-materials/core/briefing-packet.pdf', filename: 'briefing-packet.pdf' },
            { url: '/game-materials/core/vocabulary-definitions.pdf', filename: 'vocabulary-definitions.pdf' },
            { url: '/game-materials/core/permanent-kpi-impact-cards.pdf', filename: 'permanent-kpi-impact-cards.pdf' },
            { url: '/game-materials/core/biz-growth-strategy-report.pdf', filename: 'biz-growth-strategy-report.pdf' },
            { url: '/game-materials/round-1/rd1-position-sheet.pdf', filename: 'rd1-position-sheet.pdf' },
            { url: '/game-materials/round-1/rd1-investment-cards.pdf', filename: 'rd1-investment-cards.pdf' },
            { url: '/game-materials/round-1/rd1-team-summary-sheet.pdf', filename: 'rd1-team-summary-sheet.pdf' },
            { url: '/game-materials/round-2/rd2-position-sheet.pdf', filename: 'rd2-position-sheet.pdf' },
            { url: '/game-materials/round-2/rd2-investment-cards.pdf', filename: 'rd2-investment-cards.pdf' },
            { url: '/game-materials/round-2/rd2-team-summary-sheet.pdf', filename: 'rd2-team-summary-sheet.pdf' },
            { url: '/game-materials/round-3/rd3-investment-cards.pdf', filename: 'rd3-investment-cards.pdf' },
            { url: '/game-materials/round-3/rd3-team-summary-sheet.pdf', filename: 'rd3-team-summary-sheet.pdf' }
        ];

        // Create and trigger download for each PDF with delays
        staticPdfs.forEach((pdf, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = pdf.url;
                link.download = pdf.filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, (index + 1) * 300); // Reduced delay since we're not opening tabs
        });
    };

    return (
        <div className="space-y-6 text-gray-700">
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
                    <p className="text-xs text-gray-500 mb-6">
                        Click individual items to download, or use "Download All" at the bottom. Numbers show <strong>quantities needed</strong> for your {calculatedMaterials.totalTeams} teams and {calculatedMaterials.totalPlayers} players.
                    </p>

                    {/* Start Folder */}
                    <div className="mb-4">
                        <button
                            onClick={() => toggleSection('core')}
                            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                <h4 className="font-medium text-gray-800 text-sm">Start Folder</h4>
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">4 items</span>
                            </div>
                            {expandedSections.core ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {expandedSections.core && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Game Boards</h5>
                                        <span className="text-sm font-bold bg-blue-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.gameBoards}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">11x17 recommended, color, laminated</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/core/game-board.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Briefing Packets</h5>
                                        <span className="text-sm font-bold bg-blue-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.briefingPackets}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 per player, double-sided, color</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/core/briefing-packet.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Vocabulary Sheets</h5>
                                        <span className="text-sm font-bold bg-blue-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.vocabSheets}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 per team, double-sided</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/core/vocabulary-definitions.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Team Name Cards</h5>
                                        <span className="text-sm font-bold bg-blue-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.teamNameCards}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 per team, card stock, color</p>
                                    <button
                                        onClick={() => downloadItem('', 'team-name-cards')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Round 1 Folder */}
                    <div className="mb-4">
                        <button
                            onClick={() => toggleSection('round1')}
                            className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                        >
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                <h4 className="font-medium text-gray-800 text-sm">Round 1 Folder</h4>
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">3 items</span>
                            </div>
                            {expandedSections.round1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {expandedSections.round1 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pl-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Position Sheets</h5>
                                        <span className="text-sm font-bold bg-green-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd1PosSheets}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 set per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-1/rd1-position-sheet.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Investment Cards</h5>
                                        <span className="text-sm font-bold bg-green-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd1InvestCards}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 set per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-1/rd1-investment-cards.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Summary Sheets</h5>
                                        <span className="text-sm font-bold bg-green-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd1SummarySheets}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-1/rd1-team-summary-sheet.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Round 2 Folder */}
                    <div className="mb-4">
                        <button
                            onClick={() => toggleSection('round2')}
                            className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-colors"
                        >
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                                <h4 className="font-medium text-gray-800 text-sm">Round 2 Folder</h4>
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">3 items</span>
                            </div>
                            {expandedSections.round2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {expandedSections.round2 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pl-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Position Sheets</h5>
                                        <span className="text-sm font-bold bg-yellow-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd2PosSheets}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 set per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-2/rd2-position-sheet.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Investment Cards</h5>
                                        <span className="text-sm font-bold bg-yellow-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd2InvestCards}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 set per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-2/rd2-investment-cards.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Summary Sheets</h5>
                                        <span className="text-sm font-bold bg-yellow-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd2SummarySheets}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-2/rd2-team-summary-sheet.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Round 3 Folder */}
                    <div className="mb-4">
                        <button
                            onClick={() => toggleSection('round3')}
                            className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                        >
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                <h4 className="font-medium text-gray-800 text-sm">Round 3 Folder</h4>
                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">2 items</span>
                            </div>
                            {expandedSections.round3 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {expandedSections.round3 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Investment Cards</h5>
                                        <span className="text-sm font-bold bg-purple-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd3InvestCards}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 set per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-3/rd3-investment-cards.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Summary Sheets</h5>
                                        <span className="text-sm font-bold bg-purple-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.rd3SummarySheets}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/round-3/rd3-team-summary-sheet.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Special Folder */}
                    <div className="mb-6">
                        <button
                            onClick={() => toggleSection('special')}
                            className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                        >
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                                <h4 className="font-medium text-gray-800 text-sm">Special Folder</h4>
                                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">2 items</span>
                            </div>
                            {expandedSections.special ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {expandedSections.special && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">KPI Impact Cards</h5>
                                        <span className="text-sm font-bold bg-red-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.kpiImpactCards}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">Print and cut as needed, color</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/core/permanent-kpi-impact-cards.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium text-gray-700 text-sm">Growth Strategy Reports</h5>
                                        <span className="text-sm font-bold bg-red-600 text-white px-2 py-1 rounded">Need: {calculatedMaterials.bizGrowthReports}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">1 per team</p>
                                    <button
                                        onClick={() => downloadItem('/game-materials/core/biz-growth-strategy-report.pdf')}
                                        className="w-full text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Download size={12}/> Download PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Download All Button */}
                    <div className="border-t border-gray-200 pt-4">
                        <button
                            onClick={handleDownloadAllPDFs}
                            className="w-full bg-green-600 text-white text-sm font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <Download size={18}/> Download All Materials (13 files)
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            This will download all PDFs with small delays to prevent popup blocking. Team name cards will be generated automatically.
                        </p>
                    </div>
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

export default Step4PrintHandouts;