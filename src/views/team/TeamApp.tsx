// src/views/team/TeamApp.tsx
import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {AlertTriangle, Smartphone, Clock, RefreshCw, CheckCircle, Bug} from 'lucide-react';
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
        return (
            <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
                <AlertTriangle size={48} className="mb-4 text-yellow-300"/>
                <h1 className="text-2xl font-bold mb-2 text-center">Connection Problem</h1>
                <p className="text-center mb-4 px-4">{connection.error}</p>
                <div className="flex gap-3">
                    <button
                        onClick={connection.forceReconnect}
                        className="px-6 py-3 bg-yellow-400 text-red-900 font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
                    >
                        Reconnect
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'notfound') {
        return (
            <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <Smartphone size={48} className="mx-auto mb-4 text-red-400"/>
                    <h2 className="text-2xl font-bold mb-2">Session Not Found</h2>
                    <p className="text-gray-300 mb-4">
                        The game session you're trying to access doesn't exist or has been removed.
                    </p>
                    <p className="text-sm text-gray-400">
                        Please check your link or contact your facilitator.
                    </p>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'error') {
        return (
            <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-red-400"/>
                    <h2 className="text-2xl font-bold mb-2">Session Error</h2>
                    <p className="text-gray-300 mb-4">{sessionError || 'There was a problem accessing this game session.'}</p>
                    <button onClick={checkSessionStatus}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                        <RefreshCw size={16}/> Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-lg">Checking game session...</p>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'draft') {
        const timeSinceCheck = Math.floor((Date.now() - lastCheckTime) / 1000);
        const nextCheckIn = Math.max(0, 30 - timeSinceCheck);
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
                <div className="text-center max-w-lg">
                    <Clock size={48} className="mx-auto mb-4 text-yellow-400"/>
                    <h2 className="text-2xl font-bold mb-4">Game Not Yet Started</h2>
                    <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-6 mb-6">
                        <p className="text-yellow-200 mb-3">This game session is still being set up by your facilitator.
                            Please wait for them to finalize and start the game.</p>
                        <div className="flex items-center justify-center text-sm text-yellow-300">
                            <RefreshCw size={14} className="mr-2"/>
                            <span>Checking for updates every 30 seconds</span>
                        </div>
                        {nextCheckIn > 0 &&
                            <p className="text-xs text-yellow-400 mt-2">Next check in {nextCheckIn} seconds</p>}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button onClick={checkSessionStatus}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center">
                            <RefreshCw size={16}/> Check Now
                        </button>
                        <button onClick={() => window.location.reload()}
                                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition-colors">Reload
                            Page
                        </button>
                    </div>
                    <div className="mt-8 text-left bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center"><CheckCircle
                            size={14} className="mr-2 text-green-400"/> Session Information</h3>
                        <div className="text-xs text-gray-400 space-y-1">
                            <div>Session ID: <span
                                className="font-mono text-blue-300">{sessionId?.substring(0, 8)}...</span></div>
                            <div>Status: <span className="text-yellow-300 font-medium">Draft (Being Set Up)</span></div>
                            <div>Your login credentials will work once the game starts</div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
            <TeamStatusDisplay teamName={loggedInTeamName} currentSlide={teamGameState.currentActiveSlide}
                               teamKpis={teamGameState.currentTeamKpis} isLoading={teamGameState.isLoadingKpis}/>
            <div className="flex-1 min-h-0">
                {teamGameState.isDecisionTime ? (
                    <DecisionModeContainer sessionId={sessionId!} teamId={loggedInTeamId}
                                           currentSlide={teamGameState.currentActiveSlide}
                                           timeRemainingSeconds={teamGameState.timeRemainingSeconds}
                                           gameStructure={teamGameState.gameStructure}/>
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
