// src/core/game/ImmunityTracker.ts
// PRODUCTION: Immunity tracking following StrategyInvestmentTracker pattern

import {db} from '@shared/services/supabase'

export interface ImmunityRule {
    challengeId: string;
    requiredInvestment: string;
    requiredRound: number;
    message: string;
}

export class ImmunityTracker {

    private static readonly IMMUNITY_RULES: ImmunityRule[] = [
        {
            challengeId: 'ch4',
            requiredInvestment: 'D', // Supply Chain Optimization is option D
            requiredRound: 2,
            message: "If you've invested in Supply Chain Optimization in RD-2, you have already developed better relationships and terms with suppliers and voided this crisis. NO IMPACTS FROM THIS CHALLENGE"
        }
        // Future immunities go here
    ];

    /**
     * Check if team has immunity for a challenge
     * Follows the same pattern as StrategyInvestmentTracker.hasStrategyInvestment()
     */
    static async hasImmunity(sessionId: string, teamId: string, challengeId: string): Promise<boolean> {
        console.log(`[ImmunityTracker] Checking immunity for team ${teamId}, challenge ${challengeId}`);

        const rule = this.IMMUNITY_RULES.find(r => r.challengeId === challengeId);
        if (!rule) return false;

        try {
            const allDecisions = await db.decisions.getBySession(sessionId);
            const teamDecisions = allDecisions.filter(d => d.team_id === teamId);

            // Check if team made the required investment in the required round
            const hasInvestment = teamDecisions.some(decision =>
                decision.phase_id === `rd${rule.requiredRound}-invest` &&
                decision.selected_investment_options?.includes(rule.requiredInvestment)
            );

            console.log(`[ImmunityTracker] Team ${teamId} immunity result: ${hasInvestment}`);
            return hasInvestment;
        } catch (error) {
            console.error(`[ImmunityTracker] Error checking immunity:`, error);
            return false;
        }
    }

    /**
     * Get immunity message for display
     */
    static getImmunityMessage(challengeId: string): string | null {
        const rule = this.IMMUNITY_RULES.find(r => r.challengeId === challengeId);
        return rule?.message || null;
    }

    /**
     * Get all teams with immunity for a challenge (for host dashboard)
     */
    static async getImmuneTeams(sessionId: string, challengeId: string): Promise<string[]> {
        try {
            const teams = await db.teams.getBySession(sessionId);
            const immuneTeamIds: string[] = [];

            for (const team of teams) {
                const hasImmunity = await this.hasImmunity(sessionId, team.id, challengeId);
                if (hasImmunity) {
                    immuneTeamIds.push(team.id);
                }
            }

            console.log(`[ImmunityTracker] Found ${immuneTeamIds.length} immune teams for ${challengeId}`);
            return immuneTeamIds;
        } catch (error) {
            console.error(`[ImmunityTracker] Error getting immune teams:`, error);
            return [];
        }
    }
}
