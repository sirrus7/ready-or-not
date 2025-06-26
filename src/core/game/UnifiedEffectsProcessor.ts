// src/core/game/UnifiedEffectsProcessor.ts
import {GameSession, GameStructure, KpiEffect, Slide, Team, TeamDecision, TeamRoundData,} from '@shared/types';
import {db} from '@shared/services/supabase';
import {ScoringEngine} from './ScoringEngine';
import {KpiDataUtils} from './KpiDataUtils';
import {StrategyInvestmentTracker} from './StrategyInvestmentTracker';
import {KpiResetEngine} from './KpiResetEngine';
import {ImmunityTracker} from './ImmunityTracker';
import {MultiSelectChallengeTracker} from './MultiSelectChallengeTracker';
import {EmployeeDevelopmentTracker} from './EmployeeDevelopmentTracker';
import {allConsequencesData} from '@core/content/ConsequenceContent';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {SLIDE_TO_CHALLENGE_MAP} from '@core/content/ChallengeRegistry';
import {getInvestmentPhaseBySlideId, getRoundForInvestmentPhase} from '@core/content/InvestmentRegistry';

// NEW: Team broadcaster interface
interface TeamBroadcaster {
    broadcastKpiUpdated: (slide: Slide) => void;
    broadcastRoundTransition: (roundNumber: number) => void;
}

interface UnifiedEffectsProcessorProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
    teamBroadcaster?: TeamBroadcaster;
}

export class UnifiedEffectsProcessor {
    private props: UnifiedEffectsProcessorProps;
    private processedSlides = new Set<string>();
    private isProcessing = false;

    constructor(props: UnifiedEffectsProcessorProps) {
        this.props = props;
    }

