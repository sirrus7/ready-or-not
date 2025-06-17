// src/core/game/ConsequenceProcessor.ts
// PRODUCTION VERSION: Fixed real-time KPI broadcasting to team apps
// CRITICAL FIX: Removed BroadcastChannel usage, replaced with Supabase real-time trigger

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
        console.log('[ConsequenceProcessor] Initialized for session:', this.props.currentDbSession?.id);
    }

    /**
     * CRITICAL FIX: Ensures team KPI data exists in database for the current round
     * This is essential for real-time synchronization to work properly
     */
    private async ensureTeamRoundData(teamId: string, roundNumber: 1 | 2 | 3): Promise<TeamRoundData> {
        const {currentDbSession, teamRoundData, setTeamRoundDataDirectly} = this.props;
        if (!currentDbSession?.id || currentDbSession.id === 'new') {
            throw new Error("Invalid sessionId for KPI data.");
        }

        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) {
            console.log(`[ConsequenceProcessor] Using existing KPIs for team ${teamId}, round ${roundNumber}`);
            return existingKpis;
        }

        console.log(`[ConsequenceProcessor] Creating new KPI record for team ${teamId}, round ${roundNumber}`);

        // Get the previous round's KPIs to use as base
        const previousRoundKpis = roundNumber > 1 ? teamRoundData[teamId]?.[roundNumber - 1] : null;

        // Create new KPI data with default or carried-forward values
        const newKpiData: Omit<TeamRoundData, 'id' | 'created_at'> = {
            session_id: currentDbSession.id,
            team_id: teamId,
            round_number: roundNumber,
            current_capacity: previousRoundKpis?.current_capacity || 2000,
            current_orders: previousRoundKpis?.current_orders || 1500,
            current_cost: previousRoundKpis?.current_cost || 500000,
            current_asp: previousRoundKpis?.current_asp || 950,
            revenue: 0, // Will be calculated
            net_income: 0, // Will be calculated
            net_margin: 0 // Will be calculated
        };

        // Calculate derived KPIs
        const calculatedKpis = KpiCalculations.calculateDerivedKpis(newKpiData);
        const finalKpiData = {...newKpiData, ...calculatedKpis};

        // Insert into database - this will trigger real-time updates to team apps
        const createdKpis = await db.kpis.create(finalKpiData) as TeamRoundData;
        console.log(`[ConsequenceProcessor] ✅ Created KPIs in database for team ${teamId}:`, createdKpis);

        // Update local state
        setTeamRoundDataDirectly(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated[teamId]) updated[teamId] = {};
            updated[teamId][roundNumber] = createdKpis;
            return updated;
        });

        return createdKpis;
    }

    /**
     * CRITICAL FIX: Store permanent KPI adjustments with explicit challenge tracking
     * This ensures future rounds apply the correct permanent effects
     */
    private async storePermanentAdjustments(
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        challengeId: string,
        optionId: string
    ): Promise<void> {
        const permanentEffects = effects.filter(effect =>
            effect.timing === 'permanent_next_round_start' &&
            effect.applies_to_rounds &&
            effect.applies_to_rounds.length > 0
        );

        if (permanentEffects.length === 0) {
            console.log(`[ConsequenceProcessor] No permanent effects to store for ${challengeId}-${optionId}`);
            return;
        }

        const adjustments = permanentEffects.map(effect => ({
            session_id: sessionId,
            team_id: teamId,
            kpi_key: effect.kpi,
            adjustment_value: effect.change_value,
            is_percentage: effect.is_percentage_change || false,
            applies_to_round_start: effect.applies_to_rounds![0], // First applicable round
            source_description: effect.description || `${challengeId.toUpperCase()} Option ${optionId}`,
            challenge_id: challengeId,
            option_id: optionId
        }));

        await db.adjustments.create(adjustments);
        console.log(`[ConsequenceProcessor] ✅ Stored ${adjustments.length} permanent adjustments for ${challengeId}-${optionId}`);
    }

    /**
     * CRITICAL FIX: Real-time KPI broadcasting via database updates
     * Removed BroadcastChannel usage - team apps get updates via Supabase real-time subscriptions
     */
    private async broadcastKpiUpdatesToTeamApps(updatedTeamData: Array<{
        teamId: string,
        kpis: TeamRoundData
    }>): Promise<void> {
        console.log('\n🔄 [ConsequenceProcessor] Broadcasting KPI updates to team apps via database...');

        try {
            // CRITICAL: Team apps will receive these updates via their Supabase real-time subscriptions
            // No need for BroadcastChannel as team apps are on different devices

            for (const team of updatedTeamData) {
                console.log(`[ConsequenceProcessor] 📊 Team ${team.teamId} updated KPIs:`, {
                    capacity: team.kpis.current_capacity,
                    orders: team.kpis.current_orders,
                    cost: team.kpis.current_cost,
                    asp: team.kpis.current_asp,
                    revenue: team.kpis.revenue,
                    net_income: team.kpis.net_income,
                    net_margin: team.kpis.net_margin
                });
            }

            console.log(`[ConsequenceProcessor] ✅ KPI updates stored in database - team apps will receive via real-time subscriptions`);
            console.log(`[ConsequenceProcessor] 📡 Updated ${updatedTeamData.length} teams - real-time sync to team devices active`);

        } catch (error) {
            console.error('[ConsequenceProcessor] ❌ Error during KPI update broadcasting:', error);
            throw error;
        }
    }

    /**
     * PRODUCTION: Main consequence processing method with fixed real-time broadcasting
     */
    async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        console.log('\n🎯 [ConsequenceProcessor] ==================== PROCESSING CONSEQUENCE SLIDE ====================');
        console.log(`[ConsequenceProcessor] Slide ID: ${consequenceSlide.id}, Title: "${consequenceSlide.title}", Type: ${consequenceSlide.type}`);

        if (consequenceSlide.type !== 'consequence_reveal') {
            console.warn(`[ConsequenceProcessor] ❌ Slide ${consequenceSlide.id} is not a consequence slide (type: ${consequenceSlide.type})`);
            return;
        }

        const {currentDbSession, gameStructure, teams, teamDecisions, fetchTeamRoundDataFromHook} = this.props;

        if (!currentDbSession || !gameStructure) {
            console.error('[ConsequenceProcessor] ❌ Missing session or game structure');
            return;
        }

        try {
            // Get challenge information from slide
            const challengeId = getChallengeBySlideId(consequenceSlide.id)?.id;
            if (!challengeId) {
                console.warn(`[ConsequenceProcessor] ❌ Could not determine challenge ID for slide ${consequenceSlide.id}`);
                return;
            }

            console.log(`[ConsequenceProcessor] Processing consequences for challenge: ${challengeId}`);

            const allConsequences = gameStructure.all_consequences[`${challengeId}-conseq`] || [];
            const updatedTeamData: Array<{ teamId: string, kpis: TeamRoundData }> = [];

            // Process each team's consequences
            for (const team of teams) {
                const teamDecision = teamDecisions[team.id]?.[challengeId];

                if (teamDecision?.selected_option_id) {
                    const selectedOptionId = teamDecision.selected_option_id;
                    console.log(`[ConsequenceProcessor] Team ${team.name}: Processing option ${selectedOptionId}`);

                    // Find the consequence for this team's choice
                    const consequence = allConsequences.find(c => c.challenge_option_id === selectedOptionId);

                    if (consequence) {
                        console.log(`[ConsequenceProcessor] Found consequence '${consequence.id}' for ${challengeId}-${selectedOptionId}`);

                        // Ensure team has KPI data for current round
                        const currentRound = consequenceSlide.round_number as 1 | 2 | 3;
                        const teamKpis = await this.ensureTeamRoundData(team.id, currentRound);

                        // Apply immediate effects
                        const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, consequence.effects);

                        console.log(`[ConsequenceProcessor] KPI changes for ${team.name}:`, {
                            capacityChange: updatedKpis.current_capacity - teamKpis.current_capacity,
                            ordersChange: updatedKpis.current_orders - teamKpis.current_orders,
                            costChange: updatedKpis.current_cost - teamKpis.current_cost,
                            aspChange: updatedKpis.current_asp - teamKpis.current_asp
                        });

                        // Store permanent adjustments for future rounds
                        await this.storePermanentAdjustments(team.id, currentDbSession.id, consequence.effects, challengeId, selectedOptionId);

                        // CRITICAL: Update KPIs in database - this triggers real-time updates to team apps
                        const finalKpis = await db.kpis.upsert({...updatedKpis, id: teamKpis.id}) as TeamRoundData;
                        console.log(`[ConsequenceProcessor] ✅ Updated KPIs in database for ${team.name} - real-time sync triggered`);

                        // Add to broadcast list
                        updatedTeamData.push({
                            teamId: team.id,
                            kpis: finalKpis
                        });

                    } else {
                        console.warn(`[ConsequenceProcessor] ❌ Team ${team.name}: No consequence found for option ${selectedOptionId}.`);
                    }
                } else {
                    console.warn(`[ConsequenceProcessor] ❌ Team ${team.name}: No option selected for ${challengeId}.`);
                }
            }

            console.log(`\n🔄 [ConsequenceProcessor] Refreshing data and broadcasting updates...`);

            // Refresh data from database to ensure consistency
            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log('[ConsequenceProcessor] ✅ Data refresh complete');

            // CRITICAL FIX: Broadcast KPI updates via database (real-time subscriptions)
            if (updatedTeamData.length > 0) {
                await this.broadcastKpiUpdatesToTeamApps(updatedTeamData);
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
