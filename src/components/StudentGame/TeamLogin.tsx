// src/components/StudentGame/TeamLogin.tsx
import React, {useState, useEffect} from 'react';
import {supabase} from '../../lib/supabase';
import {Team} from '../../types';
import {LogIn, Users} from 'lucide-react';

interface TeamLoginProps {
    sessionId: string;
    onLoginSuccess: (teamId: string, teamName: string) => void;
}

const TeamLogin: React.FC<TeamLoginProps> = ({sessionId, onLoginSuccess}) => {
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [passcode, setPasscode] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchTeams = async () => {
            setIsLoading(true);
            setError('');
            const {data, error: fetchError} = await supabase
                .from('teams') // Assuming your table is named 'teams'
                .select('id, name')
                .eq('session_id', sessionId);

            if (fetchError) {
                setError('Failed to load teams for this session. Please ensure the session ID is correct or try again.');
                console.error("Error fetching teams:", fetchError);
            } else if (data) {
                setAvailableTeams(data as Team[]);
                if (data.length > 0) {
                    setSelectedTeamId(data[0].id); // Default to first team
                }
            }
            setIsLoading(false);
        };

        if (sessionId) {
            fetchTeams();
        }
    }, [sessionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId || !passcode) {
            setError('Please select a team and enter the passcode.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const {data: team, error: authError} = await supabase
                .from('teams')
                .select('id, name, passcode')
                .eq('id', selectedTeamId)
                .eq('session_id', sessionId)
                .single();

            if (authError || !team) {
                throw new Error('Invalid team selection or session.');
            }

            if (team.passcode === passcode) {
                onLoginSuccess(team.id, team.name);
            } else {
                setError('Incorrect passcode. Please try again.');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md p-8 bg-gray-700 rounded-xl shadow-2xl">
                <div className="flex justify-center mb-6">
                    <Users size={48} className="text-blue-400"/>
                </div>
                <h2 className="text-2xl font-bold text-center text-blue-300 mb-2">Team Login</h2>
                <p className="text-center text-gray-400 mb-6 text-sm">Select your team and enter the passcode provided
                    by your facilitator.</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/30 text-red-300 border border-red-500/50 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="team-select" className="block text-sm font-medium text-gray-300 mb-1">
                            Select Team
                        </label>
                        <select
                            id="team-select"
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                            disabled={isLoading || availableTeams.length === 0}
                        >
                            {availableTeams.length === 0 && !isLoading && <option value="">No teams available</option>}
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
                            type="password" // Use password type for masking, or text if codes are simple numeric
                            id="passcode"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || availableTeams.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <LogIn size={20}/>
                        )}
                        <span>{isLoading ? 'Verifying...' : 'Join Game'}</span>
                    </button>
                </form>
                <p className="text-xs text-gray-500 mt-4 text-center">Session ID: {sessionId}</p>
            </div>
        </div>
    );
};

export default TeamLogin;