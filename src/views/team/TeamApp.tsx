// src/views/team/TeamApp.tsx
// FIXED VERSION - Clean, working responsive design + Decision Reset Handling

/**
 * ============================================================================
 * TEAM APPLICATION MAIN COMPONENT
 * ============================================================================
 *
 * RESPONSIVE DESIGN REQUIREMENTS:
 * - PRIMARY: Mobile-first design (phones are primary access method)
 * - SECONDARY: Desktop/tablet compatibility for larger screens
 * - CRITICAL: Single-column layout on mobile, optional dual-column on desktop
 * - TOUCH-FRIENDLY: All interactive elements sized for finger taps
 * - READABLE: Text and KPIs clearly visible on small screens
 *
 * COMMUNICATION ARCHITECTURE:
 * - This component does NOT create any real-time subscriptions
 * - All real-time communication is handled by useTeamGameState hook
 * - Maintains single WebSocket connection per team app
 * - NEW: Handles decision reset triggers from host
 *
 * RESPONSIBILITIES:
 * 1. User authentication (team login/logout)
 * 2. Responsive game state display (current slide, KPIs, status)
 * 3. Mobile-optimized decision interface when required
 * 4. Debug panel for development (desktop only)
 * 5. NEW: Propagating decision reset triggers to decision components
 *
 * REAL-TIME UPDATES:
 * All handled automatically by useTeamGameState:
 * - Slide changes from host
 * - Decision resets from host (NEW: implemented)
 * - Consequence KPI updates
 *
 * DEVICE COMPATIBILITY:
 * - Mobile phones (iOS/Android) - PRIMARY
 * - Tablets (iPad/Android tablets) - SECONDARY
 * - Desktop browsers - SECONDARY
 * - Responsive breakpoints: sm(640px), md(768px), lg(1024px)
 * ============================================================================
 */

import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {Bug} from 'lucide-react';
import TeamLogin from '@views/team/components/TeamLogin/TeamLogin';
import TeamLogout from '@views/team/components/TeamLogin/TeamLogout';
import DecisionModeContainer from '@views/team/components/InteractionPanel/DecisionContainer';
import KpiImpactCards from '@views/team/components/GameStatus/KpiImpactCards';
import {useTeamGameState} from '@views/team/hooks/useTeamGameState';

