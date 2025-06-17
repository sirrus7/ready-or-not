// src/core/game/ConsequenceProcessor.ts
// PRODUCTION VERSION: Hardened consequence processing with explicit challenge tracking
// FIXED: Only apply consequences to teams that chose the matching option

import {Slide, GameStructure, GameSession, Team, TeamRoundData, KpiEffect, TeamDecision} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {SimpleBroadcastManager, KpiUpdateData} from '@core/sync/SimpleBroadcastManager';
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
    private broadcastManager: SimpleBroadcastManager | null = null;

    constructor(props: ConsequenceProcessorProps) {
        this.props = props;
        if (this.props.currentDbSession?.id && this.props.currentDbSession.id !== 'new') {
            this.broadcastManager = SimpleBroadcastManager.getInstance(
                this.props.currentDbSession.id,
                'host'
            );
            console.log('[ConsequenceProcessor] Initialized broadcast manager for session:', this.props.currentDbSession.id);
        }
    }

    private async ensureTeamRoundData(teamId: string, roundNumber: 1 | 2 | 3): Promise<TeamRoundData> {
        const {currentDbSession, teamRoundData, setTeamRoundDataDirectly} = this.props;
        if (!currentDbSession?.id || currentDbSession.id === 'new') {
            throw new Error("Invalid sessionId for KPI data.");
        }

        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) {
            console.log(`[ConsequenceProcessor] Using existing KPI data for team ${teamId} round ${roundNumber}`);
            return existingKpis;
        }

        try {
            const existingData = await db.kpis.getForTeamRound(currentDbSession.id, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                console.log(`[ConsequenceProcessor] Retrieved existing KPI data from database for team ${teamId} round ${roundNumber}`);
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.log(`[ConsequenceProcessor] No existing round data found for team ${teamId} round ${roundNumber}, creating new.`);
        }

        const newRoundData = await KpiCalculations.createNewRoundData(currentDbSession.id, teamId, roundNumber, teamRoundData[teamId]);
        const adjustments = await db.adjustments.getByTeam(currentDbSession.id, teamId);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);
        const insertedData = await db.kpis.create(adjustedData);

        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));
        console.log(`[ConsequenceProcessor] Created new KPI data for team ${teamId} round ${roundNumber}`);
        return insertedData as TeamRoundData;
    }

    /**
     * PRODUCTION: Creates permanent adjustments with explicit challenge/option tracking
     */
    private async storePermanentAdjustments(
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        challengeId: string,
        optionId: string
    ) {
        const adjustmentsToUpsert = KpiCalculations.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            challengeId,
            optionId
        );

        if (adjustmentsToUpsert.length > 0) {
            await db.adjustments.upsert(adjustmentsToUpsert);
            console.log(`[ConsequenceProcessor] Stored ${adjustmentsToUpsert.length} permanent adjustments for team ${teamId}, challenge ${challengeId}, option ${optionId}`);
        }
    }

    /**
     * FIXED: Determines which option (A, B, C, D) a consequence slide is for
     * Now includes comprehensive fallback mappings for all challenges
     */
    private getSlideOption(consequenceSlide: Slide): string {
        const title = consequenceSlide.title?.toLowerCase() || '';
        const mainText = consequenceSlide.main_text?.toLowerCase() || '';

        // Check slide title and content for option indicators
        if (title.includes('option a') || mainText.includes('option a')) return 'A';
        if (title.includes('option b') || mainText.includes('option b')) return 'B';
        if (title.includes('option c') || mainText.includes('option c')) return 'C';
        if (title.includes('option d') || mainText.includes('option d')) return 'D';

        // FIXED: Comprehensive fallback mapping for all challenges
        // Based on the challenge registry consequence_slides arrays
        const challengeId = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);

        if (!challengeId) {
            console.warn(`[ConsequenceProcessor] No challenge ID found for slide ${consequenceSlide.id}`);
            return 'A';
        }

        // Get the challenge metadata to determine slide order
        const challenge = getChallengeBySlideId(consequenceSlide.id);
        if (!challenge) {
            console.warn(`[ConsequenceProcessor] No challenge metadata found for slide ${consequenceSlide.id}`);
            return 'A';
        }

        // Find the position of this slide in the consequence slides array
        const slideIndex = challenge.consequence_slides.indexOf(consequenceSlide.id);
        if (slideIndex === -1) {
            console.warn(`[ConsequenceProcessor] Slide ${consequenceSlide.id} not found in consequence slides for challenge ${challengeId}`);
            return 'A';
        }

        // Map slide index to option (0=A, 1=B, 2=C, 3=D)
        const options = ['A', 'B', 'C', 'D'];
        const option = options[slideIndex];

        if (!option) {
            console.warn(`[ConsequenceProcessor] Invalid slide index ${slideIndex} for slide ${consequenceSlide.id}`);
            return 'A';
        }

        console.log(`[ConsequenceProcessor] Mapped slide ${consequenceSlide.id} to option ${option} (index ${slideIndex} in ${challengeId})`);
        return option;
    }

    private async broadcastKpiUpdate(updatedTeamData: { teamId: string; kpis: TeamRoundData }[]): Promise<void> {
        if (!this.broadcastManager || updatedTeamData.length === 0) {
            console.log('[ConsequenceProcessor] Skipping broadcast - no manager or no updates');
            return;
        }

        try {
            const kpiUpdateData: KpiUpdateData = {
                type: 'kpi_update',
                timestamp: Date.now(),
                updatedTeams: updatedTeamData.map(team => ({
                    teamId: team.teamId,
                    roundNumber: team.kpis.round_number,
                    kpis: {
                        capacity: team.kpis.current_capacity,
                        orders: team.kpis.current_orders,
                        cost: team.kpis.current_cost,
                        asp: team.kpis.current_asp,
                        revenue: team.kpis.revenue,
                        net_income: team.kpis.net_income,
                        net_margin: team.kpis.net_margin
                    }
                }))
            };

            this.broadcastManager.sendKpiUpdate(kpiUpdateData);
            console.log('[ConsequenceProcessor] ✅ Broadcasted KPI updates to team interfaces for', updatedTeamData.length, 'teams');

            updatedTeamData.forEach(team => {
                console.log(`[ConsequenceProcessor] 📊 Team ${team.teamId} new KPIs:`, {
                    capacity: team.kpis.current_capacity,
                    orders: team.kpis.current_orders,
                    cost: team.kpis.current_cost,
                    asp: team.kpis.current_asp
                });
            });
        } catch (error) {
            console.warn('[ConsequenceProcessor] ❌ Failed to broadcast KPI update:', error);
        }
    }

    /**
     * PRODUCTION: Main consequence processing method
     */
    async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        console.log('\n🎯 [ConsequenceProcessor] ==================== PROCESSING CONSEQUENCE SLIDE ====================');
        console.log(`[ConsequenceProcessor] Slide ID: ${consequenceSlide.id}, Title: "${consequenceSlide.title}", Type: ${consequenceSlide.type}`);

        if (consequenceSlide.type !== 'consequence_reveal') {
            console.warn(`[ConsequenceProcessor] ❌ Slide ${consequenceSlide.id} is not a consequence slide (type: ${consequenceSlide.type})`);
            return;
        }

        const {currentDbSession, gameStructure, teams, teamDecisions, fetchTeamRoundDataFromHook} = this.props;

        if (!currentDbSession?.id || !gameStructure || !teams.length) {
            console.warn('[ConsequenceProcessor] ❌ Skipping consequence processing - insufficient data');
            return;
        }

        console.log(`[ConsequenceProcessor] Processing for ${teams.length} teams in session ${currentDbSession.id}`);

        try {
            // PRODUCTION: Map consequence slide to challenge using registry
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

            console.log(`[ConsequenceProcessor] Found ${allConsequencesForChoice.length} consequences for ${consequenceKey}`);

            // NEW: Get which option this slide is for
            const slideOption = this.getSlideOption(consequenceSlide);
            console.log(`[ConsequenceProcessor] This slide is for option: ${slideOption}`);

            // Debug: Log team decisions
            console.log('\n📋 [ConsequenceProcessor] Current team decisions:');
            teams.forEach(team => {
                const decision = teamDecisions[team.id]?.[challengeId];
                console.log(`  Team ${team.name} (${team.id}): ${decision?.selected_challenge_option_id || 'NO DECISION'}`);
            });

            const updatedTeamData: { teamId: string; kpis: TeamRoundData }[] = [];

            // Process each team based on their decision
            for (const team of teams) {
                console.log(`\n🏢 [ConsequenceProcessor] Processing team: ${team.name} (${team.id})`);

                const teamKpis = await this.ensureTeamRoundData(team.id, consequenceSlide.round_number as 1 | 2 | 3);
                console.log(`[ConsequenceProcessor] Current KPIs for ${team.name}:`, {
                    capacity: teamKpis.current_capacity,
                    orders: teamKpis.current_orders,
                    cost: teamKpis.current_cost,
                    asp: teamKpis.current_asp
                });

                const decision = teamDecisions[team.id]?.[challengeId];
                const options = gameStructure.all_challenge_options[challengeId] || [];
                const selectedOptionId = decision?.selected_challenge_option_id || options.find(opt => opt.is_default_choice)?.id;

                console.log(`[ConsequenceProcessor] Team ${team.name} selected option: ${selectedOptionId}`);

                // NEW: Only process teams that chose this specific option
                if (selectedOptionId !== slideOption) {
                    console.log(`[ConsequenceProcessor] ⏭️  Team ${team.name} chose ${selectedOptionId}, but slide ${consequenceSlide.id} is for option ${slideOption}. Skipping this team.`);
                    continue; // Skip this team entirely
                }

                console.log(`[ConsequenceProcessor] ✅ Team ${team.name} chose ${selectedOptionId}, processing ${slideOption} consequences`);

                if (selectedOptionId) {
                    const consequence = allConsequencesForChoice.find(c => c.challenge_option_id === selectedOptionId);

                    if (consequence && consequence.effects.length > 0) {
                        console.log(`[ConsequenceProcessor] Found consequence for ${team.name} option ${selectedOptionId}:`, consequence.effects);

                        // Check if already applied using optimized query
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

                        // Apply consequences
                        console.log(`[ConsequenceProcessor] 🎲 Applying consequences for team ${team.name} choice '${challengeId}-${selectedOptionId}'`);

                        // Apply immediate effects
                        const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, consequence.effects);

                        console.log(`[ConsequenceProcessor] KPI changes for ${team.name}:`, {
                            capacityChange: updatedKpis.current_capacity - teamKpis.current_capacity,
                            ordersChange: updatedKpis.current_orders - teamKpis.current_orders,
                            costChange: updatedKpis.current_cost - teamKpis.current_cost,
                            aspChange: updatedKpis.current_asp - teamKpis.current_asp
                        });

                        // Store permanent adjustments
                        await this.storePermanentAdjustments(team.id, currentDbSession.id, consequence.effects, challengeId, selectedOptionId);

                        // Update KPIs in database
                        const finalKpis = await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                        console.log(`[ConsequenceProcessor] ✅ Updated KPIs in database for ${team.name}`);

                        // Add to broadcast list
                        updatedTeamData.push({
                            teamId: team.id,
                            kpis: finalKpis as TeamRoundData
                        });

                        console.log(`[ConsequenceProcessor] 📊 Final KPIs for ${team.name}:`, {
                            capacity: updatedKpis.current_capacity,
                            cost: updatedKpis.current_cost,
                            orders: updatedKpis.current_orders,
                            asp: updatedKpis.current_asp
                        });
                    } else {
                        console.warn(`[ConsequenceProcessor] ❌ Team ${team.name}: No consequence found for option ${selectedOptionId}.`);
                    }
                } else {
                    console.warn(`[ConsequenceProcessor] ❌ Team ${team.name}: No option selected for ${challengeId}.`);
                }
            }

            console.log(`\n🔄 [ConsequenceProcessor] Refreshing data and broadcasting updates...`);

            // Refresh data from database
            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log('[ConsequenceProcessor] ✅ Data refresh complete');

            // Broadcast KPI updates
            if (updatedTeamData.length > 0) {
                await this.broadcastKpiUpdate(updatedTeamData);
            } else {
                console.log('[ConsequenceProcessor] ⚠️  No teams had KPI updates to broadcast');
            }

            console.log(`[ConsequenceProcessor] ✅ Successfully processed consequence slide ${consequenceSlide.id} for all teams\n`);

        } catch (error) {
            console.error(`[ConsequenceProcessor] ❌ Error processing consequence slide ${consequenceSlide.id}:`, error);
            throw error;
        }
    }
}
