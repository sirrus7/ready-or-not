// src/views/team/TeamApp.tsx
// RESTORED: Original UI with minimal changes for unified system

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
 * All handled automatically by useTeamGameState + centralized system:
 * - Slide changes from host
 * - Decision resets from host (NEW: implemented)
 * - Consequence KPI updates
 * - Impact card updates (NEW: centralized)
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
import {useTeamGameState} from '@views/team/hooks/useTeamGameState';
import {useTeamGameContext} from '@app/providers/TeamGameProvider'; // ADDED: For centralized adjustments

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
                            teamGameState.connectionStatus === 'connected' ?
                                'text-green-400' : teamGameState.connectionStatus === 'connecting' ?
                                    'text-yellow-400' : 'text-red-400'
                        }`}>
                            {teamGameState.connectionStatus.toUpperCase()}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Slide:</span>
                        <span className="ml-1 text-blue-300">
                            {teamGameState.currentActiveSlide?.title || 'None'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Decision Time:</span>
                        <span className={`ml-1 ${teamGameState.isDecisionTime ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {teamGameState.isDecisionTime ? 'YES' : 'NO'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Loading KPIs:</span>
                        <span className={`ml-1 ${teamGameState.isLoadingKpis ?
                            'text-yellow-400' : 'text-gray-400'}`}>
                            {teamGameState.isLoadingKpis ? 'YES' : 'NO'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Loading Adjustments:</span>
                        <span className={`ml-1 ${teamGameState.isLoadingAdjustments ?
                            'text-yellow-400' : 'text-gray-400'}`}>
                            {teamGameState.isLoadingAdjustments ? 'YES' : 'NO'}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Reset Trigger:</span>
                        <span className="ml-1 text-purple-300">
                            {teamGameState.decisionResetTrigger}
                        </span>
                    </div>
                    <div><span className="text-gray-400">Impact Cards:</span>
                        <span className="ml-1 text-cyan-300">
                            {teamGameState.permanentAdjustments.length}
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

    // ADDED: Get centralized adjustment data from TeamGameProvider (lightweight, no auth)
    const teamGameContext = useTeamGameContext();
    const {permanentAdjustments, isLoadingAdjustments} = teamGameContext;

    console.log('🏢 TeamApp initialized:', {
        sessionId,
        loggedInTeamId,
        loggedInTeamName,
        adjustmentsCount: permanentAdjustments.length
    });

    // ========================================================================
    // GAME STATE HOOK - SIMPLIFIED (uses centralized adjustments)
    // This now receives adjustments from the centralized system
    // ========================================================================
    const teamGameState = useTeamGameState({
        sessionId: sessionId || null,
        loggedInTeamId,
        permanentAdjustments, // ADDED: Pass centralized adjustments
        isLoadingAdjustments  // ADDED: Pass centralized loading state
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
                        setLoggedInTeamId(teamId);
                        setLoggedInTeamName(teamName);
                    }}
                />
            </div>
        );
    }

    // ========================================================================
    // MAIN GAME INTERFACE - RESTORED ORIGINAL LAYOUT
    // ========================================================================
    return (
        <div className="min-h-screen bg-gray-900">
            {/* ================================================================ */}
            {/* HEADER - Team identification and logout */}
            {/* ================================================================ */}
            <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10">
                <div className="container mx-auto px-4 py-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                                teamGameState.connectionStatus === 'connected' ? 'bg-green-400' :
                                    teamGameState.connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                            } animate-pulse`}></div>
                            <span className="text-gray-300 text-sm">
                                {teamGameState.connectionStatus === 'connected' ? 'Connected' :
                                    teamGameState.connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                            </span>
                        </div>
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
            {/* MAIN CONTENT - RESTORED: Simple responsive layout */}
            {/* ================================================================ */}
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">

                {/* LEFT PANEL - RESTORED: Team Status */}
                <div className="w-full lg:w-80 bg-gray-800/50 border-b lg:border-b-0 lg:border-r border-gray-700">
                    <div className="p-4 space-y-4">
                        {/* Team Status with Vertical KPI Layout for Sidebar */}
                        <div className="flex-shrink-0">
                            <div
                                className="p-3 md:p-4 bg-gray-800/80 backdrop-blur-sm text-white rounded-t-xl shadow-lg border-b border-gray-700">
                                <h2 className="text-lg md:text-xl font-bold text-center text-sky-300 mb-0.5">
                                    Team: <span className="text-white">{loggedInTeamName || 'N/A'}</span>
                                </h2>

                                {/* RESTORED: CLEAN KPI SECTION */}
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
                                                    {teamGameState.currentTeamKpis?.current_capacity?.toLocaleString() || '1,000'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {teamGameState.currentTeamKpis?.start_capacity?.toLocaleString() || '1,000'}
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
                                                {/* Current Value - Color coded based on good/bad */}
                                                <div className={`text-2xl font-bold ${
                                                    teamGameState.currentTeamKpis?.current_orders === teamGameState.currentTeamKpis?.start_orders
                                                        ? 'text-white'
                                                        : (teamGameState.currentTeamKpis?.current_orders || 0) > (teamGameState.currentTeamKpis?.start_orders || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    {teamGameState.currentTeamKpis?.current_orders?.toLocaleString() || '1,000'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {teamGameState.currentTeamKpis?.start_orders?.toLocaleString() || '1,000'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost - CLEAN */}
                                    <div
                                        className="bg-gradient-to-r from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-lg p-3 border border-red-500/30 hover:border-red-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-red-400 text-xl">💰</div>
                                                <span className="text-sm font-semibold text-slate-200">Cost</span>
                                            </div>
                                            <div className="text-right">
                                                {/* Current Value - Color coded based on good/bad */}
                                                <div className={`text-2xl font-bold ${
                                                    teamGameState.currentTeamKpis?.current_cost === teamGameState.currentTeamKpis?.start_cost
                                                        ? 'text-white'
                                                        : (teamGameState.currentTeamKpis?.current_cost || 0) < (teamGameState.currentTeamKpis?.start_cost || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    ${teamGameState.currentTeamKpis?.current_cost?.toLocaleString() || '850'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start:
                                                    ${teamGameState.currentTeamKpis?.start_cost?.toLocaleString() || '850'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ASP - CLEAN */}
                                    <div
                                        className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-yellow-400 text-xl">💎</div>
                                                <span className="text-sm font-semibold text-slate-200">ASP</span>
                                            </div>
                                            <div className="text-right">
                                                {/* Current Value - Color coded based on good/bad */}
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

                        {/* SIMPLIFIED: Current Slide Card - Clean, no duplicate info */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
                            <div className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">📺</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Current Slide</h3>
                                        <p className="text-xs text-slate-400">
                                            {teamGameState.currentActiveSlide?.round_number ?
                                                `Round ${teamGameState.currentActiveSlide.round_number}` :
                                                'Game Setup'}
                                        </p>
                                    </div>
                                </div>

                                {/* Just the slide title - clean and simple */}
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <h4 className="text-white font-medium text-base">
                                        {teamGameState.currentActiveSlide?.title || 'Loading...'}
                                    </h4>
                                    {teamGameState.currentActiveSlide?.sub_text && (
                                        <p className="text-slate-300 text-sm mt-1">
                                            {teamGameState.currentActiveSlide.sub_text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL - IMPROVED: More informative content */}
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
                                {teamGameState.currentActiveSlide ? (
                                    <>
                                        <div className="text-6xl mb-6">
                                            {teamGameState.currentActiveSlide.type === 'consequence_reveal' ? '⚡' :
                                                teamGameState.currentActiveSlide.type === 'payoff_reveal' ? '💰' :
                                                    teamGameState.currentActiveSlide.type === 'leaderboard_chart' ? '🏆' :
                                                        teamGameState.currentActiveSlide.type === 'kpi_summary_instructional' ? '📊' :
                                                            '👀'}
                                        </div>
                                        <h2 className="text-2xl font-bold mb-4 text-white">
                                            {teamGameState.currentActiveSlide.type === 'consequence_reveal' ? 'Viewing Consequences' :
                                                teamGameState.currentActiveSlide.type === 'payoff_reveal' ? 'Investment Results' :
                                                    teamGameState.currentActiveSlide.type === 'leaderboard_chart' ? 'Leaderboard' :
                                                        teamGameState.currentActiveSlide.type === 'kpi_summary_instructional' ? 'Performance Summary' :
                                                            'Following Along'}
                                        </h2>
                                        <p className="text-gray-400 mb-6">
                                            {teamGameState.currentActiveSlide.type === 'consequence_reveal' ? 'Check your Impact Cards on the left for any new effects from your decisions.' :
                                                teamGameState.currentActiveSlide.type === 'payoff_reveal' ? 'Your investment results are being calculated. Check your KPIs on the left.' :
                                                    teamGameState.currentActiveSlide.type === 'leaderboard_chart' ? 'See how your team is performing compared to others.' :
                                                        teamGameState.currentActiveSlide.type === 'kpi_summary_instructional' ? 'Review your current performance metrics on the left.' :
                                                            'Follow along with the presentation. Your next decision opportunity will appear here.'}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-6xl mb-6">🚀</div>
                                        <h2 className="text-2xl font-bold mb-4 text-white">Ready to Start</h2>
                                        <p className="text-gray-400 mb-6">
                                            Waiting for the facilitator to begin the simulation...
                                        </p>
                                    </>
                                )}
                                <div className="text-sm text-gray-500 bg-slate-800/50 rounded-lg p-4">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            teamGameState.connectionStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
                                        }`}></div>
                                        <span>Connected to game session</span>
                                    </div>
                                    <p>Decision phases will automatically appear here when active.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================================================================ */}
            {/* DEBUG PANEL (Desktop Only) */}
            {/* ================================================================ */}
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
