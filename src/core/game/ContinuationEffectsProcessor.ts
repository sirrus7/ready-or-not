// src/core/game/ContinuationEffectsProcessor.ts
// Applies continuation effects immediately when teams purchase continuation investments

import {db} from '@shared/services/supabase';
import {KpiEffect, TeamRoundData} from '@shared/types';
import {KpiDataUtils} from './KpiDataUtils';

/**
 * Continuation Effects - Applied when teams continue investments from previous round
 * Moved from KpiResetEngine.ts to be used during investment purchases
 */
const CONTINUATION_EFFECTS: Record<string, Record<string, KpiEffect[]>> = {
    // RD-1→RD-2 Continuation Effects
    'rd2': {
        'B': [ // Production Efficiency continuation
            {kpi: 'capacity', change_value: 1000, timing: 'immediate', description: 'Production Efficiency (Continued)'}
        ],
        'C': [ // Expanded 2nd Shift continuation
            {kpi: 'capacity', change_value: 750, timing: 'immediate', description: 'Expanded 2nd Shift (Continued)'},
            {
                kpi: 'cost',
                change_value: 150000,
                timing: 'immediate',
                description: 'Expanded 2nd Shift Labor (Continued)'
            }
        ],
        'D': [ // Supply Chain continuation
            {kpi: 'capacity', change_value: 125, timing: 'immediate', description: 'Supply Chain (Continued)'},
            {kpi: 'cost', change_value: -50000, timing: 'immediate', description: 'Supply Chain Savings (Continued)'}
        ],
        'E': [ // Employee Development continuation
            {kpi: 'capacity', change_value: 125, timing: 'immediate', description: 'Employee Development (Continued)'},
            {
                kpi: 'cost',
                change_value: -12500,
                timing: 'immediate',
                description: 'Employee Development Savings (Continued)'
            }
        ],
        'F': [ // Maximize Sales continuation
            {kpi: 'orders', change_value: 250, timing: 'immediate', description: 'Maximize Sales (Continued)'},
            {kpi: 'asp', change_value: 10, timing: 'immediate', description: 'Maximize Sales ASP (Continued)'}
        ]
    },
    // RD-2→RD-3 Continuation Effects
    'rd3': {
        'B': [ // Production Efficiency continuation (only if RD-2 investment)
            {
                kpi: 'capacity',
                change_value: 1500,
                timing: 'immediate',
                description: 'Production Efficiency (RD-3 Continued)'
            }
        ],
        'C': [ // Expanded 2nd Shift continuation
            {
                kpi: 'capacity',
                change_value: 2125,
                timing: 'immediate',
                description: 'Expanded 2nd Shift (RD-3 Continued)'
            },
            {
                kpi: 'cost',
                change_value: 375000,
                timing: 'immediate',
                description: 'Expanded 2nd Shift Labor (RD-3 Continued)'
            }
        ],
        'D': [ // Supply Chain continuation (only if RD-2 investment)
            {kpi: 'capacity', change_value: 100, timing: 'immediate', description: 'Supply Chain (RD-3 Continued)'},
            {
                kpi: 'cost',
                change_value: -37500,
                timing: 'immediate',
                description: 'Supply Chain Savings (RD-3 Continued)'
            }
        ],
        'E': [ // Employee Development continuation
            {
                kpi: 'capacity',
                change_value: 150,
                timing: 'immediate',
                description: 'Employee Development (RD-3 Continued)'
            },
            {
                kpi: 'cost',
                change_value: -37500,
                timing: 'immediate',
                description: 'Employee Development Savings (RD-3 Continued)'
            }
        ],
        'F': [ // Maximize Sales continuation
            {kpi: 'orders', change_value: 375, timing: 'immediate', description: 'Maximize Sales (RD-3 Continued)'},
            {kpi: 'asp', change_value: 12, timing: 'immediate', description: 'Maximize Sales ASP (RD-3 Continued)'}
        ],
        'G': [ // Big Box continuation
            {kpi: 'orders', change_value: 1000, timing: 'immediate', description: 'Big Box (Continued)'}
        ],
        'H': [ // ERP continuation
            {kpi: 'capacity', change_value: 125, timing: 'immediate', description: 'ERP (Continued)'},
            {kpi: 'cost', change_value: -12500, timing: 'immediate', description: 'ERP Savings (Continued)'}
        ],
        'I': [ // IT Security continuation
            {kpi: 'cost', change_value: -12500, timing: 'immediate', description: 'IT Security Savings (Continued)'}
        ],
        'J': [ // Inflatables continuation
            {kpi: 'orders', change_value: 500, timing: 'immediate', description: 'Inflatables (Continued)'},
            {kpi: 'asp', change_value: 25, timing: 'immediate', description: 'Inflatables ASP (Continued)'}
        ],
        'K': [ // Automation continuation
            {kpi: 'capacity', change_value: 1000, timing: 'immediate', description: 'Automation (Continued)'},
            {kpi: 'cost', change_value: 100000, timing: 'immediate', description: 'Automation Costs (Continued)'}
        ]
    }
};

