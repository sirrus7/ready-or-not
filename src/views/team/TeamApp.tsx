// Enhanced TeamApp.tsx with comprehensive debug panel
// Replace your existing TeamApp.tsx file with this complete version

import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {Bug} from 'lucide-react';
import TeamLogin from '@views/team/components/TeamLogin/TeamLogin';
import TeamLogout from '@views/team/components/TeamLogin/TeamLogout';
import TeamStatusDisplay from '@views/team/components/GameStatus/TeamStatus';
import DecisionModeContainer from '@views/team/components/InteractionPanel/DecisionContainer';
import {useTeamGameState} from '@views/team/hooks/useTeamGameState';

const TeamDebugPanel: React.FC<{
    sessionId: string | null;
    teamId: string | null;
    teamGameState: any;
    isVisible: boolean;
}> = ({sessionId, teamId, teamGameState, isVisible}) => {
    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshCount(c => c + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className="fixed top-20 right-4 z-20 bg-black/95 text-white p-4 rounded-lg text-xs max-w-sm border border-green-500">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-green-400">Team Debug Panel</h4>
                <span className="text-gray-400">#{refreshCount}</span>
            </div>
            <div className="space-y-1 text-xs">
                <div><span className="text-gray-400">Session:</span> {sessionId?.substring(0, 8)}...</div>
                <div><span className="text-gray-400">Team:</span> {teamId?.substring(0, 8)}...</div>
                <div className="border-t border-gray-600 pt-1 mt-1">
                    <div><span className="text-gray-400">Connection:</span>
                        <span className={`ml-1 ${
                            teamGameState.connectionStatus === 'connected' ? 'text-green-400' :
                                teamGameState.connectionStatus === 'connecting' ? 'text-yellow-400' :
                                    'text-red-400'
                        }`}>
                            {teamGameState.connectionStatus.toUpperCase()}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Current Slide:</span>
                        <span className="text-blue-400 ml-1">
                            {teamGameState.currentActiveSlide?.id || 'None'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Slide Type:</span>
                        <span className="text-purple-400 ml-1">
                            {teamGameState.currentActiveSlide?.type || 'None'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Interactive Key:</span>
                        <span className="text-cyan-400 ml-1">
                            {teamGameState.currentActiveSlide?.interactive_data_key || 'None'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Decision Time:</span>
                        <span
                            className={`ml-1 font-bold ${teamGameState.isDecisionTime ? 'text-green-400' : 'text-red-400'}`}>
                            {teamGameState.isDecisionTime ? 'YES' : 'NO'}
                        </span>
                    </div>
                </div>
                <div className="border-t border-gray-600 pt-1 mt-1">
                    <div className="text-gray-500 text-xs">
                        Last Update: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TeamApp: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(null);
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState<boolean>(false);

    const teamGameState = useTeamGameState({sessionId: sessionId || null, loggedInTeamId});

    useEffect(() => {
        document.title = "Ready or Not - Team";
    }, []);

    const handleLoginSuccess = (teamId: string, teamName: string) => {
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
    };

    const handleLogout = () => {
        setLoggedInTeamId(null);
        setLoggedInTeamName(null);
    };

    if (!sessionId || !loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId || ''} onLoginSuccess={handleLoginSuccess}/>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col touch-manipulation">
            <button onClick={() => setShowDebug(!showDebug)}
                    className="fixed top-16 right-4 z-30 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
                    title="Toggle Debug Info">
                <Bug size={16}/>
            </button>

            <TeamDebugPanel
                sessionId={sessionId}
                teamId={loggedInTeamId}
                teamGameState={teamGameState}
                isVisible={showDebug}
            />

            <TeamLogout teamName={loggedInTeamName} sessionId={sessionId!} onLogout={handleLogout}/>
            <TeamStatusDisplay teamName={loggedInTeamName} currentSlide={teamGameState.currentActiveSlide}
                               teamKpis={teamGameState.currentTeamKpis} isLoading={teamGameState.isLoadingKpis}/>
            <div className="flex-1 min-h-0">
                {teamGameState.isDecisionTime ? (
                    <DecisionModeContainer sessionId={sessionId!} teamId={loggedInTeamId}
                                           currentSlide={teamGameState.currentActiveSlide}
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
        </div>
    );
};

export default TeamApp;
