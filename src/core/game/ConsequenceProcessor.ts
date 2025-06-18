// src/core/game/ConsequenceProcessor.ts
import {Slide, GameStructure, GameSession, Team, TeamRoundData, KpiEffect, TeamDecision} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {SLIDE_TO_CHALLENGE_MAP} from '@core/content/ChallengeRegistry';
import {getChallengeBySlideId} from '@core/content/ChallengeRegistry';

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

    // ========================================================================
    // CRITICAL FIX #1: REAL-TIME KPI BROADCASTING REQUIREMENTS
    // ========================================================================
    /**
     * REQUIREMENT: Team apps must receive KPI updates in real-time when consequences are processed
     * SOLUTION: Update KPIs in database which triggers Supabase real-time subscriptions in team apps
     * ARCHITECTURE: Host processes consequences → Database update → Real-time sync → Team apps update
     *
     * REMOVED: BroadcastChannel (only works on same device)
     * USING: Database updates + Supabase real-time subscriptions (works cross-device)
     */

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
        if (existingKpis) {
            console.log(`[ConsequenceProcessor] ✅ Using existing KPIs for team ${teamId}, round ${roundNumber}`);
            return existingKpis;
        }

        console.log(`[ConsequenceProcessor] 🔄 Creating/fetching KPI record for team ${teamId}, round ${roundNumber}`);

        try {
            // Try to get existing data from database first
            const existingData = await db.kpis.getForTeamRound(currentDbSession.id, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                console.log(`[ConsequenceProcessor] ✅ Retrieved existing KPI data from database for team ${teamId} round ${roundNumber}`);
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.log(`[ConsequenceProcessor] ℹ️  No existing round data found for team ${teamId} round ${roundNumber}, creating new`);
        }

        // Create new KPI data with base values or carried-forward from previous round
        const newRoundData = await KpiCalculations.createNewRoundData(currentDbSession.id, teamId, roundNumber, teamRoundData[teamId]);

        // Apply any permanent adjustments that should affect this round
        const adjustments = await db.adjustments.getByTeam(currentDbSession.id, teamId);
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
     * CRITICAL: Store permanent KPI adjustments with explicit challenge tracking
     * This ensures future rounds apply the correct permanent effects
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

        // Create adjustment records using the optimized method
        const adjustmentsToUpsert = KpiCalculations.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            challengeId,
            optionId
        );

        if (adjustmentsToUpsert.length > 0) {
            await db.adjustments.upsert(adjustmentsToUpsert);
            console.log(`[ConsequenceProcessor] ✅ Stored ${adjustmentsToUpsert.length} permanent adjustments for team ${teamId}, challenge ${challengeId}, option ${optionId}`);
        }
    }

    /**
     * CRITICAL FIX: Determines which option (A, B, C, D) a consequence slide is for
     * Uses comprehensive fallback mappings for all challenges
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
     * CRITICAL FIX: Real-time KPI broadcasting via Supabase database updates
     *
     * REQUIREMENTS:
     * 1. Team apps run on different devices than host
     * 2. BroadcastChannel only works on same device (NOT cross-device)
     * 3. Team apps use Supabase real-time subscriptions to get KPI updates
     * 4. When we update KPIs in database, team apps automatically receive updates
     *
     * SOLUTION: Database updates trigger real-time subscriptions in team apps
     * NOTE: Team apps MUST have useRealtimeSubscription for 'team_round_data' table
     */
    private async broadcastKpiUpdatesToTeamApps(updatedTeamData: Array<{
        teamId: string,
        kpis: TeamRoundData
    }>): Promise<void> {
        console.log('\n📡 [ConsequenceProcessor] ==================== REAL-TIME KPI BROADCASTING ====================');
        console.log(`[ConsequenceProcessor] Broadcasting KPI updates to ${updatedTeamData.length} team app(s) via database...`);

        try {
            // CRITICAL: Database updates already completed in main processing loop
            // Team apps will receive these updates via their Supabase real-time subscriptions
            //
            // REQUIREMENT: Team apps MUST subscribe to:
            // - Table: 'team_round_data'
            // - Filter: `session_id=eq.${sessionId}` AND `team_id=eq.${teamId}`
            // - Events: 'UPDATE' and 'INSERT'
            //
            // This subscription should be in useTeamGameState.ts or similar

            updatedTeamData.forEach(team => {
                console.log(`[ConsequenceProcessor] 📊 Team ${team.teamId} updated KPIs:`, {
                    capacity: team.kpis.current_capacity,
                    orders: team.kpis.current_orders,
                    cost: team.kpis.current_cost,
                    asp: team.kpis.current_asp,
                    revenue: team.kpis.revenue,
                    net_income: team.kpis.net_income,
                    net_margin: team.kpis.net_margin
                });
            });

            console.log(`[ConsequenceProcessor] ✅ KPI updates stored in database - real-time sync active`);
            console.log(`[ConsequenceProcessor] 📱 ${updatedTeamData.length} team app(s) should receive updates via Supabase real-time`);
            console.log(`[ConsequenceProcessor] 🔔 Team apps MUST have real-time subscription to 'team_round_data' table for this to work!`);

        } catch (error) {
            console.error('[ConsequenceProcessor] ❌ Error during KPI update broadcasting:', error);
            throw error;
        }
    }

    // ========================================================================
    // CRITICAL FIX #2: CH1 OPTION D INCORRECT EFFECTS
    // ========================================================================
    /**
     * REQUIREMENT: CH1 Option D should ONLY apply -500 capacity and +75k cost
     * PROBLEM: Current data includes incorrect -200 orders effect
     * SOLUTION: The consequence data needs to be corrected (see ConsequenceContent.ts fix)
     */

    /**
     * PRODUCTION: Main consequence processing method with all critical fixes
     *
     * FIXES INCLUDED:
     * 1. Real-time broadcasting via database updates (not BroadcastChannel)
     * 2. Only applies consequences to teams that chose the matching option
     * 3. Explicit challenge tracking for permanent adjustments
     * 4. Comprehensive error handling and logging
     */
    async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        console.log('\n🎯 [ConsequenceProcessor] ==================== PROCESSING CONSEQUENCE SLIDE ====================');
        console.log(`[ConsequenceProcessor] Slide ID: ${consequenceSlide.id}, Title: "${consequenceSlide.title}", Type: ${consequenceSlide.type}`);

        // Validate slide type
        if (consequenceSlide.type !== 'consequence_reveal') {
            console.warn(`[ConsequenceProcessor] ❌ Slide ${consequenceSlide.id} is not a consequence slide (type: ${consequenceSlide.type})`);
            return;
        }

        const {currentDbSession, gameStructure, teams, teamDecisions, fetchTeamRoundDataFromHook} = this.props;

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

            const updatedTeamData: { teamId: string; kpis: TeamRoundData }[] = [];

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

                // CRITICAL FIX: Only process teams that chose this specific option
                if (selectedOptionId !== slideOption) {
                    console.log(`[ConsequenceProcessor] ⏭️  Team ${team.name} chose ${selectedOptionId}, but slide ${consequenceSlide.id} is for option ${slideOption}. Skipping this team.`);
                    continue; // Skip this team entirely
                }

                console.log(`[ConsequenceProcessor] ✅ Team ${team.name} chose ${selectedOptionId}, processing ${slideOption} consequences`);

                if (selectedOptionId) {
                    // Find the consequence for this team's choice
                    const consequence = allConsequencesForChoice.find(c => c.challenge_option_id === selectedOptionId);

                    if (consequence && consequence.effects.length > 0) {
                        console.log(`[ConsequenceProcessor] ✅ Found consequence for ${team.name} option ${selectedOptionId}:`, consequence.effects);

                        // Check if consequences already applied (idempotent processing)
                        const existingAdjustments = await db.adjustments.getByChallengeAndTeam(
                            currentDbSession.id,
                            team.id,
                            challengeId
                        );
                        const alreadyApplied = existingAdjustments.some(adj => adj.option_id === selectedOptionId);

                        if (alreadyApplied) {
                            console.log(`[ConsequenceProcessor] ⚠️  Team ${team.name}: Consequences for '${challengeId}-${selectedOptionId}' already applied, skipping.`);
                            continue;
                        }

                        // Apply immediate KPI effects
                        console.log(`[ConsequenceProcessor] 🎲 Applying consequences for team ${team.name} choice '${challengeId}-${selectedOptionId}'`);
                        const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, consequence.effects);

                        console.log(`[ConsequenceProcessor] 📈 KPI changes for ${team.name}:`, {
                            capacityChange: updatedKpis.current_capacity - teamKpis.current_capacity,
                            ordersChange: updatedKpis.current_orders - teamKpis.current_orders,
                            costChange: updatedKpis.current_cost - teamKpis.current_cost,
                            aspChange: updatedKpis.current_asp - teamKpis.current_asp
                        });

                        // Calculate derived financial metrics
                        const financialMetrics = KpiCalculations.calculateFinancialMetrics(updatedKpis);
                        const finalKpis = {...updatedKpis, ...financialMetrics};

                        // Store permanent adjustments for future rounds
                        await this.storePermanentAdjustments(team.id, currentDbSession.id, consequence.effects, challengeId, selectedOptionId);

                        // CRITICAL: Update KPIs in database - this triggers real-time updates to team apps
                        const savedKpis = await db.kpis.upsert({...finalKpis, id: teamKpis.id});
                        console.log(`[ConsequenceProcessor] ✅ Updated KPIs in database for ${team.name} - real-time sync triggered`);

                        // Add to broadcast list for logging
                        updatedTeamData.push({
                            teamId: team.id,
                            kpis: savedKpis as TeamRoundData
                        });

                        console.log(`[ConsequenceProcessor] 📊 Final KPIs for ${team.name}:`, {
                            capacity: finalKpis.current_capacity,
                            cost: finalKpis.current_cost,
                            orders: finalKpis.current_orders,
                            asp: finalKpis.current_asp,
                            revenue: finalKpis.revenue,
                            netIncome: finalKpis.net_income
                        });

                    } else {
                        console.warn(`[ConsequenceProcessor] ❌ Team ${team.name}: No consequence found for option ${selectedOptionId}.`);
                    }
                } else {
                    console.warn(`[ConsequenceProcessor] ❌ Team ${team.name}: No option selected for ${challengeId}.`);
                }
            }

            console.log(`\n🔄 [ConsequenceProcessor] ==================== FINALIZING UPDATES ====================`);

            // Refresh data from database to ensure consistency
            console.log('[ConsequenceProcessor] 🔄 Refreshing host data from database...');
            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log('[ConsequenceProcessor] ✅ Host data refresh complete');

            // Broadcast KPI updates to team apps (logging only - real sync happens via database)
            if (updatedTeamData.length > 0) {
                await this.broadcastKpiUpdatesToTeamApps(updatedTeamData);
            } else {
                console.log('[ConsequenceProcessor] ℹ️  No teams had KPI updates to broadcast');
            }

            console.log(`[ConsequenceProcessor] ✅ Successfully processed consequence slide ${consequenceSlide.id} for all teams\n`);

        } catch (error) {
            console.error(`[ConsequenceProcessor] ❌ Error processing consequence slide ${consequenceSlide.id}:`, error);
            throw error;
        }
    }
}
