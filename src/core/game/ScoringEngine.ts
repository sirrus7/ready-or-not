// src/core/game/ScoringEngine.ts
// PRODUCTION: Updated with correct baseline values for KPI reset system

import {KpiEffect, TeamRoundData} from '@shared/types';
import {PermanentKpiAdjustment} from '@shared/types/database';

export const BASE_VALUES = {
    CAPACITY: 5000,
    ASP: 1000  // ✅ FIXED: Changed from 950 to 1000
};

export const ROUND_BASE_VALUES = {
    1: {orders: 5000, cost: 1200000},                    // Initial round 1 values
    2: {orders: 6750, cost: 1275000},                    // ✅ FIXED: RD-1→RD-2 Reset values
    3: {orders: 7250, cost: 1350000}                     // ✅ FIXED: RD-2→RD-3 Reset values
};

export class ScoringEngine {

    /**
     * Applies KPI effects to a team's round data
     */
    static applyKpiEffects(roundData: TeamRoundData, effects: KpiEffect[]): TeamRoundData {
        const updated = {...roundData};

        effects
            .filter(eff => eff.timing === 'immediate')
            .forEach(eff => {
                switch (eff.kpi) {
                    case 'capacity':
                        updated.current_capacity += eff.change_value;
                        break;
                    case 'orders':
                        updated.current_orders += eff.change_value;
                        break;
                    case 'cost':
                        updated.current_cost += eff.change_value;
                        break;
                    case 'asp':
                        updated.current_asp += eff.change_value;
                        break;
                }
            });

        return updated;
    }

    /**
     * Calculates derived financial metrics
     */
    static calculateFinancialMetrics(kpis: TeamRoundData): {
        revenue: number;
        net_income: number;
        net_margin: number;
    } {
        const unitsProduced = Math.min(kpis.current_capacity, kpis.current_orders);
        const revenue = unitsProduced * kpis.current_asp;
        const netIncome = revenue - kpis.current_cost;
        const netMargin = revenue > 0 ? netIncome / revenue : 0;

        return {
            revenue: Math.round(revenue),
            net_income: Math.round(netIncome),
            net_margin: parseFloat(netMargin.toFixed(4))
        };
    }

    /**
     * Creates new round data with base values for a team
     */
    static createNewRoundData(sessionId: string, teamId: string, roundNumber: 1 | 2 | 3, existingTeamData?: Record<number, TeamRoundData>): Omit<TeamRoundData, 'id'> {
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
            revenue: 0,
            net_margin: 0,
            net_income: 0,
        };
    }

    /**
     * Applies permanent adjustments to round starting values
     * OPTIMIZED: Now expects team-specific adjustments (no filtering needed)
     */
    static applyPermanentAdjustments(roundData: Omit<TeamRoundData, 'id'>, adjustments: PermanentKpiAdjustment[], teamId: string, roundNumber: number): Omit<TeamRoundData, 'id'> {
        const applicableAdjustments = adjustments.filter(adj =>
            adj.applies_to_round_start === roundNumber
        );

        applicableAdjustments.forEach(adj => {
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

        // Update current values to match start values after adjustments
        roundData.current_capacity = roundData.start_capacity;
        roundData.current_orders = roundData.start_orders;
        roundData.current_cost = roundData.start_cost;
        roundData.current_asp = roundData.start_asp;

        return roundData;
    }

    /**
     * PRODUCTION: Creates permanent adjustment records with explicit challenge tracking
     */
    static createPermanentAdjustments(
        effects: KpiEffect[],
        sessionId: string,
        teamId: string,
        challengeId: string,
        optionId: string
    ): Omit<PermanentKpiAdjustment, 'id' | 'created_at'>[] {
        return effects
            .filter(eff => eff.timing === 'permanent_next_round_start' && eff.applies_to_rounds?.length)
            .flatMap(eff => (eff.applies_to_rounds || []).map(roundNum => ({
                session_id: sessionId,
                team_id: teamId,
                applies_to_round_start: roundNum,
                kpi_key: eff.kpi,
                change_value: eff.change_value,
                description: eff.description || `${challengeId.toUpperCase()} ${optionId} Impact`,

                // NEW: Explicit challenge tracking
                challenge_id: challengeId,
                option_id: optionId
            })));
    }
}
