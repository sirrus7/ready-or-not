// src/core/game/UnifiedEffectsProcessor.ts
// Unified processor for both consequences and payoffs with slide-specific logic
// COMPLETE VERSION - Includes ALL consequence processing logic + new payoff logic

import {
    GameSession,
    Team,
    TeamDecision,
    TeamRoundData,
    GameStructure,
    Slide,
    KpiEffect
} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {KpiDataUtils} from './KpiDataUtils';
import {allConsequencesData} from '@core/content/ConsequenceContent';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {SLIDE_TO_CHALLENGE_MAP} from '@core/content/ChallengeRegistry';
import {getInvestmentPhaseBySlideId} from '@core/content/InvestmentRegistry';

interface UnifiedEffectsProcessorProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

export class UnifiedEffectsProcessor {
    private props: UnifiedEffectsProcessorProps;
    private processedSlides = new Set<string>();
    private isProcessing = false;

    constructor(props: UnifiedEffectsProcessorProps) {
        this.props = props;
        console.log('[UnifiedEffectsProcessor] ✅ Initialized for session:', this.props.currentDbSession?.id);
    }

    /**
     * Update props dynamically
     */
    public updateProps(newProps: UnifiedEffectsProcessorProps): void {
        // Reset processed slides when session changes
        if (newProps.currentDbSession?.id !== this.props.currentDbSession?.id) {
            console.log('[UnifiedEffectsProcessor] 🔄 Session changed, updating props:', newProps.currentDbSession?.id);
            this.processedSlides.clear();
            this.isProcessing = false;
        }
        this.props = newProps;
    }

    /**
     * Reset processed slides (used during game reset)
     */
    public resetProcessedSlides(): void {
        this.processedSlides.clear();
        this.isProcessing = false;
        console.log('[UnifiedEffectsProcessor] 🔄 Reset processed slides tracking');
    }

    /**
     * MAIN METHOD: Process any effect slide (consequence or payoff)
     */
    public async processEffectSlide(slide: Slide): Promise<void> {
        const slideKey = `${this.props.currentDbSession?.id}-${slide.id}`;

        // Prevent concurrent processing and reprocessing
        if (this.isProcessing) {
            console.log(`[UnifiedEffectsProcessor] ⏸️ Already processing, skipping slide ${slide.id}`);
            return;
        }

        if (this.processedSlides.has(slideKey)) {
            console.log(`[UnifiedEffectsProcessor] ✅ Slide ${slide.id} already processed, skipping`);
            return;
        }

        this.isProcessing = true;
        console.log(`\n🎯 [UnifiedEffectsProcessor] ==================== PROCESSING EFFECT SLIDE ====================`);
        console.log(`[UnifiedEffectsProcessor] Slide ID: ${slide.id}, Title: "${slide.title}", Type: ${slide.type}`);

        try {
            if (slide.type === 'consequence_reveal') {
                await this.processConsequenceSlide(slide);
            } else if (slide.type === 'payoff_reveal') {
                await this.processPayoffSlide(slide);
            } else {
                console.warn(`[UnifiedEffectsProcessor] ❌ Slide ${slide.id} is not an effect slide (type: ${slide.type})`);
                return;
            }

            // Mark slide as processed
            this.processedSlides.add(slideKey);
            console.log(`[UnifiedEffectsProcessor] ✅ Completed processing effect slide ${slide.id}`);

        } catch (error) {
            console.error(`[UnifiedEffectsProcessor] ❌ Error processing effect slide ${slide.id}:`, error);
            throw error;
        } finally {
            this.isProcessing = false;
            console.log(`🎯 [UnifiedEffectsProcessor] ==================== EFFECT PROCESSING COMPLETE ====================\n`);
        }
    }

    /**
     * Process consequence slides (COMPLETE LOGIC from ConsequenceProcessor)
     */
    private async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        const {
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            setTeamRoundDataDirectly,
            fetchTeamRoundDataFromHook
        } = this.props;

        // Validate required data
        if (!currentDbSession?.id || !gameStructure || !teams.length) {
            console.warn('[UnifiedEffectsProcessor] ⚠️ Missing required data for consequence processing');
            return;
        }

