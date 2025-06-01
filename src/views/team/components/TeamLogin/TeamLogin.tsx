// src/components/Game/TeamLogin/index.tsx - Clean main orchestration component
import React from 'react';
import {Users} from 'lucide-react';
import {useSupabaseConnection} from '@shared/services/supabase';
import {useTeamLogin} from '@views/team/hooks/useTeamLogin';
import ConnectionError from "./ConnectionError"
import LoadingState from './LoadingState';
import ErrorDisplay from './ErrorDisplay';
import LoginForm from './LoginForm';
import NoTeamsMessage from './NoTeamsMessage';
import ConnectionStatus from './ConnectionStatus';

interface TeamLoginProps {
    sessionId: string;
    onLoginSuccess: (teamId: string, teamName: string) => void;
}

const TeamLogin: React.FC<TeamLoginProps> = ({sessionId, onLoginSuccess}) => {
    const connection = useSupabaseConnection();

    const {
        availableTeams,
        isLoadingTeams,
        teamsError,
        refetchTeams,
        selectedTeamId,
        setSelectedTeamId,
        passcode,
        setPasscode,
        isLoggingIn,
        loginError,
        handleLogin
    } = useTeamLogin({sessionId, onLoginSuccess});

    // Show connection error prominently
    if (connection.status === 'error' && !connection.isConnected) {
        return <ConnectionError connection={connection}/>;
    }

    return (
        <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md p-8 bg-gray-700 rounded-xl shadow-2xl">
                {/* Header */}
                <div className="flex justify-center mb-6">
                    <Users size={48} className="text-blue-400"/>
                </div>
                <h2 className="text-2xl font-bold text-center text-blue-300 mb-2">Team Login</h2>
                <p className="text-center text-gray-400 mb-6 text-sm">
                    Select your team and enter the passcode provided by your facilitator.
                </p>

                {/* Loading State */}
                {isLoadingTeams && <LoadingState/>}

                {/* Error Display */}
                <ErrorDisplay
                    loginError={loginError}
                    teamsError={teamsError}
                    onRetry={refetchTeams}
                />

                {/* Main Content */}
                {!isLoadingTeams && availableTeams.length > 0 && (
                    <LoginForm
                        availableTeams={availableTeams}
                        selectedTeamId={selectedTeamId}
                        setSelectedTeamId={setSelectedTeamId}
                        passcode={passcode}
                        setPasscode={setPasscode}
                        onSubmit={handleLogin}
                        isLoggingIn={isLoggingIn}
                        isLoadingTeams={isLoadingTeams}
                    />
                )}

                {/* No Teams Message */}
                {!isLoadingTeams && availableTeams.length === 0 && !teamsError && (
                    <NoTeamsMessage sessionId={sessionId} onRefresh={refetchTeams}/>
                )}

                {/* Footer Info */}
                <p className="text-xs text-gray-500 mt-6 text-center">
                    Session ID: {sessionId}
                </p>

                {/* Connection Status */}
                <ConnectionStatus isConnected={connection.isConnected}/>
            </div>
        </div>
    );
};

export default TeamLogin;
