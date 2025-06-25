// src/core/game/ForcedSelectionTracker.ts
// Handles challenges where certain teams are forced to select specific options

import {db} from '@shared/services/supabase';

export interface ForcedSelectionRule {
    challengeId: string;
    requiredInvestment: string;
    requiredRound: number;
    forcedOption: string;
    reason: string;
}

export class ForcedSelectionTracker {

    private static readonly FORCED_SELECTION_RULES: ForcedSelectionRule[] = [
        {
            challengeId: 'ch9',
            requiredInvestment: 'H', // Enterprise Resource Planning is option H
            requiredRound: 3, // RD-3 investment
            forcedOption: 'C',
            reason: "If you invested in Enterprise Resource Planning in RD-3, select this option"
        }
        // Future forced selection rules go here
    ];

    /**
     * Check if team has a forced selection for a challenge
     */
    static async getForcedSelection(
        sessionId: string,
        teamId: string,
        challengeId: string
    ): Promise<string | null> {
        console.log(`[ForcedSelectionTracker] Checking forced selection for team ${teamId}, challenge ${challengeId}`);

        const rule = this.FORCED_SELECTION_RULES.find(r => r.challengeId === challengeId);
        if (!rule) return null;

        try {
            const allDecisions = await db.decisions.getBySession(sessionId);
            const teamDecisions = allDecisions.filter(d => d.team_id === teamId);

            // Check if team made the required investment in the required round
            const hasInvestment = teamDecisions.some(decision =>
                decision.phase_id === `rd${rule.requiredRound}-invest` &&
                decision.selected_investment_options?.includes(rule.requiredInvestment)
            );

            if (hasInvestment) {
                console.log(`[ForcedSelectionTracker] Team ${teamId} forced to select option ${rule.forcedOption} for ${challengeId}`);
                return rule.forcedOption;
            }

            return null;
        } catch (error) {
            console.error(`[ForcedSelectionTracker] Error checking forced selection:`, error);
            return null;
        }
    }

    /**
     * Get the reason text for a forced selection
     */
    static getForcedSelectionReason(challengeId: string): string | null {
        const rule = this.FORCED_SELECTION_RULES.find(r => r.challengeId === challengeId);
        return rule?.reason || null;
    }

    /**
     * Get all teams with forced selections for a challenge (for host dashboard)
     */
    static async getTeamsWithForcedSelection(
        sessionId: string,
        challengeId: string
    ): Promise<Array<{ teamId: string, forcedOption: string }>> {
        try {
            const teams = await db.teams.getBySession(sessionId);
            const forcedSelections: Array<{ teamId: string, forcedOption: string }> = [];

            for (const team of teams) {
                const forcedOption = await this.getForcedSelection(sessionId, team.id, challengeId);
                if (forcedOption) {
                    forcedSelections.push({teamId: team.id, forcedOption});
                }
            }

            console.log(`[ForcedSelectionTracker] Found ${forcedSelections.length} teams with forced selections for ${challengeId}`);
            return forcedSelections;
        } catch (error) {
            console.error(`[ForcedSelectionTracker] Error getting teams with forced selections:`, error);
            return [];
        }
    }

    /**
     * Check if a challenge has forced selection rules
     */
    static hasForcedSelectionRules(challengeId: string): boolean {
        return this.FORCED_SELECTION_RULES.some(rule => rule.challengeId === challengeId);
    }
}
