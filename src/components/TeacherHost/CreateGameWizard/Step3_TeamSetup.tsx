// src/components/TeacherHost/CreateGameWizard/Step3_TeamSetup.tsx
import React, {useState, useEffect} from 'react';
import {NewGameData} from '../../../pages/CreateGamePage';
import {ArrowLeft, ArrowRight, Edit2, Check, Printer as PrinterIcon, Mail} from 'lucide-react';

interface TeamConfig {
    id: number; // Temporary ID for mapping
    name: string;
    passcode: string; // Will be generated
}

interface Step3Props {
    gameData: NewGameData;
    onDataChange: (field: keyof NewGameData, value: any) => void;
    onNext: (dataFromStep: Partial<NewGameData>) => void;
    onPrevious: () => void;
}

const generatePasscode = () => Math.floor(100 + Math.random() * 900).toString(); // Simple 3-digit

const Step3TeamSetup: React.FC<Step3Props> = ({gameData, onDataChange, onNext, onPrevious}) => {
    const [teams, setTeams] = useState<TeamConfig[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [tempTeamName, setTempTeamName] = useState('');

    useEffect(() => {
        // Initialize teams based on gameData.num_teams
        const initialTeams: TeamConfig[] = [];
        for (let i = 0; i < (gameData.num_teams || 0); i++) {
            initialTeams.push({
                id: i,
                name: gameData.teams_config?.[i]?.name || `Team ${String.fromCharCode(65 + i)}`,
                passcode: gameData.teams_config?.[i]?.passcode || generatePasscode(),
            });
        }
        setTeams(initialTeams);
    }, [gameData.num_teams, gameData.teams_config]);

    const handleEditName = (team: TeamConfig) => {
        setEditingTeamId(team.id);
        setTempTeamName(team.name);
    };

    const handleSaveName = (teamId: number) => {
        const updatedTeams = teams.map(t => t.id === teamId ? {...t, name: tempTeamName} : t);
        setTeams(updatedTeams);
        onDataChange('teams_config', updatedTeams.map(({id, ...rest}) => rest)); // Save without temporary id
        setEditingTeamId(null);
    };

    const handlePrintLogins = (multiplePerPage: boolean) => {
        let content = teams.map(team =>
            `<div style="border: 1px solid #ccc; padding: 15px; margin-bottom: ${multiplePerPage ? '10px' : '50px'}; page-break-inside: avoid;">
        <h2>Team Login: ${team.name}</h2>
        <p><strong>Session URL:</strong> ${window.location.origin}/play/${"SESSION_ID_PLACEHOLDER"}</p> 
        <p><em>(Scan QR Code or use URL)</em></p>
        <div style="width:100px; height:100px; background: #eee; margin: 10px 0; display:flex; align-items:center; justify-content:center;">[QR Placeholder]</div>
        <p><strong>Passcode:</strong> <strong style="font-size: 1.2em;">${team.passcode}</strong></p>
        <p style="color:red; font-size:0.9em;">Keep your passcode secret!</p>
       </div>`
        ).join(multiplePerPage ? '' : '<div style="page-break-after: always;"></div>');

        if (multiplePerPage) {
            // Basic grouping for multiple per page (e.g., 2 or 4)
            const groupedContent: string[] = [];
            for (let i = 0; i < teams.length; i += 2) {
                groupedContent.push(
                    `<div style="display:flex; justify-content:space-around; margin-bottom:20px; page-break-inside: avoid;">
                    ${teams[i] ? content[i] : '<div></div>'}
                    ${teams[i + 1] ? content[i + 1] : '<div></div>'}
                </div>`
                );
            }
            content = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">${teams.map(team =>
                `<div style="border: 1px solid #ccc; padding: 10px; margin-bottom:10px; page-break-inside: avoid; font-size:0.8em;">
              <h2>${team.name}</h2>
              <p>URL: ${window.location.origin}/play/SESSION_ID</p>
              <div style="width:80px; height:80px; background: #eee; margin: 5px 0;">[QR]</div>
              <p>Passcode: <strong>${team.passcode}</strong></p>
            </div>`).join('')}</div>`;
        }


        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`<html><head><title>Team Logins</title><style>body{font-family:sans-serif;} @media print { div {page-break-inside: avoid !important;}}</style></head><body>${content}</body></html>`);
        printWindow?.document.close();
        printWindow?.print();
    };

    const handleEmailLogins = () => {
        const subject = `Team Logins for Game: ${gameData.name}`;
        const body = teams.map(team =>
            `Team: ${team.name}\nSession URL: ${window.location.origin}/play/SESSION_ID_PLACEHOLDER\nPasscode: ${team.passcode}\nKeep your passcode secret!\n\n`
        ).join('');
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };


    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600">
                Each team needs a way to log into the student application. Below are the generated teams and their
                passcodes.
                You can rename teams if needed. Session ID will be available after game finalization.
            </p>

            <div
                className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {teams.map((team) => (
                    <div key={team.id}
                         className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200">
                        {editingTeamId === team.id ? (
                            <input
                                type="text"
                                value={tempTeamName}
                                onChange={(e) => setTempTeamName(e.target.value)}
                                onBlur={() => handleSaveName(team.id)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveName(team.id)}
                                className="text-sm font-medium text-gray-800 border-blue-500 border px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                            />
                        ) : (
                            <span className="text-sm font-medium text-gray-800">{team.name}</span>
                        )}
                        <div className="flex items-center space-x-3">
                            <span
                                className="text-sm text-blue-600 font-mono bg-blue-100 px-2 py-0.5 rounded-md">{team.passcode}</span>
                            {editingTeamId === team.id ? (
                                <button onClick={() => handleSaveName(team.id)}
                                        className="p-1 text-green-600 hover:text-green-700"><Check size={18}/></button>
                            ) : (
                                <button onClick={() => handleEditName(team)}
                                        className="p-1 text-gray-500 hover:text-blue-600"><Edit2 size={16}/></button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={() => handlePrintLogins(false)}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <PrinterIcon size={16}/> Print 1/Page
                </button>
                <button onClick={() => handlePrintLogins(true)}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <PrinterIcon size={16}/> Print Multiple/Page
                </button>
                <button onClick={handleEmailLogins}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Mail size={16}/> Email Logins
                </button>
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
                    onClick={() => onNext({teams_config: teams.map(({id, ...rest}) => rest)})}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    Next: Room Setup <ArrowRight size={18}/>
                </button>
            </div>
        </div>
    );
};

export default Step3TeamSetup;