    /**
     * Update props dynamically
     */
    public updateProps(newProps: UnifiedEffectsProcessorProps): void {
        // Reset processed slides when session changes
        if (newProps.currentDbSession?.id !== this.props.currentDbSession?.id) {
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
    }

    /**
     * MAIN METHOD: Process any effect slide (consequence, payoff, or KPI reset)
     * UPDATED: Added KPI reset slide routing
     */
    public async processEffectSlide(slide: Slide): Promise<void> {
        const slideKey = `${this.props.currentDbSession?.id}-${slide.id}`;

        // Prevent concurrent processing and reprocessing
        if (this.isProcessing || this.processedSlides.has(slideKey)) {
            return;
        }
        this.isProcessing = true;
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

            // NEW: Broadcast to teams after successful processing
            if (this.props.teamBroadcaster) {
                this.props.teamBroadcaster.broadcastKpiUpdated(slide);

                if (slide.type === 'kpi_reset') {
                    this.props.teamBroadcaster.broadcastRoundTransition(slide.round_number);
                }
            }
        } catch (error) {
            console.error(`[UnifiedEffectsProcessor] ❌ Error processing effect slide ${slide.id}:`, error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * NEW: Process KPI reset slides - handles round transitions automatically
     * FIXED: Now actually saves the computed KPIs to database for real-time updates
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

        // Process each team individually (following existing team iteration pattern)
        for (const team of teams) {
            try {
                // STEP 1: Check if Round data already exists (shouldn't during normal gameplay)
                const existingRoundData = await db.kpis.getForTeamRound(
                    currentDbSession.id,
                    team.id,
                    targetRound
                );

                // STEP 2: Execute KPI reset calculations (preserves all existing logic)
                const resetResult = await KpiResetEngine.executeResetSequence(
                    currentDbSession.id,
                    team.id,
                    targetRound
                );

                // STEP 3: Save computed KPIs to database (CRITICAL FIX)
                if (existingRoundData) {
                    await db.kpis.update(existingRoundData.id, resetResult.finalKpis);
                } else {
                    // Create new Round data
                    await db.kpis.create(resetResult.finalKpis);
                }

            } catch (teamError) {
                console.error(`[UnifiedEffectsProcessor] ❌ KPI reset failed for team ${team.name}:`, teamError);
                // Continue with other teams - don't let one team failure break the entire process
                // This follows existing error handling patterns
            }
        }

        // STEP 4: Refresh UI data (triggers real-time updates to team apps)
        await fetchTeamRoundDataFromHook(currentDbSession.id);
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
        } catch (error) {
            console.error(`[UnifiedEffectsProcessor] ❌ Error processing strategy investment for team ${team.name}:`, error);
            // Don't throw - let the regular payoff processing continue
        }
    }

    /**
     * Check if team bought CNC machine in CH1 (Option A)
     */
    private async checkCncMachine(sessionId: string, teamId: string): Promise<boolean> {
        try {
            const allDecisions = await db.decisions.getBySession(sessionId);
            const teamDecisions = allDecisions.filter(d => d.team_id === teamId);

            // Check for CNC machine (CH1 Option A)
            return teamDecisions.some(decision =>
                decision.phase_id === 'ch1' &&
                decision.selected_challenge_option_id === 'A'
            );
        } catch (error) {
            console.error('Error checking CNC machine:', error);
            return false;
        }
    }

    /**
     * Check if team invested in Automation & Co-Bots in RD-2 (Option K)
     */
    private async checkAutomationInvestment(sessionId: string, teamId: string): Promise<boolean> {
        try {
            const allDecisions = await db.decisions.getBySession(sessionId);
            const teamDecisions = allDecisions.filter(d => d.team_id === teamId);

            // Check for Automation investment (RD-2 Option K)
            return teamDecisions.some(decision =>
                decision.phase_id === 'rd2-invest' &&
                decision.selected_investment_options?.includes('K')
            );
        } catch (error) {
            console.error('Error checking automation investment:', error);
            return false;
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
            return;
        }

        // Use the SLIDE_TO_CHALLENGE_MAP to get challenge ID and option
        const challengeId = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);
        if (!challengeId) {
            return;
        }

        const slideOption = this.getSlideOption(consequenceSlide);
        if (!slideOption) {
            return;
        }

        // Get consequence data
        const consequenceKey = `${challengeId}-conseq`;
        const allConsequencesForChallenge = allConsequencesData[consequenceKey] || [];
        if (allConsequencesForChallenge.length === 0) {
            console.warn(`[UnifiedEffectsProcessor] ⚠️ No consequences defined for challenge ${consequenceKey}`);
            return;
        }

        // Process each team
        for (const team of teams) {
            // Get team's decision for this challenge
            const teamDecision = teamDecisions[team.id]?.[challengeId];
            if (!teamDecision) {
                continue;
            }

            // Get team's exact selection (could be "A", "A,C", "B,C", etc.)
            const teamSelection = teamDecision.selected_challenge_option_id;
            if (!teamSelection) {
                continue;
            }

            // Find consequence that matches the team's EXACT selection
            const consequenceForTeamSelection = allConsequencesForChallenge.find(cons =>
                cons.challenge_option_id === teamSelection
            );

            if (!consequenceForTeamSelection?.effects) {
                console.warn(`[UnifiedEffectsProcessor] ⚠️ No consequences found for selection "${teamSelection}" in challenge ${challengeId}`);
                continue;
            }

            // Only process this slide if it's the consequence slide for this team's selection
            if (!MultiSelectChallengeTracker.shouldSlideProcessSelection(consequenceSlide.id, teamSelection)) {
                continue; // This slide is not for this team's selection
            }

            // Check immunity before applying effects
            const hasImmunity = await ImmunityTracker.hasImmunity(currentDbSession.id, team.id, challengeId);

            if (hasImmunity) {
                console.log(`[UnifiedEffectsProcessor] Team ${team.name} has immunity for ${challengeId}`);

                // UPDATED: Check for immunity-specific consequences (positive effects)
                const immunityConsequenceKey = `${challengeId}-immunity`;
                const immunityConsequences = allConsequencesData[immunityConsequenceKey] || [];

                if (immunityConsequences.length > 0) {
                    // Find immunity consequence for this team's selection
                    const immunityConsequence = immunityConsequences.find(cons =>
                        cons.challenge_option_id === teamSelection
                    );

                    if (immunityConsequence?.effects) {
                        console.log(`[UnifiedEffectsProcessor] Applying immunity benefits for team ${team.name}, selection "${teamSelection}"`);

                        // Apply immunity effects (positive benefits)
                        const currentRound = consequenceSlide.round_number as 1 | 2 | 3;
                        const currentKpis = await KpiDataUtils.ensureTeamRoundData(
                            currentDbSession.id,
                            team.id,
                            currentRound,
                            teamRoundData,
                            setTeamRoundDataDirectly
                        );

                        const updatedKpis = ScoringEngine.applyKpiEffects(currentKpis, immunityConsequence.effects);
                        const finalKpis = ScoringEngine.calculateFinancialMetrics(updatedKpis);

                        // Save to database
                        await db.kpis.update(currentKpis.id, {
                            ...updatedKpis,
                            ...finalKpis
                        });

                        console.log(`[UnifiedEffectsProcessor] Applied immunity benefits for team ${team.name}`);
                    } else {
                        console.log(`[UnifiedEffectsProcessor] No immunity consequences found for selection "${teamSelection}", skipping all effects`);
                    }
                } else {
                    console.log(`[UnifiedEffectsProcessor] No immunity consequences defined for ${challengeId}, skipping all effects`);
                }

                continue; // Skip to next team (immune team is processed)
            }

            // ========================================================================
            // CONDITIONAL EFFECTS PROCESSING: Handle CH7 automation and existing logic
            // ========================================================================

            // Apply effects to team round data
            const currentRound = consequenceSlide.round_number as 1 | 2 | 3;
            const currentKpis = await KpiDataUtils.ensureTeamRoundData(
                currentDbSession.id,
                team.id,
                currentRound,
                teamRoundData,
                setTeamRoundDataDirectly
            );

            // SPECIAL HANDLING: CH7 Option C customization needs automation capability check
            let effectsToApply = consequenceForTeamSelection.effects;
            if (challengeId === 'ch7' && teamSelection === 'C') {
                // Check for automation capability (CNC machine OR Automation investment)
                const hasCncMachine = await this.checkCncMachine(currentDbSession.id, team.id);
                const hasAutomationInvestment = await this.checkAutomationInvestment(currentDbSession.id, team.id);
                const hasAutomationCapability = hasCncMachine || hasAutomationInvestment;

                // Calculate capacity impact: 0 if automated, -500 if not
                const capacityImpact = hasAutomationCapability ? 0 : -500;

                // Update capacity effect
                effectsToApply = consequenceForTeamSelection.effects.map(effect => {
                    if (effect.kpi === 'capacity') {
                        return {
                            ...effect,
                            change_value: capacityImpact,
                            description: hasAutomationCapability
                                ? 'Customization Capacity Impact (Automated - No Penalty)'
                                : 'Customization Capacity Impact (Manual Production)'
                        };
                    }
                    return effect;
                });

                console.log(`[UnifiedEffectsProcessor] CH7 customization for team ${team.name}: ${capacityImpact} (automation: ${hasAutomationCapability})`);
            }

            const updatedKpis = ScoringEngine.applyKpiEffects(currentKpis, effectsToApply);
            const finalKpis = ScoringEngine.calculateFinancialMetrics(updatedKpis);

            // Save to database
            await db.kpis.update(currentKpis.id, {
                ...updatedKpis,
                ...finalKpis
            });

            // ========================================================================
            // MINIMAL CHANGE: Handle permanent effects with Employee Development check
            // ========================================================================
            const permanentEffects = consequenceForTeamSelection.effects.filter(eff =>
                eff.timing === 'permanent_next_round_start'
            );

            if (permanentEffects.length > 0) {
                // SPECIAL HANDLING: CH5 hiring permanent effects need Employee Development check
                if (challengeId === 'ch5' && (teamSelection === 'A' || teamSelection === 'A,C')) {
                    // Check Employee Development investment for conditional capacity bonus
                    const hasEmployeeDevelopment = await EmployeeDevelopmentTracker.hasEmployeeDevelopment(
                        currentDbSession.id,
                        team.id
                    );

                    // Calculate dynamic permanent effects with conditional bonus
                    const dynamicPermanentEffects = permanentEffects.map(effect => {
                        if (effect.kpi === 'capacity' && effect.description?.includes('Permanent Hiring Capacity Impact')) {
                            // Apply conditional bonus: 1000 base + 500 if Employee Development
                            const finalCapacityValue = EmployeeDevelopmentTracker.getConditionalCapacityBonus(hasEmployeeDevelopment);

                            return {
                                ...effect,
                                change_value: finalCapacityValue,
                                description: hasEmployeeDevelopment
                                    ? "Permanent Hiring Capacity Impact (+500 bonus from Employee Development)"
                                    : "Permanent Hiring Capacity Impact"
                            };
                        }
                        return effect; // Return other effects unchanged
                    });

                    // Store the calculated permanent effects
                    await KpiDataUtils.storePermanentAdjustments(
                        team.id,
                        currentDbSession.id,
                        dynamicPermanentEffects,
                        challengeId,
                        teamSelection
                    );

                    console.log(`[UnifiedEffectsProcessor] Applied dynamic hiring effects for team ${team.name}, Employee Development: ${hasEmployeeDevelopment}`);
                } else {
                    // Regular permanent effects processing (existing logic unchanged)
                    await KpiDataUtils.storePermanentAdjustments(
                        team.id,
                        currentDbSession.id,
                        permanentEffects,
                        challengeId,
                        teamSelection
                    );
                }
            }
            console.log(`[UnifiedEffectsProcessor] Applied effects for team ${team.name}, selection "${teamSelection}"`);
        }

        // Refresh data
        await fetchTeamRoundDataFromHook(currentDbSession.id);
    }

