// src/components/StudentDisplay/LeaderboardChartDisplay.tsx
import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Team, TeamRoundData, KpiKey } from '../../types';
import { Trophy } from 'lucide-react';

interface LeaderboardItem {
    teamName: string;
    value: number;
    formattedValue: string;
    rank: number;
}

interface LeaderboardChartDisplayProps {
    dataKey: string; // e.g., "rd1_leaderboard_income", "rd1_leaderboard_cap_ord"
    currentRoundForDisplay: number | null; // To fetch data for the correct round
    // Optional props to provide data directly when AppContext isn't available
    teams?: Team[];
    teamRoundData?: Record<string, Record<number, TeamRoundData>>;
}

const formatValueForDisplay = (value: number, metric: KpiKey | 'net_margin' | 'cost_per_board'): string => {
    if (isNaN(value) || value === null || value === undefined) return 'N/A';
    switch (metric) {
        case 'cost':
        case 'revenue':
        case 'net_income':
        case 'asp':
        case 'cost_per_board': // Assuming cost per board is also currency
            return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        case 'capacity':
        case 'orders':
            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        case 'net_margin':
            return `${(value * 100).toFixed(1)}%`; // Display as percentage
        default:
            return value.toString();
    }
};

const getMetricAndSortOrder = (dataKey: string): { metric: KpiKey | 'net_margin' | 'cost_per_board', kpiLabel: string, higherIsBetter: boolean, secondaryMetric?: KpiKey, secondaryKpiLabel?: string } => {
    // Example: "rd1_leaderboard_income" -> metric: net_income, label: "Net Income"
    // Example: "rd1_leaderboard_cap_ord" -> metric: capacity, secondaryMetric: orders
    const parts = dataKey.split('_');
    const metricKey = parts[parts.length -1]; // last part e.g. "income", "capord", "cpb"

    switch (metricKey) {
        case 'income': return { metric: 'net_income', kpiLabel: 'Net Income', higherIsBetter: true };
        case 'margin': return { metric: 'net_margin', kpiLabel: 'Net Margin', higherIsBetter: true };
        case 'revenue': return { metric: 'revenue', kpiLabel: 'Revenue', higherIsBetter: true };
        case 'asp': return { metric: 'asp', kpiLabel: 'Avg. Selling Price', higherIsBetter: true };
        case 'capord': return { metric: 'capacity', kpiLabel: 'Capacity', higherIsBetter: true, secondaryMetric: 'orders', secondaryKpiLabel: 'Orders' };
        case 'capacity': return { metric: 'capacity', kpiLabel: 'Capacity', higherIsBetter: true }; // if just capacity
        case 'orders': return { metric: 'orders', kpiLabel: 'Orders Filled', higherIsBetter: true }; // if just orders
        case 'costs': return { metric: 'cost', kpiLabel: 'Total Costs', higherIsBetter: false }; // Lower costs are better
        case 'cpb': return { metric: 'cost_per_board', kpiLabel: 'Cost Per Board', higherIsBetter: false }; // Lower is better
        default: return { metric: 'net_income', kpiLabel: 'Overall Score (Net Income)', higherIsBetter: true }; // Default fallback
    }
};


