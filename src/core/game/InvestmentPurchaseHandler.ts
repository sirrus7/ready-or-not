// src/core/game/InvestmentPurchaseHandler.ts
// Integration point for applying continuation effects during investment purchases

import {ContinuationEffectsProcessor} from './ContinuationEffectsProcessor';
import {ContinuationPricingEngine} from './ContinuationPricingEngine';
import {StrategyInvestmentTracker} from './StrategyInvestmentTracker';
import {TeamRoundData} from '@shared/types';

export interface InvestmentPurchaseContext {
    sessionId: string;
    teamId: string;
    investmentPhase: string; // e.g., 'rd2-invest', 'rd3-invest'
    selectedInvestments: string[];
    teamRoundData: Record<string, TeamRoundData>;
    setTeamRoundDataDirectly: (data: Record<string, TeamRoundData>) => void;
}

export interface InvestmentPurchaseResult {
    continuationEffectsApplied: Array<{
        investmentId: string;
        effects: any[];
        appliedAt: string;
    }>;
    totalContinuationEffects: number;
}

export class InvestmentPurchaseHandler {

    /**
     * Process investment purchases and apply continuation effects immediately
     * This should be called when teams submit their investment decisions
     */
    static async processInvestmentPurchases(
        context: InvestmentPurchaseContext
    ): Promise<InvestmentPurchaseResult> {
        const {
            sessionId,
            teamId,
            investmentPhase,
            selectedInvestments,
            teamRoundData,
            setTeamRoundDataDirectly
        } = context;

        console.log(`[InvestmentPurchaseHandler] Processing investment purchases for team ${teamId}, phase ${investmentPhase}`);
        console.log(`[InvestmentPurchaseHandler] Selected investments:`, selectedInvestments);

        // Determine target round from investment phase
        const targetRound = this.getTargetRoundFromPhase(investmentPhase);
        if (!targetRound) {
            console.warn(`[InvestmentPurchaseHandler] Could not determine target round from phase ${investmentPhase}`);
            return {continuationEffectsApplied: [], totalContinuationEffects: 0};
        }

        // Get previous investments to determine what can be continued
        const previousInvestments = await ContinuationPricingEngine.getPreviousInvestments(
            sessionId,
            teamId,
            targetRound
        );

        // Check if team has strategy investment
        const strategyStatus = await StrategyInvestmentTracker.getStrategyInvestmentStatus(
            sessionId,
            teamId
        );

        const continuationEffectsApplied: Array<{
            investmentId: string;
            effects: any[];
            appliedAt: string;
        }> = [];

        // Process each selected investment
        for (const investmentId of selectedInvestments) {
            // Determine if this is a continuation purchase
            const availability = ContinuationPricingEngine.determineAvailability(
                investmentId,
                targetRound,
                previousInvestments,
                strategyStatus.hasStrategy
            );

            console.log(`[InvestmentPurchaseHandler] Investment ${investmentId} availability: ${availability}`);

            // If this is a continuation, apply continuation effects immediately
            if (availability === 'continue') {
                console.log(`[InvestmentPurchaseHandler] Applying continuation effects for investment ${investmentId}`);

                const result = await ContinuationEffectsProcessor.applyContinuationEffects(
                    sessionId,
                    teamId,
                    investmentId,
                    targetRound,
                    teamRoundData,
                    setTeamRoundDataDirectly
                );

                if (result) {
                    continuationEffectsApplied.push({
                        investmentId: result.investmentId,
                        effects: result.effects,
                        appliedAt: result.appliedAt
                    });

                    console.log(`[InvestmentPurchaseHandler] ✅ Applied continuation effects for ${investmentId}:`,
                        result.effects.map(e => `${e.description}: ${e.change_value}`).join(', '));
                } else {
                    console.warn(`[InvestmentPurchaseHandler] Failed to apply continuation effects for ${investmentId}`);
                }
            } else {
                console.log(`[InvestmentPurchaseHandler] Investment ${investmentId} is not a continuation (${availability}), no continuation effects to apply`);
            }
        }

        console.log(`[InvestmentPurchaseHandler] ✅ Processed ${selectedInvestments.length} investments, applied continuation effects for ${continuationEffectsApplied.length}`);

        return {
            continuationEffectsApplied,
            totalContinuationEffects: continuationEffectsApplied.length
        };
    }

    /**
     * Get target round number from investment phase
     */
    private static getTargetRoundFromPhase(investmentPhase: string): 2 | 3 | null {
        if (investmentPhase.includes('rd2')) return 2;
        if (investmentPhase.includes('rd3')) return 3;
        return null;
    }

    /**
     * Preview continuation effects for a set of investments
     * Useful for showing teams what continuation effects they'll get before purchase
     */
    static async previewContinuationEffects(
        sessionId: string,
        teamId: string,
        investmentPhase: string,
        selectedInvestments: string[]
    ): Promise<Array<{
        investmentId: string;
        effects: any[];
        availability: string;
    }>> {
        const targetRound = this.getTargetRoundFromPhase(investmentPhase);
        if (!targetRound) return [];

        const previousInvestments = await ContinuationPricingEngine.getPreviousInvestments(
            sessionId,
            teamId,
            targetRound
        );

        const strategyStatus = await StrategyInvestmentTracker.getStrategyInvestmentStatus(
            sessionId,
            teamId
        );

        const preview: Array<{
            investmentId: string;
            effects: any[];
            availability: string;
        }> = [];

        for (const investmentId of selectedInvestments) {
            const availability = ContinuationPricingEngine.determineAvailability(
                investmentId,
                targetRound,
                previousInvestments,
                strategyStatus.hasStrategy
            );

            if (availability === 'continue') {
                const effects = ContinuationEffectsProcessor.getContinuationEffects(
                    investmentId,
                    targetRound
                );

                preview.push({
                    investmentId,
                    effects,
                    availability
                });
            }
        }

        return preview;
    }
}
