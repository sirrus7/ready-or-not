// src/core/game/ConsequenceProcessor.ts
// FINAL VERSION: Database-backed consequence application tracking

import {Slide, GameStructure, GameSession, Team, TeamRoundData, KpiEffect, TeamDecision} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {SLIDE_TO_CHALLENGE_MAP, getChallengeBySlideId} from '@core/content/ChallengeRegistry';

interface ConsequenceProcessorProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

export class ConsequenceProcessor {
    private props: ConsequenceProcessorProps;

    // Instance-based processing tracking
    private processedSlides = new Set<string>();
    private isProcessing = false;

    constructor(props: ConsequenceProcessorProps) {
        this.props = props;
        console.log('[ConsequenceProcessor] ✅ Initialized for session:', this.props.currentDbSession?.id);
    }

    /**
     * Dynamic props update to prevent instance recreation
     */
    updateProps(newProps: ConsequenceProcessorProps): void {
        // Only log if session changes (significant change)
        if (newProps.currentDbSession?.id !== this.props.currentDbSession?.id) {
            console.log('[ConsequenceProcessor] 🔄 Session changed, updating props:', newProps.currentDbSession?.id);
            // Reset processed slides when session changes
            this.processedSlides.clear();
            this.isProcessing = false;
        }

        this.props = newProps;
    }

    /**
     * FINAL VERSION: Main consequence processing method with database-backed duplicate prevention
     */
    async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        const slideKey = `${this.props.currentDbSession?.id}-${consequenceSlide.id}`;

        // Prevent concurrent processing and reprocessing
        if (this.isProcessing) {
            console.log(`[ConsequenceProcessor] ⏸️ Already processing, skipping slide ${consequenceSlide.id}`);
            return;
        }

        if (this.processedSlides.has(slideKey)) {
            console.log(`[ConsequenceProcessor] ✅ Slide ${consequenceSlide.id} already processed, skipping`);
            return;
        }

        this.isProcessing = true;
        console.log('\n🎯 [ConsequenceProcessor] ==================== PROCESSING CONSEQUENCE SLIDE ====================');
        console.log(`[ConsequenceProcessor] Slide ID: ${consequenceSlide.id}, Title: "${consequenceSlide.title}", Type: ${consequenceSlide.type}`);

        try {
            // Validate slide type
            if (consequenceSlide.type !== 'consequence_reveal') {
                console.warn(`[ConsequenceProcessor] ❌ Slide ${consequenceSlide.id} is not a consequence slide (type: ${consequenceSlide.type})`);
                return;
            }

            const {currentDbSession, gameStructure, teams, teamDecisions} = this.props;

            // Validate required data
            if (!currentDbSession?.id || !gameStructure || !teams.length) {
                console.warn('[ConsequenceProcessor] ❌ Skipping consequence processing - insufficient data');
                return;
            }

            console.log(`[ConsequenceProcessor] ✅ Processing for ${teams.length} teams in session ${currentDbSession.id}`);

            // Map consequence slide to challenge using registry
            const challengeId = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);
            if (!challengeId) {
                console.warn(`[ConsequenceProcessor] ❌ No challenge mapping found for slide ${consequenceSlide.id}`);
                return;
            }

            console.log(`[ConsequenceProcessor] ✅ Mapped slide ${consequenceSlide.id} to challenge ${challengeId}`);

            // Get consequences for this challenge
            const consequenceKey = `${challengeId}-conseq`;
            const allConsequencesForChoice = gameStructure.all_consequences[consequenceKey];

            if (!allConsequencesForChoice || allConsequencesForChoice.length === 0) {
                console.warn(`[ConsequenceProcessor] ❌ No consequences found for key: ${consequenceKey}`);
                return;
            }

            console.log(`[ConsequenceProcessor] ✅ Found ${allConsequencesForChoice.length} consequences for ${consequenceKey}`);

            // Determine which option this slide is for
            const slideOption = this.getSlideOption(consequenceSlide);
            console.log(`[ConsequenceProcessor] ✅ This slide is for option: ${slideOption}`);

            // Debug: Log all team decisions for this challenge
            console.log('\n📋 [ConsequenceProcessor] Current team decisions:');
            teams.forEach(team => {
                const decision = teamDecisions[team.id]?.[challengeId];
                console.log(`  - ${team.name}: ${decision ? decision.selected_challenge_option_id : 'No decision found'}`);
            });

            const updatedTeamData: { teamId: string, kpis: TeamRoundData }[] = [];