const LeaderboardChartDisplay: React.FC<LeaderboardChartDisplayProps> = ({
                                                                             dataKey,
                                                                             currentRoundForDisplay,
                                                                             teams: propTeams,
                                                                             teamRoundData: propTeamRoundData
                                                                         }) => {
    // Try to get data from AppContext, but fall back to props if not available
    let contextState = null;
    try {
        const { state } = useAppContext();
        contextState = state;
    } catch (error) {
        console.log('[LeaderboardChartDisplay] AppContext not available, using prop data');
    }

    const teams = propTeams || contextState?.teams || [];
    const teamRoundData = propTeamRoundData || contextState?.teamRoundData || {};

    const { metric, kpiLabel, higherIsBetter, secondaryMetric, secondaryKpiLabel } = useMemo(() => getMetricAndSortOrder(dataKey), [dataKey]);

    const leaderboardData = useMemo((): LeaderboardItem[] => {
        if (!currentRoundForDisplay || teams.length === 0) return [];

        const dataForRound: { team: Team; roundData: TeamRoundData | undefined }[] = teams.map(team => ({
            team,
            roundData: teamRoundData[team.id]?.[currentRoundForDisplay]
        }));

        const valuedData = dataForRound.map(item => {
            let value: number | undefined;
            let secondaryValue: number | undefined;

            if (item.roundData) {
                if (metric === 'cost_per_board') {
                    // Cost per board = total cost / total orders (if orders > 0)
                    value = (item.roundData.current_orders > 0) ? (item.roundData.current_cost / item.roundData.current_orders) : Infinity; // Higher if no orders to rank last
                    if (value === Infinity && !higherIsBetter) value = Number.MAX_SAFE_INTEGER; // Effectively last for lowerIsBetter
                } else {
                    value = item.roundData[metric as keyof TeamRoundData] as number | undefined;
                }
                if (secondaryMetric && item.roundData) {
                    secondaryValue = item.roundData[secondaryMetric as keyof TeamRoundData] as number | undefined;
                }
            }
            return {
                teamName: item.team.name,
                value: value ?? (higherIsBetter ? -Infinity : Infinity), // Default for sorting if no data
                formattedValue: value !== undefined ? formatValueForDisplay(value, metric) : 'N/A',
                secondaryValue: secondaryValue !== undefined && secondaryMetric ? formatValueForDisplay(secondaryValue, secondaryMetric) : undefined,
            };
        });

        const sortedData = valuedData.sort((a, b) => {
            return higherIsBetter ? b.value - a.value : a.value - b.value;
        });

        return sortedData.map((item, index) => ({
            ...item,
            rank: index + 1
        }));

    }, [teams, teamRoundData, currentRoundForDisplay, metric, higherIsBetter, secondaryMetric]);

    if (!currentRoundForDisplay) {
        return <div className="p-8 text-center text-xl text-gray-400">Leaderboard data not available for this context.</div>;
    }
    if (leaderboardData.length === 0) {
        return <div className="p-8 text-center text-xl text-gray-400">Loading leaderboard data or no teams present...</div>;
    }

    const titleParts = dataKey.split('_');
    const roundDisplay = titleParts[0].toUpperCase(); // RD1, RD2, etc.


    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 md:p-8 bg-gray-800 text-white rounded-lg shadow-2xl">
            <Trophy size={48} className="text-yellow-400 mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-1">{roundDisplay} Leaderboard</h2>
            <h3 className="text-xl md:text-2xl text-sky-300 mb-6">{kpiLabel}</h3>

            <div className="w-full max-w-2xl bg-gray-700/50 p-4 sm:p-6 rounded-lg shadow-inner">
                <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 items-center mb-2 pb-2 border-b border-gray-600 text-xs sm:text-sm font-semibold text-gray-300">
                    <span>Rank</span>
                    <span>Team</span>
                    <span className="text-right">{kpiLabel}{secondaryKpiLabel ? ` / ${secondaryKpiLabel}` : ''}</span>
                </div>
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700/50">
                    {leaderboardData.map((item) => (
                        <li key={item.teamName} className={`p-2.5 sm:p-3 rounded-md flex items-center transition-all duration-300
                            ${item.rank === 1 ? 'bg-yellow-500/30 border-2 border-yellow-400 shadow-lg' :
                            item.rank === 2 ? 'bg-gray-500/30 border border-gray-400' :
                                item.rank === 3 ? 'bg-orange-600/30 border border-orange-500' :
                                    'bg-gray-600/30 border border-gray-500/50'}`}>
                            <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-3 text-xs sm:text-sm font-bold flex-shrink-0
                                ${item.rank === 1 ? 'bg-yellow-400 text-gray-900' :
                                item.rank === 2 ? 'bg-gray-400 text-gray-900' :
                                    item.rank === 3 ? 'bg-orange-500 text-white' :
                                        'bg-gray-500 text-white'}`}>
                                {item.rank}
                            </span>
                            <span className="font-medium text-sm sm:text-base text-gray-100 flex-grow truncate" title={item.teamName}>{item.teamName}</span>
                            <div className="text-right ml-2">
                                <span className={`font-semibold text-sm sm:text-base ${item.rank === 1 ? 'text-yellow-300' : 'text-sky-300'}`}>
                                    {item.formattedValue}
                                </span>
                                {item.secondaryValue && secondaryKpiLabel && (
                                    <span className="block text-xs text-gray-400">{item.secondaryValue} ({secondaryKpiLabel})</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default LeaderboardChartDisplay;