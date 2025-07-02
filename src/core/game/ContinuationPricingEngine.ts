// src/core/game/ContinuationPricingEngine.ts
// Implements exact continuation pricing system from Ready or Not physical game

import {db} from '@shared/services/supabase';
import {INVESTMENT_BUDGETS} from '@shared/utils/budgetUtils';

export type InvestmentAvailability = 'fresh' | 'continue' | 'not_available';

export interface InvestmentPricing {
    investmentId: string;
    investmentName: string;
    availability: InvestmentAvailability;
    freshPrice?: number;
    continuationPrice?: number;
    finalPrice: number;
    reason?: string; // Explanation for why it's N/A or continue-only
}

export interface ContinuationPricingResult {
    teamId: string;
    targetRound: 2 | 3;
    previousInvestments: string[];
    investmentPricing: InvestmentPricing[];
    totalBudget: number;
}

/**
 * CONTINUATION PRICING TABLES - Exact values from Ready or Not physical game
 */
const CONTINUATION_PRICING_TABLES = {
    // RD-1→RD-2 Continuation Pricing Table
    'rd2': {
        'A': { // Strategy Investment
            freshPrice: 75000,
            continuationPrice: null, // N/A if already purchased
            requiresPrevious: false,
            name: 'Strategic Plan (KPI Card)'
        },
        'B': { // Production Efficiency
            freshPrice: 200000,
            continuationPrice: 75000,
            requiresPrevious: false,
            name: 'Production Efficiency II'
        },
        'C': { // Expanded 2nd Shift
            freshPrice: 75000,
            continuationPrice: 25000,
            requiresPrevious: false,
            name: 'Add/Expand 2nd Shift'
        },
        'D': { // Supply Chain
            freshPrice: 150000,
            continuationPrice: 75000,
            requiresPrevious: false,
            name: 'Supply Chain Optimization II'
        },
        'E': { // Employee Development
            freshPrice: 175000,
            continuationPrice: 75000,
            requiresPrevious: false,
            name: 'Employee Development II'
        },
        'F': { // Maximize Sales
            freshPrice: 225000,
            continuationPrice: 100000,
            requiresPrevious: false,
            name: 'Maximize Boutique Sales & Distribution'
        },
        // 🎯 ADDED: Missing investments G-K from PDF
        'G': { // Big Box Expansion
            freshPrice: 125000,
            continuationPrice: null, // Fresh only - not available in RD-1
            requiresPrevious: false,
            name: 'Expand Distribution Channels: Big Box'
        },
        'H': { // ERP
            freshPrice: 100000,
            continuationPrice: null, // Fresh only - not available in RD-1
            requiresPrevious: false,
            name: 'Enterprise Resource Planning'
        },
        'I': { // IT Security
            freshPrice: 50000,
            continuationPrice: null, // Fresh only - not available in RD-1
            requiresPrevious: false,
            name: 'IT & Cyber Security'
        },
        'J': { // Product Line
            freshPrice: 150000,
            continuationPrice: null, // Fresh only - not available in RD-1
            requiresPrevious: false,
            name: 'Product Line Expansion: Inflatables'
        },
        'K': { // Automation
            freshPrice: 100000,
            continuationPrice: null, // Fresh only - not available in RD-1
            requiresPrevious: false,
            name: 'Automation & Co-Bots'
        }
    },
    // RD-2→RD-3 Continuation Pricing Table
    'rd3': {
        'A': { // Strategy - Not available in RD-3
            freshPrice: null,
            continuationPrice: null,
            requiresPrevious: false,
            name: 'Strategic Plan II - 5 Year Vision',
            notAvailable: true
        },
        'B': { // Production Efficiency - Continuation only ($75K if invested in RD-2, N/A if not)
            freshPrice: null,
            continuationPrice: 75000,
            requiresPrevious: true, // Must have made RD-2 investment
            name: 'Production Efficiency III - Lean Manufacturing'
        },
        'C': { // Expanded 2nd Shift - Both fresh and continuation ($25K if invested in RD-2, $100K if not)
            freshPrice: 100000,
            continuationPrice: 25000,
            requiresPrevious: false,
            name: 'Expanded 2nd Shift - 24/7 Operations'
        },
        'D': { // Supply Chain - Continuation only ($75K if invested in RD-2, N/A if not)
            freshPrice: null,
            continuationPrice: 75000,
            requiresPrevious: true, // Must have made RD-2 investment
            name: 'Supply Chain Optimization III'
        },
        'E': { // Employee Development - Both fresh and continuation ($75K if invested in RD-2, $300K if not)
            freshPrice: 300000,
            continuationPrice: 75000,
            requiresPrevious: false,
            name: 'Employee Development III'
        },
        'F': { // Maximize Sales - Both fresh and continuation ($75K if invested in RD-2, $225K if not)
            freshPrice: 225000,
            continuationPrice: 75000,
            requiresPrevious: false,
            name: 'Maximize Boutique Sales III'
        },
        'G': { // Big Box - Both fresh and continuation ($50K if invested in RD-2, $300K if not)
            freshPrice: 300000,
            continuationPrice: 50000,
            requiresPrevious: false,
            name: 'Expand Distribution Channels: Big Box III'
        },
        'H': { // ERP - Both fresh and continuation ($25K if invested in RD-2, $125K if not)
            freshPrice: 125000,
            continuationPrice: 25000,
            requiresPrevious: false,
            name: 'Enterprise Resource Planning III'
        },
        'I': { // IT Security - Both fresh and continuation ($25K if invested in RD-2, $75K if not)
            freshPrice: 75000,
            continuationPrice: 25000,
            requiresPrevious: false,
            name: 'IT & Cybersecurity III'
        },
        'J': { // Product Line - Both fresh and continuation ($50K if invested in RD-2, $150K if not)
            freshPrice: 150000,
            continuationPrice: 50000,
            requiresPrevious: false,
            name: 'Product Line Expansion: Inflatables III'
        },
        'K': { // Automation - Both fresh and continuation ($200K if invested in RD-2, $300K if not)
            freshPrice: 300000,
            continuationPrice: 200000,
            requiresPrevious: false,
            name: 'Automation & Co-Bots III'
        }
    }
};

