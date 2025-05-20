// src/components/TeacherHost/CreateGameWizard/Step3_TeamSetup.tsx
import React, {useState, useEffect} from 'react';
import {NewGameData, TeamConfig} from '../../../types'; // Assuming TeamConfig is exported or defined in NewGameData
import {
    ArrowLeft,
    ArrowRight,
    Edit2,
    Printer as PrinterIcon,
    Mail,
    Info,
    Save, RefreshCw
} from 'lucide-react';

// If TeamConfig is not in CreateGamePage, define it here or in types.ts
// export interface TeamConfig {
//   id: number; // Temporary client-side ID for mapping/editing
//   name: string;
//   passcode: string;
// }

const generatePasscode = (): string => {
    // Generates a 4-digit numeric passcode
    return Math.floor(1000 + Math.random() * 9000).toString();
};

interface Step3Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: any) => void; // To update teams_config
    onNext: (dataFromStep: Partial<NewGameData>) => void;
    onPrevious: () => void;
}

const Step3TeamSetup: React.FC<Step3Props> = ({gameData, onDataChange, onNext, onPrevious}) => {
    const [teams, setTeams] = useState<TeamConfig[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [tempTeamName, setTempTeamName] = useState('');

    useEffect(() => {
        // Initialize teams based on gameData.num_teams
        // If teams_config already exists (e.g., navigating back), use that.
        const existingTeamsConfig = gameData.teams_config;
        const numTeams = gameData.num_teams || 0;
        const initialTeams: TeamConfig[] = [];

        for (let i = 0; i < numTeams; i++) {
            initialTeams.push({
                id: i, // Simple numeric ID for client-side list key and editing
                name: existingTeamsConfig?.[i]?.name || `Team ${String.fromCharCode(65 + i)}`, // Default to Team A, B, C...
                passcode: existingTeamsConfig?.[i]?.passcode || generatePasscode(),
            });
        }
        setTeams(initialTeams);
        // Update gameData with these initial/retrieved teams if not already set precisely
        if (!existingTeamsConfig || existingTeamsConfig.length !== numTeams) {
            onDataChange('teams_config', initialTeams.map(({id, ...rest}) => rest));
        }
    }, [gameData.num_teams]); // Rerun if num_teams changes from a previous step correction

    const handleEditName = (team: TeamConfig) => {
        setEditingTeamId(team.id);
        setTempTeamName(team.name);
    };

    const handleSaveName = (teamId: number) => {
        const updatedTeams = teams.map(t =>
            t.id === teamId ? {...t, name: tempTeamName.trim() || `Team ${String.fromCharCode(65 + t.id)}`} : t
        );
        setTeams(updatedTeams);
        onDataChange('teams_config', updatedTeams.map(({id, ...rest}) => rest)); // Save to parent state
        setEditingTeamId(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempTeamName(e.target.value);
    };

    const regeneratePasscode = (teamId: number) => {
        const updatedTeams = teams.map(t =>
            t.id === teamId ? {...t, passcode: generatePasscode()} : t
        );
        setTeams(updatedTeams);
        onDataChange('teams_config', updatedTeams.map(({id, ...rest}) => rest));
    };

    const printLogins = (multiplePerPage: boolean) => {
        let printContent = `<style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .login-card { 
            border: 1px solid #ddd; 
            padding: 15px; 
            margin-bottom: 15px; 
            border-radius: 8px; 
            page-break-inside: avoid;
            width: ${multiplePerPage ? 'calc(50% - 10px)' : '100%'};
            box-sizing: border-box;
            display: inline-block;
            vertical-align: top;
        }
        .login-card h3 { margin-top: 0; color: #333; }
        .login-card p { margin: 5px 0; font-size: 0.9em; }
        .login-card .passcode { font-size: 1.2em; color: #007bff; font-weight: bold; }
        .qr-placeholder { width: 80px; height: 80px; background-color: #f0f0f0; display:flex; align-items:center; justify-content:center; text-align:center; font-size:0.7em; color:#888; margin:10px auto; border:1px dashed #ccc;}
        @media print { 
            body { margin: 10mm; } 
            .login-card { box-shadow: none; border: 1px dashed #999; }
            .no-print { display: none; }
        }
        ${multiplePerPage ? '.page-container { display: flex; flex-wrap: wrap; gap: 10px; }' : ''}
    </style>
    <h2 class="no-print">Team Login Information (Session ID will be assigned upon game start)</h2>
    <button class="no-print" onclick="window.print()">Print</button> <hr class="no-print"/>
    <div class="${multiplePerPage ? 'page-container' : ''}">`;

        teams.forEach(team => {
            printContent += `
        <div class="login-card">
          <h3>Ready or Not Game</h3>
          <p><strong>Team Name:</strong> ${team.name}</p>
          <p><strong>Login URL:</strong> [To be provided with Session ID]</p>
          <div class="qr-placeholder">QR Code <br/>(for Session URL)</div>
          <p><strong>Team Passcode:</strong> <span class="passcode">${team.passcode}</span></p>
          <p style="color:red; font-size:0.8em;">Keep your passcode secret!</p>
        </div>
      `;
        });
        printContent += `</div>`;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(printContent);
        printWindow?.document.close();
    };

    const emailLogins = () => {
        const subject = `Team Logins for "Ready or Not" Game: ${gameData.name || 'New Game'}`;
        let body = `Hello,\n\nPlease find the team login details for your upcoming "Ready or Not" session.\nThe Session URL will be provided by the facilitator when the game starts.\n\n`;
        teams.forEach(team => {
            body += `-------------------------------------\n`;
            body += `Team Name: ${team.name}\n`;
            body += `Team Passcode: ${team.passcode}\n`;
            body += `(Scan QR code or use Session URL provided by facilitator)\n`;
            body += `-------------------------------------\n\n`;
        });
        body += `Remember to keep passcodes secret within your teams!\n\nBest regards,\nFacilitator`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-700"/>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            Below are the teams generated for your game based on <strong
                            className="font-semibold">{gameData.num_teams} teams</strong>.
                            You can rename teams if desired. Unique passcodes have been generated for each.
                            The Session ID and specific Login URL/QR Code will be available once you finalize and start
                            the game.
                        </p>
                    </div>
                </div>
            </div>


            <div
                className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 border rounded-lg p-3 bg-white">
                {teams.map((team) => (
                    <div key={team.id}
                         className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex-grow mr-2">
                            {editingTeamId === team.id ? (
                                <input
                                    type="text"
                                    value={tempTeamName}
                                    onChange={handleInputChange}
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

            <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Distribute Login Credentials:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={() => printLogins(false)}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
                        <PrinterIcon size={16}/> Print (1 per Page)
                    </button>
                    <button onClick={() => printLogins(true)}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
                        <PrinterIcon size={16}/> Print (Multiple/Page)
                    </button>
                    <button onClick={emailLogins}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
                        <Mail size={16}/> Compose Email
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">The actual Session ID and login URL/QR code will be generated
                    and available after you finalize and start the game.</p>
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
                    // Data is updated in onDataChange, so just call onNext
                    onClick={() => onNext(gameData)} // Ensure gameData is passed if it was modified here
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Room Setup <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step3TeamSetup;