export interface ContinuationEffectResult {
    investmentId: string;
    effects: KpiEffect[];
    teamId: string;
    appliedAt: string;
}

export class ContinuationEffectsProcessor {

    /**
     * Apply continuation effects for a specific investment purchase
     * This should be called immediately when a team purchases a continuation investment
     */
    static async applyContinuationEffects(
        sessionId: string,
        teamId: string,
        investmentId: string,
        targetRound: 2 | 3,
        teamRoundData: Record<string, TeamRoundData>,
        setTeamRoundDataDirectly: (data: Record<string, TeamRoundData>) => void
    ): Promise<ContinuationEffectResult | null> {
        console.log(`[ContinuationEffectsProcessor] Applying continuation effects for team ${teamId}, investment ${investmentId}, round ${targetRound}`);

        // Get continuation effects for this investment and round
        const roundKey = `rd${targetRound}`;
        const availableContinuations = CONTINUATION_EFFECTS[roundKey] || {};
        const continuationEffects = availableContinuations[investmentId];

        if (!continuationEffects || continuationEffects.length === 0) {
            console.log(`[ContinuationEffectsProcessor] No continuation effects available for investment ${investmentId} in ${roundKey}`);
            return null;
        }

        // Ensure we have current team data
        const currentKpis = await KpiDataUtils.ensureTeamRoundData(
            sessionId,
            teamId,
            targetRound,
            teamRoundData,
            setTeamRoundDataDirectly
        );

        if (!currentKpis) {
            console.error(`[ContinuationEffectsProcessor] Could not get current KPIs for team ${teamId}`);
            return null;
        }

        // Apply effects to current KPIs
        const updatedKpis = {...currentKpis};
        continuationEffects.forEach(effect => {
            const kpiKey = `current_${effect.kpi}` as keyof TeamRoundData;
            const currentValue = (updatedKpis[kpiKey] as number) || 0;
            const newValue = currentValue + effect.change_value;
            (updatedKpis as any)[kpiKey] = newValue;

            console.log(`[ContinuationEffectsProcessor] Applied ${effect.description}: ${effect.kpi} ${effect.change_value > 0 ? '+' : ''}${effect.change_value} (${currentValue} → ${newValue})`);
        });

        // Update team round data
        const newTeamRoundData = {
            ...teamRoundData,
            [teamId]: updatedKpis
        };
        setTeamRoundDataDirectly(newTeamRoundData);

        // Store in database using the correct service
        await db.kpis.upsert({
            ...updatedKpis, // This includes the id field needed for upsert
            session_id: sessionId,
            team_id: teamId,
            round_number: targetRound
        });

        console.log(`[ContinuationEffectsProcessor] ✅ Applied ${continuationEffects.length} continuation effects for investment ${investmentId}`);

        return {
            investmentId,
            effects: continuationEffects,
            teamId,
            appliedAt: new Date().toISOString()
        };
    }

    /**
     * Apply continuation effects for multiple investments at once
     * Useful when a team purchases multiple continuations simultaneously
     */
    static async applyMultipleContinuationEffects(
        sessionId: string,
        teamId: string,
        investmentIds: string[],
        targetRound: 2 | 3,
        teamRoundData: Record<string, TeamRoundData>,
        setTeamRoundDataDirectly: (data: Record<string, TeamRoundData>) => void
    ): Promise<ContinuationEffectResult[]> {
        const results: ContinuationEffectResult[] = [];

        for (const investmentId of investmentIds) {
            const result = await this.applyContinuationEffects(
                sessionId,
                teamId,
                investmentId,
                targetRound,
                teamRoundData,
                setTeamRoundDataDirectly
            );

            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Check if an investment has continuation effects available
     */
    static hasContinuationEffects(investmentId: string, targetRound: 2 | 3): boolean {
        const roundKey = `rd${targetRound}`;
        const availableContinuations = CONTINUATION_EFFECTS[roundKey] || {};
        return !!availableContinuations[investmentId];
    }

    /**
     * Get continuation effects for preview (without applying them)
     */
    static getContinuationEffects(investmentId: string, targetRound: 2 | 3): KpiEffect[] {
        const roundKey = `rd${targetRound}`;
        const availableContinuations = CONTINUATION_EFFECTS[roundKey] || {};
        return availableContinuations[investmentId] || [];
    }
}
