// src/core/game/ScoringEngine.ts
import {TeamRoundData, PermanentKpiAdjustment} from '@shared/types/database';
import {KpiEffect, KpiKey} from '@shared/types/game';

// Base starting values for the game
const BASE_VALUES = {
    CAPACITY: 5000,
    ORDERS: 6250, // This is now only a fallback for Round 1
    COST: 1200000, // This is now only a fallback for Round 1
    ASP: 1000
} as const;

// NEW: Constants from the CSV game engine model
const MATERIAL_COST_PER_BOARD = 470;
const OVERHEAD_PERCENTAGE = 0.25;

// NEW: Round-specific base values from the CSV
const ROUND_BASE_VALUES = {
    1: {cost: 1200000, orders: 6250},
    2: {cost: 1260000, orders: 6750},
    3: {cost: 1323000, orders: 7250},
};


export class KpiCalculations {
    /**
     * Apply KPI effects to current team data
     */
    static applyKpiEffects(currentKpisInput: TeamRoundData, effects: KpiEffect[]): TeamRoundData {
        const updatedKpis = JSON.parse(JSON.stringify(currentKpisInput));

        effects.forEach(effect => {
            if (effect.timing === 'immediate') {
                const currentKpiName = `current_${effect.kpi}` as keyof TeamRoundData;
                const baseValue = (updatedKpis[currentKpiName] as number) ??
                    (updatedKpis[`start_${effect.kpi}` as keyof TeamRoundData] as number) ?? 0;

                let changeAmount = effect.change_value;
                if (effect.is_percentage_change) {
                    changeAmount = baseValue * (effect.change_value / 100);
                }

                (updatedKpis[currentKpiName] as number) = Math.round(baseValue + changeAmount);
            }
        });

        return updatedKpis;
    }

    /**
     * REFACTOR: Calculate final KPIs based on the CSV model.
     * This now includes capacity constraints, variable material costs, and overhead.
     */
    static calculateFinalKpis(kpis: TeamRoundData): Partial<TeamRoundData> {
        // CHANGED: Units sold are constrained by capacity.
        const unitsSold = Math.min(kpis.current_capacity, kpis.current_orders);

        // CHANGED: Revenue is based on unitsSold, not total orders.
        const revenue = unitsSold * kpis.current_asp;

        // CHANGED: Implement the full cost model from the CSV.
        const variableMaterialCosts = unitsSold * MATERIAL_COST_PER_BOARD;
        const overheadCosts = revenue * OVERHEAD_PERCENTAGE;
        // 'kpis.current_cost' is now treated as the fixed "Production Cost" from the CSV.
        const totalCost = kpis.current_cost + variableMaterialCosts + overheadCosts;

        const netIncome = revenue - totalCost;
        const netMargin = revenue > 0 ? netIncome / revenue : 0;

        // Note: We return the new total cost in the 'current_cost' field for reporting.
        return {
            current_cost: Math.round(totalCost),
            revenue: Math.round(revenue),
            net_income: Math.round(netIncome),
            net_margin: parseFloat(netMargin.toFixed(4))
        };
    }

    /**
     * REFACTOR: Create new round data using the hardcoded base values from the CSV model for each round.
     */
    static async createNewRoundData(
        sessionId: string,
        teamId: string,
        roundNumber: 1 | 2 | 3,
    ): Promise<Omit<TeamRoundData, 'id'>> {

        // CHANGED: Use hardcoded base values per round from the CSV model.
        const roundBases = ROUND_BASE_VALUES[roundNumber];

        const start_capacity = BASE_VALUES.CAPACITY;
        const start_orders = roundBases.orders;
        const start_cost = roundBases.cost;
        const start_asp = BASE_VALUES.ASP;

        return {
            session_id: sessionId,
            team_id: teamId,
            round_number: roundNumber,
            start_capacity,
            current_capacity: start_capacity,
            start_orders,
            current_orders: start_orders,
            start_cost,
            current_cost: start_cost,
            start_asp,
            current_asp: start_asp,
            revenue: 0,
            net_margin: 0,
            net_income: 0,
        };
    }

    /**
     * Apply permanent adjustments to round data
     */
    static applyPermanentAdjustments(
        roundData: Omit<TeamRoundData, 'id'>,
        adjustments: PermanentKpiAdjustment[],
        teamId: string,
        roundNumber: number
    ): Omit<TeamRoundData, 'id'> {
        const teamAdjustments = adjustments.filter(adj =>
            adj.team_id === teamId && adj.applies_to_round_start === roundNumber
        );

        let {start_capacity, start_orders, start_cost, start_asp} = roundData;

        teamAdjustments.forEach(adj => {
            const baseValue = this.getBaseValueForKpi(adj.kpi_key, {
                start_capacity,
                start_orders,
                start_cost,
                start_asp
            });

            const change = adj.is_percentage ? baseValue * (adj.change_value / 100) : adj.change_value;

            switch (adj.kpi_key) {
                case 'capacity':
                    start_capacity = Math.round(start_capacity + change);
                    break;
                case 'orders':
                    start_orders = Math.round(start_orders + change);
                    break;
                case 'cost':
                    start_cost = Math.round(start_cost + change);
                    break;
                case 'asp':
                    start_asp = Math.round(start_asp + change);
                    break;
            }
        });

        return {
            ...roundData,
            start_capacity,
            current_capacity: start_capacity,
            start_orders,
            current_orders: start_orders,
            start_cost,
            current_cost: start_cost,
            start_asp,
            current_asp: start_asp,
        };
    }

    /**
     * Create permanent adjustment records from effects
     */
    static createPermanentAdjustments(
        effects: KpiEffect[],
        sessionId: string,
        teamId: string,
        phaseSourceLabel: string
    ): Omit<PermanentKpiAdjustment, 'id'>[] {
        return effects
            .filter(eff => eff.timing === 'permanent_next_round_start' && eff.applies_to_rounds?.length)
            .flatMap(eff => (eff.applies_to_rounds!).map(roundNum => ({
                session_id: sessionId,
                team_id: teamId,
                applies_to_round_start: roundNum,
                kpi_key: eff.kpi,
                change_value: eff.change_value,
                is_percentage: eff.is_percentage_change || false,
                description: eff.description || `Permanent effect from ${phaseSourceLabel}`
            })));
    }

    /**
     * Reset KPI data to base values (for game reset)
     */
    static resetKpiData(): Partial<TeamRoundData> {
        // Resets to the absolute start of the game (Round 1 bases)
        const round1Bases = ROUND_BASE_VALUES[1];
        return {
            start_capacity: BASE_VALUES.CAPACITY,
            current_capacity: BASE_VALUES.CAPACITY,
            start_orders: round1Bases.orders,
            current_orders: round1Bases.orders,
            start_cost: round1Bases.cost,
            current_cost: round1Bases.cost,
            start_asp: BASE_VALUES.ASP,
            current_asp: BASE_VALUES.ASP,
            revenue: 0,
            net_income: 0,
            net_margin: 0,
        };
    }

    /**
     * Helper to get base value for a KPI key
     */
    private static getBaseValueForKpi(
        kpiKey: KpiKey,
        values: {
            start_capacity: number;
            start_orders: number;
            start_cost: number;
            start_asp: number;
        }
    ): number {
        switch (kpiKey) {
            case 'capacity':
                return values.start_capacity;
            case 'orders':
                return values.start_orders;
            case 'cost':
                return values.start_cost;
            case 'asp':
                return values.start_asp;
            default:
                return 0;
        }
    }
}
