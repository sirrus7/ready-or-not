// src/core/game/ConsequenceProcessor.ts
// CRITICAL FIX: Real-time KPI updates for team apps

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

    constructor(props: ConsequenceProcessorProps) {
        this.props = props;
        console.log('[ConsequenceProcessor] ✅ Initialized for session:', this.props.currentDbSession?.id);
    }

    /**
     * CRITICAL: Ensures team KPI data exists in database for the current round
     * This is essential for real-time synchronization to work properly
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

        // CRITICAL: Insert into database - this will trigger real-time updates to team apps
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
     * CRITICAL: Store permanent KPI adjustments with explicit challenge tracking
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
            console.log(`[ConsequenceProcessor] ℹ️  No permanent effects to store for ${challengeId}-${optionId}`);
            return;
        }

        // Create adjustment records
        const adjustmentsToUpsert = KpiCalculations.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            challengeId,
            optionId
        );

        if (adjustmentsToUpsert.length > 0) {
            // CRITICAL: Store in database - this triggers real-time updates
            await db.adjustments.upsert(adjustmentsToUpsert);
            console.log(`[ConsequenceProcessor] ✅ Stored ${adjustmentsToUpsert.length} permanent adjustments for team ${teamId}, challenge ${challengeId}, option ${optionId}`);
        }
    }

    /**
     * CRITICAL: Determines which option (A, B, C, D) a consequence slide is for
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
            console.warn(`[ConsequenceProcessor] ⚠️  No challenge ID found for slide ${consequenceSlide.id}, defaulting to A`);
            return 'A';
        }

        // Get the challenge metadata to determine slide order
        const challenge = getChallengeBySlideId(consequenceSlide.id);
        if (!challenge) {
            console.warn(`[ConsequenceProcessor] ⚠️  No challenge metadata found for slide ${consequenceSlide.id}, defaulting to A`);
            return 'A';
        }

        // Find the position of this slide in the consequence slides array
        const slideIndex = challenge.consequence_slides.indexOf(consequenceSlide.id);
        if (slideIndex === -1) {
            console.warn(`[ConsequenceProcessor] ⚠️  Slide ${consequenceSlide.id} not found in consequence slides for challenge ${challengeId}, defaulting to A`);
            return 'A';
        }

        // Map slide index to option (0=A, 1=B, 2=C, 3=D)
        const options = ['A', 'B', 'C', 'D'];
        const option = options[slideIndex];

        if (!option) {
            console.warn(`[ConsequenceProcessor] ⚠️  Invalid slide index ${slideIndex} for slide ${consequenceSlide.id}, defaulting to A`);
            return 'A';
        }

        console.log(`[ConsequenceProcessor] ✅ Mapped slide ${consequenceSlide.id} to option ${option} (index ${slideIndex} in ${challengeId})`);
        return option;
    }

    /**
     * CRITICAL FIX: Main consequence processing method
     *
     * ARCHITECTURE:
     * 1. Host processes consequences → Database update → Real-time sync → Team apps update
     * 2. Only applies consequences to teams that chose the matching option
     * 3. Updates KPIs immediately and stores permanent adjustments
     * 4. Database updates trigger Supabase real-time subscriptions in team apps
     */
    async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        console.log('\n🎯 [ConsequenceProcessor] ==================== PROCESSING CONSEQUENCE SLIDE ====================');
        console.log(`[ConsequenceProcessor] Slide ID: ${consequenceSlide.id}, Title: "${consequenceSlide.title}", Type: ${consequenceSlide.type}`);

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

        try {
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

            // CRITICAL: Determine which option this slide is for
            const slideOption = this.getSlideOption(consequenceSlide);
            console.log(`[ConsequenceProcessor] ✅ This slide is for option: ${slideOption}`);

            // Debug: Log all team decisions for this challenge
            console.log('\n📋 [ConsequenceProcessor] Current team decisions:');
            teams.forEach(team => {
                const decision = teamDecisions[team.id]?.[challengeId];
                console.log(`  Team ${team.name} (${team.id}): ${decision?.selected_challenge_option_id || 'NO DECISION'}`);
            });

            const updatedTeamData: Array<{ teamId: string; kpis: TeamRoundData }> = [];

            // Process each team based on their decision
            for (const team of teams) {
                console.log(`\n🏢 [ConsequenceProcessor] ======== PROCESSING TEAM: ${team.name} (${team.id}) ========`);

                // Ensure team has KPI data for current round
                const teamKpis = await this.ensureTeamRoundData(team.id, consequenceSlide.round_number as 1 | 2 | 3);
                console.log(`[ConsequenceProcessor] 📊 Current KPIs for ${team.name}:`, {
                    capacity: teamKpis.current_capacity,
                    orders: teamKpis.current_orders,
                    cost: teamKpis.current_cost,
                    asp: teamKpis.current_asp
                });

                // Get team's decision for this challenge
                const decision = teamDecisions[team.id]?.[challengeId];
                const options = gameStructure.all_challenge_options[challengeId] || [];
                const selectedOptionId = decision?.selected_challenge_option_id || options.find(opt => opt.is_default_choice)?.id;

                console.log(`[ConsequenceProcessor] 🎯 Team ${team.name} selected option: ${selectedOptionId}`);

                // CRITICAL: Only process teams that chose this specific option
                if (selectedOptionId !== slideOption) {
                    console.log(`[ConsequenceProcessor] ⏭️  Team ${team.name} chose ${selectedOptionId}, but slide ${consequenceSlide.id} is for option ${slideOption}. Skipping.`);
                    continue;
                }

                // Find the consequence for this option
                const consequence = allConsequencesForChoice.find(c => c.challenge_option_id === slideOption);
                if (!consequence) {
                    console.warn(`[ConsequenceProcessor] ❌ No consequence found for option ${slideOption} in ${challengeId}`);
                    continue;
                }

                console.log(`[ConsequenceProcessor] ✅ Applying consequence for ${team.name}: ${consequence.id}`);
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

                    // CRITICAL: Update in database - this triggers real-time sync to team apps
                    const finalKpis = await db.kpis.update(teamKpis.id!, recalculatedKpis);
                    console.log(`[ConsequenceProcessor] ✅ Updated KPIs in database for team ${team.name}`);

                    updatedTeamData.push({teamId: team.id, kpis: finalKpis as TeamRoundData});
                }

                // CRITICAL: Store permanent adjustments for future rounds
                await this.storePermanentAdjustments(
                    team.id,
                    currentDbSession.id,
                    consequence.effects,
                    challengeId,
                    slideOption
                );

                console.log(`[ConsequenceProcessor] ✅ Completed processing for team ${team.name}`);
            }

            // CRITICAL: Real-time broadcasting happens automatically via database updates
            console.log('\n📡 [ConsequenceProcessor] ==================== REAL-TIME BROADCASTING ====================');
            console.log(`[ConsequenceProcessor] ✅ Database updates completed for ${updatedTeamData.length} teams`);
            console.log(`[ConsequenceProcessor] 📱 Team apps should receive updates via Supabase real-time subscriptions`);

            updatedTeamData.forEach(team => {
                console.log(`[ConsequenceProcessor] 📊 Team ${team.teamId} final KPIs:`, {
                    capacity: team.kpis.current_capacity,
                    orders: team.kpis.current_orders,
                    cost: team.kpis.current_cost,
                    asp: team.kpis.current_asp,
                    revenue: team.kpis.revenue,
                    net_income: team.kpis.net_income,
                    net_margin: team.kpis.net_margin
                });
            });

            console.log(`[ConsequenceProcessor] ✅ Consequence processing completed successfully`);

        } catch (error) {
            console.error('[ConsequenceProcessor] ❌ Error during consequence processing:', error);
            throw error;
        }
    }
}
