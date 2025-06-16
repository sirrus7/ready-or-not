// src/core/game/ConsequenceProcessor.ts
// DEBUG ENHANCED VERSION - With detailed logging and broadcast fixes

import {Slide, GameStructure, GameSession, Team, TeamRoundData, KpiEffect, TeamDecision} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {SimpleBroadcastManager, KpiUpdateData} from '@core/sync/SimpleBroadcastManager';

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
        // Initialize broadcast manager for real-time KPI updates
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
        const adjustments = await db.adjustments.getBySession(currentDbSession.id);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);
        const insertedData = await db.kpis.create(adjustedData);

        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));
        console.log(`[ConsequenceProcessor] Created new KPI data for team ${teamId} round ${roundNumber}`);
        return insertedData as TeamRoundData;
    }

    private async storePermanentAdjustments(teamId: string, sessionId: string, effects: KpiEffect[], sourceLabel: string) {
        const adjustmentsToUpsert = KpiCalculations.createPermanentAdjustments(effects, sessionId, teamId, sourceLabel);
        if (adjustmentsToUpsert.length > 0) {
            await db.adjustments.upsert(adjustmentsToUpsert);
            console.log(`[ConsequenceProcessor] Stored ${adjustmentsToUpsert.length} permanent adjustments for team ${teamId}`);
        }
    }

    /**
     * Enhanced method to broadcast KPI updates to all team interfaces
     */
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

            // Log detailed update info
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
     * ENHANCED DEBUG VERSION: Processes a consequence slide with detailed logging
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
            console.log('Debug info:', {
                hasSession: !!currentDbSession?.id,
                hasGameStructure: !!gameStructure,
                teamCount: teams.length
            });
            return;
        }

        console.log(`[ConsequenceProcessor] Processing for ${teams.length} teams in session ${currentDbSession.id}`);

        try {
            // Map consequence slide to the corresponding choice phase
            const choicePhase = this.getCorrespondingChoicePhase(consequenceSlide);
            if (!choicePhase) {
                console.warn(`[ConsequenceProcessor] ❌ No corresponding choice phase found for consequence slide ${consequenceSlide.id}`);
                return;
            }

            console.log(`[ConsequenceProcessor] ✅ Found corresponding choice phase: ${choicePhase}`);

            // Get consequences for this choice phase
            const consequenceKey = `${choicePhase}-conseq`;
            const allConsequencesForChoice = gameStructure.all_consequences[consequenceKey];

            if (!allConsequencesForChoice || allConsequencesForChoice.length === 0) {
                console.warn(`[ConsequenceProcessor] ❌ No consequences found for key: ${consequenceKey}`);
                return;
            }

            console.log(`[ConsequenceProcessor] Found ${allConsequencesForChoice.length} consequences for ${consequenceKey}`);

            // Debug: Log team decisions
            console.log('\n📋 [ConsequenceProcessor] Current team decisions:');
            teams.forEach(team => {
                const decision = teamDecisions[team.id]?.[choicePhase];
                console.log(`  Team ${team.name} (${team.id}): ${decision?.selected_challenge_option_id || 'NO DECISION'}`);
            });

            // Track updated teams for broadcasting
            const updatedTeamData: { teamId: string; kpis: TeamRoundData }[] = [];

            // Process each team based on their ACTUAL choice
            for (const team of teams) {
                console.log(`\n🏢 [ConsequenceProcessor] Processing team: ${team.name} (${team.id})`);

                const teamKpis = await this.ensureTeamRoundData(team.id, consequenceSlide.round_number as 1 | 2 | 3);
                console.log(`[ConsequenceProcessor] Current KPIs for ${team.name}:`, {
                    capacity: teamKpis.current_capacity,
                    orders: teamKpis.current_orders,
                    cost: teamKpis.current_cost,
                    asp: teamKpis.current_asp
                });

                const decision = teamDecisions[team.id]?.[choicePhase];
                const options = gameStructure.all_challenge_options[choicePhase] || [];
                const selectedOptionId = decision?.selected_challenge_option_id || options.find(opt => opt.is_default_choice)?.id;

                console.log(`[ConsequenceProcessor] Team ${team.name} selected option: ${selectedOptionId}`);

                if (selectedOptionId) {
                    // Find the consequence for this team's ACTUAL choice
                    const consequence = allConsequencesForChoice.find(c => c.challenge_option_id === selectedOptionId);

                    if (consequence && consequence.effects.length > 0) {
                        console.log(`[ConsequenceProcessor] Found consequence for ${team.name} option ${selectedOptionId}:`, consequence.effects);

                        // Check if this team already has this consequence applied
                        const sourceLabel = `${choicePhase} - ${selectedOptionId}`;
                        const existingAdjustments = await db.adjustments.getBySession(currentDbSession.id);
                        const alreadyApplied = existingAdjustments.some(adj =>
                            adj.team_id === team.id &&
                            adj.description?.includes(sourceLabel)
                        );

                        if (alreadyApplied) {
                            console.log(`[ConsequenceProcessor] ⚠️  Team ${team.name}: Consequences for '${selectedOptionId}' already applied, skipping.`);
                            continue;
                        }

                        // Apply the consequences - both immediate and permanent effects
                        console.log(`[ConsequenceProcessor] 🎲 Applying consequences for team ${team.name} choice '${selectedOptionId}'`);

                        // Apply immediate effects to current KPIs
                        const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, consequence.effects);

                        console.log(`[ConsequenceProcessor] KPI changes for ${team.name}:`, {
                            capacityChange: updatedKpis.current_capacity - teamKpis.current_capacity,
                            ordersChange: updatedKpis.current_orders - teamKpis.current_orders,
                            costChange: updatedKpis.current_cost - teamKpis.current_cost,
                            aspChange: updatedKpis.current_asp - teamKpis.current_asp
                        });

                        // Store permanent adjustments for future rounds
                        await this.storePermanentAdjustments(team.id, currentDbSession.id, consequence.effects, sourceLabel);

                        // Update the team's KPIs in the database
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
                    console.warn(`[ConsequenceProcessor] ❌ Team ${team.name}: No option selected for ${choicePhase}.`);
                }
            }

            console.log(`\n🔄 [ConsequenceProcessor] Refreshing data and broadcasting updates...`);

            // Refresh data from database
            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log('[ConsequenceProcessor] ✅ Data refresh complete');

            // Broadcast KPI updates to all team interfaces
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

    /**
     * Maps a consequence slide to its corresponding choice phase
     * PRODUCTION VERSION - Complete mapping for all 9 challenges
     */
    private getCorrespondingChoicePhase(consequenceSlide: Slide): string | null {
        const slideTitle = consequenceSlide.title?.toLowerCase() || '';
        const slideId = consequenceSlide.id;

        console.log(`[ConsequenceProcessor] 🗺️  Mapping slide ${slideId} "${slideTitle}" to choice phase`);

        // Primary mapping based on title patterns
        if (slideTitle.includes('ch1') || slideTitle.includes('challenge 1')) {
            console.log('[ConsequenceProcessor] Mapped to ch1 via title pattern');
            return 'ch1';
        }
        if (slideTitle.includes('ch2') || slideTitle.includes('challenge 2')) {
            return 'ch2';
        }
        if (slideTitle.includes('ch3') || slideTitle.includes('challenge 3')) {
            return 'ch3';
        }
        if (slideTitle.includes('ch4') || slideTitle.includes('challenge 4')) {
            return 'ch4';
        }
        if (slideTitle.includes('ch5') || slideTitle.includes('challenge 5')) {
            return 'ch5';
        }
        if (slideTitle.includes('ch6') || slideTitle.includes('challenge 6')) {
            return 'ch6';
        }
        if (slideTitle.includes('ch7') || slideTitle.includes('challenge 7')) {
            return 'ch7';
        }
        if (slideTitle.includes('ch8') || slideTitle.includes('challenge 8')) {
            return 'ch8';
        }
        if (slideTitle.includes('ch9') || slideTitle.includes('challenge 9')) {
            return 'ch9';
        }

        // PRODUCTION MAPPING - Based on actual slide structure
        // ROUND 1 CHALLENGES
        // CH1 (Equipment Failure) consequences: slides 20-23
        if (slideId >= 20 && slideId <= 23) {
            console.log(`[ConsequenceProcessor] Mapped slide ${slideId} to ch1 based on ID range (20-23)`);
            return 'ch1';
        }

        // CH2 (Revenue Tax) consequences: slides 35-38
        if (slideId >= 35 && slideId <= 38) return 'ch2';

        // CH3 (Recession) consequences: slides 50-53
        if (slideId >= 50 && slideId <= 53) return 'ch3';

        // ROUND 2 CHALLENGES
        // CH4 (Supply Chain) consequences: slides 82-84
        if (slideId >= 82 && slideId <= 84) return 'ch4';

        // CH5 (Capacity Crisis) consequences: slides 93-96
        if (slideId >= 93 && slideId <= 96) return 'ch5';

        // CH6 (Quality Crisis) consequences: slides 108-111
        if (slideId >= 108 && slideId <= 111) return 'ch6';

        // CH7 (Competition) consequences: slides 120-123
        if (slideId >= 120 && slideId <= 123) return 'ch7';

        // ROUND 3 CHALLENGES
        // CH8 (Ransomware) consequences: slides 154-156
        if (slideId >= 154 && slideId <= 156) return 'ch8';

        // CH9 (ERP Crisis) consequences: slides 165-167
        if (slideId >= 165 && slideId <= 167) return 'ch9';

        console.warn(`[ConsequenceProcessor] ❌ Could not map consequence slide ${slideId} (${slideTitle}) to a choice phase`);
        return null;
    }
}