            // Process each team
            for (const team of teams) {
                const teamDecision = teamDecisions[team.id]?.[challengeId];
                if (!teamDecision) {
                    console.log(`[ConsequenceProcessor] ⚠️ No decision found for team ${team.name} for challenge ${challengeId}. Skipping.`);
                    continue;
                }

                if (teamDecision.selected_challenge_option_id !== slideOption) {
                    console.log(`[ConsequenceProcessor] ℹ️ Team ${team.name} chose ${teamDecision.selected_challenge_option_id}, but this slide is for ${slideOption}. Skipping.`);
                    continue;
                }

                // 🏛️ CRITICAL: Database-backed duplicate prevention
                const alreadyApplied = await db.consequenceApplications.hasBeenApplied(
                    currentDbSession.id,
                    team.id,
                    challengeId,
                    slideOption
                );

                if (alreadyApplied) {
                    console.log(`[ConsequenceProcessor] 🔒 Consequence already applied to team ${team.name} for challenge ${challengeId}, option ${slideOption} (database check). Skipping.`);
                    continue;
                }

                // Ensure KPI data exists for this team and round
                const kpiRoundNumber = consequenceSlide.round_number === 0 ? 1 : consequenceSlide.round_number as (1 | 2 | 3);
                const teamKpis = await this.ensureTeamRoundData(team.id, kpiRoundNumber);

                // Find the consequence for this option
                const consequence = allConsequencesForChoice.find(c => c.challenge_option_id === slideOption);
                if (!consequence) {
                    console.warn(`[ConsequenceProcessor] ❌ No consequence found for option ${slideOption} in ${challengeId}`);
                    continue;
                }

                console.log(`[ConsequenceProcessor] ✅ Applying NEW consequence for ${team.name}: ${consequence.id}`);
                console.log(`[ConsequenceProcessor] 📝 Effects to apply:`, consequence.effects);

                // Apply immediate effects to KPIs
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
                        console.log(`[ConsequenceProcessor] 📈 ${effect.kpi}: ${oldValue} → ${newValue} (${effect.change_value > 0 ? '+' : ''}${effect.change_value})`);
                        hasImmediateChanges = true;
                    }
                });

                // Recalculate derived metrics if there were immediate changes
                if (hasImmediateChanges) {
                    const financialMetrics = KpiCalculations.calculateFinancialMetrics(updatedKpis);
                    const recalculatedKpis = {
                        ...updatedKpis,
                        ...financialMetrics
                    };

                    // Update in database - this triggers real-time sync to team apps
                    const finalKpis = await db.kpis.update(teamKpis.id!, recalculatedKpis);
                    console.log(`[ConsequenceProcessor] ✅ Updated KPIs in database for team ${team.name}`);

                    updatedTeamData.push({teamId: team.id, kpis: finalKpis as TeamRoundData});
                }

                // Store permanent adjustments for future rounds
                await this.storePermanentAdjustments(
                    team.id,
                    currentDbSession.id,
                    consequence.effects,
                    challengeId,
                    slideOption
                );

                // 🏛️ CRITICAL: Record consequence application in database
                await db.consequenceApplications.recordApplication({
                    session_id: currentDbSession.id,
                    team_id: team.id,
                    challenge_id: challengeId,
                    option_id: slideOption,
                    slide_id: consequenceSlide.id
                });

                console.log(`[ConsequenceProcessor] ✅ Completed processing for team ${team.name} (recorded in database)`);
            }

            // Mark slide as processed ONLY after successful completion
            this.processedSlides.add(slideKey);

            console.log('\n📡 [ConsequenceProcessor] ==================== PROCESSING COMPLETED ====================');
            console.log(`[ConsequenceProcessor] ✅ Successfully processed slide ${consequenceSlide.id} for ${updatedTeamData.length} teams`);
            console.log(`[ConsequenceProcessor] 🏛️ All consequence applications recorded in database for permanent tracking`);
            console.log(`[ConsequenceProcessor] 📱 Team apps will receive updates via Supabase real-time subscriptions`);

        } catch (error) {
            console.error('[ConsequenceProcessor] ❌ Error during consequence processing:', error);
            throw error;
        } finally {
            // Always reset processing flag
            this.isProcessing = false;
        }
    }

    /**
     * Reset processed slides when needed (e.g., new session)
     */
    public resetProcessedSlides(): void {
        this.processedSlides.clear();
        this.isProcessing = false;
        console.log('[ConsequenceProcessor] 🔄 Reset processed slides cache (database tracking remains intact)');
    }

    /**
     * Ensures team KPI data exists in database for the current round
     */
    private async ensureTeamRoundData(teamId: string, roundNumber: 1 | 2 | 3): Promise<TeamRoundData> {
        const {currentDbSession, teamRoundData, setTeamRoundDataDirectly} = this.props;

        if (!currentDbSession?.id || currentDbSession.id === 'new') {
            throw new Error("Invalid sessionId for KPI data.");
        }

        // Check if we already have KPI data in memory
        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis?.id) {
            console.log(`[ConsequenceProcessor] ✅ Using existing KPI data for team ${teamId} round ${roundNumber}`);
            return existingKpis;
        }

        // Try to fetch from database first
        try {
            const dbKpis = await db.kpis.getForTeamRound(currentDbSession.id, teamId, roundNumber);
            if (dbKpis) {
                console.log(`[ConsequenceProcessor] ✅ Found existing KPI data in database for team ${teamId} round ${roundNumber}`);

                // Update local state
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: dbKpis as TeamRoundData}
                }));

                return dbKpis as TeamRoundData;
            }
        } catch (error) {
            console.warn(`[ConsequenceProcessor] ⚠️ Error fetching existing KPIs for team ${teamId} round ${roundNumber}:`, error);
        }

        // Create new KPI data if none exists
        console.log(`[ConsequenceProcessor] 🆕 Creating new KPI data for team ${teamId} round ${roundNumber}`);

        const sessionId = currentDbSession.id;

        // Get all permanent adjustments for this team and round
        const adjustments = await db.adjustments.getByTeam(sessionId, teamId);

        // Create new round data with adjustments applied
        const newRoundData = KpiCalculations.createNewRoundData(sessionId, teamId, roundNumber, teamRoundData[teamId]);

        // Apply permanent adjustments
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);

        // Insert into database - this will trigger real-time updates to team apps
        const insertedData = await db.kpis.create(adjustedData);

        // Update local state
        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        console.log(`[ConsequenceProcessor] ✅ Created new KPI data for team ${teamId} round ${roundNumber}`);
        return insertedData as TeamRoundData;
    }

    /**
     * Store permanent KPI adjustments with enhanced logging
     */
    private async storePermanentAdjustments(
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        challengeId: string,
        optionId: string
    ): Promise<void> {
        // Filter for permanent effects only
        const permanentEffects = effects.filter(effect =>
            effect.timing === 'permanent_next_round_start' &&
            effect.applies_to_rounds &&
            effect.applies_to_rounds.length > 0
        );

        if (permanentEffects.length === 0) {
            console.log(`[ConsequenceProcessor] ℹ️ No permanent effects to store for ${challengeId}-${optionId}`);
            return;
        }

        console.log(`[ConsequenceProcessor] 🎯 Creating permanent adjustments for team ${teamId}:`, permanentEffects);

        // Create adjustment records
        const adjustmentsToUpsert = KpiCalculations.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            challengeId,
            optionId
        );

        if (adjustmentsToUpsert.length > 0) {
            console.log(`[ConsequenceProcessor] 💾 Storing ${adjustmentsToUpsert.length} permanent adjustments:`, adjustmentsToUpsert);

            // Store in database - this triggers real-time updates
            const storedAdjustments = await db.adjustments.upsert(adjustmentsToUpsert);

            console.log(`[ConsequenceProcessor] ✅ Successfully stored permanent adjustments for team ${teamId}, challenge ${challengeId}, option ${optionId}`);
            console.log(`[ConsequenceProcessor] 📊 Stored adjustments:`, storedAdjustments);
        }
    }

    /**
     * Determines which option (A, B, C, D) a consequence slide is for
     */
    private getSlideOption(consequenceSlide: Slide): string {
        const title = consequenceSlide.title?.toLowerCase() || '';
        const mainText = consequenceSlide.main_text?.toLowerCase() || '';

        // Check slide title and content for explicit option indicators
        if (title.includes('option a') || mainText.includes('option a')) return 'A';
        if (title.includes('option b') || mainText.includes('option b')) return 'B';
        if (title.includes('option c') || mainText.includes('option c')) return 'C';
        if (title.includes('option d') || mainText.includes('option d')) return 'D';

        // Fallback: Use challenge registry to map slide to option by position
        const challengeId = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);
        if (!challengeId) {
            console.warn(`[ConsequenceProcessor] ⚠️ No challenge ID found for slide ${consequenceSlide.id}, defaulting to A`);
            return 'A';
        }

        // Get the challenge metadata to determine slide order
        const challenge = getChallengeBySlideId(consequenceSlide.id);
        if (!challenge) {
            console.warn(`[ConsequenceProcessor] ⚠️ No challenge metadata found for slide ${consequenceSlide.id}, defaulting to A`);
            return 'A';
        }

        // Find the position of this slide in the consequence slides array
        const slideIndex = challenge.consequence_slides.indexOf(consequenceSlide.id);
        if (slideIndex === -1) {
            console.warn(`[ConsequenceProcessor] ⚠️ Slide ${consequenceSlide.id} not found in consequence slides for challenge ${challengeId}, defaulting to A`);
            return 'A';
        }

        // Map slide index to option (0=A, 1=B, 2=C, 3=D)
        const options = ['A', 'B', 'C', 'D'];
        const option = options[slideIndex];

        if (!option) {
            console.warn(`[ConsequenceProcessor] ⚠️ Invalid slide index ${slideIndex} for slide ${consequenceSlide.id}, defaulting to A`);
            return 'A';
        }

        console.log(`[ConsequenceProcessor] ✅ Mapped slide ${consequenceSlide.id} to option ${option} (index ${slideIndex} in ${challengeId})`);
        return option;
    }
}
