// src/views/team/TeamApp.tsx
// FINAL PRODUCTION VERSION - No Real-time Connections (handled by useTeamGameState)

/**
 * ============================================================================
 * TEAM APPLICATION MAIN COMPONENT
 * ============================================================================
 *
 * COMMUNICATION ARCHITECTURE:
 * - This component does NOT create any real-time subscriptions
 * - All real-time communication is handled by useTeamGameState hook
 * - Maintains single WebSocket connection per team app
 *
 * RESPONSIBILITIES:
 * 1. User authentication (team login/logout)
 * 2. Game state display (current slide, KPIs, status)
 * 3. Decision interface when required
 * 4. Debug panel for development
 *
 * REAL-TIME UPDATES:
 * All handled automatically by useTeamGameState:
 * - Slide changes from host
 * - Decision resets from host
 * - Consequence KPI updates
 * ============================================================================
 */

import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {Bug} from 'lucide-react';
import {PermanentKpiAdjustment} from '@shared/types';
import {db} from '@shared/services/supabase';
import TeamLogin from '@views/team/components/TeamLogin/TeamLogin';
import TeamLogout from '@views/team/components/TeamLogin/TeamLogout';
import TeamStatusDisplay from '@views/team/components/GameStatus/TeamStatus';
import DecisionModeContainer from '@views/team/components/InteractionPanel/DecisionContainer';
import KpiImpactCards from '@views/team/components/GameStatus/KpiImpactCards';
import {useTeamGameState} from '@views/team/hooks/useTeamGameState';

// ============================================================================
// DEBUG PANEL COMPONENT
// ============================================================================
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

