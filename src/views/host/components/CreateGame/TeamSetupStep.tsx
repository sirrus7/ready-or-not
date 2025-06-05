// src/views/host/components/CreateGame/TeamSetupStep.tsx - Enhanced with real QR codes
import React, {useState, useEffect} from 'react';
import {NewGameData, TeamConfig as AppTeamConfig} from '@shared/types';
import {
    ArrowLeft,
    ArrowRight,
    Edit2,
    Printer as PrinterIcon,
    Mail,
    Info,
    RefreshCw,
    Save,
    CheckCircle2
} from 'lucide-react';
import QRCode from 'qrcode';

// Internal state for this component can use an 'id' for React keys
interface LocalTeamConfig extends AppTeamConfig {
    id: number; // Client-side temporary ID for list mapping and editing state
}

// Default team names list
const DEFAULT_TEAM_NAMES = [
    'CRANE', 'WILLOW', 'BIGHORN', 'OSPREY', 'YEW', 'LAUREL', 'MAPLE', 'HEMLOCK', 'OWL', 'ELM',
    'CYPRESS', 'BOXELDER', 'PLUM', 'DOGWOOD', 'ELK', 'ASH', 'ASPEN', 'BIRCH', 'FILBERT', 'FIR',
    'JUNIPER', 'LARCH', 'OAK', 'PEAR', 'PINE', 'SPRUCE', 'CHUKAR', 'BRANT', 'EAGLE', 'SWIFT',
    'HERON', 'EGRET', 'RAVEN', 'CROW', 'JAY', 'FALCON', 'TOWIE', 'DOVE', 'PLOVER', 'AVOCET',
    'WILLET', 'SNAKE', 'ROGUE', 'ALSEA', 'TRASK', 'WILSON', 'CHETCO', 'SANDY', 'HOOD', 'UMPQUA',
    'SILETZ', 'OWYHEE'
];

const generatePasscode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit numeric passcode
};

const getDefaultTeamName = (index: number): string => {
    if (index < DEFAULT_TEAM_NAMES.length) {
        return DEFAULT_TEAM_NAMES[index];
    }
    // Fallback to generic naming after running out of default names
    return `Team ${String.fromCharCode(65 + (index - DEFAULT_TEAM_NAMES.length))}`;
};

// Maximum team name length for printing compatibility
const MAX_TEAM_NAME_LENGTH = 15;

interface Step2Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: AppTeamConfig[]) => void;
    onNext: (dataFromStep: Partial<NewGameData>) => void;
    onPrevious: () => void;
    draftSessionId: string | null; // NEW: Real session ID for QR codes
}