export class ContinuationPricingEngine {

    /**
     * Get previous round investments for a team
     */
    static async getPreviousInvestments(
        sessionId: string,
        teamId: string,
        targetRound: 2 | 3
    ): Promise<string[]> {
        const previousRoundPhase = targetRound === 2 ? 'rd1-invest' : 'rd2-invest';

        try {
            // Get regular investment decision
            const regularDecision = await db.decisions.getForPhase(sessionId, teamId, previousRoundPhase);

            // Get immediate purchases for the previous round
            const immediatePhaseId = `${previousRoundPhase}_immediate`;
            const allDecisions = await db.decisions.getBySession(sessionId);
            const immediateDecisions = allDecisions.filter(d =>
                d.team_id === teamId &&
                d.phase_id === immediatePhaseId &&
                d.is_immediate_purchase === true
            );

            // Combine all investment IDs
            const investments: string[] = [];

            // Add regular investments
            if (regularDecision?.selected_investment_options) {
                investments.push(...regularDecision.selected_investment_options);
            }

            // Add immediate purchases
            immediateDecisions.forEach(decision => {
                if (decision.selected_investment_options) {
                    investments.push(...decision.selected_investment_options);
                }
            });

            // Remove duplicates and sort
            const uniqueInvestments = [...new Set(investments)].sort();

            return uniqueInvestments;
        } catch (error) {
            console.error(`[ContinuationPricingEngine] Error getting previous investments:`, error);
            return [];
        }
    }

