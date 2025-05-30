// src/components/Game/TeamLogin.tsx - UPDATED
import React, { useState, useEffect } from 'react';
import { db, formatSupabaseError, useSupabaseConnection } from '../../utils/supabase';
import { Team } from '../../types';
import { LogIn, Users, Hourglass, AlertTriangle } from 'lucide-react';

interface TeamLoginProps {
    sessionId: string;
    onLoginSuccess: (teamId: string, teamName: string) => void;
}

const TeamLogin: React.FC<TeamLoginProps> = ({ sessionId, onLoginSuccess }) => {
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [passcode, setPasscode] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoadingTeams, setIsLoadingTeams] = useState<boolean>(true);
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

    const connection = useSupabaseConnection();

    useEffect(() => {
        const fetchTeams = async () => {
            if (!sessionId) {
                setError("Session ID is missing.");
                setIsLoadingTeams(false);
                return;
            }

            setIsLoadingTeams(true);
            setError('');

            try {
                const teams = await db.teams.getBySession(sessionId);
                setAvailableTeams(teams as Team[]);

                if (teams.length > 0) {
                    setSelectedTeamId(teams[0].id);
                } else {
                    setError('No teams are currently set up for this game session or the session ID is incorrect. Please wait for the facilitator or check the ID.');
                }
            } catch (err) {
                console.error("[TeamLogin] Error fetching teams:", err);
                setError(`Failed to load teams: ${formatSupabaseError(err)}`);
            } finally {
                setIsLoadingTeams(false);
            }
        };

        if (connection.isConnected) {
            fetchTeams();
        } else if (connection.status === 'error') {
            setError(`Connection error: ${connection.error}`);
            setIsLoadingTeams(false);
        }
    }, [sessionId, connection.isConnected, connection.status, connection.error]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId) {
            setError('Please select a team.');
            return;
        }
        if (!passcode.trim()) {
            setError('Please enter the team passcode.');
            return;
        }

        setIsLoggingIn(true);
        setError('');

        try {
            const verifiedTeam = await db.teams.verifyLogin(
                selectedTeamId,
                sessionId,
                passcode.trim()
            );

            if (verifiedTeam) {
                onLoginSuccess(verifiedTeam.id, verifiedTeam.name);
            } else {
                setError('Incorrect passcode or invalid team for this session.');
            }
        } catch (err) {
            console.error("[TeamLogin] Login error:", err);
            setError(`Login failed: ${formatSupabaseError(err)}`);
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Show connection error prominently
    if (connection.status === 'error' && !connection.isConnected) {
        return (
            <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-red-400"/>
                    <h2 className="text-xl font-bold mb-2">Connection Problem</h2>
                    <p className="mb-4">{connection.error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md p-8 bg-gray-700 rounded-xl shadow-2xl">
                <div className="flex justify-center mb-6">
                    <Users size={48} className="text-blue-400"/>
                </div>
                <h2 className="text-2xl font-bold text-center text-blue-300 mb-2">Team Login</h2>
                <p className="text-center text-gray-400 mb-6 text-sm">
                    Select your team and enter the passcode provided by your facilitator.
                </p>

                {isLoadingTeams && (
                    <div className="flex items-center justify-center p-4 my-4 bg-gray-600/50 rounded-md">
                        <Hourglass size={20} className="animate-spin mr-2 text-sky-400"/>
                        <span className="text-sky-300 text-sm">Loading available teams...</span>
                    </div>
                )}

                {error && !isLoadingTeams && (
                    <div className="mb-4 p-3 bg-red-500/30 text-red-300 border border-red-500/50 rounded-md text-sm flex items-start">
                        <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0"/>
                        <span>{error}</span>
                    </div>
                )}

                {!isLoadingTeams && availableTeams.length > 0 && (
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
                )}

                {!isLoadingTeams && availableTeams.length === 0 && !error && (
                    <p className="text-center text-yellow-400 text-sm my-4">
                        No teams found for this session ID. Please ensure the Session ID in your URL is correct and that the facilitator has started the game.
                    </p>
                )}

                <p className="text-xs text-gray-500 mt-6 text-center">Session ID: {sessionId}</p>
            </div>
        </div>
    );
};

export default TeamLogin;