const TeamSetupStep: React.FC<Step2Props> = ({
                                                 gameData,
                                                 onDataChange,
                                                 onNext,
                                                 onPrevious,
                                                 draftSessionId
                                             }) => {
    const [localTeams, setLocalTeams] = useState<LocalTeamConfig[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [tempTeamName, setTempTeamName] = useState('');

    // Initialize or re-initialize teams when gameData.num_teams changes
    useEffect(() => {
        console.log("TeamSetup: useEffect for gameData.num_teams change.", gameData);
        const numTeams = gameData.num_teams || 0;
        const existingTeamsConfig = gameData.teams_config || [];
        const newLocalTeams: LocalTeamConfig[] = [];

        for (let i = 0; i < numTeams; i++) {
            newLocalTeams.push({
                id: i,
                name: existingTeamsConfig[i]?.name || getDefaultTeamName(i),
                passcode: existingTeamsConfig[i]?.passcode || generatePasscode(),
            });
        }
        setLocalTeams(newLocalTeams);

        // Update parent if the generated/retrieved teams differ
        const newAppTeamConfigs = newLocalTeams.map(({id, ...rest}) => rest);
        if (JSON.stringify(gameData.teams_config) !== JSON.stringify(newAppTeamConfigs)) {
            console.log("TeamSetup: Updating parent teams_config due to initialization/change.");
            onDataChange('teams_config', newAppTeamConfigs);
        }
    }, [gameData.num_teams]);

    // Effect to update parent if localTeams state changes due to user edits
    useEffect(() => {
        if (localTeams.length > 0 && localTeams.length === gameData.num_teams) {
            const appTeamConfigs = localTeams.map(({id, ...rest}) => rest);
            if (JSON.stringify(gameData.teams_config) !== JSON.stringify(appTeamConfigs)) {
                console.log("TeamSetup: Local teams changed by user, updating parent teams_config.");
                onDataChange('teams_config', appTeamConfigs);
            }
        }
    }, [localTeams, gameData.teams_config, gameData.num_teams, onDataChange]);

    const handleEditName = (team: LocalTeamConfig) => {
        setEditingTeamId(team.id);
        setTempTeamName(team.name);
    };

    const handleSaveName = (teamId: number) => {
        const trimmedName = tempTeamName.trim();

        // Validate team name length
        if (trimmedName.length > MAX_TEAM_NAME_LENGTH) {
            alert(`Team name must be ${MAX_TEAM_NAME_LENGTH} characters or less for printing compatibility.`);
            return;
        }

        setLocalTeams(prevTeams =>
            prevTeams.map(t =>
                t.id === teamId ? {
                    ...t,
                    name: trimmedName || getDefaultTeamName(t.id)
                } : t
            )
        );
        setEditingTeamId(null);
    };

    const handleTempNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempTeamName(e.target.value);
    };

    const regeneratePasscode = (teamIdToUpdate: number) => {
        setLocalTeams(prevTeams =>
            prevTeams.map(t =>
                t.id === teamIdToUpdate ? {...t, passcode: generatePasscode()} : t
            )
        );
    };

    // Enhanced print function with real QR codes
    const printLogins = async (multiplePerPage: boolean) => {
        const baseUrl = `${window.location.origin}/student-game`;
        const actualUrl = draftSessionId ? `${baseUrl}/${draftSessionId}` : `${baseUrl}/[SESSION_ID]`;

        let qrDataUrl: string | null = null;

        if (draftSessionId) {
            try {
                qrDataUrl = await QRCode.toDataURL(actualUrl, {
                    width: 120,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        }

        let content = localTeams.map(team => {
            const qrCodeHtml = qrDataUrl
                ? `<img src="${qrDataUrl}" style="width:80px; height:80px; margin:10px auto; display:block;" alt="QR Code" />`
                : `<div style="width:80px; height:80px; background-color: #f0f0f0; display:flex; align-items:center; justify-content:center; text-align:center; font-size:0.7em; color:#888; margin:10px auto; border:1px dashed #ccc;">QR for Session</div>`;

            const urlText = draftSessionId ? actualUrl : `${baseUrl}/[SESSION_ID]`;
            const sessionNote = draftSessionId
                ? '<p style="color:#10b981; font-size:0.8em; margin-top: 10px; font-weight: bold;">✓ Session is ready! Students can use this link and QR code now.</p>'
                : '<p style="color:#f59e0b; font-size:0.8em; margin-top: 10px; font-style: italic;">*The actual Session ID will be provided when the game is finalized.</p>';

            return `<div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 8px; page-break-inside: avoid; width: ${multiplePerPage ? 'calc(50% - 20px)' : 'calc(100% - 30px)'}; box-sizing: border-box; display: inline-block; vertical-align: top; margin-right: ${multiplePerPage ? '10px' : '0'};">
                    <h3 style="margin-top: 0; color: #333; font-size: 1.1em;">Ready Or Not Game Login</h3>
                    <p style="margin: 8px 0; font-size: 0.9em;"><strong>Team Name:</strong> ${team.name}</p>
                    <p style="margin: 8px 0; font-size: 0.9em;"><strong>Login URL:</strong> ${urlText}</p>
                    ${qrCodeHtml}
                    <p style="margin: 8px 0; font-size: 0.9em;"><strong>Team Passcode:</strong> <span style="font-size: 1.3em; color: #007bff; font-weight: bold;">${team.passcode}</span></p>
                    <p style="color:red; font-size:0.8em; margin-top: 10px;">Keep your passcode secret within your team!</p>
                    ${sessionNote}
                </div>`;
        }).join(multiplePerPage ? '' : '<div style="page-break-after: always;"></div>');

        if (multiplePerPage) {
            content = `<div style="display: flex; flex-wrap: wrap; gap: 10px;">${content}</div>`;
        }

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow?.document.write(`
        <html><head><title>Team Login Credentials</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            @media print { 
                body { margin: 10mm; } 
                .no-print { display: none !important; }
                .login-card { box-shadow: none !important; border: 1px dashed #999 !important; }
            }
        </style>
        </head><body>
        <h2 class="no-print">Team Login Information</h2>
        ${draftSessionId ?
            `<p class="no-print" style="color: #10b981; font-weight: bold;">✓ Your game session is ready! Students can use these login credentials immediately.</p>` :
            `<p class="no-print"><strong>Important:</strong> The game Session ID and specific Login URL/QR code will be available after the facilitator starts the game session from their control panel.</p>`
        }
        <button class="no-print" onclick="window.print()" style="padding:10px; margin:10px 0; background-color:#007bff; color:white; border:none; border-radius:5px; cursor:pointer;">Print This Page</button>
        <hr class="no-print"/>
        ${content}
        </body></html>`);
        printWindow?.document.close();
    };

    const emailLogins = () => {
        const subject = `Team Logins for "Ready or Not" Game: ${gameData.name || 'New Game'}`;
        const baseUrl = `${window.location.origin}/student-game`;
        const actualUrl = draftSessionId ? `${baseUrl}/${draftSessionId}` : `${baseUrl}/[SESSION_ID]`;

        let body = `Hello Teams,\n\nPlease find your login details for the "Ready or Not" simulation: ${gameData.name || ''}.\n\n`;

        if (draftSessionId) {
            body += `✓ Game session is ready! You can log in immediately using:\n`;
            body += `Login URL: ${actualUrl}\n\n`;
        } else {
            body += `The specific Session URL will be provided by your facilitator when the game begins.\n\n`;
        }

        localTeams.forEach(team => {
            body += `-------------------------------------\n`;
            body += `Team Name: ${team.name}\n`;
            body += `Team Passcode: ${team.passcode}\n`;
            body += `-------------------------------------\n\n`;
        });

        body += `Please keep your passcode secret within your team.\n\nGood luck!\nYour Facilitator`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="space-y-6">
            <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0 pt-0.5">
                        <Info className="h-5 w-5 text-sky-700"/>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-sky-700">
                            Based on your selection of <strong
                            className="font-medium">{gameData.num_teams} teams</strong>,
                            team names and unique 4-digit passcodes have been generated. The names are inspired by
                            Pacific Northwest nature.
                            You can customize any team name below by clicking the edit icon.
                        </p>
                        {draftSessionId && (
                            <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md">
                                <div className="flex items-center">
                                    <CheckCircle2 size={16} className="text-green-600 mr-2 flex-shrink-0"/>
                                    <p className="text-sm text-green-700 font-medium">
                                        Session Ready! Students can now access the game using the QR codes and links
                                        below.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {localTeams.length === 0 && (
                <p className="text-gray-500 text-center py-4">No teams to display. Please set the number of teams in
                    Step 1.</p>
            )}

            <div
                className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 border rounded-lg p-3 bg-white">
                {localTeams.map((team) => (
                    <div key={team.id}
                         className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex-grow mr-2">
                            {editingTeamId === team.id ? (
                                <div className="w-full">
                                    <input
                                        type="text"
                                        value={tempTeamName}
                                        onChange={handleTempNameChange}
                                        onBlur={() => handleSaveName(team.id)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSaveName(team.id)}
                                        className="w-full text-sm font-medium text-gray-800 border-blue-500 border px-2 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                        maxLength={MAX_TEAM_NAME_LENGTH}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        {tempTeamName.length}/{MAX_TEAM_NAME_LENGTH} characters
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm font-semibold text-gray-800">{team.name}</span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                            <span
                                className="text-sm text-blue-700 font-mono bg-blue-100 px-2.5 py-1 rounded-md shadow-sm">
                                {team.passcode}
                            </span>
                            {editingTeamId === team.id ? (
                                <button onClick={() => handleSaveName(team.id)}
                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-full"
                                        title="Save name">
                                    <Save size={16}/>
                                </button>
                            ) : (
                                <button onClick={() => handleEditName(team)}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full"
                                        title="Edit team name">
                                    <Edit2 size={16}/>
                                </button>
                            )}
                            <button onClick={() => regeneratePasscode(team.id)}
                                    className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-100 rounded-full"
                                    title="Regenerate passcode">
                                <RefreshCw size={16}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show information about default names if there are many teams */}
            {gameData.num_teams > DEFAULT_TEAM_NAMES.length && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0 pt-0.5">
                            <Info className="h-5 w-5 text-yellow-700"/>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                You have more teams ({gameData.num_teams}) than our default names list
                                ({DEFAULT_TEAM_NAMES.length}).
                                Teams beyond the first {DEFAULT_TEAM_NAMES.length} will use generic names (Team A, Team
                                B, etc.)
                                that you can customize by clicking the edit icon.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Distribute Login Credentials:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={() => printLogins(false)}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <PrinterIcon size={16}/> Print (1 per Page)
                    </button>
                    <button onClick={() => printLogins(true)}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <PrinterIcon size={16}/> Print (Multiple/Page)
                    </button>
                    <button onClick={emailLogins}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <Mail size={16}/> Compose Email
                    </button>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                    {draftSessionId ? (
                        <div className="flex items-center">
                            <CheckCircle2 size={14} className="text-green-500 mr-1"/>
                            <span className="text-green-600 font-medium">
                                Session is active! QR codes and URLs are ready for immediate use.
                            </span>
                        </div>
                    ) : (
                        <span>
                            The Session ID and QR codes will be available once the game is finalized and started.
                        </span>
                    )}
                </div>
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
                    onClick={() => onNext(gameData)}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Room Setup <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default TeamSetupStep;
