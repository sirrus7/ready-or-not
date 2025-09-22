// src/core/game/EmployeeDevelopmentTracker.ts
// PRODUCTION: Check if team invested in Employee Development for conditional bonuses

import { db } from '@shared/services/supabase';
import {TeamDecision} from "@shared/types";

export class EmployeeDevelopmentTracker {

    /**
     * Check if team has Employee Development investment in any round
     * Employee Development is option "E" in investment phases
     */
    static async hasEmployeeDevelopment(sessionId: string, teamId: string): Promise<boolean> {
        console.log(`[EmployeeDevelopmentTracker] Checking Employee Development for team ${teamId}`);

        try {
            const allDecisions: TeamDecision[] = await db.decisions.getBySession(sessionId);
            const teamDecisions: TeamDecision[] = allDecisions.filter(d => d.team_id === teamId);

            // Check for Employee Development (option E) in any investment round
            const hasInvestment: boolean = teamDecisions.some(decision =>
                decision.selected_investment_options?.includes('E')
            );

            console.log(`[EmployeeDevelopmentTracker] Team ${teamId} Employee Development result: ${hasInvestment}`);
            return hasInvestment;
        } catch (error) {
            console.error(`[EmployeeDevelopmentTracker] Error checking Employee Development:`, error);
            return false;
        }
    }

    /**
     * Calculate conditional capacity bonus based on Employee Development investment
     */
    static getConditionalCapacityBonus(hasEmployeeDevelopment: boolean): number {
        return hasEmployeeDevelopment ? 1500 : 1000; // 1000 base + 500 bonus if invested
    }

    /**
     * Get display text for impact card
     */
    static getImpactCardText(hasEmployeeDevelopment: boolean): string {
        const capacity = this.getConditionalCapacityBonus(hasEmployeeDevelopment);
        return hasEmployeeDevelopment
            ? `COSTS: +$300K\nCAPACITY: +${capacity.toLocaleString()}*\n*Bonus +500 CAP from Employee Development`
            : `COSTS: +$300K\nCAPACITY: +${capacity.toLocaleString()}*`;
    }
}