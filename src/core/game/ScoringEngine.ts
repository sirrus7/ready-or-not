// src/core/game/ScoringEngine.ts
import {TeamRoundData, PermanentKpiAdjustment} from '@shared/types/database';
import {KpiEffect, KpiKey} from '@shared/types/game';

// --- CONSTANTS FROM THE GAME ENGINE MODEL ---

// From "Mix Financials.csv"
const BASE_VALUES = {
    CAPACITY: 5000,
    ASP: 1000
};
const ROUND_BASE_VALUES = {
    1: {cost: 1200000, orders: 6250},
    2: {cost: 1260000, orders: 6750},
    3: {cost: 1323000, orders: 7250},
};
const MATERIAL_COST_PER_BOARD = 470;

// From "Profit and Overhead Matrix.csv"
const OVERHEAD_MATRIX = [
    {margin: 0.29, overhead: 0.25}, {margin: 0.30, overhead: 0.25},
    {margin: 0.31, overhead: 0.25}, {margin: 0.32, overhead: 0.25},
    {margin: 0.33, overhead: 0.25}, {margin: 0.34, overhead: 0.25},
    {margin: 0.35, overhead: 0.25}, {margin: 0.36, overhead: 0.26},
    {margin: 0.37, overhead: 0.26}, {margin: 0.38, overhead: 0.27},
    {margin: 0.39, overhead: 0.27}, {margin: 0.40, overhead: 0.27},
    {margin: 0.41, overhead: 0.28}, {margin: 0.42, overhead: 0.28},
    {margin: 0.43, overhead: 0.29}, {margin: 0.44, overhead: 0.29},
    {margin: 0.45, overhead: 0.29}, {margin: 0.46, overhead: 0.30},
    {margin: 0.47, overhead: 0.30}, {margin: 0.48, overhead: 0.31},
    {margin: 0.49, overhead: 0.31}, {margin: 0.50, overhead: 0.31},
    {margin: 0.51, overhead: 0.32}, {margin: 0.52, overhead: 0.32},
    {margin: 0.53, overhead: 0.33}, {margin: 0.54, overhead: 0.33},
    {margin: 0.55, overhead: 0.33}, {margin: 0.56, overhead: 0.34},
    {margin: 0.57, overhead: 0.34}
];

// Helper to get overhead % based on Gross Margin
const getOverheadPercentage = (grossMargin: number): number => {
    // Find the closest margin in the matrix that is less than or equal to the actual margin
    const match = [...OVERHEAD_MATRIX].reverse().find(entry => grossMargin >= entry.margin);
    return match ? match.overhead : 0.25; // Default to 25% if below the minimum
};

export class KpiCalculations {
    static applyKpiEffects(currentKpisInput: TeamRoundData, effects: KpiEffect[]): TeamRoundData {
        const updatedKpis = JSON.parse(JSON.stringify(currentKpisInput));
        effects.forEach(effect => {
            if (effect.timing === 'immediate') {
                const kpi = effect.kpi as keyof typeof updatedKpis;
                if (typeof updatedKpis[kpi] === 'number') {
                    updatedKpis[kpi] += effect.change_value;
                }
            }
        });
        return updatedKpis;
    }

    static calculateFinalKpis(kpis: TeamRoundData): Partial<TeamRoundData> {
        const unitsSold = Math.min(kpis.current_capacity, kpis.current_orders);
        const revenue = unitsSold * kpis.current_asp;

        // COGS = Production Cost (KPI) + Variable Materials Cost
        const productionCost = kpis.current_cost;
        const variableMaterialsCost = unitsSold * MATERIAL_COST_PER_BOARD;
        const cogs = productionCost + variableMaterialsCost;

        const grossMargin = revenue > 0 ? (revenue - cogs) / revenue : 0;
        const overheadPercentage = getOverheadPercentage(grossMargin);
        const overheadCosts = revenue * overheadPercentage;

        const totalCost = cogs + overheadCosts;
        const netIncome = revenue - totalCost;
        const netMargin = revenue > 0 ? netIncome / revenue : 0;

        return {
            revenue: Math.round(revenue),
            net_income: Math.round(netIncome),
            net_margin: parseFloat(netMargin.toFixed(4))
        };
    }

    static createNewRoundData(sessionId: string, teamId: string, roundNumber: 1 | 2 | 3): Omit<TeamRoundData, 'id'> {
        const roundBases = ROUND_BASE_VALUES[roundNumber];
        return {
            session_id: sessionId,
            team_id: teamId,
            round_number: roundNumber,
            start_capacity: BASE_VALUES.CAPACITY,
            current_capacity: BASE_VALUES.CAPACITY,
            start_orders: roundBases.orders,
            current_orders: roundBases.orders,
            start_cost: roundBases.cost,
            current_cost: roundBases.cost,
            start_asp: BASE_VALUES.ASP,
            current_asp: BASE_VALUES.ASP,
            revenue: 0, net_margin: 0, net_income: 0,
        };
    }

    static applyPermanentAdjustments(roundData: Omit<TeamRoundData, 'id'>, adjustments: PermanentKpiAdjustment[], teamId: string, roundNumber: number): Omit<TeamRoundData, 'id'> {
        const teamAdjustments = adjustments.filter(adj => adj.team_id === teamId && adj.applies_to_round_start === roundNumber);

        teamAdjustments.forEach(adj => {
            switch (adj.kpi_key) {
                case 'capacity':
                    roundData.start_capacity += adj.change_value;
                    break;
                case 'orders':
                    roundData.start_orders += adj.change_value;
                    break;
                case 'cost':
                    roundData.start_cost += adj.change_value;
                    break;
                case 'asp':
                    roundData.start_asp += adj.change_value;
                    break;
            }
        });

        roundData.current_capacity = roundData.start_capacity;
        roundData.current_orders = roundData.start_orders;
        roundData.current_cost = roundData.start_cost;
        roundData.current_asp = roundData.start_asp;

        return roundData;
    }

    static createPermanentAdjustments(effects: KpiEffect[], sessionId: string, teamId: string, sourceLabel: string): Omit<PermanentKpiAdjustment, 'id' | 'created_at'>[] {
        return effects
            .filter(eff => eff.timing === 'permanent_next_round_start' && eff.applies_to_rounds?.length)
            .flatMap(eff => (eff.applies_to_rounds!).map(roundNum => ({
                session_id: sessionId,
                team_id: teamId,
                applies_to_round_start: roundNum,
                kpi_key: eff.kpi,
                change_value: eff.change_value,
                description: eff.description || `Permanent effect from ${sourceLabel}`
            })));
    }
}
