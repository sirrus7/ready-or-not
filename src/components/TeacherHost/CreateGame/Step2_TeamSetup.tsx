// src/components/TeacherHost/CreateGameWizard/Step2_TeamSetup.tsx
import React, {useState, useEffect} from 'react';
import {NewGameData, TeamConfig as AppTeamConfig} from '../../../types'; // Ensure path is correct
import {
    ArrowLeft,
    ArrowRight,
    Edit2,
    Printer as PrinterIcon,
    Mail,
    Info,
    RefreshCw,
    Save
} from 'lucide-react';
import QRCode from 'qrcode';

// Internal state for this component can use an 'id' for React keys
interface LocalTeamConfig extends AppTeamConfig {
    id: number; // Client-side temporary ID for list mapping and editing state
}

const generatePasscode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit numeric passcode
};

interface Step3Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: AppTeamConfig[]) => void; // Specifically for teams_config
    onNext: (dataFromStep: Partial<NewGameData>) => void;
    onPrevious: () => void;
}

const Step3TeamSetup: React.FC<Step3Props> = ({gameData, onDataChange, onNext, onPrevious}) => {
    const [localTeams, setLocalTeams] = useState<LocalTeamConfig[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [tempTeamName, setTempTeamName] = useState('');

    // Initialize or re-initialize teams when gameData.num_teams changes or gameData.teams_config is different
    useEffect(() => {
        console.log("Step3TeamSetup: useEffect for gameData.num_teams or gameData.teams_config change.", gameData);
        const numTeams = gameData.num_teams || 0;
        const existingTeamsConfig = gameData.teams_config || [];
        const newLocalTeams: LocalTeamConfig[] = [];

        for (let i = 0; i < numTeams; i++) {
            newLocalTeams.push({
                id: i,
                name: existingTeamsConfig[i]?.name || `Team ${String.fromCharCode(65 + i)}`,
                passcode: existingTeamsConfig[i]?.passcode || generatePasscode(),
            });
        }
        setLocalTeams(newLocalTeams);

        // Update parent if the generated/retrieved teams differ from what's in gameData.teams_config
        // This handles initial setup and cases where num_teams might change after this step was visited.
        const newAppTeamConfigs = newLocalTeams.map(({id, ...rest}) => rest);
        if (JSON.stringify(gameData.teams_config) !== JSON.stringify(newAppTeamConfigs)) {
            console.log("Step3TeamSetup: Updating parent teams_config due to initialization/change.");
            onDataChange('teams_config', newAppTeamConfigs);
        }
    }, [gameData.num_teams]); // Only re-initialize if num_teams changes. gameData.teams_config is for initial load.

    // Effect to update parent if localTeams state changes due to user edits
    useEffect(() => {
        // Avoid updating parent during initial setup from gameData.num_teams
        if (localTeams.length > 0 && localTeams.length === gameData.num_teams) {
            const appTeamConfigs = localTeams.map(({id, ...rest}) => rest);
            if (JSON.stringify(gameData.teams_config) !== JSON.stringify(appTeamConfigs)) {
                console.log("Step3TeamSetup: Local teams changed by user, updating parent teams_config.");
                onDataChange('teams_config', appTeamConfigs);
            }
        }
    }, [localTeams, gameData.teams_config, gameData.num_teams, onDataChange]);


    const handleEditName = (team: LocalTeamConfig) => {
        setEditingTeamId(team.id);
        setTempTeamName(team.name);
    };

    const handleSaveName = (teamId: number) => {
        setLocalTeams(prevTeams =>
            prevTeams.map(t =>
                t.id === teamId ? {...t, name: tempTeamName.trim() || `Team ${String.fromCharCode(65 + t.id)}`} : t
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

    const printLogins = async (multiplePerPage: boolean) => {
        // Generate QR codes for each team
        const baseUrl = `${window.location.origin}/student-game`;
        const sessionPlaceholder = '[SESSION_ID]'; // Placeholder since session isn't created yet
        const qrDataUrl = await QRCode.toDataURL(`${baseUrl}/${sessionPlaceholder}`, {
            width: 120,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }).catch(() => null);

        let content = localTeams.map(team => {
            const qrCodeHtml = qrDataUrl
                ? `<img src="${qrDataUrl}" style="width:80px; height:80px; margin:10px auto; display:block;" alt="QR Code" />`
                : `<div style="width:80px; height:80px; background-color: #f0f0f0; display:flex; align-items:center; justify-content:center; text-align:center; font-size:0.7em; color:#888; margin:10px auto; border:1px dashed #ccc;">QR for Session</div>`;

            return `<div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 8px; page-break-inside: avoid; width: ${multiplePerPage ? 'calc(50% - 20px)' : 'calc(100% - 30px)'}; box-sizing: border-box; display: inline-block; vertical-align: top; margin-right: ${multiplePerPage ? '10px' : '0'};">
                    <h3 style="margin-top: 0; color: #333; font-size: 1.1em;">Ready Or Not Game Login</h3>
                    <p style="margin: 8px 0; font-size: 0.9em;"><strong>Team Name:</strong> ${team.name}</p>
                    <p style="margin: 8px 0; font-size: 0.9em;"><strong>Login URL:</strong> ${baseUrl}/[SESSION_ID]</p>
                    ${qrCodeHtml}
                    <p style="margin: 8px 0; font-size: 0.9em;"><strong>Team Passcode:</strong> <span style="font-size: 1.3em; color: #007bff; font-weight: bold;">${team.passcode}</span></p>
                    <p style="color:red; font-size:0.8em; margin-top: 10px;">Keep your passcode secret within your team!</p>
                    <p style="color:#666; font-size:0.7em; margin-top: 5px; font-style: italic;">*The actual Session ID will be provided by your facilitator when the game starts.</p>
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
        <p class="no-print"><strong>Important:</strong> The game Session ID and specific Login URL/QR code will be available after the facilitator starts the game session from their control panel.</p>
        <button class="no-print" onclick="window.print()" style="padding:10px; margin:10px 0; background-color:#007bff; color:white; border:none; border-radius:5px; cursor:pointer;">Print This Page</button>
        <hr class="no-print"/>
        ${content}
        </body></html>`);
        printWindow?.document.close();
    };

    const emailLogins = () => {
        const subject = `Team Logins for "Ready or Not" Game: ${gameData.name || 'New Game'}`;
        let body = `Hello Teams,\n\nPlease find your login details for the "Ready or Not" simulation: ${gameData.name || ''}.\n\n`;
        body += `The specific Session URL/QR Code will be provided by your facilitator when the game begins.\n\n`;
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
                            className="font-medium">{gameData.num_teams} teams</strong>, initial names and unique
                            4-digit passcodes have been generated.
                            You can customize team names below. These credentials will be used by students to log into
                            their team's interface on their devices.
                        </p>
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
                                <input
                                    type="text"
                                    value={tempTeamName}
                                    onChange={handleTempNameChange}
                                    onBlur={() => handleSaveName(team.id)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSaveName(team.id)}
                                    className="w-full text-sm font-medium text-gray-800 border-blue-500 border px-2 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            ) : (
                                <span className="text-sm font-semibold text-gray-800">{team.name}</span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                            <span
                                className="text-sm text-blue-700 font-mono bg-blue-100 px-2.5 py-1 rounded-md shadow-sm">{team.passcode}</span>
                            {editingTeamId === team.id ? (
                                <button onClick={() => handleSaveName(team.id)}
                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-full"
                                        title="Save name"><Save size={16}/></button>
                            ) : (
                                <button onClick={() => handleEditName(team)}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full"
                                        title="Edit team name"><Edit2 size={16}/></button>
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
                <p className="text-xs text-gray-500 mt-2">The Session ID and specific Login URL/QR code will be
                    available once the game is finalized and started from the main control panel.</p>
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
                    onClick={() => onNext(gameData)} // Pass the current gameData which includes updated teams_config
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Room Setup <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step3TeamSetup;