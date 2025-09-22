// src/core/game/UnifiedEffectsProcessor.ts
import {
    Consequence,
    GameSession,
    GameStructure, InvestmentPayoff,
    KpiEffect,
    Slide,
    Team,
    TeamDecision,
    TeamRoundData,
} from '@shared/types';
import {db} from '@shared/services/supabase';
import {FinancialMetrics, ScoringEngine} from './ScoringEngine';
import {KpiDataUtils} from './KpiDataUtils';
import {KpiResetEngine, KpiResetResult} from './KpiResetEngine';
import {ImmunityTracker} from './ImmunityTracker';
import {MultiSelectChallengeTracker} from './MultiSelectChallengeTracker';
import {EmployeeDevelopmentTracker} from './EmployeeDevelopmentTracker';
import {allConsequencesData} from '@core/content/ConsequenceContent';
import {allInvestmentPayoffsData} from '@core/content/InvestmentPayoffContent';
import {SLIDE_TO_CHALLENGE_MAP} from '@core/content/ChallengeRegistry';
import {getInvestmentPhaseBySlideId, getRoundForInvestmentPhase} from '@core/content/InvestmentRegistry';

// NEW: Team broadcaster interface
export interface TeamBroadcaster {
    broadcastKpiUpdated: (slide: Slide, kpiData?: Record<string, any>) => void;
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

interface TeamKpiUpdateParams {
    readonly team: Team;
    readonly currentRound: 1 | 2 | 3;
    readonly effects: KpiEffect[];
    readonly sessionId: string;
}

interface UpdateFinalizationParams {
    readonly slide: Slide;
    readonly sessionId: string;
}

export class UnifiedEffectsProcessor {
    private props: UnifiedEffectsProcessorProps;
    private processedSlides = new Set<string>();
    private isProcessing = false;
    private updatedKpisForBroadcast: Record<string, any> = {};

    constructor(props: UnifiedEffectsProcessorProps) {
        this.props = props;
    }

