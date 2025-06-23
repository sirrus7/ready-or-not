// src/core/game/UnifiedEffectsProcessor.ts
// COMPLETE VERSION - Added KPI reset slide processing support
// ONLY CHANGES: Added KpiResetEngine import, updated routing logic, added processKpiResetSlide method

import {
    GameSession,
    Team,
    TeamDecision,
    TeamRoundData,
    GameStructure,
    Slide,
} from '@shared/types';
import {db} from '@shared/services/supabase';
import {ScoringEngine} from './ScoringEngine';
import {KpiDataUtils} from './KpiDataUtils';
import {StrategyInvestmentTracker} from './StrategyInvestmentTracker';
import {KpiResetEngine} from './KpiResetEngine'; // ADDED: Import for KPI reset functionality
import {allConsequencesData} from '@core/content/ConsequenceContent';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {SLIDE_TO_CHALLENGE_MAP} from '@core/content/ChallengeRegistry';
import {getInvestmentPhaseBySlideId, getRoundForInvestmentPhase} from '@core/content/InvestmentRegistry';

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
     * MAIN METHOD: Process any effect slide (consequence, payoff, or KPI reset)
     * UPDATED: Added KPI reset slide routing
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
            } else if (slide.type === 'kpi_reset') {
                // NEW: KPI reset slide auto-processing
                await this.processKpiResetSlide(slide);
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
     * NEW: Process KPI reset slides - handles round transitions automatically
     * Follows same patterns as processConsequenceSlide/processPayoffSlide
     */
    private async processKpiResetSlide(slide: Slide): Promise<void> {
        const {
            currentDbSession,
            teams,
            fetchTeamRoundDataFromHook
        } = this.props;

        // Validate required data (same pattern as other processors)
        if (!currentDbSession?.id || !teams.length) {
            console.warn('[UnifiedEffectsProcessor] ⚠️ Missing required data for KPI reset processing');
            return;
        }

        // Determine target round based on slide round_number
        const targetRound = slide.round_number as 2 | 3;
        const roundTransition = targetRound === 2 ? 'RD-1→RD-2' : 'RD-2→RD-3';

        console.log(`[UnifiedEffectsProcessor] 🔄 Processing KPI reset slide ${slide.id}: ${roundTransition} transition`);

        try {
            // Process each team individually (following existing team iteration pattern)
            for (const team of teams) {
                console.log(`[UnifiedEffectsProcessor] 👥 Processing KPI reset for team: ${team.name} → Round ${targetRound}`);

                try {
                    // Use existing KpiResetEngine (preserves all existing logic)
                    const resetResult = await KpiResetEngine.executeResetSequence(
                        currentDbSession.id,
                        team.id,
                        targetRound
                    );

                    console.log(`[UnifiedEffectsProcessor] ✅ KPI reset complete for team ${team.name}:`, {
                        permanentEffects: resetResult.permanentEffectsApplied.length,
                        continuedInvestments: resetResult.continuedInvestmentsApplied.length,
                        finalKpis: {
                            capacity: resetResult.finalKpis.current_capacity,
                            orders: resetResult.finalKpis.current_orders,
                            cost: resetResult.finalKpis.current_cost,
                            asp: resetResult.finalKpis.current_asp
                        }
                    });

                } catch (teamError) {
                    console.error(`[UnifiedEffectsProcessor] ❌ KPI reset failed for team ${team.name}:`, teamError);
                    // Continue with other teams - don't let one team failure break the entire process
                    // This follows existing error handling patterns
                }
            }

            // Refresh UI data (same pattern as other processors)
            await fetchTeamRoundDataFromHook(currentDbSession.id);

            console.log(`[UnifiedEffectsProcessor] ✅ KPI reset processing complete for slide ${slide.id} (${roundTransition})`);

        } catch (error) {
            console.error(`[UnifiedEffectsProcessor] ❌ Error during KPI reset processing for slide ${slide.id}:`, error);
            throw error;
        }
    }

    /**
     * ADDED: Process strategy investment permanent effects
     */
    private async processStrategyInvestmentEffects(
        team: Team,
        investmentPhase: string,
        slideOption: string
    ): Promise<void> {
        // Check if this is a strategy investment (option 'A' in any investment phase)
        if (slideOption !== 'A') {
            return; // Not a strategy investment
        }

        console.log(`[UnifiedEffectsProcessor] 🎯 Strategy investment detected for team ${team.name} in ${investmentPhase}`);

        try {
            // Determine investment type and round
            const investmentType = investmentPhase === 'rd1-invest'
                ? 'business_growth_strategy' as const
                : 'strategic_plan' as const;
            const purchaseRound = investmentPhase === 'rd1-invest' ? 1 : 2;

            // Process the strategy investment to create permanent effects
            await StrategyInvestmentTracker.processStrategyInvestment(
                this.props.currentDbSession!.id,
                team.id,
                investmentType,
                purchaseRound
            );

            console.log(`[UnifiedEffectsProcessor] ✅ Strategy investment permanent effects created for team ${team.name}`);

        } catch (error) {
            console.error(`[UnifiedEffectsProcessor] ❌ Error processing strategy investment for team ${team.name}:`, error);
            // Don't throw - let the regular payoff processing continue
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

        // Use the SLIDE_TO_CHALLENGE_MAP to get challenge ID and option
        const challengeId = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);
        if (!challengeId) {
            console.warn(`[UnifiedEffectsProcessor] ❌ No challenge mapping found for slide ${consequenceSlide.id}`);
            return;
        }

        const slideOption = this.getSlideOption(consequenceSlide);
        if (!slideOption) {
            console.warn(`[UnifiedEffectsProcessor] ❌ Could not determine slide option for ${consequenceSlide.id}: "${consequenceSlide.title}"`);
            return;
        }

        console.log(`[UnifiedEffectsProcessor] 🎯 Processing consequence: ${challengeId}, option ${slideOption}`);

        // Get consequence data
        const consequenceKey = `${challengeId}-conseq`;
        const allConsequencesForChallenge = allConsequencesData[consequenceKey] || [];
        if (allConsequencesForChallenge.length === 0) {
            console.warn(`[UnifiedEffectsProcessor] ⚠️ No consequences defined for challenge ${consequenceKey}`);
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

            // Check if team selected this option
            if (teamDecision.selected_challenge_option_id !== slideOption) {
                console.log(`[UnifiedEffectsProcessor] ℹ️ Team ${team.name} selected option ${teamDecision.selected_challenge_option_id}, not ${slideOption}. Skipping.`);
                continue;
            }

            console.log(`[UnifiedEffectsProcessor] ✅ Team ${team.name} selected option ${slideOption}. Processing effects.`);

            // Find consequence effects for this option - FIXED: Use challenge_option_id not selected_option
            const consequenceForOption = allConsequencesForChallenge.find(cons => cons.challenge_option_id === slideOption);
            if (!consequenceForOption?.effects) {
                console.warn(`[UnifiedEffectsProcessor] ⚠️ No effects found for option ${slideOption} in challenge ${challengeId}`);
                continue;
            }

            // Apply effects to team round data - FIXED: Use ensureTeamRoundData not ensureKpiDataExists
            const currentRound = consequenceSlide.round_number as 1 | 2 | 3;
            const currentKpis = await KpiDataUtils.ensureTeamRoundData(
                currentDbSession.id,
                team.id,
                currentRound,
                teamRoundData,
                setTeamRoundDataDirectly
            );

            const updatedKpis = ScoringEngine.applyKpiEffects(currentKpis, consequenceForOption.effects);
            const finalKpis = ScoringEngine.calculateFinancialMetrics(updatedKpis);

            // Save to database
            await db.kpis.update(currentKpis.id, {
                ...updatedKpis,
                ...finalKpis
            });

            // Handle permanent effects (if any)
            const permanentEffects = consequenceForOption.effects.filter(eff =>
                eff.timing === 'permanent_next_round_start'
            );

            if (permanentEffects.length > 0) {
                await KpiDataUtils.storePermanentAdjustments(
                    team.id,
                    currentDbSession.id,
                    permanentEffects,
                    challengeId,
                    slideOption
                );
            }

            console.log(`[UnifiedEffectsProcessor] ✅ Processed consequence for team ${team.name}: ${consequenceForOption.id}`);
        }

        // Refresh data
        await fetchTeamRoundDataFromHook(currentDbSession.id);
    }

    /**
     * Process payoff slides (COMPLETE LOGIC with strategy investment integration)
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

        // Determine which investment phase this payoff is for
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

        // Get payoff data for this phase
        const roundNumber = getRoundForInvestmentPhase(investmentPhase);
        const payoffKey = `rd${roundNumber}-payoff`;
        const allPayoffsForPhase = allInvestmentPayoffsData[payoffKey] || [];
        if (allPayoffsForPhase.length === 0) {
            console.warn(`[UnifiedEffectsProcessor] ⚠️ No payoffs defined for ${payoffKey}`);
            return;
        }

        // Process each team
        for (const team of teams) {
            console.log(`[UnifiedEffectsProcessor] 👥 Processing payoff for team: ${team.name}`);

            // Get team's investment decisions for this phase
            const regularDecision = teamDecisions[team.id]?.[investmentPhase];
            const immediateDecision = teamDecisions[team.id]?.[`${investmentPhase}_immediate`];

            // Combine regular and immediate purchase options
            const regularOptions = regularDecision?.selected_investment_options || [];
            const immediateOptions = immediateDecision?.selected_investment_options || [];
            const selectedOptions = [...regularOptions, ...immediateOptions];

            // Skip if team made no investment decisions at all
            if (!regularDecision && !immediateDecision) {
                console.log(`[UnifiedEffectsProcessor] ⚠️ No investment decisions found for team ${team.name} for phase ${investmentPhase}. Skipping.`);
                continue;
            }

            // Check if team selected this option
            if (!selectedOptions.includes(slideOption)) {
                console.log(`[UnifiedEffectsProcessor] ℹ️ Team ${team.name} did not select option ${slideOption}. Available options: [${selectedOptions.join(', ')}]. Skipping.`);
                continue;
            }

            // For budget calculations, combine spent amounts from both decision types
            const regularSpent = regularDecision?.total_spent_budget ?? 0;
            const immediateSpent = immediateDecision?.total_spent_budget ?? 0;
            const totalSpentBudget = regularSpent + immediateSpent;

            console.log(`[UnifiedEffectsProcessor] ✅ Team ${team.name} selected option ${slideOption}. Total spent: $${totalSpentBudget}.`);

            // Process strategy investment effects first (if applicable)
            await this.processStrategyInvestmentEffects(team, investmentPhase, slideOption);

            // Find payoff effects for this option - FIXED: Use 'id' not 'investment_option'
            const payoffForOption = allPayoffsForPhase.find(payoff => payoff.id === slideOption);
            if (!payoffForOption?.effects) {
                console.warn(`[UnifiedEffectsProcessor] ⚠️ No effects found for option ${slideOption} in ${payoffKey}`);
                continue;
            }

            // Apply effects to team round data - FIXED: Use ensureTeamRoundData not ensureKpiDataExists
            const currentRound = payoffSlide.round_number as 1 | 2 | 3;
            const currentKpis = await KpiDataUtils.ensureTeamRoundData(
                currentDbSession.id,
                team.id,
                currentRound,
                teamRoundData,
                setTeamRoundDataDirectly
            );

            const updatedKpis = ScoringEngine.applyKpiEffects(currentKpis, payoffForOption.effects);
            const finalKpis = ScoringEngine.calculateFinancialMetrics(updatedKpis);

            // Save to database
            await db.kpis.update(currentKpis.id, {
                ...updatedKpis,
                ...finalKpis
            });

            console.log(`[UnifiedEffectsProcessor] ✅ Applied ${payoffForOption.effects.length} payoff effects to team ${team.name}`);
        }

        // Refresh data
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
