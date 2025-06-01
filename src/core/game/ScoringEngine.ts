// src/utils/kpiCalculations.ts
import { TeamRoundData, KpiEffect, PermanentKpiAdjustment, KpiKey } from '@shared/types/common.ts';

// Base starting values for the game
const BASE_VALUES = {
    CAPACITY: 5000,
    ORDERS: 6250,
    COST: 1200000,
    ASP: 1000
} as const;

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
     * Calculate final KPIs (revenue, net income, net margin)
     */
    static calculateFinalKpis(kpis: TeamRoundData): Partial<TeamRoundData> {
        const revenue = kpis.current_orders * kpis.current_asp;
        const netIncome = revenue - kpis.current_cost;
        const netMargin = revenue > 0 ? netIncome / revenue : 0;

        return {
            revenue: Math.round(revenue),
            net_income: Math.round(netIncome),
            net_margin: parseFloat(netMargin.toFixed(4))
        };
    }

    /**
     * Create new round data with proper starting values
     */
    static async createNewRoundData(
        sessionId: string,
        teamId: string,
        roundNumber: 1 | 2 | 3,
        existingTeamData?: Record<number, TeamRoundData>
    ): Promise<Omit<TeamRoundData, 'id'>> {
        let start_capacity = BASE_VALUES.CAPACITY;
        let start_orders = BASE_VALUES.ORDERS;
        let start_cost = BASE_VALUES.COST;
        let start_asp = BASE_VALUES.ASP;

        // Use previous round's current values as starting values
        if (roundNumber > 1 && existingTeamData) {
            const prevRoundKey = (roundNumber - 1) as 1 | 2;
            const prevRoundData = existingTeamData[prevRoundKey];
            if (prevRoundData) {
                start_capacity = prevRoundData.current_capacity;
                start_orders = prevRoundData.current_orders;
                start_cost = prevRoundData.current_cost;
                start_asp = prevRoundData.current_asp;
            }
        }

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

        let { start_capacity, start_orders, start_cost, start_asp } = roundData;

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
    static resetKpiData(kpiData: TeamRoundData): Partial<TeamRoundData> {
        return {
            start_capacity: BASE_VALUES.CAPACITY,
            current_capacity: BASE_VALUES.CAPACITY,
            start_orders: BASE_VALUES.ORDERS,
            current_orders: BASE_VALUES.ORDERS,
            start_cost: BASE_VALUES.COST,
            current_cost: BASE_VALUES.COST,
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

// TODO: Extract KPI calculation logic into a class or set of functions within ScoringEngine.ts.
