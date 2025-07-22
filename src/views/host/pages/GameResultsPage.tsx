// src/views/host/pages/GameResultsPage.tsx
import React, {useEffect, useState, useMemo} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {
    Trophy,
    TrendingUp,
    DollarSign,
    Users,
    Calendar,
    ArrowLeft,
    Award,
    Target
} from 'lucide-react';
import {GameSession} from '@shared/types';
import {GameSessionManager} from '@core/game/GameSessionManager';
import {useTeamDataManager} from '@shared/hooks/useTeamDataManager';
import {calculateConsolidatedNetIncome, calculateKpiValue} from '@shared/components/UI/Leaderboard/utils';
import GameResultsCharts from '../components/GameResultsCharts';
import KPITrendCharts from '../components/KPITrendCharts';
import OperationalKPITrends from '../components/OperationalKPITrends';
import {TeamStanding, GameStatistics} from '@shared/types/results';

const GameResultsPage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<GameSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use existing team data management hook
    const {
        teams,
        teamRoundData,
        teamDecisions,
        isLoadingTeams,
        isLoadingRoundData,
        error: teamDataError
    } = useTeamDataManager(sessionId || '');

    // Load session data
    useEffect(() => {
        const loadSession = async () => {
            if (!sessionId) {
                setError('No session ID provided');
                setLoading(false);
                return;
            }

            try {
                const sessionManager = GameSessionManager.getInstance();
                const sessionData = await sessionManager.loadSession(sessionId);
                setSession(sessionData);
            } catch (err) {
                console.error('Error loading session:', err);
                setError(err instanceof Error ? err.message : 'Failed to load session');
            } finally {
                setLoading(false);
            }
        };

        loadSession();
    }, [sessionId]);

    // Calculate final standings and stats
    const finalStandings = useMemo((): TeamStanding[] => {
        if (!teams.length || !teamRoundData) return [];

        const allTeamDecisions = teamDecisions ?
            Object.values(teamDecisions).flatMap(teamDecisionsByPhase =>
                Object.values(teamDecisionsByPhase)
            ) : [];

        const standings = teams.map(team => {
            const round3Data = teamRoundData[team.id]?.[3];
            if (!round3Data) return null;

            const consolidatedNetIncome = calculateConsolidatedNetIncome(teamRoundData, team.id, allTeamDecisions);
            const revenue = calculateKpiValue(round3Data, 'revenue', allTeamDecisions, team.id);
            const netMargin = calculateKpiValue(round3Data, 'net_margin', allTeamDecisions, team.id);

            return {
                team,
                round3Data,
                consolidatedNetIncome,
                revenue,
                netMargin,
                capacity: round3Data.current_capacity,
                orders: round3Data.current_orders,
                asp: round3Data.current_asp,
                costs: round3Data.current_cost
            } satisfies TeamStanding;
        }).filter((item): item is TeamStanding => item !== null);

        return standings.sort((a, b) => b.consolidatedNetIncome - a.consolidatedNetIncome);
    }, [teams, teamRoundData, teamDecisions]);

    // Calculate game statistics
    const gameStats = useMemo((): GameStatistics | null => {
        if (finalStandings.length === 0) return null;

        const totalRevenue = finalStandings.reduce((sum, team) => sum + team.revenue, 0);
        const avgConsolidatedNetIncome = finalStandings.reduce((sum, team) => sum + team.consolidatedNetIncome, 0) / finalStandings.length;
        const highestConsolidatedNetIncome = Math.max(...finalStandings.map(team => team.consolidatedNetIncome));
        const lowestConsolidatedNetIncome = Math.min(...finalStandings.map(team => team.consolidatedNetIncome));

        return {
            totalRevenue,
            avgConsolidatedNetIncome,
            highestConsolidatedNetIncome,
            lowestConsolidatedNetIncome,
            totalTeams: finalStandings.length
        };
    }, [finalStandings]);

    const winner = useMemo((): TeamStanding | null => {
        return finalStandings.length > 0 ? finalStandings[0] : null;
    }, [finalStandings]);

    if (loading || isLoadingTeams || isLoadingRoundData) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-4 border-game-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading game results...</p>
                </div>
            </div>
        );
    }

    if (error || teamDataError || !session) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Trophy size={32} className="text-red-600"/>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Game Not Found</h2>
                    <p className="text-gray-600 mb-6">{error || teamDataError || 'Unable to load game results'}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-game-orange-600 text-white px-6 py-2 rounded-lg hover:bg-game-orange-700 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft size={20}/>
                            Back to Dashboard
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    {session.name} - Final Results
                                </h1>
                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16}/>
                                        Completed: {new Date(session.updated_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users size={16}/>
                                        {finalStandings.length} Teams
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Target size={16}/>
                                        Game Version {session.game_version}
                                    </div>
                                </div>
                            </div>

                            {winner && (
                                <div className="text-right">
                                    <div className="flex items-center gap-2 text-yellow-600 mb-2">
                                        <Trophy size={24}/>
                                        <span className="text-lg font-semibold">WINNER</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">{winner.team.name}</div>
                                    <div className="text-lg text-green-600">
                                        ${winner.consolidatedNetIncome.toLocaleString()} Consolidated Net Income
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Game Statistics */}
                {gameStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-green-100 p-2 rounded-lg">
                                    <DollarSign size={24} className="text-green-600"/>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Total Revenue</h3>
                                    <p className="text-2xl font-bold text-green-600">
                                        ${gameStats.totalRevenue.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-game-orange-100 p-2 rounded-lg">
                                    <TrendingUp size={24} className="text-game-orange-600"/>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Avg Consolidated Net Income</h3>
                                    <p className="text-2xl font-bold text-game-orange-600">
                                        ${Math.round(gameStats.avgConsolidatedNetIncome).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-yellow-100 p-2 rounded-lg">
                                    <Award size={24} className="text-yellow-600"/>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Highest Score</h3>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        ${gameStats.highestConsolidatedNetIncome.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-game-orange-100 p-2 rounded-lg">
                                    <Users size={24} className="text-game-orange-600"/>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Teams</h3>
                                    <p className="text-2xl font-bold text-game-orange-600">
                                        {gameStats.totalTeams}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Final Rankings Table */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <Trophy className="text-yellow-600" size={28}/>
                            Final Rankings
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rank</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Team</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Consolidated Net Income</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Revenue</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Net Margin</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Capacity</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Orders</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {finalStandings.map((team, index) => (
                                <tr key={team.team.id} className={index === 0 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {index === 0 && <Trophy size={18} className="text-yellow-600"/>}
                                            <span
                                                className={`font-semibold ${index === 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                                                    #{index + 1}
                                                </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                            <span
                                                className={`font-medium ${index === 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                                                {team.team.name}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm">
                                        <span
                                            className={index === 0 ? 'text-yellow-600 font-bold' : 'text-gray-900'}>
                                            ${team.consolidatedNetIncome.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-600">
                                        ${team.revenue.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-600">
                                        {team.netMargin.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-600">
                                        {team.capacity.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-600">
                                        {team.orders.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detailed Analytics Charts */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Trophy className="text-yellow-600" size={28}/>
                        Performance Analytics
                    </h2>
                    <GameResultsCharts
                        teams={teams}
                        teamRoundData={teamRoundData}
                        roundNumber={3}
                    />
                </div>

                {/* KPI Trend Analysis */}
                <div className="mb-8">
                    <KPITrendCharts
                        teams={teams}
                        teamRoundData={teamRoundData}
                    />
                </div>

                {/* Operational KPI Trends */}
                <div className="mb-8">
                    <OperationalKPITrends
                        teams={teams}
                        teamRoundData={teamRoundData}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={20}/>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameResultsPage;
