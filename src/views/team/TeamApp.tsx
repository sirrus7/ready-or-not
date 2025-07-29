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

import React, {useEffect, useState} from 'react';
import TeamLogin from '@views/team/components/TeamLogin/TeamLogin';
import DecisionModeContainer from '@views/team/components/InteractionPanel/DecisionContainer';
import KpiImpactCards from '@views/team/components/GameStatus/KpiImpactCards';
import {useTeamGameState, UseTeamGameStateReturn} from '@views/team/hooks/useTeamGameState';
import {TeamGameContextType, useTeamGameContext} from '@app/providers/TeamGameProvider';
import {BASE_VALUES, ROUND_BASE_VALUES} from "@core/game/ScoringEngine";
import TeamInvestmentDisplay from "@views/team/components/GameStatus/TeamInvestmentDisplay";
import {Building, ShoppingCart, DollarSign, TrendingUp, AlertTriangle} from 'lucide-react';
import {StrategyStatusCard} from "@views/team/components/GameStatus/StrategyStatusCard";
import {Slide, TeamRoundData} from "@shared/types";

// Sets the duration (in MS) that the KPI changes are shown in the TeamApp
const KPI_CHANGE_DURATION = 15000;

// ============================================================================
// MAIN TEAM APP COMPONENT
// ============================================================================
const TeamApp: React.FC = () => {
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(null);
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(null);
    const [kpiChanges, setKpiChanges] = useState<Record<string, number>>({});
    const [lastKpiValues, setLastKpiValues] = useState<Record<string, number>>({});
    const [investmentRefreshTrigger, setInvestmentRefreshTrigger] = useState(0);

    // ADDED: Get centralized adjustment data from TeamGameProvider (lightweight, no auth)
    const teamGameContext: TeamGameContextType = useTeamGameContext();
    const sessionId: string | null = teamGameContext.sessionId;
    const {permanentAdjustments, isLoadingAdjustments} = teamGameContext;

    // ========================================================================
    // GAME STATE HOOK - SIMPLIFIED (uses centralized adjustments)
    // This now receives adjustments from the centralized system
    // ========================================================================
    const teamGameState: UseTeamGameStateReturn = useTeamGameState({
        sessionId: sessionId || null,
        loggedInTeamId,
        permanentAdjustments, // ADDED: Pass centralized adjustments
        isLoadingAdjustments  // ADDED: Pass centralized loading state
    });

    const triggerDecisionRefresh = teamGameState.triggerDecisionRefresh;

    useEffect(() => {
        // Clear team login when session is deleted
        if (teamGameState.sessionStatus === 'deleted') {
            setLoggedInTeamId(null);
            setLoggedInTeamName(null);
        }
    }, [teamGameState.sessionStatus]);

    // ADD this simple useEffect:
    useEffect(() => {
        const currentKpis = teamGameState.currentTeamKpis;
        if (!currentKpis || !lastKpiValues.capacity) {
            if (currentKpis) {
                setLastKpiValues({
                    capacity: currentKpis.current_capacity || 0,
                    orders: currentKpis.current_orders || 0,
                    cost: currentKpis.current_cost || 0,
                    asp: currentKpis.current_asp || 0
                });
            }
            return;
        }

        const newKpiValues = {
            capacity: currentKpis.current_capacity || 0,
            orders: currentKpis.current_orders || 0,
            cost: currentKpis.current_cost || 0,
            asp: currentKpis.current_asp || 0
        };

        const changes: Record<string, number> = {};
        let hasChanges = false;

        (['capacity', 'orders', 'cost', 'asp'] as const).forEach(kpi => {
            const change = newKpiValues[kpi] - lastKpiValues[kpi];
            if (Math.abs(change) > 0) {
                changes[kpi] = change;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            setKpiChanges(changes);
            playNotificationSound();

            setTimeout(() => {
                setKpiChanges({});
            }, KPI_CHANGE_DURATION);
        }

        setLastKpiValues(newKpiValues);
    }, [teamGameState.currentTeamKpis]);

    // Show session ended screen if session was deleted
    if (teamGameState.sessionStatus === 'deleted') {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center shadow-2xl">
                        {/* Warning Icon */}
                        <div
                            className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-orange-400"/>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-slate-100 mb-4">
                            Game Session Ended
                        </h1>

                        {/* Message */}
                        <p className="text-slate-300 mb-8 leading-relaxed">
                            This game session has been ended by your instructor.
                            Thank you for participating in Ready or Not!
                        </p>

                        {/* Additional Info */}
                        <p className="text-slate-500 text-sm mt-6">
                            Contact your instructor if you need to join a different session.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show login if not logged in
    if (!loggedInTeamId || !sessionId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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

    // Extract key values for easier access
    const currentActiveSlide: Slide | null = teamGameState.currentActiveSlide;
    const currentTeamKpis: TeamRoundData | null = teamGameState.currentTeamKpis;
    const isDecisionPhaseActive: boolean = teamGameState.isDecisionTime;
    const resetTrigger: number = teamGameState.decisionResetTrigger;
    const connectionStatus: 'connected' | 'connecting' | 'disconnected' = teamGameState.connectionStatus;

    // Base values
    const currentRound: 1 | 2 | 3 = (currentActiveSlide?.round_number as 1 | 2 | 3) || 1;
    const baseValues = {
        capacity: BASE_VALUES.CAPACITY.toString(),
        orders: ROUND_BASE_VALUES[currentRound].orders.toString(),
        cost: ROUND_BASE_VALUES[currentRound].cost.toString(),
        asp: BASE_VALUES.ASP.toString()
    };

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

    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('🔔 KPI Update notification', error);
        }
    };

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
                                className="kpi-display p-4 bg-gray-800/80 backdrop-blur-sm text-white rounded-xl shadow-lg border-b border-gray-700 overflow-hidden">
                                <h2 className="text-xl font-bold text-center text-sky-300 mb-4">
                                    Team: <span className="text-white">{loggedInTeamName || 'N/A'}</span>
                                </h2>

                                {/* RESTORED: ORIGINAL KPI SECTION WITH GRADIENT BACKGROUNDS */}
                                <div className="space-y-3">
                                    {/* Capacity */}
                                    <div
                                        className="bg-gradient-to-r from-kpi-capacity-500/20 to-kpi-capacity-600/20 backdrop-blur-sm rounded-lg p-3 border border-kpi-capacity-500/30 hover:border-kpi-capacity-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Building className="text-kpi-capacity-400" size={20}/>
                                                <span className="text-sm font-semibold text-slate-200">Capacity</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    currentTeamKpis?.current_capacity === currentTeamKpis?.start_capacity
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_capacity || 0) > (currentTeamKpis?.start_capacity || 0)
                                                            ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {currentTeamKpis?.current_capacity?.toLocaleString() || baseValues.capacity}

                                                    {/* CHANGE INDICATOR */}
                                                    {kpiChanges.capacity && (
                                                        <span className={`ml-2 text-lg font-bold animate-pulse ${
                                                            kpiChanges.capacity > 0 ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {kpiChanges.capacity > 0 ? '+' : ''}{kpiChanges.capacity.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {currentTeamKpis?.start_capacity?.toLocaleString() || baseValues.capacity}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Orders */}
                                    <div
                                        className="bg-gradient-to-r from-kpi-orders-500/20 to-kpi-orders-600/20 backdrop-blur-sm rounded-lg p-3 border border-kpi-orders-500/30 hover:border-kpi-orders-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <ShoppingCart className="text-kpi-orders-400" size={20}/>
                                                <span className="text-sm font-semibold text-slate-200">Orders</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    currentTeamKpis?.current_orders === currentTeamKpis?.start_orders
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_orders || 0) > (currentTeamKpis?.start_orders || 0)
                                                            ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {currentTeamKpis?.current_orders?.toLocaleString() || baseValues.orders}

                                                    {/* CHANGE INDICATOR */}
                                                    {kpiChanges.orders && (
                                                        <span className={`ml-2 text-lg font-bold animate-pulse ${
                                                            kpiChanges.orders > 0 ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {kpiChanges.orders > 0 ? '+' : ''}{kpiChanges.orders.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start: {currentTeamKpis?.start_orders?.toLocaleString() || baseValues.orders}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost */}
                                    <div
                                        className="bg-gradient-to-r from-kpi-cost-500/20 to-kpi-cost-600/20 backdrop-blur-sm rounded-lg p-3 border border-kpi-cost-500/30 hover:border-kpi-cost-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <DollarSign className="text-kpi-cost-400" size={20}/>
                                                <span className="text-sm font-semibold text-slate-200">Cost</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    currentTeamKpis?.current_cost === currentTeamKpis?.start_cost
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_cost || 0) < (currentTeamKpis?.start_cost || 0)
                                                            ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    ${currentTeamKpis?.current_cost?.toLocaleString() || baseValues.cost}

                                                    {/* CHANGE INDICATOR */}
                                                    {kpiChanges.cost && (
                                                        <span className={`ml-2 text-lg font-bold animate-pulse ${
                                                            kpiChanges.cost > 0 ? 'text-red-400' : 'text-green-400'
                                                        }`}>
                                                            {kpiChanges.cost > 0 ? '+' : '-'}${Math.abs(kpiChanges.cost).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start:
                                                    ${currentTeamKpis?.start_cost?.toLocaleString() || baseValues.cost}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ASP - FIXED: Changed from purple to red colors */}
                                    <div
                                        className="bg-gradient-to-r from-kpi-asp-500/20 to-kpi-asp-600/20 backdrop-blur-sm rounded-lg p-3 border border-kpi-asp-500/30 hover:border-kpi-asp-500/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <TrendingUp className="text-kpi-asp-400" size={20}/>
                                                <span className="text-sm font-semibold text-slate-200">ASP</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${
                                                    currentTeamKpis?.current_asp === currentTeamKpis?.start_asp
                                                        ? 'text-white'
                                                        : (currentTeamKpis?.current_asp || 0) > (currentTeamKpis?.start_asp || 0)
                                                            ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    ${currentTeamKpis?.current_asp?.toLocaleString() || baseValues.asp}

                                                    {/* CHANGE INDICATOR */}
                                                    {kpiChanges.asp && (
                                                        <span className={`ml-2 text-lg font-bold animate-pulse ${
                                                            kpiChanges.asp > 0 ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {kpiChanges.asp > 0 ? '+' : '-'}${Math.abs(kpiChanges.asp).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Start:
                                                    ${currentTeamKpis?.start_asp?.toLocaleString() || baseValues.asp}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Strategy Status Card */}
                        <StrategyStatusCard
                            sessionId={sessionId}
                            teamId={loggedInTeamId || ''}
                            currentRound={currentActiveSlide?.round_number || 1}
                        />

                        {/* INVESTMENT DISPLAY - Show purchased investments for current round */}
                        {currentActiveSlide && teamGameState.gameStructure && loggedInTeamId && (
                            <TeamInvestmentDisplay
                                key={`investments-${loggedInTeamId}-${currentActiveSlide.round_number}`} // ✅ Only remount on team/round change
                                sessionId={sessionId || ''}
                                teamId={loggedInTeamId}
                                currentRound={currentActiveSlide.round_number || 1}
                                gameStructure={teamGameState.gameStructure}
                                refreshTrigger={Math.max(resetTrigger, investmentRefreshTrigger)}
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
                    {isDecisionPhaseActive && teamGameState.gameStructure ? (
                        <DecisionModeContainer
                            teamId={loggedInTeamId}
                            currentSlide={currentActiveSlide}
                            sessionId={sessionId || ''}
                            gameStructure={teamGameState.gameStructure}
                            interactiveData={teamGameState.interactiveData}
                            decisionResetTrigger={resetTrigger}
                            onDecisionSubmitted={() => {
                                triggerDecisionRefresh();
                                setInvestmentRefreshTrigger(prev => prev + 1);
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center max-w-md">
                                {currentActiveSlide ? (
                                    <>
                                        <div className="mb-6">
                                            <img
                                                src="/images/ready-or-not-logo.png"
                                                alt="Ready or Not"
                                                className="w-24 h-auto mx-auto drop-shadow-lg"
                                                style={{filter: 'brightness(1.1) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'}}
                                            />
                                        </div>
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
                                        <div className="mb-6">
                                            <img
                                                src="/images/ready-or-not-logo.png"
                                                alt="Ready or Not"
                                                className="w-24 h-auto mx-auto drop-shadow-lg"
                                                style={{filter: 'brightness(1.1) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'}}
                                            />
                                        </div>
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