    /**
     * Determine investment availability based on previous investments
     */
    static determineAvailability(
        investmentId: string,
        targetRound: 2 | 3,
        previousInvestments: string[],
        hasStrategy: boolean
    ): InvestmentAvailability {
        const roundKey = `rd${targetRound}` as keyof typeof CONTINUATION_PRICING_TABLES;
        const pricingInfo = CONTINUATION_PRICING_TABLES[roundKey][investmentId as keyof typeof CONTINUATION_PRICING_TABLES[typeof roundKey]];

        if (!pricingInfo) {
            console.warn(`[ContinuationPricingEngine] No pricing info for investment ${investmentId} in round ${targetRound}`);
            return 'fresh';
        }

        // Special case: Strategy investment in RD-3 is not available
        if (investmentId === 'A' && targetRound === 3) {
            return 'not_available';
        }

        // Special case: Strategy investment in RD-2 - N/A if already purchased
        if (investmentId === 'A' && targetRound === 2 && hasStrategy) {
            return 'not_available';
        }

        // Check if investment requires previous round investment
        if (pricingInfo.requiresPrevious) {
            const hasPreviousInvestment = previousInvestments.includes(investmentId);
            if (hasPreviousInvestment) {
                return 'continue';
            } else {
                return 'not_available'; // Can't make fresh investment, need previous
            }
        }

        // Check if team made this investment in previous round
        const hasPreviousInvestment = previousInvestments.includes(investmentId);
        if (hasPreviousInvestment && pricingInfo.continuationPrice !== null) {
            return 'continue';
        }

        // Default to fresh if available
        if (pricingInfo.freshPrice !== null) {
            return 'fresh';
        }

        return 'not_available';
    }

    /**
     * Calculate final price based on availability
     */
    static calculateFinalPrice(
        investmentId: string,
        targetRound: 2 | 3,
        availability: InvestmentAvailability
    ): number {
        if (availability === 'not_available') {
            return 0;
        }

        const roundKey = `rd${targetRound}` as keyof typeof CONTINUATION_PRICING_TABLES;
        const pricingInfo = CONTINUATION_PRICING_TABLES[roundKey][investmentId as keyof typeof CONTINUATION_PRICING_TABLES[typeof roundKey]];

        if (!pricingInfo) {
            return 0;
        }

        if (availability === 'continue' && pricingInfo.continuationPrice !== null) {
            return pricingInfo.continuationPrice;
        }

        if (availability === 'fresh' && pricingInfo.freshPrice !== null) {
            return pricingInfo.freshPrice;
        }

        return 0;
    }

    /**
     * Generate reason text for why an investment has specific availability
     */
    static generateReasonText(
        investmentId: string,
        targetRound: 2 | 3,
        availability: InvestmentAvailability,
        previousInvestments: string[],
        hasStrategy: boolean
    ): string {
        const roundKey = `rd${targetRound}` as keyof typeof CONTINUATION_PRICING_TABLES;
        const pricingInfo = CONTINUATION_PRICING_TABLES[roundKey][investmentId as keyof typeof CONTINUATION_PRICING_TABLES[typeof roundKey]];
        const previousRoundNumber = targetRound - 1;

        switch (availability) {
            case 'not_available':
                if (investmentId === 'A' && targetRound === 3) {
                    return 'Strategy not available in RD-3';
                }
                if (investmentId === 'A' && targetRound === 2 && hasStrategy) {
                    return 'Strategy already purchased';
                }
                if (pricingInfo?.requiresPrevious) {
                    return `Requires ${investmentId} investment from RD-${previousRoundNumber}`;
                }
                return 'Not available';

            case 'continue': {
                const hadPreviousInvestment = previousInvestments.includes(investmentId);
                if (hadPreviousInvestment) {
                    return `Continuing ${investmentId} from RD-${previousRoundNumber}`;
                }
                return 'Continuing from previous round';
            }
            case 'fresh': {
                const hadThisBefore = previousInvestments.includes(investmentId);
                if (hadThisBefore) {
                    return 'Fresh investment (had previously)';
                }
                return 'Fresh investment';
            }
            default:
                return '';
        }
    }

    /**
     * Check if team has Strategy investment (permanent effect)
     */
    static async hasStrategyInvestment(sessionId: string, teamId: string): Promise<boolean> {
        try {
            const adjustments = await db.adjustments.getBySession(sessionId);
            const teamAdjustments = adjustments.filter(adj => adj.team_id === teamId);

            // Look for strategy investment in permanent adjustments
            return teamAdjustments.some(adj =>
                adj.challenge_id === 'strategy' ||
                adj.description?.toLowerCase().includes('strategy') ||
                adj.challenge_id === 'rd1-invest' && adj.option_id === 'A' ||
                adj.challenge_id === 'rd2-invest' && adj.option_id === 'A'
            );
        } catch (error) {
            console.error(`[ContinuationPricingEngine] Error checking strategy investment:`, error);
            return false;
        }
    }

