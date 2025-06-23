// src/shared/components/UI/Leaderboard/utils.ts
import {KpiKey} from '@shared/types/game';
import {TeamRoundData} from '@shared/types/database';

// Format values for display
export const formatValueForDisplay = (value: number, metric: KpiKey | 'net_margin' | 'cost_per_board' | 'revenue' | 'net_income'): string => {
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

// Get metric configuration from data key
export const getMetricAndSortOrder = (dataKey: string): {
    metric: KpiKey | 'net_margin' | 'cost_per_board' | 'revenue' | 'net_income',
    kpiLabel: string,
    higherIsBetter: boolean,
    secondaryMetric?: KpiKey,
    secondaryKpiLabel?: string
} => {
    const parts = dataKey.split('_');
    const metricKey = parts[parts.length - 1];

    switch (metricKey) {
        case 'income':
            return {metric: 'net_income', kpiLabel: 'Net Income', higherIsBetter: true};
        case 'margin':
            return {metric: 'net_margin', kpiLabel: 'Net Margin', higherIsBetter: true};
        case 'revenue':
            return {metric: 'revenue', kpiLabel: 'Revenue', higherIsBetter: true};
        case 'asp':
            return {metric: 'asp', kpiLabel: 'ASP', higherIsBetter: true};
        case 'costs':
            return {metric: 'cost', kpiLabel: 'Total Costs', higherIsBetter: false};
        case 'cpb':
            return {metric: 'cost_per_board', kpiLabel: 'Cost Per Board', higherIsBetter: false};
        case 'capord':
            return {
                metric: 'capacity',
                kpiLabel: 'Capacity',
                higherIsBetter: true,
                secondaryMetric: 'orders',
                secondaryKpiLabel: 'Orders'
            };
        default:
            return {metric: 'capacity', kpiLabel: 'Unknown', higherIsBetter: true};
    }
};

// Calculate KPI values from round data
export const calculateKpiValue = (roundData: TeamRoundData, metric: KpiKey | 'net_margin' | 'cost_per_board' | 'revenue' | 'net_income'): number => {
    switch (metric) {
        case 'capacity':
            return roundData.current_capacity || 0;
        case 'orders':
            return roundData.current_orders || 0;
        case 'cost':
            return roundData.current_cost || 0;
        case 'asp':
            return roundData.current_asp || 0;
        case 'revenue': {
            const orders = roundData.current_orders || 0;
            const asp = roundData.current_asp || 0;
            return orders * asp;
        }
        case 'net_income': {
            const orders = roundData.current_orders || 0;
            const asp = roundData.current_asp || 0;
            const cost = roundData.current_cost || 0;
            const revenue = orders * asp;
            return revenue - cost;
        }
        case 'net_margin': {
            const orders = roundData.current_orders || 0;
            const asp = roundData.current_asp || 0;
            const cost = roundData.current_cost || 0;
            const revenue = orders * asp;
            return revenue > 0 ? (revenue - cost) / revenue : 0;
        }
        case 'cost_per_board': {
            const orders = roundData.current_orders || 1;
            return (roundData.current_cost || 0) / orders;
        }
        default:
            return 0;
    }
};

// Generate data key from slide ID
export const getDataKeyFromSlideId = (slideId: number): string => {
    switch (slideId) {
        // Round 1 leaderboards
        case 63.1:
            return 'rd1_leaderboard_capord';
        case 63.2:
            return 'rd1_leaderboard_cpb';
        case 63.3:
            return 'rd1_leaderboard_costs';
        case 63.4:
            return 'rd1_leaderboard_asp';
        case 63.5:
            return 'rd1_leaderboard_revenue';
        case 63.6:
            return 'rd1_leaderboard_margin';
        case 63.7:
            return 'rd1_leaderboard_income';

        // Round 2 leaderboards
        case 140.1:
            return 'rd2_leaderboard_capord';
        case 140.2:
            return 'rd2_leaderboard_cpb';
        case 140.3:
            return 'rd2_leaderboard_costs';
        case 140.4:
            return 'rd2_leaderboard_asp';
        case 140.5:
            return 'rd2_leaderboard_revenue';
        case 140.6:
            return 'rd2_leaderboard_margin';
        case 140.7:
            return 'rd2_leaderboard_income';

        // Round 3 leaderboards
        case 196.1:
            return 'rd3_leaderboard_capord';
        case 196.2:
            return 'rd3_leaderboard_cpb';
        case 196.3:
            return 'rd3_leaderboard_costs';
        case 196.4:
            return 'rd3_leaderboard_asp';
        case 196.5:
            return 'rd3_leaderboard_revenue';
        case 196.6:
            return 'rd3_leaderboard_margin';
        case 196.7:
            return 'rd3_leaderboard_income';

        default:
            console.warn(`Unknown leaderboard slide ID: ${slideId}`);
            return '';
    }
};