    /**
     * Check if an investment was sacrificed in double down
     */
    private isInvestmentSacrificed(teamDecisions: TeamDecision[], investmentId: string): boolean {
        const ddDecision = teamDecisions.find(d =>
            d.phase_id === 'ch-dd-prompt' &&
            d.selected_challenge_option_id === 'yes_dd'
        );
        return ddDecision?.double_down_sacrifice_id === investmentId;
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
        console.log(`[UnifiedEffectsProcessor] Processing slide ${slide.id}, type: ${slide.type}`);

        // Add check to prevent processing non-effect slides
        if (!['consequence_reveal', 'payoff_reveal', 'kpi_reset'].includes(slide.type)) {
            console.log(`[UnifiedEffectsProcessor] Skipping non-effect slide ${slide.id}`);
            return;
        }

        const slideKey = `${this.props.currentDbSession?.id}-${slide.id}`;

        // Prevent concurrent processing and reprocessing
        if (this.isProcessing || this.processedSlides.has(slideKey)) {
            return;
        }
        this.isProcessing = true;
        console.log(`[UnifiedEffectsProcessor] 🚀 Processing slide ${slide.id} (${slide.title}) type: ${slide.type}`);
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

            // NEW: Broadcast to teams after successful processing (wait for DB refresh)
            if (this.props.teamBroadcaster) {
                // Wait for database refresh to complete before broadcasting
                if (this.props.currentDbSession?.id) {
                    await this.props.fetchTeamRoundDataFromHook(this.props.currentDbSession.id);
                }

                // Small additional delay to ensure all database operations are complete
                setTimeout(async () => {
                    // Get fresh KPI data for all teams for current round
                    const freshKpiData: Record<string, any> = {};
                    const currentRound = slide.round_number || 1;

                    for (const team of this.props.teams) {
                        try {
                            const freshKpis = await db.kpis.getForTeamRound(
                                this.props.currentDbSession!.id,
                                team.id,
                                currentRound
                            );
                            if (freshKpis) {
                                freshKpiData[team.id] = freshKpis;
                            }
                        } catch (error) {
                            console.error(`Error fetching fresh KPIs for team ${team.id}:`, error);
                        }
                    }

                    // ← ADD THIS: Fetch permanent adjustments
                    let permanentAdjustments: any[] = [];
                    try {
                        permanentAdjustments = await db.adjustments.getBySession(this.props.currentDbSession!.id);
                    } catch (error) {
                        console.error('Error fetching permanent adjustments:', error);
                    }

                    console.log('🔍 UnifiedEffectsProcessor broadcasting fresh KPIs:', Object.keys(freshKpiData));
                    console.log('🔍 UnifiedEffectsProcessor broadcasting permanent adjustments:', permanentAdjustments.length);

                    // Include permanent adjustments in broadcast
                    this.props.teamBroadcaster!.broadcastKpiUpdated(slide, {
                        updatedKpis: freshKpiData,
                        permanentAdjustments: permanentAdjustments
                    });
                }, 100);
            }
        } catch (error) {
            console.error(`[UnifiedEffectsProcessor] ❌ Error processing effect slide ${slide.id}:`, error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Calculate KPI effects for a single team and collect for bulk update
     */
    private async calculateTeamKpiChanges(params: TeamKpiUpdateParams): Promise<TeamRoundData> {
        const {team, currentRound, effects, sessionId} = params;
        const {teamRoundData, setTeamRoundDataDirectly} = this.props;

        // Get current KPIs
        const currentKpis: TeamRoundData = await KpiDataUtils.ensureTeamRoundData(
            sessionId,
            team.id,
            currentRound,
            teamRoundData,
            setTeamRoundDataDirectly
        );

        // Apply effects and calculate metrics
        const updatedKpis: TeamRoundData = ScoringEngine.applyKpiEffects(currentKpis, effects);
        const finalMetrics: FinancialMetrics = ScoringEngine.calculateFinancialMetrics(updatedKpis);
        const finalKpis = {...updatedKpis, ...finalMetrics};

        // Store for bulk operations (don't save to DB yet)
        this.updatedKpisForBroadcast[team.id] = finalKpis;

        return finalKpis;
    }

    /**
     * Apply bulk KPI updates to database and local state in a single call
     */
    private async applyBulkKpiUpdates(kpiUpdates: Array<{
        teamId: string;
        kpis: TeamRoundData
    }>, currentRound: 1 | 2 | 3): Promise<void> {
        const {setTeamRoundDataDirectly} = this.props;

        if (kpiUpdates.length === 0) return;

        // Prepare data for bulk upsert
        const kpiDataArray: TeamRoundData[] = kpiUpdates.map(({kpis}) => kpis);

        // Single bulk database operation
        await db.kpis.bulkUpsert(kpiDataArray);

        // Update local state in single operation
        setTeamRoundDataDirectly(prev => {
            const updated = {...prev};
            kpiUpdates.forEach(({teamId, kpis}) => {
                if (!updated[teamId]) updated[teamId] = {};
                updated[teamId][currentRound] = kpis;
            });
            return updated;
        });

        console.log(`[UnifiedEffectsProcessor] ✅ Bulk updated ${kpiUpdates.length} teams in single database call`);
    }

    /**
     * Apply bulk updates and finalize by broadcasting to teams and refreshing data
     */
    private async finalizeUpdates(params: UpdateFinalizationParams, kpiUpdates?: Array<{
        teamId: string;
        kpis: TeamRoundData
    }>): Promise<void> {
        const {slide, sessionId} = params;
        const {teamBroadcaster, fetchTeamRoundDataFromHook} = this.props;

        // Apply bulk KPI updates if provided
        if (kpiUpdates && kpiUpdates.length > 0) {
            await this.applyBulkKpiUpdates(kpiUpdates, slide.round_number as 1 | 2 | 3);
        }

        // Only broadcast if there are actual KPI updates for teams
        if (teamBroadcaster && Object.keys(this.updatedKpisForBroadcast).length > 0) {
            console.log(`[UnifiedEffectsProcessor] 📡 Broadcasting KPI updates for ${Object.keys(this.updatedKpisForBroadcast).length} affected teams`);
            teamBroadcaster.broadcastKpiUpdated(slide, this.updatedKpisForBroadcast);
            this.updatedKpisForBroadcast = {};
        } else if (teamBroadcaster) {
            console.log(`[UnifiedEffectsProcessor] ⏭️ Skipping broadcast - no teams affected by slide ${slide.id}`);
        }

        // Refresh data from database
        await fetchTeamRoundDataFromHook(sessionId);
    }

    /**
     * Process KPI reset slides - Uses batch for actual reset slides, individual for others
     */
    private async processKpiResetSlide(slide: Slide): Promise<void> {
        console.log(`[UnifiedEffectsProcessor] KPI Reset for slide ${slide.id}, round ${slide.round_number}`);

        const {
            currentDbSession,
            teams,
            fetchTeamRoundDataFromHook
        } = this.props;

        // Validate required data
        if (!currentDbSession?.id || !teams.length) {
            console.warn('[UnifiedEffectsProcessor] ⚠️ Missing required data for KPI reset processing');
            return;
        }

        // Determine target round based on slide round_number
        const targetRound = slide.round_number as 2 | 3;

        // KEY DECISION: Use batch for actual KPI reset slides, individual for others
        const isActualKpiResetSlide = slide.type === 'kpi_reset';

        if (isActualKpiResetSlide) {
            // USE BATCH OPERATION for mass KPI reset slides (67, 142)
            console.log(`[UnifiedEffectsProcessor] 🚀 BATCH KPI reset for ${teams.length} teams → Round ${targetRound}`);

            try {
                await KpiResetEngine.executeResetSequenceForAllTeams(
                    currentDbSession.id,
                    targetRound
                );
                console.log(`[UnifiedEffectsProcessor] ✅ Batch KPI reset complete`);
            } catch (error) {
                console.error(`[UnifiedEffectsProcessor] ❌ Batch KPI reset failed:`, error);
                throw error;
            }
        } else {
            // USE INDIVIDUAL PROCESSING for other effect slides (preserves real-time)
            console.log(`[UnifiedEffectsProcessor] 🔄 Individual processing for ${teams.length} teams`);

            for (const team of teams) {
                try {
                    const existingRoundData: TeamRoundData | null = await db.kpis.getForTeamRound(
                        currentDbSession.id,
                        team.id,
                        targetRound
                    );

                    const resetResult: KpiResetResult = await KpiResetEngine.executeResetSequence(
                        currentDbSession.id,
                        team.id,
                        targetRound
                    );

                    if (existingRoundData) {
                        await db.kpis.update(existingRoundData.id, resetResult.finalKpis);
                    } else {
                        await db.kpis.create(resetResult.finalKpis);
                    }

                } catch (teamError) {
                    console.error(`[UnifiedEffectsProcessor] ❌ Individual processing failed for team ${team.name}:`, teamError);
                    // Continue with other teams
                }
            }
        }

        // Refresh UI data
        await fetchTeamRoundDataFromHook(currentDbSession.id);
    }

    /**
     * Check if team bought CNC machine in CH1 (Option A)
     */
    private async checkCncMachine(sessionId: string, teamId: string): Promise<boolean> {
        try {
            const allDecisions: TeamDecision[] = await db.decisions.getBySession(sessionId);
            const teamDecisions: TeamDecision[] = allDecisions.filter(d => d.team_id === teamId);

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
            const allDecisions: TeamDecision[] = await db.decisions.getBySession(sessionId);
            const teamDecisions: TeamDecision[] = allDecisions.filter(d => d.team_id === teamId);

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

    private async processSetupSlide(slide: Slide, challengeId: string): Promise<void> {
        const {currentDbSession, teams} = this.props;

        // Get setup consequence from existing challenge consequences
        const consequenceKey: string = `${challengeId}-conseq`;
        const allConsequences: Consequence[] = allConsequencesData[consequenceKey] || [];
        const setupConsequence: Consequence | undefined = allConsequences.find(cons => cons.challenge_option_id === 'setup');

        if (!setupConsequence) {
            console.warn(`[UnifiedEffectsProcessor] No setup consequence found for ${challengeId}`);
            return;
        }

        console.log(`[UnifiedEffectsProcessor] 🌍 Applying setup to ALL teams: ${setupConsequence.id}`);
        const kpiUpdates: Array<{ teamId: string; kpis: TeamRoundData }> = [];
        // Process each team
        for (const team of teams) {
            const finalKpis: TeamRoundData = await this.calculateTeamKpiChanges({
                team,
                currentRound: slide.round_number as 1 | 2 | 3,
                effects: setupConsequence.effects,
                sessionId: currentDbSession!.id
            });

            // Collect for bulk update
            kpiUpdates.push({teamId: team.id, kpis: finalKpis});
        }

        await this.finalizeUpdates({
            slide,
            sessionId: currentDbSession!.id
        }, kpiUpdates);
        console.log(`[UnifiedEffectsProcessor] ✅ Setup slide ${slide.id} complete`);
    }

    /**
     * Process immunity slides - apply immunity benefits to qualifying teams
     */
    private async processImmunityBonusSlide(immunitySlide: Slide, challengeId: string): Promise<void> {
        const {currentDbSession, teams} = this.props;

        console.log(`[UnifiedEffectsProcessor] 🛡️ Processing immunity slide for challenge ${challengeId}`);

        // Get immunity consequences
        const immunityConsequenceKey = `${challengeId}-immunity`;
        const immunityConsequences: Consequence[] = allConsequencesData[immunityConsequenceKey] || [];

        if (immunityConsequences.length === 0) {
            console.warn(`[UnifiedEffectsProcessor] No immunity consequences defined for ${challengeId}`);
            return;
        }

        // Get the single immunity consequence (not tied to team selection)
        const immunityConsequence: Consequence | undefined = immunityConsequences.find(cons =>
            cons.challenge_option_id === 'immunity'
        );

        if (!immunityConsequence?.effects) {
            console.warn(`[UnifiedEffectsProcessor] No immunity consequence found with challenge_option_id 'immunity'`);
            return;
        }

        console.log(`[UnifiedEffectsProcessor] 🛡️ Processing immunity slide for challenge ${challengeId}`);
        const kpiUpdates: Array<{ teamId: string; kpis: TeamRoundData }> = [];
        // Process each team
        for (const team of teams) {
            // Check if team has immunity for this challenge
            const hasImmunity: boolean = await ImmunityTracker.hasImmunity(currentDbSession!.id, team.id, challengeId);

            if (!hasImmunity) {
                console.log(`[UnifiedEffectsProcessor] Team ${team.name} does not have immunity for ${challengeId}`);
                continue;
            }

            console.log(`[UnifiedEffectsProcessor] 🛡️ Applying immunity benefits for team ${team.name}`);

            // Calculate immunity KPI changes (don't save yet)
            const finalKpis = await this.calculateTeamKpiChanges({
                team,
                currentRound: immunitySlide.round_number as 1 | 2 | 3,
                effects: immunityConsequence.effects,
                sessionId: currentDbSession!.id
            });

            // Collect for bulk update
            kpiUpdates.push({teamId: team.id, kpis: finalKpis});

            console.log(`[UnifiedEffectsProcessor] ✅ Applied immunity benefits for team ${team.name}`);
        }

        // Apply bulk updates and finalize
        await this.finalizeUpdates({
            slide: immunitySlide,
            sessionId: currentDbSession!.id
        }, kpiUpdates);
    }

    /**
     * Process consequence slides (COMPLETE LOGIC from ConsequenceProcessor)
     */
    private async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        console.log(`[UnifiedEffectsProcessor] 📋 Processing consequence slide ${consequenceSlide.id}`);
        const {
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
        } = this.props;

        // Validate required data
        if (!currentDbSession?.id || !gameStructure || !teams.length) {
            return;
        }

        // Use the SLIDE_TO_CHALLENGE_MAP to get challenge ID and option
        const challengeId: string | undefined = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);
        console.log(`[UnifiedEffectsProcessor] 🎯 Looking for challenge ID: ${challengeId}`);
        if (!challengeId) {
            return;
        }

        // NEW: Handle setup slides that affect all teams
        const isSetupSlide: boolean = consequenceSlide.id === 42 || consequenceSlide.id === 86 || consequenceSlide.id === 100;
        if (isSetupSlide) {
            await this.processSetupSlide(consequenceSlide, challengeId);
            return;
        }

        // Check if this is an immunity bonus slide - if so, skip the slide option requirement
        if (consequenceSlide.immunity_bonus) {
            await this.processImmunityBonusSlide(consequenceSlide, challengeId);
            return;
        }

        const slideOption: string | null = this.getSlideOption(consequenceSlide);
        if (!slideOption) {
            return;
        }

        // Get consequence data
        const consequenceKey = `${challengeId}-conseq`;
        const allConsequencesForChallenge: Consequence[] = allConsequencesData[consequenceKey] || [];
        console.log(`[UnifiedEffectsProcessor] 📊 Found ${allConsequencesForChallenge?.length || 0} consequences for ${consequenceKey}`);
        if (allConsequencesForChallenge.length === 0) {
            console.warn(`[UnifiedEffectsProcessor] ⚠️ No consequences defined for challenge ${consequenceKey}`);
            return;
        }

        console.log(`[UnifiedEffectsProcessor] 👥 Processing ${teams.length} teams`);
        const kpiUpdates: Array<{ teamId: string; kpis: TeamRoundData }> = [];
        // Process each team
        for (const team of teams) {
            console.log(`[UnifiedEffectsProcessor] 🏢 Processing team: ${team.name} (${team.id})`);
            // Get team's decision for this challenge
            const teamDecision: TeamDecision = teamDecisions[team.id]?.[challengeId];
            console.log(`[UnifiedEffectsProcessor] 📝 Team ${team.name} decision:`, teamDecision);
            if (!teamDecision) {
                console.warn(`[UnifiedEffectsProcessor] ⚠️ No decision found for team ${team.name} challenge ${challengeId}`);
                continue;
            }

            // Get team's exact selection (could be "A", "A,C", "B,C", etc.)
            const teamSelection: string | null = teamDecision.selected_challenge_option_id;
            console.log(`[UnifiedEffectsProcessor] ✅ Team ${team.name} selected option: ${teamSelection}`);
            if (!teamSelection) {
                continue;
            }

            // Only apply multi-select filtering to actual multi-select challenges
            if (MultiSelectChallengeTracker.isMultiSelectChallenge(challengeId)) {
                if (!MultiSelectChallengeTracker.shouldSlideProcessSelection(consequenceSlide.id, teamSelection)) {
                    console.log(`[UnifiedEffectsProcessor] ⏭️ Skipping team ${team.name} - multi-select: slide ${consequenceSlide.id} not for selection ${teamSelection}`);
                    continue; // This slide is not for this team's selection
                }
            } else {
                // For single-select challenges, use simple option matching
                const slideOption: string | null = this.getSlideOption(consequenceSlide);
                if (!slideOption) {
                    console.warn(`[UnifiedEffectsProcessor] Could not determine slide option for ${consequenceSlide.title}`);
                    continue;
                }

                if (teamSelection !== slideOption) {
                    console.log(`[UnifiedEffectsProcessor] ⏭️ Skipping team ${team.name} - single-select: selected ${teamSelection} but slide is for ${slideOption}`);
                    continue;
                }
            }

            // Find consequence that matches the team's EXACT selection
            const consequenceForTeamSelection: Consequence | undefined = allConsequencesForChallenge.find(cons =>
                cons.challenge_option_id === teamSelection
            );

            if (!consequenceForTeamSelection?.effects) {
                console.warn(`[UnifiedEffectsProcessor] ⚠️ No consequences found for selection "${teamSelection}" in challenge ${challengeId}`);
                continue;
            }

            console.log(`[UnifiedEffectsProcessor] 🎲 Found consequence for team ${team.name}:`, consequenceForTeamSelection.id);
            console.log(`[UnifiedEffectsProcessor] 🎲 Effects to apply:`, consequenceForTeamSelection.effects);

            // Only apply multi-select filtering to actual multi-select challenges
            if (MultiSelectChallengeTracker.isMultiSelectChallenge(challengeId)) {
                if (!MultiSelectChallengeTracker.shouldSlideProcessSelection(consequenceSlide.id, teamSelection)) {
                    continue; // This slide is not for this team's selection
                }
            }

            // Check immunity before applying effects
            const hasImmunity: boolean = await ImmunityTracker.hasImmunity(currentDbSession.id, team.id, challengeId);

            if (hasImmunity) {
                console.log(`[UnifiedEffectsProcessor] 🛡️ Team ${team.name} is immune to ${challengeId} consequences, skipping`);
                continue; // Skip to next team - immunity benefits already applied on immunity slide
            }

            // ========================================================================
            // CONDITIONAL EFFECTS PROCESSING: Handle CH7 automation and existing logic
            // ========================================================================

            console.log(`[UnifiedEffectsProcessor] ⚙️ Applying ${consequenceForTeamSelection.effects.length} effects to team ${team.name}`);

            // SPECIAL HANDLING: CH7 Option C customization needs automation capability check
            let effectsToApply: KpiEffect[] = consequenceForTeamSelection.effects;
            if (challengeId === 'ch7' && teamSelection === 'C') {
                // Check for automation capability (CNC machine OR Automation investment)
                const hasCncMachine: boolean = await this.checkCncMachine(currentDbSession.id, team.id);
                const hasAutomationInvestment: boolean = await this.checkAutomationInvestment(currentDbSession.id, team.id);
                const hasAutomationCapability: boolean = hasCncMachine || hasAutomationInvestment;

                // Calculate capacity impact: 0 if automated, -500 if not
                const capacityImpact: 0 | -500 = hasAutomationCapability ? 0 : -500;

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

            // Calculate KPI changes (don't save yet)
            const finalKpis = await this.calculateTeamKpiChanges({
                team,
                currentRound: consequenceSlide.round_number as 1 | 2 | 3,
                effects: effectsToApply,
                sessionId: currentDbSession.id
            });

            // Collect for bulk update
            kpiUpdates.push({teamId: team.id, kpis: finalKpis});

            // ========================================================================
            // SPECIAL HANDLING: CH5 Option B Employee Development bonus (immediate effects)
            // ========================================================================
            if (challengeId === 'ch5' && (teamSelection === 'B' || teamSelection === 'B,C')) {
                // Check Employee Development investment for conditional capacity bonus
                const hasEmployeeDevelopment = await EmployeeDevelopmentTracker.hasEmployeeDevelopment(
                    currentDbSession.id,
                    team.id
                );

                if (hasEmployeeDevelopment) {
                    // Apply +500 capacity bonus for Employee Development
                    effectsToApply = effectsToApply.map(effect => {
                        if (effect.kpi === 'capacity' && effect.timing === 'immediate') {
                            return {
                                ...effect,
                                change_value: effect.change_value + 500, // Add 500 to base 1000 = 1500 total
                                description: effect.description
                                    ? `${effect.description} (+500 bonus from Employee Development)`
                                    : 'Temporary Hiring Capacity (+500 bonus from Employee Development)'
                            };
                        }
                        return effect;
                    });

                    console.log(`[UnifiedEffectsProcessor] Applied Employee Development bonus to CH5 Option B for team ${team.name}: +500 capacity`);
                }
            }

            // ========================================================================
            // MINIMAL CHANGE: Handle permanent effects with Employee Development check
            // ========================================================================
            const permanentEffects: KpiEffect[] = consequenceForTeamSelection.effects.filter(eff =>
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
                    const dynamicPermanentEffects: KpiEffect[] = permanentEffects.map(effect => {
                        if (effect.kpi === 'capacity' && effect.description?.includes('Permanent Hiring Capacity Impact')) {
                            // Apply conditional bonus: 1000 base + 500 if Employee Development
                            const finalCapacityValue: number = EmployeeDevelopmentTracker.getConditionalCapacityBonus(hasEmployeeDevelopment);

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

        // Apply bulk updates and finalize
        await this.finalizeUpdates({
            slide: consequenceSlide,
            sessionId: currentDbSession.id
        }, kpiUpdates);
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
        const investmentPhase: string | null = getInvestmentPhaseBySlideId(payoffSlide.id);
        if (!investmentPhase) {
            console.warn(`[UnifiedEffectsProcessor] ❌ Could not determine investment phase for payoff slide ${payoffSlide.id}`);
            return;
        }

        // Get payoff data for this phase
        const roundNumber: 1 | 2 | 3 | null = getRoundForInvestmentPhase(investmentPhase);
        const payoffKey = `rd${roundNumber}-payoff`;
        const allPayoffsForPhase: InvestmentPayoff[] = allInvestmentPayoffsData[payoffKey] || [];
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

                // Get all team decisions to check investment combinations
                const allDecisions: TeamDecision[] = await db.decisions.getBySession(currentDbSession.id);
                const teamDecisions: TeamDecision[] = allDecisions.filter(d => d.team_id === team.id);

                const bonusEffects: KpiEffect[] = [];

                // RD-2 BONUSES (slides 137-138)
                if (payoffSlide.id === 137) {
                    // Production Efficiency Bonus - requires Production Efficiency (B) + manufacturing investments
                    const hasProductionEfficiency: boolean = teamDecisions.some(decision =>
                        decision.phase_id === 'rd2-invest' &&
                        decision.selected_investment_options?.includes('B')
                    );

                    if (hasProductionEfficiency) {
                        // Check for Expanded 2nd Shift (C)
                        const hasExpandedShift: boolean = teamDecisions.some(decision =>
                            decision.phase_id === 'rd2-invest' &&
                            decision.selected_investment_options?.includes('C')
                        )

                        // Check for Automation (K)
                        const hasAutomation: boolean = teamDecisions.some(decision =>
                            decision.phase_id === 'rd2-invest' &&
                            decision.selected_investment_options?.includes('K')
                        );

                        if (hasExpandedShift) {
                            bonusEffects.push(
                                {
                                    kpi: 'capacity',
                                    change_value: 1000,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Expanded 2nd Shift Bonus'
                                },
                                {
                                    kpi: 'cost',
                                    change_value: -300000,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Expanded 2nd Shift Bonus'
                                }
                            );
                        }

                        if (hasAutomation) {
                            bonusEffects.push(
                                {
                                    kpi: 'capacity',
                                    change_value: 1000,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Automation Bonus'
                                },
                                {
                                    kpi: 'cost',
                                    change_value: -150000,
                                    timing: 'immediate',
                                    description: 'Production Efficiency + Automation Bonus'
                                }
                            );
                        }
                    }

                } else if (payoffSlide.id === 138) {
                    // Supply Chain + Distribution Bonus - requires both Supply Chain (D) AND Distribution Channels (G)
                    const hasSupplyChain: boolean = teamDecisions.some(decision =>
                        decision.phase_id === 'rd2-invest' &&
                        decision.selected_investment_options?.includes('D')
                    );

                    const hasDistributionChannels: boolean = teamDecisions.some(decision =>
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
                    const hasProductionEfficiency: boolean = !this.isInvestmentSacrificed(teamDecisions, 'B') &&
                        teamDecisions.some(decision =>
                            decision.phase_id === 'rd3-invest' &&
                            decision.selected_investment_options?.includes('B')
                        );

                    if (hasProductionEfficiency) {
                        // Check for Expanded 2nd Shift (C)
                        const hasExpandedShift: boolean = !this.isInvestmentSacrificed(teamDecisions, 'C') &&
                            teamDecisions.some(decision =>
                                decision.phase_id === 'rd3-invest' &&
                                decision.selected_investment_options?.includes('C')
                            );

                        // Check for Automation (K)
                        const hasAutomation: boolean = !this.isInvestmentSacrificed(teamDecisions, 'K') &&
                            teamDecisions.some(decision =>
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
                    const hasSupplyChain: boolean = !this.isInvestmentSacrificed(teamDecisions, 'D') &&
                        teamDecisions.some(decision =>
                            decision.phase_id === 'rd3-invest' &&
                            decision.selected_investment_options?.includes('D')
                        );

                    const hasDistributionChannels: boolean = !this.isInvestmentSacrificed(teamDecisions, 'G') &&
                        teamDecisions.some(decision =>
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
                    const currentKpis: TeamRoundData = await KpiDataUtils.ensureTeamRoundData(
                        currentDbSession.id,
                        team.id,
                        currentRound,
                        teamRoundData,
                        setTeamRoundDataDirectly
                    );

                    const updatedKpis: TeamRoundData = ScoringEngine.applyKpiEffects(currentKpis, bonusEffects);
                    const finalKpis: FinancialMetrics = ScoringEngine.calculateFinancialMetrics(updatedKpis);

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
            const regularDecision: TeamDecision = teamDecisions[team.id]?.[investmentPhase];
            const immediateDecision: TeamDecision = teamDecisions[team.id]?.[`${investmentPhase}_immediate`];

            // Determine which option this payoff slide is for using position-based detection
            const slideOption = this.getPayoffSlideOption(payoffSlide.id, investmentPhase);
            if (!slideOption) {
                console.warn(`[UnifiedEffectsProcessor] ❌ Could not determine option for payoff slide ${payoffSlide.id}`);
                return;
            }

            // UPDATED: For strategy investment (option 'A'), check if they bought it in ANY round
            if (slideOption === 'A') {
                // Strategy investment - check if bought in ANY round
                const hasStrategyInvestment = await db.decisions.hasStrategyInvestment(
                    currentDbSession.id,
                    team.id
                );

                if (!hasStrategyInvestment) {
                    continue; // Team doesn't have strategy investment in any round
                }
            } else {
                // Regular investments - check if bought in this specific phase
                // Combine regular and immediate purchase options
                const regularOptions: string[] = regularDecision?.selected_investment_options || [];
                const immediateOptions: string[] = immediateDecision?.selected_investment_options || [];
                const selectedOptions: string[] = [...regularOptions, ...immediateOptions];

                // Skip if team made no investment decisions at all
                if (!regularDecision && !immediateDecision) {
                    continue;
                }

                if (!selectedOptions.includes(slideOption)) {
                    continue;
                }

                // Check if this investment was sacrificed during double down
                if (investmentPhase === 'rd3-invest') {
                    const doubleDownDecision = teamDecisions[team.id]?.['ch-dd-prompt'];
                    if (doubleDownDecision?.double_down_sacrifice_id === slideOption) {
                        continue;
                    }
                }
            }

            // Find payoff effects for this option
            const payoffForOption: InvestmentPayoff | undefined = allPayoffsForPhase.find(payoff => payoff.id === slideOption);
            if (!payoffForOption?.effects) {
                console.warn(`[UnifiedEffectsProcessor] ⚠️ No effects found for option ${slideOption} in ${payoffKey}`);
                continue;
            }

            // Apply effects to team round data
            const currentRound = payoffSlide.round_number as 1 | 2 | 3;
            const currentKpis: TeamRoundData = await KpiDataUtils.ensureTeamRoundData(
                currentDbSession.id,
                team.id,
                currentRound,
                teamRoundData,
                setTeamRoundDataDirectly
            );

            const updatedKpis: TeamRoundData = ScoringEngine.applyKpiEffects(currentKpis, payoffForOption.effects);
            const finalKpis: FinancialMetrics = ScoringEngine.calculateFinancialMetrics(updatedKpis);

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
