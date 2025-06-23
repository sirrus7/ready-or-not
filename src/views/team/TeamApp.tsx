// src/views/team/TeamApp.tsx
// FIXED: Added KpiImpactCards integration with unified system

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

import React, {useState} from 'react';
import {useParams} from 'react-router-dom';
import TeamLogin from '@views/team/components/TeamLogin/TeamLogin';
import DecisionModeContainer from '@views/team/components/InteractionPanel/DecisionContainer';
import KpiImpactCards from '@views/team/components/GameStatus/KpiImpactCards'; // ADDED: Import impact cards
import {useTeamGameState} from '@views/team/hooks/useTeamGameState';
import {useTeamGameContext} from '@app/providers/TeamGameProvider';
import {BASE_VALUES, ROUND_BASE_VALUES} from "@core/game/ScoringEngine.ts";
import TeamInvestmentDisplay from "@views/team/components/GameStatus/TeamInvestmentDisplay.tsx";

// ============================================================================
// MAIN TEAM APP COMPONENT
// ============================================================================
const TeamApp: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(null);
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(null);

    // ADDED: Get centralized adjustment data from TeamGameProvider (lightweight, no auth)
    const teamGameContext = useTeamGameContext();
    const {permanentAdjustments, isLoadingAdjustments} = teamGameContext;

    // Base values
    const baseValues = {
        capacity: BASE_VALUES.CAPACITY.toString(),
        orders: ROUND_BASE_VALUES["1"].orders.toString(),
        cost: ROUND_BASE_VALUES["1"].cost.toString(),
        asp: BASE_VALUES.ASP.toString()
    }

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

    // Extract key values for easier access
    const currentActiveSlide = teamGameState.currentActiveSlide;
    const currentTeamKpis = teamGameState.currentTeamKpis;
    const isDecisionPhaseActive = teamGameState.isDecisionTime;
    const resetTrigger = teamGameState.decisionResetTrigger;
    const connectionStatus = teamGameState.connectionStatus;

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
    // MAIN GAME INTERFACE - RESTORED ORIGINAL LAYOUT WITH IMPACT CARDS
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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    // Clear localStorage
                                    localStorage.removeItem(`ron_teamId_${sessionId}`);
                                    localStorage.removeItem(`ron_teamName_${sessionId}`);
                                    setLoggedInTeamId(null);
                                    setLoggedInTeamName(null);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600/80 hover:bg-red-700/80 text-white text-sm font-medium rounded-lg backdrop-blur-sm border border-red-500/30 transition-colors"
                                title={`Logout from team ${loggedInTeamName}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* MAIN CONTENT - RESTORED: Simple responsive layout */}
            {/* ================================================================ */}
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">

                {/* LEFT PANEL - RESTORED: Team Status with ADDED Impact Cards */}
                <div className="w-full lg:w-80 bg-gray-800/50 border-b lg:border-b-0 lg:border-r border-gray-700">
                    <div className="p-4 space-y-4">
                        {/* Team Status with Vertical KPI Layout for Sidebar */}
                        <div className="flex-shrink-0">
                            <div
                                className="p-4 bg-gray-800/80 backdrop-blur-sm text-white rounded-t-xl shadow-lg border-b border-gray-700">
                                <h2 className="text-xl font-bold text-center text-sky-300 mb-4">
                                    Team: <span className="text-white">{loggedInTeamName || 'N/A'}</span>
                                </h2>

                                {/* RESTORED: ORIGINAL KPI SECTION WITH GRADIENT BACKGROUNDS */}
                                <div className="space-y-3">
                                    {/* Capacity - RESTORED */}
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
                                                    currentTeamKpis?.current_capacity === currentTeamKpis?.start_capacity
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_capacity || 0) > (currentTeamKpis?.start_capacity || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    {currentTeamKpis?.current_capacity?.toLocaleString() || baseValues.capacity}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {currentTeamKpis?.start_capacity?.toLocaleString() || baseValues.capacity}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Orders - RESTORED */}
                                    <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-yellow-400 text-xl">📦</div>
                                                <span className="text-sm font-semibold text-slate-200">Orders</span>
                                            </div>
                                            <div className="text-right">
                                                {/* Current Value - Color coded based on good/bad */}
                                                <div className={`text-2xl font-bold ${
                                                    currentTeamKpis?.current_orders === currentTeamKpis?.start_orders
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_orders || 0) > (currentTeamKpis?.start_orders || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    {currentTeamKpis?.current_orders?.toLocaleString() || baseValues.orders}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {currentTeamKpis?.start_orders?.toLocaleString() || baseValues.orders}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost - RESTORED */}
                                    <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-lg p-3 border border-green-500/30 hover:border-green-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-green-400 text-xl">💰</div>
                                                <span className="text-sm font-semibold text-slate-200">Cost</span>
                                            </div>
                                            <div className="text-right">
                                                {/* Current Value - Color coded based on good/bad (lower cost = green) */}
                                                <div className={`text-2xl font-bold ${
                                                    currentTeamKpis?.current_cost === currentTeamKpis?.start_cost
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_cost || 0) < (currentTeamKpis?.start_cost || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    ${currentTeamKpis?.current_cost?.toLocaleString() || baseValues.cost}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start:
                                                    ${currentTeamKpis?.start_cost?.toLocaleString() || baseValues.cost}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ASP - RESTORED */}
                                    <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-lg p-3 border border-red-500/30 hover:border-red-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-red-400 text-xl">💎</div>
                                                <span className="text-sm font-semibold text-slate-200">ASP</span>
                                            </div>
                                            <div className="text-right">
                                                {/* Current Value - Color coded based on good/bad */}
                                                <div className={`text-2xl font-bold ${
                                                    currentTeamKpis?.current_asp === currentTeamKpis?.start_asp
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_asp || 0) > (currentTeamKpis?.start_asp || 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                }`}>
                                                    ${currentTeamKpis?.current_asp?.toLocaleString() || baseValues.asp}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: ${currentTeamKpis?.start_asp?.toLocaleString() || baseValues.asp}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NEW: INVESTMENT DISPLAY - Show purchased investments for current round */}
                        {currentActiveSlide && teamGameState.gameStructure && loggedInTeamId && (
                            <TeamInvestmentDisplay
                                sessionId={sessionId || ''}
                                teamId={loggedInTeamId}
                                currentRound={currentActiveSlide.round_number || 1}
                                gameStructure={teamGameState.gameStructure}
                            />
                        )}

                        {/* ADDED: KPI IMPACT CARDS SECTION - Only show if team has impact cards */}
                        {loggedInTeamId && permanentAdjustments.filter(adj => adj.team_id === loggedInTeamId).length > 0 && (
                            <div className="flex-shrink-0">
                                <KpiImpactCards
                                    teamId={loggedInTeamId}
                                    currentRound={currentActiveSlide?.round_number || 1}
                                    permanentAdjustments={permanentAdjustments}
                                    isLoadingAdjustments={isLoadingAdjustments}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL - Main Game Content */}
                <div className="flex-1 flex flex-col">
                    {isDecisionPhaseActive ? (
                        <DecisionModeContainer
                            teamId={loggedInTeamId}
                            currentSlide={currentActiveSlide}
                            sessionId={sessionId || ''}
                            gameStructure={teamGameState.gameStructure}
                            decisionResetTrigger={resetTrigger}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center max-w-md">
                                {currentActiveSlide ? (
                                    <>
                                        <div className="text-6xl mb-6">📊</div>
                                        <h2 className="text-2xl font-bold mb-4 text-white">Following Along</h2>
                                        <p className="text-gray-400 mb-6">
                                            {currentActiveSlide.type === 'consequence_reveal' ? 'Check your KPIs on the left.' :
                                                currentActiveSlide.type === 'payoff_reveal' ? 'Check your KPIs on the left.' :
                                                    currentActiveSlide.type === 'leaderboard_chart' ? 'See how your team is performing compared to others.' :
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
                                            connectionStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
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
        </div>
    );
};

export default TeamApp;
