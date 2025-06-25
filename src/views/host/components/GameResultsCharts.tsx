// src/views/host/components/GameResultsCharts.tsx
// Standalone results component that doesn't depend on game context or slide IDs
import React, {useMemo} from 'react';
import {
    Trophy,
    TrendingUp,
    DollarSign,
    BarChart2,
    Zap
} from 'lucide-react';
import {Team, TeamRoundData} from '@shared/types';
import {calculateKpiValue, formatValueForDisplay} from '@shared/components/UI/Leaderboard/utils';

interface LeaderboardItem {
    teamName: string;
    value: number;
    formattedValue: string;
    rank: number;
    secondaryValue?: string;
}

interface GameResultsChartsProps {
    teams: Team[];
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    roundNumber: number;
}

interface MetricConfig {
    key: string;
    label: string;
    icon: React.ReactNode;
    colorScheme: string;
    higherIsBetter: boolean;
    secondaryMetric?: string;
    secondaryLabel?: string;
}

const METRICS: MetricConfig[] = [
    {
        key: 'net_income',
        label: 'Net Income',
        icon: <DollarSign className="w-6 h-6"/>,
        colorScheme: 'from-yellow-400 to-yellow-600',
        higherIsBetter: true
    },
    {
        key: 'revenue',
        label: 'Revenue',
        icon: <TrendingUp className="w-6 h-6"/>,
        colorScheme: 'from-orange-500 to-orange-600',
        higherIsBetter: true
    },
    {
        key: 'capacity',
        label: 'Capacity & Orders',
        icon: <Zap className="w-6 h-6"/>,
        colorScheme: 'from-blue-500 to-blue-600',
        higherIsBetter: true,
        secondaryMetric: 'orders',
        secondaryLabel: 'Orders'
    },
    {
        key: 'net_margin',
        label: 'Net Margin',
        icon: <BarChart2 className="w-6 h-6"/>,
        colorScheme: 'from-purple-500 to-purple-600',
        higherIsBetter: true
    }
];

// Individual chart component
const ResultsChart: React.FC<{
    title: string;
    metric: MetricConfig;
    data: LeaderboardItem[];
    isWinnerChart?: boolean;
}> = ({title, metric, data, isWinnerChart = false}) => {
    const maxValue = Math.max(...data.map(item => item.value));

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-gradient-to-r ${metric.colorScheme} rounded-lg text-white`}>
                        {metric.icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{title}</h3>
                        {isWinnerChart && (
                            <p className="text-sm text-yellow-600 font-medium">🏆 Final Rankings</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart Content */}
            <div className="p-6">
                <div className="space-y-4">
                    {data.map((item, index) => {
                        const isWinner = isWinnerChart && index === 0;
                        const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                        return (
                            <div key={item.teamName} className="space-y-2">
                                {/* Team info row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isWinner && <Trophy size={20} className="text-yellow-500"/>}
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                isWinner ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {item.rank}
                                        </div>
                                        <span className={`font-medium ${
                                            isWinner ? 'text-yellow-800' : 'text-gray-900'
                                        }`}>
                                            {item.teamName}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold ${
                                            isWinner ? 'text-yellow-600' : 'text-gray-900'
                                        }`}>
                                            {item.formattedValue}
                                        </div>
                                        {item.secondaryValue && (
                                            <div className="text-sm text-gray-500">
                                                {metric.secondaryLabel}: {item.secondaryValue}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${metric.colorScheme} transition-all duration-700 ${
                                            isWinner ? 'shadow-lg' : ''
                                        }`}
                                        style={{width: `${Math.max(barWidth, 2)}%`}}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Main component
const GameResultsCharts: React.FC<GameResultsChartsProps> = ({
                                                                 teams,
                                                                 teamRoundData,
                                                                 roundNumber
                                                             }) => {
    // Calculate leaderboard data for each metric
    const metricData = useMemo(() => {
        const results: Record<string, LeaderboardItem[]> = {};

        METRICS.forEach(metric => {
            const data = teams.map(team => {
                const roundData = teamRoundData[team.id]?.[roundNumber];
                if (!roundData) return null;

                const value = calculateKpiValue(roundData, metric.key as any);
                const formattedValue = formatValueForDisplay(value, metric.key as any);

                let secondaryValue: string | undefined;
                if (metric.secondaryMetric) {
                    const secValue = calculateKpiValue(roundData, metric.secondaryMetric as any);
                    secondaryValue = formatValueForDisplay(secValue, metric.secondaryMetric as any);
                }

                return {
                    teamName: team.name,
                    value,
                    formattedValue,
                    secondaryValue,
                    rank: 0 // Will be set after sorting
                };
            }).filter((item): item is NonNullable<typeof item> => item !== null);

            // Sort and rank
            const sorted = data.sort((a, b) =>
                metric.higherIsBetter ? b.value - a.value : a.value - b.value
            );

            results[metric.key] = sorted.map((item, index) => ({
                ...item,
                rank: index + 1
            }));
        });

        return results;
    }, [teams, teamRoundData, roundNumber]);

    if (teams.length === 0 || Object.keys(teamRoundData).length === 0) {
        return (
            <div className="text-center py-12">
                <Trophy size={48} className="text-gray-400 mx-auto mb-4"/>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h3>
                <p className="text-gray-500">Game results will be displayed here once teams complete all rounds.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {METRICS.map(metric => (
                <ResultsChart
                    key={metric.key}
                    title={`Final ${metric.label}`}
                    metric={metric}
                    data={metricData[metric.key] || []}
                    isWinnerChart={metric.key === 'net_income'}
                />
            ))}
        </div>
    );
};

export default GameResultsCharts;
