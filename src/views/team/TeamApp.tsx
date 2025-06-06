// src/views/team/TeamApp.tsx
import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {Bug} from 'lucide-react';
import {useSupabaseConnection} from '@shared/services/supabase';
import {GameSessionManager} from '@core/game/GameSessionManager';
import {useTeamGameState} from './hooks/useTeamGameState';
import TeamLogin from './components/TeamLogin/TeamLogin';
import TeamLogout from './components/TeamLogin/TeamLogout';
import TeamStatusDisplay from './components/GameStatus/TeamStatus';
import DecisionModeContainer from './components/InteractionPanel/DecisionContainer';
import ConnectionStatus from './components/GameStatus/ConnectionStatus';

type SessionStatus = 'loading' | 'draft' | 'active' | 'notfound' | 'error';

const TeamApp: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const connection = useSupabaseConnection();

    const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [lastCheckTime, setLastCheckTime] = useState<number>(Date.now());
    const [showDebug, setShowDebug] = useState<boolean>(false);

    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(
        sessionId ? localStorage.getItem(`ron_teamId_${sessionId}`) : null
    );
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(
        sessionId ? localStorage.getItem(`ron_teamName_${sessionId}`) : null
    );

    // REFACTOR: This hook now provides the live game state.
    const teamGameState = useTeamGameState({
        sessionId: sessionStatus === 'active' ? sessionId || null : null,
        loggedInTeamId: sessionStatus === 'active' ? loggedInTeamId : null
    });

    const checkSessionStatus = React.useCallback(async () => {
        if (!sessionId) {
            setSessionStatus('notfound');
            return;
        }
        try {
            setSessionError(null);
            const sessionManager = GameSessionManager.getInstance();
            const statusInfo = await sessionManager.getSessionStatus(sessionId);
            if (!statusInfo.exists) setSessionStatus('notfound');
            else if (statusInfo.status === 'draft') setSessionStatus('draft');
            else setSessionStatus('active');
            setLastCheckTime(Date.now());
        } catch (error) {
            setSessionError(error instanceof Error ? error.message : 'Failed to check session status');
            setSessionStatus('error');
        }
    }, [sessionId]);

    useEffect(() => {
        checkSessionStatus();
    }, [checkSessionStatus]);

    useEffect(() => {
        if (sessionStatus === 'draft') {
            const interval = setInterval(checkSessionStatus, 30000);
            return () => clearInterval(interval);
        }
    }, [sessionStatus, checkSessionStatus]);

    const handleLoginSuccess = (teamId: string, teamName: string) => {
        if (sessionId) {
            localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
            localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
            setLoggedInTeamId(teamId);
            setLoggedInTeamName(teamName);
        }
    };

    const handleLogout = () => {
        setLoggedInTeamId(null);
        setLoggedInTeamName(null);
    };

    if (connection.status === 'error' && !connection.isConnected) {
        return <div
            className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">...</div>; // Error UI
    }
    if (sessionStatus === 'notfound') {
        return <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">...</div>; // Not Found UI
    }
    if (sessionStatus === 'error') {
        return <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">...</div>; // Error UI
    }
    if (sessionStatus === 'loading') {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">...</div>; // Loading UI
    }
    if (sessionStatus === 'draft') {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">...</div>; // Draft UI
    }

    if (!loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId!} onLoginSuccess={handleLoginSuccess}/>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col touch-manipulation">
            <button onClick={() => setShowDebug(!showDebug)}
                    className="fixed top-16 right-4 z-30 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
                    title="Toggle Debug Info">
                <Bug size={16}/>
            </button>
            {showDebug && (
                <div className="fixed top-20 right-4 z-20 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm">
                    <h4 className="font-bold mb-2">Debug Info</h4>
                    <div className="space-y-1">
                        <div>Session: {sessionId?.substring(0, 8)}...</div>
                        <div>Team: {loggedInTeamId?.substring(0, 8)}...</div>
                        <div>Connection: {teamGameState.connectionStatus}</div>
                        <div>Current Slide ID: {teamGameState.currentActiveSlide?.id || 'None'}</div>
                        <div>Slide Type: {teamGameState.currentActiveSlide?.type || 'None'}</div>
                        <div>Is Decision Time: {teamGameState.isDecisionTime ? 'YES' : 'NO'}</div>
                        <div>Timer: {teamGameState.timeRemainingSeconds ?? 'N/A'}</div>
                    </div>
                </div>
            )}
            <TeamLogout teamName={loggedInTeamName} sessionId={sessionId!} onLogout={handleLogout}/>

            <TeamStatusDisplay
                teamName={loggedInTeamName}
                // REFACTOR: Pass the slide from the hook directly
                currentSlide={teamGameState.currentActiveSlide}
                teamKpis={teamGameState.currentTeamKpis}
                isLoading={teamGameState.isLoadingKpis}
            />

            <div className="flex-1 min-h-0">
                {teamGameState.isDecisionTime ? (
                    <DecisionModeContainer
                        sessionId={sessionId!}
                        teamId={loggedInTeamId}
                        // REFACTOR: Pass the slide from the hook directly
                        currentSlide={teamGameState.currentActiveSlide}
                        timeRemainingSeconds={teamGameState.timeRemainingSeconds}
                        gameStructure={teamGameState.gameStructure}
                    />
                ) : (
                    <div className="h-full overflow-y-auto">
                        <div className="p-3 md:p-4 min-h-full flex flex-col">
                            <div className="flex-1 flex items-center justify-center">
                                <div className="max-w-xl w-full">
                                    {teamGameState.currentActiveSlide ? (
                                        <div className="text-center p-6 bg-gray-800 rounded-xl shadow-lg">
                                            <h3 className="text-xl font-semibold text-sky-400 mb-3">{teamGameState.currentActiveSlide.title || "Current Activity"}</h3>
                                            {teamGameState.currentActiveSlide.main_text &&
                                                <p className="text-lg text-gray-200 mb-2">{teamGameState.currentActiveSlide.main_text}</p>}
                                            {teamGameState.currentActiveSlide.sub_text &&
                                                <p className="text-sm text-gray-300 mb-4">{teamGameState.currentActiveSlide.sub_text}</p>}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-12">
                                            <p className="text-lg">Waiting for facilitator...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConnectionStatus connection={connection}/>
        </div>
    );
};

export default TeamApp;
