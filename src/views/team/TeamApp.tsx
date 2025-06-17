// src/views/team/TeamApp.tsx
// PRODUCTION-GRADE FIXED VERSION - Removed BroadcastChannel usage, implements proper Supabase real-time only

/**
 * COMMUNICATION ARCHITECTURE RULE:
 * - Host ↔ Presentation Display: Use BroadcastChannel (same device)
 * - Host ↔ Team Apps: Use Supabase Real-time ONLY (different devices)
 * - Team Apps: NEVER use BroadcastChannel - it won't work cross-device
 */

import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {Bug} from 'lucide-react';
import {PermanentKpiAdjustment} from '@shared/types';
import {db} from '@shared/services/supabase';
import {useRealtimeSubscription} from '@shared/services/supabase';
import TeamLogin from '@views/team/components/TeamLogin/TeamLogin';
import TeamLogout from '@views/team/components/TeamLogin/TeamLogout';
import TeamStatusDisplay from '@views/team/components/GameStatus/TeamStatus';
import DecisionModeContainer from '@views/team/components/InteractionPanel/DecisionContainer';
import KpiImpactCards from '@views/team/components/GameStatus/KpiImpactCards';
import {useTeamGameState} from '@views/team/hooks/useTeamGameState';

const TeamDebugPanel: React.FC<{
    sessionId: string | null;
    teamId: string | null;
    teamGameState: ReturnType<typeof useTeamGameState>;
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
                                teamGameState.connectionStatus === 'connecting' ?
                                    'text-yellow-400' : 'text-red-400'}`}>
                            {teamGameState.connectionStatus || 'unknown'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Decision Time:</span>
                        <span className={`ml-1 ${teamGameState.isDecisionTime ?
                            'text-green-400' : 'text-gray-400'}`}>
                            {teamGameState.isDecisionTime ? 'YES' : 'NO'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Current Slide:</span>
                        <span className="ml-1 text-cyan-300">
                            {teamGameState.currentActiveSlide?.title || 'None'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">KPIs Loading:</span>
                        <span className={`ml-1 ${teamGameState.isLoadingKpis ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {teamGameState.isLoadingKpis ? 'YES' : 'NO'}
                        </span>
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
    const [showDebugPanel, setShowDebugPanel] = useState(false);
    const [permanentAdjustments, setPermanentAdjustments] = useState<PermanentKpiAdjustment[]>([]);
    const [loadingAdjustments, setLoadingAdjustments] = useState(false);

    const teamGameState = useTeamGameState({
        sessionId: sessionId || null,
        loggedInTeamId
    });

    // Load permanent adjustments when team/session changes
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            setPermanentAdjustments([]);
            return;
        }

        const loadPermanentAdjustments = async () => {
            setLoadingAdjustments(true);
            try {
                const adjustments = await db.adjustments.getBySession(sessionId);
                setPermanentAdjustments(adjustments);
                console.log('[TeamApp] Loaded permanent adjustments:', adjustments.length);
            } catch (error) {
                console.error('[TeamApp] Failed to load permanent adjustments:', error);
            } finally {
                setLoadingAdjustments(false);
            }
        };

        loadPermanentAdjustments();
    }, [sessionId, loggedInTeamId]);

    // SUPABASE REAL-TIME: Listen for KPI updates to refresh permanent adjustments (REPLACES BroadcastChannel)
    useRealtimeSubscription(
        `team-kpi-adjustments-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            filter: `session_id=eq.${sessionId}`,
            event: 'UPDATE',
            onchange: (payload) => {
                console.log('[TeamApp] KPI update detected via Supabase real-time:', payload);

                // Check if this update is for our team
                if (payload.new?.team_id === loggedInTeamId) {
                    console.log('[TeamApp] KPI update detected for our team, refreshing permanent adjustments');

                    // Refresh permanent adjustments when KPI updates come in
                    const refreshPermanentAdjustments = async () => {
                        setLoadingAdjustments(true);
                        try {
                            const adjustments = await db.adjustments.getBySession(sessionId!);
                            setPermanentAdjustments(adjustments);
                            console.log('[TeamApp] Refreshed permanent adjustments after KPI update');
                        } catch (error) {
                            console.error('[TeamApp] Failed to refresh permanent adjustments:', error);
                        } finally {
                            setLoadingAdjustments(false);
                        }
                    };

                    refreshPermanentAdjustments();
                }
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // SUPABASE REAL-TIME: Listen for new permanent adjustments (REPLACES BroadcastChannel)
    useRealtimeSubscription(
        `permanent-adjustments-${sessionId}`,
        {
            table: 'permanent_kpi_adjustments',
            filter: `session_id=eq.${sessionId}`,
            event: 'INSERT',
            onchange: (payload) => {
                console.log('[TeamApp] New permanent adjustment detected via Supabase real-time:', payload);

                // Refresh permanent adjustments when new ones are added
                const refreshPermanentAdjustments = async () => {
                    try {
                        const adjustments = await db.adjustments.getBySession(sessionId!);
                        setPermanentAdjustments(adjustments);
                        console.log('[TeamApp] Refreshed permanent adjustments after new adjustment');
                    } catch (error) {
                        console.error('[TeamApp] Failed to refresh permanent adjustments:', error);
                    }
                };

                refreshPermanentAdjustments();
            }
        },
        !!sessionId
    );

    // Toggle debug panel visibility
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.shiftKey && event.key.toLowerCase() === 'd') {
                setShowDebugPanel(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    if (!sessionId) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                <div className="text-center text-white p-8">
                    <h2 className="text-2xl font-bold mb-4">Invalid Session</h2>
                    <p>No session ID provided in the URL.</p>
                </div>
            </div>
        );
    }

    if (!loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId || ''} onLoginSuccess={(teamId, teamName) => {
            setLoggedInTeamId(teamId);
            setLoggedInTeamName(teamName);
        }}/>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col touch-manipulation">
            <button onClick={() => setShowDebugPanel(!showDebugPanel)}
                    className="fixed top-16 right-4 z-30 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
                    title="Toggle Debug Info">
                <Bug size={16}/>
            </button>

            <TeamDebugPanel
                sessionId={sessionId}
                teamId={loggedInTeamId}
                teamGameState={teamGameState}
                isVisible={showDebugPanel}
            />

            <TeamLogout
                teamName={loggedInTeamName}
                sessionId={sessionId!}
                onLogout={() => {
                    setLoggedInTeamId(null);
                    setLoggedInTeamName(null);
                    setPermanentAdjustments([]); // Clear adjustments on logout
                }}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <TeamStatusDisplay
                    teamName={loggedInTeamName}
                    currentSlide={teamGameState.currentActiveSlide}
                    teamKpis={teamGameState.currentTeamKpis}
                    isLoading={teamGameState.isLoadingKpis}
                />

                {/* Content */}
                {teamGameState.isDecisionTime ? (
                    <DecisionModeContainer
                        sessionId={sessionId}
                        teamId={loggedInTeamId}
                        currentSlide={teamGameState.currentActiveSlide}
                        gameStructure={teamGameState.gameStructure}/>
                ) : (
                    <div className="h-full overflow-y-auto">
                        <div className="p-3 md:p-4 min-h-full flex flex-col">
                            <div className="flex-1 flex items-center justify-center">
                                <div className="max-w-xl w-full">
                                    {teamGameState.currentActiveSlide ? (
                                        <div className="text-center p-6 bg-gray-800 rounded-xl shadow-lg">
                                            <h3 className="text-xl font-semibold text-sky-400 mb-3">
                                                {teamGameState.currentActiveSlide.title || "Current Activity"}
                                            </h3>
                                            {teamGameState.currentActiveSlide.main_text &&
                                                <p className="text-lg text-gray-200 mb-2">
                                                    {teamGameState.currentActiveSlide.main_text}
                                                </p>}
                                            {teamGameState.currentActiveSlide.sub_text &&
                                                <p className="text-sm text-gray-300 mb-4">
                                                    {teamGameState.currentActiveSlide.sub_text}
                                                </p>}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-12">
                                            <p className="text-lg">Waiting for facilitator...</p>
                                        </div>
                                    )}

                                    {/* KPI Impact Cards - only show if we have adjustments and not loading */}
                                    {!loadingAdjustments && permanentAdjustments.length > 0 && (
                                        <div className="mt-6">
                                            <KpiImpactCards
                                                teamId={loggedInTeamId}
                                                currentRound={teamGameState.currentActiveSlide?.round_number || 1}
                                                permanentAdjustments={permanentAdjustments}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Debug Panel */}
            <TeamDebugPanel
                sessionId={sessionId}
                teamId={loggedInTeamId}
                teamGameState={teamGameState}
                isVisible={showDebugPanel}
            />

            {/* Debug toggle hint */}
            <div className="fixed bottom-4 left-4 text-xs text-gray-500">
                <button
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    className="flex items-center gap-1 hover:text-gray-400"
                >
                    <Bug size={12}/>
                    Debug
                </button>
            </div>
        </div>
    );
};

export default TeamApp;