// ============================================================================
// MAIN TEAM APP COMPONENT
// ============================================================================
const TeamApp: React.FC = () => {
    // ========================================================================
    // ROUTE AND STATE MANAGEMENT
    // ========================================================================
    const {sessionId} = useParams<{ sessionId: string }>();
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(null);
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(null);
    const [showDebugPanel, setShowDebugPanel] = useState(false);
    const [permanentAdjustments, setPermanentAdjustments] = useState<PermanentKpiAdjustment[]>([]);
    const [loadingAdjustments, setLoadingAdjustments] = useState(false);

    console.log('🏢 TeamApp initialized:', {
        sessionId,
        loggedInTeamId,
        loggedInTeamName
    });

    // ========================================================================
    // GAME STATE HOOK - SINGLE REAL-TIME CONNECTION
    // This is the ONLY hook that creates real-time subscriptions
    // ========================================================================
    const teamGameState = useTeamGameState({
        sessionId: sessionId || null,
        loggedInTeamId
    });

    // ========================================================================
    // PERMANENT ADJUSTMENTS MANAGEMENT
    // Load permanent KPI adjustments when team/session changes
    // ========================================================================
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            setPermanentAdjustments([]);
            return;
        }

        const loadPermanentAdjustments = async () => {
            setLoadingAdjustments(true);
            try {
                console.log('🏢 Loading permanent adjustments for session:', sessionId);
                const adjustments = await db.adjustments.getBySession(sessionId);
                setPermanentAdjustments(adjustments);
                console.log('🏢 Loaded permanent adjustments:', adjustments.length);
            } catch (error) {
                console.error('🏢 Failed to load permanent adjustments:', error);
                setPermanentAdjustments([]); // Set empty array on error
            } finally {
                setLoadingAdjustments(false);
            }
        };

        loadPermanentAdjustments();
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // TEAM AUTHENTICATION HANDLERS
    // ========================================================================
    const handleTeamLogin = (teamId: string, teamName: string) => {
        console.log('🏢 Team logged in:', teamName, teamId);
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
    };

    const handleTeamLogout = () => {
        console.log('🏢 Team logged out');
        setLoggedInTeamId(null);
        setLoggedInTeamName(null);
    };

    // ========================================================================
    // RENDER LOGIC
    // ========================================================================

    // Show login screen if not authenticated
    if (!loggedInTeamId || !loggedInTeamName) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <TeamLogin
                    sessionId={sessionId || ''}
                    onLoginSuccess={(teamId: string, teamName: string) => handleTeamLogin(teamId, teamName)}
                />
            </div>
        );
    }

    // Main application interface
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* ================================================================ */}
            {/* HEADER WITH TEAM INFO AND LOGOUT */}
            {/* ================================================================ */}
            <div className="relative">
                <div className="absolute top-4 left-4 z-10">
                    <div className="text-center">
                        <div className="text-xl font-bold text-sky-400">Team: {loggedInTeamName}</div>
                        <div className="text-sm text-gray-400">ID: {loggedInTeamId.substring(0, 8)}</div>
                    </div>
                </div>

                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {/* Debug Panel Toggle */}
                    <button
                        onClick={() => setShowDebugPanel(!showDebugPanel)}
                        className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                        title="Toggle Debug Panel"
                    >
                        <Bug size={20} className="text-gray-400"/>
                    </button>

                    {/* Logout Button */}
                    <TeamLogout
                        teamName={loggedInTeamName}
                        sessionId={sessionId || ''}
                        onLogout={() => handleTeamLogout()}
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* DEBUG PANEL */}
            {/* ================================================================ */}
            <TeamDebugPanel
                sessionId={sessionId || null}
                teamId={loggedInTeamId}
                teamGameState={teamGameState}
                isVisible={showDebugPanel}
            />

            {/* ================================================================ */}
            {/* TEAM STATUS DISPLAY */}
            {/* Always visible - shows KPIs and current status */}
            {/* ================================================================ */}
            <div className="pt-20 pb-4">
                <TeamStatusDisplay
                    teamName={loggedInTeamName}
                    currentSlide={teamGameState.currentActiveSlide}
                    teamKpis={teamGameState.currentTeamKpis}
                    isLoading={teamGameState.isLoadingKpis}
                />
            </div>

            {/* ================================================================ */}
            {/* MAIN CONTENT AREA */}
            {/* ================================================================ */}
            <div className="px-4 pb-4">
                {/* DECISION MODE - Only shown when isDecisionTime is true */}
                {teamGameState.isDecisionTime ? (
                    <div className="mb-6">
                        <div className="text-center mb-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                            <h2 className="text-xl font-bold text-yellow-400 mb-2">Decision Required</h2>
                            <p className="text-gray-300">
                                {teamGameState.currentActiveSlide?.title || "Interactive Phase"}
                            </p>
                        </div>

                        <DecisionModeContainer
                            sessionId={sessionId || ''}
                            teamId={loggedInTeamId || ''}
                            currentSlide={teamGameState.currentActiveSlide}
                            gameStructure={teamGameState.gameStructure}
                        />
                    </div>
                ) : (
                    /* PASSIVE MODE - Show current slide information */
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
                                                </p>
                                            }
                                            {teamGameState.currentActiveSlide.sub_text &&
                                                <p className="text-sm text-gray-300 mb-4">
                                                    {teamGameState.currentActiveSlide.sub_text}
                                                </p>
                                            }

                                            {/* Connection Status Indicator */}
                                            <div className="mt-4 flex items-center justify-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    teamGameState.connectionStatus === 'connected' ? 'bg-green-400' :
                                                        teamGameState.connectionStatus === 'connecting' ? 'bg-yellow-400' :
                                                            'bg-red-400'
                                                }`}></div>
                                                <span className="text-xs text-gray-400">
                                                    {teamGameState.connectionStatus === 'connected' ? 'Connected' :
                                                        teamGameState.connectionStatus === 'connecting' ? 'Connecting...' :
                                                            'Disconnected'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-12">
                                            <p className="text-lg">Waiting for facilitator...</p>
                                            <div className="mt-4 flex items-center justify-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    teamGameState.connectionStatus === 'connected' ? 'bg-green-400' :
                                                        teamGameState.connectionStatus === 'connecting' ? 'bg-yellow-400' :
                                                            'bg-red-400'
                                                }`}></div>
                                                <span className="text-xs text-gray-400">
                                                    {teamGameState.connectionStatus === 'connected' ? 'Connected' :
                                                        teamGameState.connectionStatus === 'connecting' ? 'Connecting...' :
                                                            'Disconnected'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* KPI IMPACT CARDS */}
                {/* Only show if we have adjustments and not loading */}
                {/* ============================================================ */}
                {!loadingAdjustments && permanentAdjustments.length > 0 && (
                    <div className="mt-6">
                        <KpiImpactCards
                            teamId={loggedInTeamId || ''}
                            currentRound={teamGameState.currentActiveSlide?.round_number || 1}
                            permanentAdjustments={permanentAdjustments}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamApp;
