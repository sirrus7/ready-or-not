// src/components/Game/TeamLogin.tsx
import React, { useState, useEffect } from 'react';
import { db, useSupabaseConnection } from '../../utils/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabaseOperation'
import { LogIn, Users, Hourglass, AlertTriangle } from 'lucide-react';

interface TeamLoginProps {
    sessionId: string;
    onLoginSuccess: (teamId: string, teamName: string) => void;
}

const TeamLogin: React.FC<TeamLoginProps> = ({ sessionId, onLoginSuccess }) => {
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [passcode, setPasscode] = useState<string>('');
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
    const [loginError, setLoginError] = useState<string>('');

    const connection = useSupabaseConnection();

    const {
        data: availableTeams = [],
        isLoading: isLoadingTeams,
        error: teamsError,
        refresh: refetchTeams
    } = useSupabaseQuery(
        () => db.teams.getBySession(sessionId),
        [sessionId],
        {
            cacheKey: `teams-${sessionId}`,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
            retryOnError: true,
            maxRetries: 2,
            onError: (error) => {
                console.error("[TeamLogin] Error fetching teams:", error);
            }
        }
    );

    // Set initial team selection
    useEffect(() => {
        if (availableTeams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(availableTeams[0].id);
        }
    }, [availableTeams, selectedTeamId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId) {
            setLoginError('Please select a team.');
            return;
        }
        if (!passcode.trim()) {
            setLoginError('Please enter the team passcode.');
            return;
        }

        setIsLoggingIn(true);
        setLoginError('');

        try {
            const verifiedTeam = await db.teams.verifyLogin(
                selectedTeamId,
                sessionId,
                passcode.trim()
            );

            if (verifiedTeam) {
                onLoginSuccess(verifiedTeam.id, verifiedTeam.name);
            } else {
                setLoginError('Incorrect passcode or invalid team for this session.');
            }
        } catch (err) {
            console.error("[TeamLogin] Login error:", err);
            setLoginError(`Login failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={connection.forceReconnect}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Retry Connection
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Reload Page
                        </button>
                    </div>
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

                {(loginError || teamsError) && !isLoadingTeams && (
                    <div className="mb-4 p-3 bg-red-500/30 text-red-300 border border-red-500/50 rounded-md text-sm flex items-start">
                        <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0"/>
                        <div>
                            <span>{loginError || teamsError}</span>
                            {teamsError && (
                                <button
                                    onClick={refetchTeams}
                                    className="block mt-2 text-xs text-red-200 underline hover:text-red-100"
                                >
                                    Try again
                                </button>
                            )}
                        </div>
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

                {!isLoadingTeams && availableTeams.length === 0 && !teamsError && (
                    <div className="text-center">
                        <p className="text-yellow-400 text-sm my-4">
                            No teams found for this session ID. Please ensure the Session ID in your URL is correct and that the facilitator has started the game.
                        </p>
                        <button
                            onClick={refetchTeams}
                            className="text-sm text-blue-400 underline hover:text-blue-300"
                        >
                            Refresh teams list
                        </button>
                    </div>
                )}

                <p className="text-xs text-gray-500 mt-6 text-center">Session ID: {sessionId}</p>

                {/* Connection status indicator */}
                <div className="mt-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        connection.isConnected
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                    }`}>
                        {connection.isConnected ? '● Connected' : '● Connecting...'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TeamLogin;