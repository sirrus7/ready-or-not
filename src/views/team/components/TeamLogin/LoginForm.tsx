// src/components/Game/TeamLogin/components/LoginForm.tsx - Main login form
import {LogIn} from 'lucide-react';

interface LoginFormProps {
    availableTeams: any[];
    selectedTeamId: string;
    setSelectedTeamId: (id: string) => void;
    passcode: string;
    setPasscode: (code: string) => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    isLoggingIn: boolean;
    isLoadingTeams: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
                                                 availableTeams,
                                                 selectedTeamId,
                                                 setSelectedTeamId,
                                                 passcode,
                                                 setPasscode,
                                                 onSubmit,
                                                 isLoggingIn,
                                                 isLoadingTeams
                                             }) => {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <label htmlFor="team-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Select Team
                </label>
                <select
                    id="team-select"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                    disabled={isLoggingIn || availableTeams.length === 0}
                >
                    {availableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                            {team.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="passcode" className="block text-sm font-medium text-gray-300 mb-1">
                    Team Passcode
                </label>
                <input
                    type="password"
                    id="passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                    required
                    disabled={isLoggingIn}
                    autoComplete="current-password"
                />
            </div>

            <button
                type="submit"
                disabled={isLoggingIn || isLoadingTeams || availableTeams.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoggingIn ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                    <LogIn size={20}/>
                )}
                <span>{isLoggingIn ? 'Verifying...' : 'Join Game'}</span>
            </button>
        </form>
    );
};

export default LoginForm;