// ============================================================================
// DEBUG PANEL COMPONENT (Desktop Only)
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
            className="fixed top-20 right-4 z-20 bg-black/95 text-white p-4 rounded-lg text-xs max-w-sm border border-green-500 hidden lg:block">
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
                    <div><span className="text-gray-400">Reset Trigger:</span>
                        <span className="ml-1 text-purple-300">
                            {teamGameState.decisionResetTrigger}
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

    console.log('🏢 TeamApp initialized:', {
        sessionId,
        loggedInTeamId,
        loggedInTeamName
    });

    // ========================================================================
    // GAME STATE HOOK - SINGLE REAL-TIME CONNECTION
    // This is the ONLY hook that creates real-time subscriptions
    // NEW: Now includes decisionResetTrigger
    // ========================================================================
    const teamGameState = useTeamGameState({
        sessionId: sessionId || null,
        loggedInTeamId
    });

    // ========================================================================
    // CONDITIONAL RENDERING
    // ========================================================================

    // Show login screen if not logged in
    if (!loggedInTeamId) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <TeamLogin
                    sessionId={sessionId || ''}
                    onLoginSuccess={(teamId, teamName) => {
                        console.log('🔐 Login successful:', teamId, teamName);
                        setLoggedInTeamId(teamId);
                        setLoggedInTeamName(teamName);
                    }}
                />
            </div>
        );
    }

    // ========================================================================
    // MAIN RESPONSIVE INTERFACE
    // Clean, simple mobile-first design that works
    // ========================================================================
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* ================================================================ */}
            {/* HEADER - Clean and simple */}
            {/* ================================================================ */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-white">Ready or Not 2.0</h1>
                        <div className="text-sm text-gray-300">
                            Team: <span className="font-semibold text-green-400">{loggedInTeamName}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Debug button - only show on larger screens */}
                        <button
                            onClick={() => setShowDebugPanel(!showDebugPanel)}
                            className="p-2 text-gray-400 hover:text-white transition-colors hidden lg:block"
                            title="Toggle Debug Panel"
                        >
                            <Bug size={18}/>
                        </button>
                        <TeamLogout
                            teamName={loggedInTeamName || ''}
                            sessionId={sessionId || ''}
                            onLogout={() => {
                                console.log('🔐 Logging out');
                                setLoggedInTeamId(null);
                                setLoggedInTeamName(null);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* MAIN CONTENT - Simple responsive layout */}
            {/* ================================================================ */}
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">

                {/* LEFT PANEL - Team Status */}
                <div className="w-full lg:w-80 bg-gray-800/50 border-b lg:border-b-0 lg:border-r border-gray-700">
                    <div className="p-4 space-y-4">
                        {/* Team Status with Vertical KPI Layout for Sidebar */}
                        <div className="flex-shrink-0">
                            <div
                                className="p-3 md:p-4 bg-gray-800/80 backdrop-blur-sm text-white rounded-t-xl shadow-lg border-b border-gray-700">
                                <h2 className="text-lg md:text-xl font-bold text-center text-sky-300 mb-0.5">
                                    Team: <span className="text-white">{loggedInTeamName || 'N/A'}</span>
                                </h2>
                                <p className="text-xs text-gray-400 text-center mb-3 font-medium">
                                    {teamGameState.isLoadingKpis ? "Loading..." :
                                        teamGameState.currentActiveSlide?.round_number ?
                                            `RD-${teamGameState.currentActiveSlide.round_number} Status` :
                                            "Game Setup"}
                                </p>

                                {/* CLEAN KPI SECTION */}
                                <div className="space-y-2">
                                    {/* Capacity - CLEAN */}
                                    <div
                                        className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30 hover:border-blue-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-blue-400 text-xl">🏢</div>
                                                <span className="text-sm font-semibold text-slate-200">Capacity</span>
                                            </div>
                                            <div className="text-right">
                                                {/* Current Value - Color coded based on good/bad */}
                                                <div className={`text-2xl font-bold ${
                                                    teamGameState.currentTeamKpis?.current_capacity === teamGameState.currentTeamKpis?.start_capacity
                                                        ? 'text-white'
                                                        : (teamGameState.currentTeamKpis?.current_capacity || 0) > (teamGameState.currentTeamKpis?.start_capacity || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    {teamGameState.currentTeamKpis?.current_capacity?.toLocaleString() || '5,000'}
                                                </div>
                                                {/* Starting Value */}
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {teamGameState.currentTeamKpis?.start_capacity?.toLocaleString() || '5,000'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Orders - CLEAN */}
                                    <div
                                        className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-lg p-3 border border-green-500/30 hover:border-green-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-green-400 text-xl">📦</div>
                                                <span className="text-sm font-semibold text-slate-200">Orders</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    teamGameState.currentTeamKpis?.current_orders === teamGameState.currentTeamKpis?.start_orders
                                                        ? 'text-white'
                                                        : (teamGameState.currentTeamKpis?.current_orders || 0) > (teamGameState.currentTeamKpis?.start_orders || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    {teamGameState.currentTeamKpis?.current_orders?.toLocaleString() || '5,000'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {teamGameState.currentTeamKpis?.start_orders?.toLocaleString() || '5,000'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost - CLEAN */}
                                    <div
                                        className="bg-gradient-to-r from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-lg p-3 border border-red-500/30 hover:border-red-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-red-400 text-xl">💸</div>
                                                <span className="text-sm font-semibold text-slate-200">Cost</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    teamGameState.currentTeamKpis?.current_cost === teamGameState.currentTeamKpis?.start_cost
                                                        ? 'text-white'
                                                        : (teamGameState.currentTeamKpis?.current_cost || 0) < (teamGameState.currentTeamKpis?.start_cost || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    ${teamGameState.currentTeamKpis?.current_cost?.toLocaleString() || '1,200,000'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start:
                                                    ${teamGameState.currentTeamKpis?.start_cost?.toLocaleString() || '1,200,000'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ASP - CLEAN */}
                                    <div
                                        className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30 hover:border-purple-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-purple-400 text-xl">💰</div>
                                                <span className="text-sm font-semibold text-slate-200">ASP</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    teamGameState.currentTeamKpis?.current_asp === teamGameState.currentTeamKpis?.start_asp
                                                        ? 'text-white'
                                                        : (teamGameState.currentTeamKpis?.current_asp || 0) > (teamGameState.currentTeamKpis?.start_asp || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    ${teamGameState.currentTeamKpis?.current_asp?.toLocaleString() || '950'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start:
                                                    ${teamGameState.currentTeamKpis?.start_asp?.toLocaleString() || '950'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Permanent Adjustments */}
                        <KpiImpactCards
                            teamId={loggedInTeamId || ''}
                            currentRound={teamGameState.currentActiveSlide?.round_number || 1}
                            permanentAdjustments={teamGameState.permanentAdjustments}
                            isLoadingAdjustments={teamGameState.isLoadingAdjustments}
                        />
                    </div>
                </div>

                {/* RIGHT PANEL - Main Content */}
                <div className="flex-1 flex flex-col">
                    {teamGameState.isDecisionTime && teamGameState.currentActiveSlide ? (
                        <DecisionModeContainer
                            sessionId={sessionId || ''}
                            teamId={loggedInTeamId}
                            currentSlide={teamGameState.currentActiveSlide}
                            gameStructure={teamGameState.gameStructure}
                            decisionResetTrigger={teamGameState.decisionResetTrigger}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center max-w-md mx-auto">
                                <div className="text-6xl mb-6">⏳</div>
                                <h2 className="text-2xl font-bold mb-4">Waiting for Decision Phase</h2>
                                <p className="text-gray-400 mb-6">
                                    {teamGameState.currentActiveSlide
                                        ? `Current: ${teamGameState.currentActiveSlide.title}`
                                        : 'Waiting for facilitator to start the game...'}
                                </p>

                                {/* Connection Status */}
                                <div className="flex items-center justify-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        teamGameState.connectionStatus === 'connected' ? 'bg-green-400' :
                                            teamGameState.connectionStatus === 'connecting' ?
                                                'bg-yellow-400' : 'bg-red-400'
                                    }`}></div>
                                    <span className="text-sm text-gray-400">
                                        {teamGameState.connectionStatus === 'connected' ? 'Connected' :
                                            teamGameState.connectionStatus === 'connecting' ? 'Connecting...' :
                                                'Disconnected'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Debug Panel - Desktop only */}
            <TeamDebugPanel
                sessionId={sessionId || null}
                teamId={loggedInTeamId}
                teamGameState={teamGameState}
                isVisible={showDebugPanel}
            />
        </div>
    );
};

export default TeamApp;