        // Determine which challenge this slide belongs to
        const challengeId = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);
        if (!challengeId) {
            console.warn(`[UnifiedEffectsProcessor] ❌ Could not determine challenge for slide ${consequenceSlide.id}`);
            return;
        }

        // Determine which option this consequence slide is for
        const slideOption = this.getSlideOption(consequenceSlide);
        if (!slideOption) {
            console.warn(`[UnifiedEffectsProcessor] ❌ Could not determine option for slide ${consequenceSlide.id}`);
            return;
        }

        console.log(`[UnifiedEffectsProcessor] 🎯 Processing consequence: challenge ${challengeId}, option ${slideOption}`);

        // Get consequences for this challenge
        const consequenceKey = `${challengeId}-conseq`;
        const allConsequencesForChoice = allConsequencesData[consequenceKey] || [];
        if (allConsequencesForChoice.length === 0) {
            console.warn(`[UnifiedEffectsProcessor] ⚠️ No consequences defined for ${consequenceKey}`);
            return;
        }

        // Process each team
        for (const team of teams) {
            console.log(`[UnifiedEffectsProcessor] 👥 Processing consequence for team: ${team.name}`);

            // Get team's decision for this challenge
            const teamDecision = teamDecisions[team.id]?.[challengeId];
            if (!teamDecision) {
                console.log(`[UnifiedEffectsProcessor] ⚠️ No decision found for team ${team.name} for challenge ${challengeId}. Skipping.`);
                continue;
            }

            if (teamDecision.selected_challenge_option_id !== slideOption) {
                console.log(`[UnifiedEffectsProcessor] ℹ️ Team ${team.name} chose ${teamDecision.selected_challenge_option_id}, but this slide is for ${slideOption}. Skipping.`);
                continue;
            }

            // Database-backed duplicate prevention
            const alreadyApplied = await db.consequenceApplications.hasBeenApplied(
                currentDbSession.id,
                team.id,
                challengeId,
                slideOption
            );

            if (alreadyApplied) {
                console.log(`[UnifiedEffectsProcessor] 🔒 Consequence already applied to team ${team.name} for challenge ${challengeId}, option ${slideOption} (database check). Skipping.`);
                continue;
            }

            // Ensure KPI data exists for this team and round using utility function
            const kpiRoundNumber = consequenceSlide.round_number === 0 ? 1 : consequenceSlide.round_number as (1 | 2 | 3);
            const teamKpis = await KpiDataUtils.ensureTeamRoundData(
                currentDbSession.id,
                team.id,
                kpiRoundNumber,
                teamRoundData,
                setTeamRoundDataDirectly
            );

            // Find the consequence for this option
            const consequence = allConsequencesForChoice.find(c => c.challenge_option_id === slideOption);
            if (!consequence) {
                console.warn(`[UnifiedEffectsProcessor] ❌ No consequence found for option ${slideOption} in ${challengeId}`);
                continue;
            }

            console.log(`[UnifiedEffectsProcessor] ✅ Applying consequence for ${team.name}: ${consequence.id}`);
            console.log(`[UnifiedEffectsProcessor] 📝 Effects to apply:`, consequence.effects);

            // Apply immediate effects to KPIs (COMPLETE LOGIC FROM ORIGINAL)
            const updatedKpis = {...teamKpis};
            let hasImmediateChanges = false;

            consequence.effects.forEach(effect => {
                if (effect.timing === 'immediate') {
                    const oldValue = updatedKpis[`current_${effect.kpi}` as keyof TeamRoundData] as number;

                    if (effect.is_percentage_change) {
                        const change = oldValue * (effect.change_value / 100);
                        (updatedKpis as any)[`current_${effect.kpi}`] = Math.round(oldValue + change);
                    } else {
                        (updatedKpis as any)[`current_${effect.kpi}`] = oldValue + effect.change_value;
                    }

                    const newValue = updatedKpis[`current_${effect.kpi}` as keyof TeamRoundData] as number;
                    const changeSymbol = effect.change_value > 0 ? '+' : '';
                    console.log(`[UnifiedEffectsProcessor] 📈 ${effect.kpi}: ${oldValue} → ${newValue} (${changeSymbol}${effect.change_value})`);
                    hasImmediateChanges = true;
                }
            });

            // Update KPIs in database if there were immediate changes
            if (hasImmediateChanges) {
                const finalKpis = KpiCalculations.calculateFinancialMetrics(updatedKpis);
                await db.kpis.upsert({...updatedKpis, ...finalKpis, id: teamKpis.id});
                console.log(`[UnifiedEffectsProcessor] 💾 Updated immediate KPI effects for team ${team.name}`);
            }

            // Store permanent adjustments using utility function
            await KpiDataUtils.storePermanentAdjustments(
                team.id,
                currentDbSession.id,
                consequence.effects,
                challengeId,
                slideOption
            );

            // Record that this consequence has been applied (database tracking)
            await db.consequenceApplications.recordApplication({
                session_id: currentDbSession.id,
                team_id: team.id,
                challenge_id: challengeId,
                option_id: slideOption,
                slide_id: consequenceSlide.id
            });

            console.log(`[UnifiedEffectsProcessor] ✅ Successfully applied consequence to team ${team.name}`);
        }

        // Refresh team round data to update UI
        await fetchTeamRoundDataFromHook(currentDbSession.id);
    }

    /**
     * Process payoff slides (UPDATED - now follows challenge registry pattern with position-based option detection)
     */
    private async processPayoffSlide(payoffSlide: Slide): Promise<void> {
        const {
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            setTeamRoundDataDirectly,
            fetchTeamRoundDataFromHook
        } = this.props;

        // Validate required data
        if (!currentDbSession?.id || !gameStructure || !teams.length) {
            console.warn('[UnifiedEffectsProcessor] ⚠️ Missing required data for payoff processing');
            return;
        }

        // Get the investment phase this slide belongs to (like challenge mapping)
        const investmentPhase = getInvestmentPhaseBySlideId(payoffSlide.id);
        if (!investmentPhase) {
            console.warn(`[UnifiedEffectsProcessor] ❌ Could not determine investment phase for payoff slide ${payoffSlide.id}`);
            return;
        }

        // Determine which option this payoff slide is for using position-based detection
        const slideOption = this.getPayoffSlideOption(payoffSlide.id, investmentPhase);
        if (!slideOption) {
            console.warn(`[UnifiedEffectsProcessor] ❌ Could not determine option for payoff slide ${payoffSlide.id}`);
            return;
        }

        console.log(`[UnifiedEffectsProcessor] 🎯 Processing payoff: phase ${investmentPhase}, option ${slideOption}`);

        // Get payoff data for this phase (like consequence data)
        const payoffKey = `${investmentPhase}-payoff`;
        const allPayoffsForPhase = allInvestmentPayoffsData[payoffKey] || [];
        if (allPayoffsForPhase.length === 0) {
            console.warn(`[UnifiedEffectsProcessor] ⚠️ No payoffs defined for ${payoffKey}`);
            return;
        }

        // Process each team (same logic as consequences)
        for (const team of teams) {
            console.log(`[UnifiedEffectsProcessor] 👥 Processing payoff for team: ${team.name}`);

            // Get team's investment decision for this phase
            const investmentDecision = teamDecisions[team.id]?.[investmentPhase];

            if (!investmentDecision) {
                console.log(`[UnifiedEffectsProcessor] ⚠️ No investment decision found for team ${team.name} for phase ${investmentPhase}. Skipping.`);
                continue;
            }

            // Check if team selected this option (same as consequences)
            const selectedOptions = investmentDecision.selected_investment_ids || [];
            if (!selectedOptions.includes(slideOption)) {
                console.log(`[UnifiedEffectsProcessor] ℹ️ Team ${team.name} did not select option ${slideOption}. Skipping.`);
                continue;
            }

            // Database-backed duplicate prevention (same as consequences)
            const alreadyApplied = await db.payoffApplications.hasBeenApplied(
                currentDbSession.id,
                team.id,
                investmentPhase,
                slideOption
            );

            if (alreadyApplied) {
                console.log(`[UnifiedEffectsProcessor] 🔒 Payoff already applied to team ${team.name} for phase ${investmentPhase}, option ${slideOption}. Skipping.`);
                continue;
            }

            // Find the payoff for this option (same as consequences)
            const payoff = allPayoffsForPhase.find(p => p.investment_option_id === slideOption);
            if (!payoff) {
                console.warn(`[UnifiedEffectsProcessor] ❌ No payoff found for option ${slideOption} in ${payoffKey}`);
                continue;
            }

            // Ensure KPI data exists for this team and round
            const kpiRoundNumber = payoffSlide.round_number === 0 ? 1 : payoffSlide.round_number as (1 | 2 | 3);
            const teamKpis = await KpiDataUtils.ensureTeamRoundData(
                currentDbSession.id,
                team.id,
                kpiRoundNumber,
                teamRoundData,
                setTeamRoundDataDirectly
            );

            console.log(`[UnifiedEffectsProcessor] ✅ Applying payoff for ${team.name}: ${payoff.id || payoff.name}`);
            console.log(`[UnifiedEffectsProcessor] 📝 Effects to apply:`, payoff.effects);

            // Apply immediate effects to KPIs (SAME COMPLETE LOGIC AS CONSEQUENCES)
            const updatedKpis = {...teamKpis};
            let hasImmediateChanges = false;

            const effects: KpiEffect[] = payoff.effects || [];
            effects.forEach(effect => {
                if (effect.timing === 'immediate') {
                    const oldValue = updatedKpis[`current_${effect.kpi}` as keyof TeamRoundData] as number;

                    if (effect.is_percentage_change) {
                        const change = oldValue * (effect.change_value / 100);
                        (updatedKpis as any)[`current_${effect.kpi}`] = Math.round(oldValue + change);
                    } else {
                        (updatedKpis as any)[`current_${effect.kpi}`] = oldValue + effect.change_value;
                    }

                    const newValue = updatedKpis[`current_${effect.kpi}` as keyof TeamRoundData] as number;
                    const changeSymbol = effect.change_value > 0 ? '+' : '';
                    console.log(`[UnifiedEffectsProcessor] 📈 ${effect.kpi}: ${oldValue} → ${newValue} (${changeSymbol}${effect.change_value})`);
                    hasImmediateChanges = true;
                }
            });

            // Handle unspent budget for Round 1 only (PRESERVE EXISTING LOGIC)
            if (kpiRoundNumber === 1) {
                const budget = gameStructure.investment_phase_budgets[investmentPhase] || 0;
                const spent = investmentDecision?.total_spent_budget ?? 0;
                const unspent = budget - spent;

                if (unspent > 0) {
                    const oldCost = updatedKpis.current_cost;
                    updatedKpis.current_cost = oldCost - unspent;
                    console.log(`[UnifiedEffectsProcessor] 📈 cost: ${oldCost} → ${updatedKpis.current_cost} (unspent budget: -${unspent})`);
                    hasImmediateChanges = true;

                    // Add unspent budget effect to effects list for permanent tracking
                    effects.push({
                        kpi: 'cost',
                        change_value: -unspent,
                        timing: 'immediate',
                        description: 'RD-1 Unspent Budget'
                    });
                }
            }

            // Update KPIs in database if there were immediate changes
            if (hasImmediateChanges) {
                const finalKpis = KpiCalculations.calculateFinancialMetrics(updatedKpis);
                await db.kpis.upsert({...updatedKpis, ...finalKpis, id: teamKpis.id});
                console.log(`[UnifiedEffectsProcessor] 💾 Updated immediate KPI effects for team ${team.name}`);
            }

            // Store permanent adjustments using utility function
            await KpiDataUtils.storePermanentAdjustments(
                team.id,
                currentDbSession.id,
                effects,
                investmentPhase, // challengeId for payoffs
                slideOption      // optionId for payoffs
            );

            // Record that this payoff has been applied (same as consequences)
            await db.payoffApplications.recordApplication({
                session_id: currentDbSession.id,
                team_id: team.id,
                investment_phase_id: investmentPhase,
                option_id: slideOption,
                slide_id: payoffSlide.id
            });

            console.log(`[UnifiedEffectsProcessor] ✅ Successfully applied payoff to team ${team.name}`);
        }

        // Refresh team round data to update UI
        await fetchTeamRoundDataFromHook(currentDbSession.id);
    }

    /**
     * Position-based option detection for payoff slides
     * Maps slide position within investment phase to A, B, C, D, E, F options
     */
    private getPayoffSlideOption(slideId: number, investmentPhase: string): string | null {
        const options = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

        if (investmentPhase === 'rd1-invest') {
            // Round 1: Slides 56-61 map to A-F
            if (slideId >= 56 && slideId <= 61) {
                const slideIndex = slideId - 56;
                return options[slideIndex] || null;
            }
        } else if (investmentPhase === 'rd2-invest') {
            // Round 2: Slides 126-137 map to A-L
            if (slideId >= 126 && slideId <= 137) {
                const slideIndex = slideId - 126;
                return options[slideIndex] || null;
            }
        } else if (investmentPhase === 'rd3-invest') {
            // Round 3: Slides 170-181 map to A-L
            if (slideId >= 170 && slideId <= 181) {
                const slideIndex = slideId - 170;
                return options[slideIndex] || null;
            }
        }

        return null;
    }

    /**
     * Determines which option (A, B, C, D) a consequence slide is for
     * (COMPLETE LOGIC from ConsequenceProcessor)
     */
    private getSlideOption(slide: Slide): string | null {
        const title = slide.title?.toLowerCase() || '';

        if (title.includes('option a') || title.startsWith('a.') || title.startsWith('a)')) {
            return 'A';
        } else if (title.includes('option b') || title.startsWith('b.') || title.startsWith('b)')) {
            return 'B';
        } else if (title.includes('option c') || title.startsWith('c.') || title.startsWith('c)')) {
            return 'C';
        } else if (title.includes('option d') || title.startsWith('d.') || title.startsWith('d)')) {
            return 'D';
        }

        console.warn(`[UnifiedEffectsProcessor] Could not determine slide option from title: "${slide.title}"`);
        return null;
    }
}
