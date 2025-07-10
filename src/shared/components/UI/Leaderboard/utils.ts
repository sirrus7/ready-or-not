// src/shared/components/UI/Leaderboard/utils.ts
import {KpiKey} from '@shared/types/game';
import {TeamRoundData, TeamDecision} from '@shared/types/database';
import {INVESTMENT_BUDGETS} from '@shared/utils/budgetUtils';

// NEW: Constants for the comprehensive cost calculation system
const MATERIALS_COST_PER_UNIT = 470; // $470 per board
const OVERHEAD_PERCENTAGE = 0.25; // 25% of revenue

// NEW: Calculate unspent investment budget for a team in a specific round
export const calculateUnspentBudget = (
    teamDecisions: TeamDecision[],
    teamId: string,
    roundNumber: number
): number => {
    const roundBudget = INVESTMENT_BUDGETS[roundNumber as keyof typeof INVESTMENT_BUDGETS] || 0;

    // Find all decisions for this team and round
    const roundDecisions = teamDecisions.filter(d =>
        d.team_id === teamId &&
        d.round_number === roundNumber
    );

    // Sum all spent amounts (both regular investments and immediate purchases)
    const totalSpent = roundDecisions.reduce((sum, decision) =>
        sum + (decision.total_spent_budget || 0), 0
    );

    return Math.max(0, roundBudget - totalSpent);
};

// NEW: Calculate the comprehensive cost breakdown
export const calculateNewCostBreakdown = (
    roundData: TeamRoundData,
    unspentBudget: number
): {
    adjustedCostKpi: number;
    materialsCost: number;
    overhead: number;
    totalCost: number;
    revenue: number;
    netIncome: number;
} => {
    // Step 1: Adjust Cost KPI
    const adjustedCostKpi = (roundData.current_cost || 0) - unspentBudget;

    // Step 2: Calculate components
    const unitsProduced = Math.min(
        roundData.current_capacity || 0,
        roundData.current_orders || 0
    );
    const revenue = unitsProduced * (roundData.current_asp || 0);
    const materialsCost = MATERIALS_COST_PER_UNIT * unitsProduced;
    const overhead = OVERHEAD_PERCENTAGE * revenue;

    // Step 3: Calculate totals
    const totalCost = adjustedCostKpi + materialsCost + overhead;
    const netIncome = revenue - totalCost;

    return {
        adjustedCostKpi,
        materialsCost,
        overhead,
        totalCost,
        revenue,
        netIncome
    };
};

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
            return {
                metric: 'net_income',
                kpiLabel: dataKey.includes('consolidated') ? 'Consolidated Net Income' : 'Net Income',
                higherIsBetter: true
            };
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

// UPDATED: Calculate KPI values from round data with optional comprehensive cost calculation
export const calculateKpiValue = (
    roundData: TeamRoundData,
    metric: KpiKey | 'net_margin' | 'cost_per_board' | 'revenue' | 'net_income',
    teamDecisions?: TeamDecision[], // NEW: Optional team decisions for comprehensive calculation
    teamId?: string // NEW: Optional team ID for filtering decisions
): number => {
    switch (metric) {
        case 'capacity':
            return roundData.current_capacity || 0;
        case 'orders':
            return roundData.current_orders || 0;
        case 'asp':
            return roundData.current_asp || 0;

        case 'cost': {
            // NEW: Use comprehensive cost calculation for leaderboards
            if (teamDecisions && teamId) {
                const unspentBudget = calculateUnspentBudget(teamDecisions, teamId, roundData.round_number);
                const breakdown = calculateNewCostBreakdown(roundData, unspentBudget);
                return breakdown.totalCost;
            }
            // Fallback to original calculation during gameplay
            return roundData.current_cost || 0;
        }

        case 'revenue': {
            // NEW: Use calculated revenue from comprehensive system
            if (teamDecisions && teamId) {
                const unspentBudget = calculateUnspentBudget(teamDecisions, teamId, roundData.round_number);
                const breakdown = calculateNewCostBreakdown(roundData, unspentBudget);
                return breakdown.revenue;
            }
            // FIXED: Use min(capacity, orders) for correct calculation
            const orders = roundData.current_orders || 0;
            const capacity = roundData.current_capacity || 0;
            const asp = roundData.current_asp || 0;
            return Math.min(orders, capacity) * asp;
        }

        case 'net_income': {
            // NEW: Use comprehensive net income calculation
            if (teamDecisions && teamId) {
                const unspentBudget = calculateUnspentBudget(teamDecisions, teamId, roundData.round_number);
                const breakdown = calculateNewCostBreakdown(roundData, unspentBudget);
                return breakdown.netIncome;
            }
            // FIXED: Use min(capacity, orders) for correct calculation
            const orders = roundData.current_orders || 0;
            const capacity = roundData.current_capacity || 0;
            const asp = roundData.current_asp || 0;
            const cost = roundData.current_cost || 0;
            const revenue = Math.min(orders, capacity) * asp;
            return revenue - cost;
        }

        case 'net_margin': {
            // NEW: Use comprehensive net margin calculation
            if (teamDecisions && teamId) {
                const unspentBudget = calculateUnspentBudget(teamDecisions, teamId, roundData.round_number);
                const breakdown = calculateNewCostBreakdown(roundData, unspentBudget);
                return breakdown.revenue > 0 ? breakdown.netIncome / breakdown.revenue : 0;
            }
            // FIXED: Use min(capacity, orders) for correct calculation
            const orders = roundData.current_orders || 0;
            const capacity = roundData.current_capacity || 0;
            const asp = roundData.current_asp || 0;
            const cost = roundData.current_cost || 0;
            const revenue = Math.min(orders, capacity) * asp;
            return revenue > 0 ? (revenue - cost) / revenue : 0;
        }

        case 'cost_per_board': {
            // NEW: Use comprehensive cost per board calculation
            const orders = roundData.current_orders || 1;
            const capacity = roundData.current_capacity || 1;
            const unitsProduced = Math.min(orders, capacity);

            if (teamDecisions && teamId) {
                const unspentBudget = calculateUnspentBudget(teamDecisions, teamId, roundData.round_number);
                const breakdown = calculateNewCostBreakdown(roundData, unspentBudget);
                return unitsProduced > 0 ? breakdown.totalCost / unitsProduced : 0;
            }
            // Fallback to original calculation
            return (roundData.current_cost || 0) / unitsProduced;
        }

        default:
            return 0;
    }
};

export const calculateConsolidatedNetIncome = (
    teamRoundData: Record<string, Record<number, TeamRoundData>>,
    teamId: string,
    teamDecisions?: TeamDecision[]
): number => {
    let totalNetIncome = 0;
    for (let round = 1; round <= 3; round++) {
        const roundData = teamRoundData[teamId]?.[round];
        if (roundData) {
            const netIncome = calculateKpiValue(roundData, 'net_income', teamDecisions, teamId);
            totalNetIncome += netIncome;
        }
    }
    return totalNetIncome;
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
        case 196.8:
            return 'rd3_leaderboard_consolidated_income';

        default:
            console.warn(`Unknown leaderboard slide ID: ${slideId}`);
            return '';
    }
};
