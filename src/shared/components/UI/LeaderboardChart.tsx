// src/shared/components/UI/LeaderboardChart.tsx
// UPDATED to handle all RD-1, RD-2, and RD-3 leaderboard types
import React, {useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider.tsx';
import {KpiKey} from '@shared/types/game';
import {Team, TeamRoundData} from '@shared/types/database';
import {Trophy} from 'lucide-react';

interface LeaderboardItem {
    teamName: string;
    value: number;
    formattedValue: string;
    rank: number;
    secondaryValue?: string; // For capacity & orders display
}

interface LeaderboardChartDisplayProps {
    slideId: number; // Changed from dataKey to slideId
    currentRoundForDisplay: number | null;
    teams?: Team[];
    teamRoundData?: Record<string, Record<number, TeamRoundData>>;
}

const formatValueForDisplay = (value: number, metric: KpiKey | 'net_margin' | 'cost_per_board' | 'revenue' | 'net_income'): string => {
    if (isNaN(value) || value === null || value === undefined) return 'N/A';

    switch (metric) {
        case 'cost':
        case 'revenue':
        case 'net_income':
            return `$${value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
        case 'asp':
        case 'cost_per_board':
            return `$${value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
        case 'capacity':
        case 'orders':
            return value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
        case 'net_margin':
            return `${(value * 100).toFixed(1)}%`; // Display as percentage
        default:
            return value.toString();
    }
};

const getMetricAndSortOrder = (dataKey: string): {
    metric: KpiKey | 'net_margin' | 'cost_per_board' | 'revenue' | 'net_income',
    kpiLabel: string,
    higherIsBetter: boolean,
    secondaryMetric?: KpiKey,
    secondaryKpiLabel?: string
} => {
    // Parse the dataKey to extract the metric
    // Format: "rd1_leaderboard_income", "rd2_leaderboard_capord", etc.
    const parts = dataKey.split('_');
    const metricKey = parts[parts.length - 1]; // Get the last part (income, capord, cpb, etc.)

    switch (metricKey) {
        case 'income':
            return {metric: 'net_income', kpiLabel: 'Net Income', higherIsBetter: true};
        case 'margin':
            return {metric: 'net_margin', kpiLabel: 'Net Margin', higherIsBetter: true};
        case 'revenue':
            return {metric: 'revenue', kpiLabel: 'Revenue', higherIsBetter: true};
        case 'asp':
            return {metric: 'asp', kpiLabel: 'Avg. Selling Price', higherIsBetter: true};
        case 'capord':
            return {
                metric: 'capacity',
                kpiLabel: 'Capacity',
                higherIsBetter: true,
                secondaryMetric: 'orders',
                secondaryKpiLabel: 'Orders'
            };
        case 'capacity':
            return {metric: 'capacity', kpiLabel: 'Capacity', higherIsBetter: true};
        case 'orders':
            return {metric: 'orders', kpiLabel: 'Orders Filled', higherIsBetter: true};
        case 'costs':
            return {metric: 'cost', kpiLabel: 'Total Costs', higherIsBetter: false}; // Lower costs are better
        case 'cpb':
            return {metric: 'cost_per_board', kpiLabel: 'Cost Per Board', higherIsBetter: false}; // Lower is better
        default:
            return {metric: 'net_income', kpiLabel: 'Overall Score (Net Income)', higherIsBetter: true}; // Default fallback
    }
};

const calculateKpiValue = (roundData: TeamRoundData, metric: KpiKey | 'net_margin' | 'cost_per_board' | 'revenue' | 'net_income'): number => {
    if (!roundData) return 0;

    switch (metric) {
        case 'capacity':
            return roundData.current_capacity || 0;
        case 'orders':
            return roundData.current_orders || 0;
        case 'cost':
            return roundData.current_cost || 0;
        case 'asp':
            return roundData.current_asp || 0;
        case 'revenue':
            // Revenue = Orders × ASP
            return (roundData.current_orders || 0) * (roundData.current_asp || 0);
        case 'net_income': {
            // Net Income = Revenue - Cost
            const revenue = (roundData.current_orders || 0) * (roundData.current_asp || 0);
            return revenue - (roundData.current_cost || 0);
        }
        case 'net_margin': {
            // Net Margin = (Revenue - Cost) / Revenue
            const rev = (roundData.current_orders || 0) * (roundData.current_asp || 0);
            const cost = roundData.current_cost || 0;
            return rev > 0 ? (rev - cost) / rev : 0; // Return as decimal (0.15 = 15%)
        }
        case 'cost_per_board': {
            // Cost Per Board = Total Cost / Orders
            const orders = roundData.current_orders || 1; // Avoid division by zero
            return (roundData.current_cost || 0) / orders;
        }
        default:
            return 0;
    }
};

// Hook to safely get game context
const useSafeGameContext = () => {
    try {
        return useGameContext();
    } catch (error) {
        // Context not available, return null
        return null;
    }
};

const LeaderboardChartDisplay: React.FC<LeaderboardChartDisplayProps> = ({
                                                                             slideId, // Changed prop name
                                                                             currentRoundForDisplay,
                                                                             teams: propTeams,
                                                                             teamRoundData: propTeamRoundData
                                                                         }) => {
    // Generate dataKey from slideId
    const dataKey = useMemo(() => {
        const getDataKey = (slideId: number): string => {
            switch(slideId) {
                // Round 1 leaderboards
                case 63.1: return 'rd1_leaderboard_capord';
                case 63.2: return 'rd1_leaderboard_cpb';
                case 63.3: return 'rd1_leaderboard_costs';
                case 63.4: return 'rd1_leaderboard_asp';
                case 63.5: return 'rd1_leaderboard_revenue';
                case 63.6: return 'rd1_leaderboard_margin';
                case 63.7: return 'rd1_leaderboard_income';

                // Round 2 leaderboards
                case 140.1: return 'rd2_leaderboard_capord';
                case 140.2: return 'rd2_leaderboard_cpb';
                case 140.3: return 'rd2_leaderboard_costs';
                case 140.4: return 'rd2_leaderboard_asp';
                case 140.5: return 'rd2_leaderboard_revenue';
                case 140.6: return 'rd2_leaderboard_margin';
                case 140.7: return 'rd2_leaderboard_income';

                // Round 3 leaderboards
                case 196.1: return 'rd3_leaderboard_capord';
                case 196.2: return 'rd3_leaderboard_cpb';
                case 196.3: return 'rd3_leaderboard_costs';
                case 196.4: return 'rd3_leaderboard_asp';
                case 196.5: return 'rd3_leaderboard_revenue';
                case 196.6: return 'rd3_leaderboard_margin';
                case 196.7: return 'rd3_leaderboard_income';

                default:
                    console.warn(`Unknown leaderboard slide ID: ${slideId}`);
                    return '';
            }
        };

        return getDataKey(slideId);
    }, [slideId]);

    // Safely try to get data from AppContext
    const gameContext = useSafeGameContext();
    const contextState = gameContext?.state;

    const teams = propTeams || contextState?.teams || [];
    const teamRoundData = propTeamRoundData || contextState?.teamRoundData || {};

    const {
        metric,
        kpiLabel,
        higherIsBetter,
        secondaryMetric,
        secondaryKpiLabel
    } = useMemo(() => getMetricAndSortOrder(dataKey), [dataKey]);

    const leaderboardData = useMemo((): LeaderboardItem[] => {
        if (!currentRoundForDisplay || teams.length === 0) return [];

        const dataForRound: { team: Team; roundData: TeamRoundData | undefined }[] = teams.map(team => ({
            team,
            roundData: teamRoundData[team.id]?.[currentRoundForDisplay]
        }));

        const itemsWithValues = dataForRound
            .map(({team, roundData}) => {
                if (!roundData) return null;

                const value = calculateKpiValue(roundData, metric);
                const formattedValue = formatValueForDisplay(value, metric);

                // For capacity & orders, show both values
                let secondaryValue: string | undefined;
                if (secondaryMetric) {
                    const secValue = calculateKpiValue(roundData, secondaryMetric);
                    secondaryValue = formatValueForDisplay(secValue, secondaryMetric);
                }

                return {
                    teamName: team.name,
                    value,
                    formattedValue,
                    secondaryValue,
                    rank: 0 // Will be set after sorting
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        // Sort by value
        const sortedItems = itemsWithValues.sort((a, b) =>
            higherIsBetter ? b.value - a.value : a.value - b.value
        );

        // Assign ranks
        return sortedItems.map((item, index) => ({
            ...item,
            rank: index + 1
        }));
    }, [teams, teamRoundData, currentRoundForDisplay, metric, secondaryMetric, higherIsBetter]);

    // Determine round display text
    const roundDisplay = useMemo(() => {
        if (!currentRoundForDisplay) return 'Round';

        // Check if this is a final leaderboard
        if (dataKey.includes('rd3_leaderboard')) {
            return 'Final Round 3';
        }

        return `Round ${currentRoundForDisplay}`;
    }, [currentRoundForDisplay, dataKey]);

    if (leaderboardData.length === 0) {
        return (
            <div
                className="h-full w-full flex flex-col items-center justify-center p-4 md:p-8 bg-gray-800 text-white rounded-lg shadow-2xl">
                <Trophy size={48} className="text-yellow-400 mb-4"/>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">No Data Available</h2>
                <p className="text-gray-400 text-center">Leaderboard data not yet available for this round.</p>
            </div>
        );
    }

    return (
        <div
            className="h-full w-full flex flex-col items-center justify-center p-4 md:p-8 bg-gray-800 text-white rounded-lg shadow-2xl">
            <Trophy size={48} className="text-yellow-400 mb-4"/>
            <h2 className="text-3xl md:text-4xl font-bold mb-1">{roundDisplay} Leaderboard</h2>
            <h3 className="text-xl md:text-2xl text-sky-300 mb-6">{kpiLabel}</h3>

            <div className="w-full max-w-2xl bg-gray-700/50 p-4 sm:p-6 rounded-lg shadow-inner">
                <div
                    className="grid grid-cols-[auto_1fr_auto] gap-x-4 items-center mb-2 pb-2 border-b border-gray-600 text-xs sm:text-sm font-semibold text-gray-300">
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
                            <span className="font-medium text-sm sm:text-base text-gray-100 flex-grow truncate"
                                  title={item.teamName}>{item.teamName}</span>
                            <div className="text-right ml-2">
                                <span
                                    className={`font-semibold text-sm sm:text-base ${item.rank === 1 ? 'text-yellow-300' : 'text-sky-300'}`}>
                                    {item.formattedValue}
                                </span>
                                {item.secondaryValue && secondaryKpiLabel && (
                                    <span
                                        className="block text-xs text-gray-400">{item.secondaryValue} ({secondaryKpiLabel})</span>
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