    /**
     * MAIN METHOD: Calculate continuation pricing for all investments for a team
     */
    static async calculateContinuationPricing(
        sessionId: string,
        teamId: string,
        targetRound: 2 | 3
    ): Promise<ContinuationPricingResult> {
        try {
            // Get previous investments and strategy status
            const [previousInvestments, hasStrategy] = await Promise.all([
                this.getPreviousInvestments(sessionId, teamId, targetRound),
                this.hasStrategyInvestment(sessionId, teamId)
            ]);

            const roundKey = `rd${targetRound}` as keyof typeof CONTINUATION_PRICING_TABLES;
            const availableInvestments = Object.keys(CONTINUATION_PRICING_TABLES[roundKey]);

            const investmentPricing: InvestmentPricing[] = availableInvestments.map(investmentId => {
                const pricingInfo = CONTINUATION_PRICING_TABLES[roundKey][investmentId as keyof typeof CONTINUATION_PRICING_TABLES[typeof roundKey]];
                const availability = this.determineAvailability(investmentId, targetRound, previousInvestments, hasStrategy);
                const finalPrice = this.calculateFinalPrice(investmentId, targetRound, availability);
                const reason = this.generateReasonText(investmentId, targetRound, availability, previousInvestments, hasStrategy);

                return {
                    investmentId,
                    investmentName: pricingInfo.name,
                    availability,
                    freshPrice: pricingInfo.freshPrice || undefined,
                    continuationPrice: pricingInfo.continuationPrice || undefined,
                    finalPrice,
                    reason
                };
            });

            const result: ContinuationPricingResult = {
                teamId,
                targetRound,
                previousInvestments,
                investmentPricing,
                totalBudget: INVESTMENT_BUDGETS[targetRound]
            };

            return result;
        } catch (error) {
            console.error(`[ContinuationPricingEngine] ❌ Error calculating pricing for team ${teamId}:`, error);
            throw error;
        }
    }

    /**
     * BATCH OPERATION: Calculate continuation pricing for all teams
     */
    static async calculateContinuationPricingForAllTeams(
        sessionId: string,
        targetRound: 2 | 3
    ): Promise<Record<string, ContinuationPricingResult>> {
        try {
            const teams = await db.teams.getBySession(sessionId);
            const results: Record<string, ContinuationPricingResult> = {};

            // Calculate pricing for each team
            for (const team of teams) {
                results[team.id] = await this.calculateContinuationPricing(sessionId, team.id, targetRound);
            }

            return results;
        } catch (error) {
            console.error(`[ContinuationPricingEngine] ❌ Batch pricing failed:`, error);
            throw error;
        }
    }

    /**
     * UTILITY: Get investment pricing for a specific investment and team
     */
    static async getInvestmentPricing(
        sessionId: string,
        teamId: string,
        targetRound: 2 | 3,
        investmentId: string
    ): Promise<InvestmentPricing | null> {
        try {
            const fullPricing = await this.calculateContinuationPricing(sessionId, teamId, targetRound);
            return fullPricing.investmentPricing.find(p => p.investmentId === investmentId) || null;
        } catch (error) {
            console.error(`[ContinuationPricingEngine] Error getting specific investment pricing:`, error);
            return null;
        }
    }

    /**
     * UTILITY: Validate if a team can afford their selected investments
     */
    static validateInvestmentAffordability(
        pricingResult: ContinuationPricingResult,
        selectedInvestmentIds: string[]
    ): { canAfford: boolean; totalCost: number; remainingBudget: number } {
        const totalCost = selectedInvestmentIds.reduce((sum, investmentId) => {
            const pricing = pricingResult.investmentPricing.find(p => p.investmentId === investmentId);
            return sum + (pricing?.finalPrice || 0);
        }, 0);

        const remainingBudget = pricingResult.totalBudget - totalCost;
        const canAfford = remainingBudget >= 0;

        return {
            canAfford,
            totalCost,
            remainingBudget
        };
    }
}
