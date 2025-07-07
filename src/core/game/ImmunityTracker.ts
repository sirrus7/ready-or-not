// src/core/game/ImmunityTracker.ts
import {db} from '@shared/services/supabase';

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
        },
        {
            challengeId: 'ch6',
            requiredInvestment: 'B', // Production Efficiency is option B
            requiredRound: 2,
            message: "If you've invested in Production Efficiency in RD-2, you have excellent quality control & avoided this crisis. SUBTRACT -$75K COSTS, ADD +$10 ASP and +250 ORDERS. YOU FACE NO ADDITIONAL CONSEQUENCES OR KPI IMPACTS FROM THIS CHALLENGE"
        },
        {
            challengeId: 'ch8',
            requiredInvestment: 'I', // IT & Cybersecurity is option I
            requiredRound: 3, // RD-3 investment
            message: "If you invested in Cyber Security in RD-3, you have avoided this crisis. NO IMPACTS FROM THIS CHALLENGE"
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

            // Check if the investment was sacrificed during double down
            const wasSacrificed = teamDecisions.some(decision =>
                decision.phase_id === 'ch-dd-prompt' &&
                decision.double_down_sacrifice_id === rule.requiredInvestment
            );

            console.log(`[ImmunityTracker] Team ${teamId} immunity result: ${hasInvestment && !wasSacrificed}`);
            return hasInvestment && !wasSacrificed;
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
