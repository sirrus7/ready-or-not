// src/pages/TeamDisplayPage/index.tsx - Updated with logout functionality
import React from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Smartphone } from 'lucide-react';
import { useSupabaseConnection } from '../../utils/supabase';
import { useTeamBroadcast } from './hooks/useTeamBroadcast';
import { useDecisionSubmission } from './hooks/useDecisionSubmission';
import TeamLogin from '../../components/Game/TeamLogin';
import TeamLogout from '../../components/Game/TeamLogout';
import TeamStatusDisplay from './components/TeamStatusDisplay';
import DecisionModeContainer from './components/DecisionModeContainer';
import ConnectionStatus from './components/ConnectionStatus';

const TeamDisplayPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const connection = useSupabaseConnection();

    // Team login state
    const [loggedInTeamId, setLoggedInTeamId] = React.useState<string | null>(
        localStorage.getItem(`ron_teamId_${sessionId}`)
    );
    const [loggedInTeamName, setLoggedInTeamName] = React.useState<string | null>(
        localStorage.getItem(`ron_teamName_${sessionId}`)
    );

    // Broadcast integration for receiving teacher updates
    const broadcastState = useTeamBroadcast({
        sessionId: sessionId || null,
        loggedInTeamId
    });

    // Decision submission logic
    const decisionSubmission = useDecisionSubmission({
        sessionId: sessionId || null,
        teamId: loggedInTeamId,
        currentPhase: broadcastState.currentActivePhase
    });

    // Handle login success
    const handleLoginSuccess = (teamId: string, teamName: string) => {
        localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
        localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
    };

    // Handle logout
    const handleLogout = () => {
        setLoggedInTeamId(null);
        setLoggedInTeamName(null);
        // localStorage is cleared by the TeamLogout component
    };

    // Show connection error prominently
    if (connection.status === 'error' && !connection.isConnected) {
        return (
            <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
                <AlertTriangle size={48} className="mb-4 text-yellow-300"/>
                <h1 className="text-2xl font-bold mb-2 text-center">Connection Problem</h1>
                <p className="text-center mb-4 px-4">{connection.error}</p>
                <div className="flex gap-3">
                    <button onClick={connection.forceReconnect} className="px-6 py-3 bg-yellow-400 text-red-900 font-semibold rounded-lg hover:bg-yellow-300 transition-colors">
                        Reconnect
                    </button>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    // Show invalid session
    if (!sessionId) {
        return (
            <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <Smartphone size={48} className="mx-auto mb-4 text-red-400"/>
                    <p className="text-lg">Error: Invalid session link. Please check the URL.</p>
                </div>
            </div>
        );
    }

    // Show login if not authenticated
    if (!loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId} onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col touch-manipulation">
            {/* Team Logout Button */}
            <TeamLogout
                teamName={loggedInTeamName}
                sessionId={sessionId}
                onLogout={handleLogout}
            />

            {/* Team Status (KPIs) - Fixed header */}
            <TeamStatusDisplay
                teamName={loggedInTeamName}
                currentPhase={broadcastState.currentActivePhase}
                teamKpis={broadcastState.currentTeamKpis}
                isLoading={broadcastState.isLoadingKpis}
            />

            {/* Main Content Area */}
            <div className="flex-1 min-h-0">
                {broadcastState.isDecisionTime ? (
                    <DecisionModeContainer
                        sessionId={sessionId}
                        teamId={loggedInTeamId}
                        currentPhase={broadcastState.currentActivePhase}
                        timeRemainingSeconds={broadcastState.timeRemainingSeconds}
                        submissionState={decisionSubmission}
                        gameStructure={broadcastState.gameStructure}
                        decisionOptionsKey={broadcastState.decisionOptionsKey}
                    />
                ) : (
                    <div className="h-full overflow-y-auto">
                        <div className="p-3 md:p-4 min-h-full flex flex-col">
                            <div className="flex-1 flex items-center justify-center">
                                <div className="max-w-xl w-full">
                                    {/* Show current slide or waiting state */}
                                    {broadcastState.currentActiveSlide ? (
                                        <div className="text-center p-6 bg-gray-800 rounded-xl shadow-lg">
                                            <h3 className="text-xl font-semibold text-sky-400 mb-3">
                                                {broadcastState.currentActiveSlide.title || broadcastState.currentActivePhase?.label || "Current Activity"}
                                            </h3>
                                            {broadcastState.currentActiveSlide.main_text && (
                                                <p className="text-lg text-gray-200 mb-2">{broadcastState.currentActiveSlide.main_text}</p>
                                            )}
                                            {broadcastState.currentActiveSlide.sub_text && (
                                                <p className="text-sm text-gray-300 mb-4">{broadcastState.currentActiveSlide.sub_text}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-12">
                                            <p className="text-lg">Waiting for facilitator to start next phase...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Connection Status Indicator */}
            <ConnectionStatus connection={connection} />
        </div>
    );
};

export default TeamDisplayPage;