    /**
     * Process payoff slides (COMPLETE LOGIC with strategy investment integration and bonus handling)
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
            // ========================================================================
            // CONDITIONAL BONUS PAYOFFS: Handle RD-2 and RD-3 synergy bonuses
            // ========================================================================
            if (payoffSlide.id === 137 || payoffSlide.id === 138 || payoffSlide.id === 182 || payoffSlide.id === 183) {
                console.log(`[UnifiedEffectsProcessor] Processing bonus slide ${payoffSlide.id} for team ${team.name}`);

                // Get all team decisions to check investment combinations
                const allDecisions = await db.decisions.getBySession(currentDbSession.id);
                const teamDecisions = allDecisions.filter(d => d.team_id === team.id);

                const bonusEffects: KpiEffect[] = [];

                // RD-2 BONUSES (slides 137-138)
                if (payoffSlide.id === 137) {
                    // Production Efficiency Bonus - requires Production Efficiency (B) + manufacturing investments
                    const hasProductionEfficiency = teamDecisions.some(decision =>
                        decision.phase_id === 'rd2-invest' &&
                        decision.selected_investment_options?.includes('B')
                    );

                    if (hasProductionEfficiency) {
                        // Check for Expanded 2nd Shift (C)
                        const hasExpandedShift = teamDecisions.some(decision =>
                            decision.phase_id === 'rd2-invest' &&
                            decision.selected_investment_options?.includes('C')
                        );

                        // Check for Automation (K)
                        const hasAutomation = teamDecisions.some(decision =>
                            decision.phase_id === 'rd2-invest' &&
                            decision.selected_investment_options?.includes('K')
                        );

                        if (hasExpandedShift) {
                            bonusEffects.push(
                                {
                                    kpi: 'capacity',
                                    change_value: 500,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Expanded 2nd Shift Bonus'
                                },
                                {
                                    kpi: 'cost',
                                    change_value: -150000,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Expanded 2nd Shift Bonus'
                                }
                            );
                        }

                        if (hasAutomation) {
                            bonusEffects.push(
                                {
                                    kpi: 'capacity',
                                    change_value: 500,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Automation Bonus'
                                },
                                {
                                    kpi: 'cost',
                                    change_value: -75000,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Automation Bonus'
                                }
                            );
                        }
                    }

                } else if (payoffSlide.id === 138) {
                    // Supply Chain + Distribution Bonus - requires both Supply Chain (D) AND Distribution Channels (G)
                    const hasSupplyChain = teamDecisions.some(decision =>
                        decision.phase_id === 'rd2-invest' &&
                        decision.selected_investment_options?.includes('D')
                    );

                    const hasDistributionChannels = teamDecisions.some(decision =>
                        decision.phase_id === 'rd2-invest' &&
                        decision.selected_investment_options?.includes('G')
                    );

                    if (hasSupplyChain && hasDistributionChannels) {
                        bonusEffects.push(
                            {
                                kpi: 'orders',
                                change_value: 1000,
                                timing: 'immediate',
                                description: 'Supply Chain + Distribution Channels Bonus'
                            },
                            {
                                kpi: 'cost',
                                change_value: -50000,
                                timing: 'immediate',
                                description: 'Supply Chain + Distribution Channels Bonus'
                            }
                        );
                    }

                    // ✅ NEW: RD-3 BONUSES (slides 182-183)
                } else if (payoffSlide.id === 182) {
                    // RD-3 Production Efficiency Bonus - requires Production Efficiency (B) + manufacturing investments
                    const hasProductionEfficiency = teamDecisions.some(decision =>
                        decision.phase_id === 'rd3-invest' &&
                        decision.selected_investment_options?.includes('B')
                    );

                    if (hasProductionEfficiency) {
                        // Check for Expanded 2nd Shift (C)
                        const hasExpandedShift = teamDecisions.some(decision =>
                            decision.phase_id === 'rd3-invest' &&
                            decision.selected_investment_options?.includes('C')
                        );

                        // Check for Automation (K)
                        const hasAutomation = teamDecisions.some(decision =>
                            decision.phase_id === 'rd3-invest' &&
                            decision.selected_investment_options?.includes('K')
                        );

                        if (hasExpandedShift) {
                            // 2nd Shift bonus: +1000 CAP, -$300K COSTS
                            bonusEffects.push(
                                {
                                    kpi: 'capacity',
                                    change_value: 1000,
                                    timing: 'immediate',
                                    description: 'RD-3 Production Efficiency + 2nd Shift Bonus'
                                },
                                {
                                    kpi: 'cost',
                                    change_value: -300000,
                                    timing: 'immediate',
                                    description: 'RD-3 Production Efficiency + 2nd Shift Bonus'
                                }
                            );
                        }

                        if (hasAutomation) {
                            // Automation bonus: +1000 CAP, -$150K COSTS
                            bonusEffects.push(
                                {
                                    kpi: 'capacity',
                                    change_value: 1000,
                                    timing: 'immediate',
                                    description: 'RD-3 Production Efficiency + Automation Bonus'
                                },
                                {
                                    kpi: 'cost',
                                    change_value: -150000,
                                    timing: 'immediate',
                                    description: 'RD-3 Production Efficiency + Automation Bonus'
                                }
                            );
                        }

                        console.log(`[UnifiedEffectsProcessor] Team ${team.name} RD-3 Production Efficiency bonus: Shift=${hasExpandedShift}, Automation=${hasAutomation}`);
                    }

                } else if (payoffSlide.id === 183) {
                    // RD-3 Supply Chain + Distribution Bonus - requires both Supply Chain (D) AND Distribution Channels (G)
                    const hasSupplyChain = teamDecisions.some(decision =>
                        decision.phase_id === 'rd3-invest' &&
                        decision.selected_investment_options?.includes('D')
                    );

                    const hasDistributionChannels = teamDecisions.some(decision =>
                        decision.phase_id === 'rd3-invest' &&
                        decision.selected_investment_options?.includes('G')
                    );

                    if (hasSupplyChain && hasDistributionChannels) {
                        // Apply bonus: +2000 Orders, -$100K Costs
                        bonusEffects.push(
                            {
                                kpi: 'orders',
                                change_value: 2000,
                                timing: 'immediate',
                                description: 'RD-3 Supply Chain + Distribution Channels Bonus'
                            },
                            {
                                kpi: 'cost',
                                change_value: -100000,
                                timing: 'immediate',
                                description: 'RD-3 Supply Chain + Distribution Channels Bonus'
                            }
                        );

                        console.log(`[UnifiedEffectsProcessor] Team ${team.name} RD-3 Supply Chain + Distribution bonus applied`);
                    }
                }

                // Apply bonus effects if any qualify
                if (bonusEffects.length > 0) {
                    const currentRound = payoffSlide.round_number as 1 | 2 | 3;
                    const currentKpis = await KpiDataUtils.ensureTeamRoundData(
                        currentDbSession.id,
                        team.id,
                        currentRound,
                        teamRoundData,
                        setTeamRoundDataDirectly
                    );

                    const updatedKpis = ScoringEngine.applyKpiEffects(currentKpis, bonusEffects);
                    const finalKpis = ScoringEngine.calculateFinancialMetrics(updatedKpis);

                    await db.kpis.update(currentKpis.id, {
                        ...updatedKpis,
                        ...finalKpis
                    });

                    console.log(`[UnifiedEffectsProcessor] Applied ${bonusEffects.length} bonus effects for team ${team.name} on slide ${payoffSlide.id}`);
                } else {
                    console.log(`[UnifiedEffectsProcessor] Team ${team.name} does not qualify for bonus on slide ${payoffSlide.id}`);
                }

                // Skip to next team - bonus slides don't have regular payoff data
                continue;
            }

            // ========================================================================
            // REGULAR PAYOFF PROCESSING: Handle normal investment payoffs
            // ========================================================================

            // Get team's investment decisions for this phase
            const regularDecision = teamDecisions[team.id]?.[investmentPhase];
            const immediateDecision = teamDecisions[team.id]?.[`${investmentPhase}_immediate`];

            // Combine regular and immediate purchase options
            const regularOptions = regularDecision?.selected_investment_options || [];
            const immediateOptions = immediateDecision?.selected_investment_options || [];
            const selectedOptions = [...regularOptions, ...immediateOptions];

            // Skip if team made no investment decisions at all
            if (!regularDecision && !immediateDecision) {
                continue;
            }

            // Check if team selected this option
            if (!selectedOptions.includes(slideOption)) {
                continue;
            }

            // Process strategy investment effects first (if applicable)
            await this.processStrategyInvestmentEffects(team, investmentPhase, slideOption);

            // Find payoff effects for this option
            const payoffForOption = allPayoffsForPhase.find(payoff => payoff.id === slideOption);
            if (!payoffForOption?.effects) {
                console.warn(`[UnifiedEffectsProcessor] ⚠️ No effects found for option ${slideOption} in ${payoffKey}`);
                continue;
            }

            // Apply effects to team round data
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

            console.log(`[UnifiedEffectsProcessor] Applied payoff effects for team ${team.name}, option ${slideOption}`);
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
            // Round 3: Slides 171-181 map to A-K (FIXED: was 170-181)
            if (slideId >= 171 && slideId <= 181) {
                const slideIndex = slideId - 171;
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
