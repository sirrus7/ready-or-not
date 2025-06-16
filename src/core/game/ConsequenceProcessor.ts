// src/core/game/ConsequenceProcessor.ts
// FIXED VERSION - Applies consequences based on team's actual choice, not slide being displayed

import {Slide, GameStructure, GameSession, Team, TeamRoundData, KpiEffect, TeamDecision} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';

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
    }

    private async ensureTeamRoundData(teamId: string, roundNumber: 1 | 2 | 3): Promise<TeamRoundData> {
        const {currentDbSession, teamRoundData, setTeamRoundDataDirectly} = this.props;
        if (!currentDbSession?.id || currentDbSession.id === 'new') throw new Error("Invalid sessionId for KPI data.");

        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

        try {
            const existingData = await db.kpis.getForTeamRound(currentDbSession.id, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
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
        return insertedData as TeamRoundData;
    }

    private async storePermanentAdjustments(teamId: string, sessionId: string, effects: KpiEffect[], sourceLabel: string) {
        const adjustmentsToUpsert = KpiCalculations.createPermanentAdjustments(effects, sessionId, teamId, sourceLabel);
        if (adjustmentsToUpsert.length > 0) {
            await db.adjustments.upsert(adjustmentsToUpsert);
        }
    }

    /**
     * FIXED: Processes a consequence slide by applying KPI effects to teams based on their ACTUAL previous choices
     * This method applies consequences to ALL teams based on their individual choices when ANY consequence slide is displayed
     */
    async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
        if (consequenceSlide.type !== 'consequence_reveal') {
            console.warn(`[ConsequenceProcessor] Slide ${consequenceSlide.id} is not a consequence slide`);
            return;
        }

        console.log(`[ConsequenceProcessor] Processing consequence slide: ${consequenceSlide.title}`);

        const {currentDbSession, gameStructure, teams, teamDecisions, fetchTeamRoundDataFromHook} = this.props;

        if (!currentDbSession?.id || !gameStructure || !teams.length) {
            console.warn('[ConsequenceProcessor] Skipping consequence processing - insufficient data');
            return;
        }

        try {
            // Map consequence slide to the corresponding choice phase
            const choicePhase = this.getCorrespondingChoicePhase(consequenceSlide);
            if (!choicePhase) {
                console.warn(`[ConsequenceProcessor] No corresponding choice phase found for consequence slide ${consequenceSlide.id}`);
                return;
            }

            console.log(`[ConsequenceProcessor] Found corresponding choice phase: ${choicePhase}`);

            // Get consequences for this choice phase
            const consequenceKey = `${choicePhase}-conseq`;
            const allConsequencesForChoice = gameStructure.all_consequences[consequenceKey];

            if (!allConsequencesForChoice || allConsequencesForChoice.length === 0) {
                console.warn(`[ConsequenceProcessor] No consequences found for key: ${consequenceKey}`);
                return;
            }

            // FIXED: Process each team based on their ACTUAL choice, not the slide being displayed
            for (const team of teams) {
                const teamKpis = await this.ensureTeamRoundData(team.id, consequenceSlide.round_number as 1 | 2 | 3);
                const decision = teamDecisions[team.id]?.[choicePhase];

                const options = gameStructure.all_challenge_options[choicePhase] || [];
                const selectedOptionId = decision?.selected_challenge_option_id || options.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    // Find the consequence for this team's ACTUAL choice
                    const consequence = allConsequencesForChoice.find(c => c.challenge_option_id === selectedOptionId);

                    if (consequence && consequence.effects.length > 0) {
                        // Check if this team already has this consequence applied
                        const sourceLabel = `${choicePhase} - ${selectedOptionId}`;
                        const existingAdjustments = await db.adjustments.getBySession(currentDbSession.id);
                        const alreadyApplied = existingAdjustments.some(adj =>
                            adj.team_id === team.id &&
                            adj.description?.includes(sourceLabel)
                        );

                        if (alreadyApplied) {
                            console.log(`[ConsequenceProcessor] Team ${team.name}: Consequences for '${selectedOptionId}' already applied, skipping.`);
                            continue;
                        }

                        // FIXED: Apply the consequences - both immediate and permanent effects
                        console.log(`[ConsequenceProcessor] Team ${team.name}: Applying consequences for choice '${selectedOptionId}'`, consequence.effects);

                        // Apply immediate effects to current KPIs
                        const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, consequence.effects);

                        // Store permanent adjustments for future rounds
                        await this.storePermanentAdjustments(team.id, currentDbSession.id, consequence.effects, sourceLabel);

                        // Update the team's KPIs in the database
                        await db.kpis.upsert({...updatedKpis, id: teamKpis.id});

                        console.log(`[ConsequenceProcessor] Team ${team.name}: Applied consequences for choice '${selectedOptionId}'. Updated KPIs:`, {
                            capacity: updatedKpis.current_capacity,
                            cost: updatedKpis.current_cost,
                            orders: updatedKpis.current_orders,
                            asp: updatedKpis.current_asp
                        });
                    } else {
                        console.warn(`[ConsequenceProcessor] Team ${team.name}: No consequence found for option ${selectedOptionId}.`);
                    }
                } else {
                    console.warn(`[ConsequenceProcessor] Team ${team.name}: No option selected for ${choicePhase}.`);
                }
            }

            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`[ConsequenceProcessor] Successfully processed consequence slide ${consequenceSlide.id} for all teams`);

        } catch (error) {
            console.error(`[ConsequenceProcessor] Error processing consequence slide ${consequenceSlide.id}:`, error);
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

        // FIXED: Improved mapping logic for CH1 Option A Consequences (slide 20)
        console.log(`[ConsequenceProcessor] Mapping slide ${slideId} "${slideTitle}" to choice phase`);

        // Primary mapping based on title patterns
        if (slideTitle.includes('ch1') || slideTitle.includes('challenge 1')) {
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
            console.log(`[ConsequenceProcessor] Slide ${slideId} mapped to ch1 based on ID range`);
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

        console.warn(`[ConsequenceProcessor] Could not map consequence slide ${slideId} (${slideTitle}) to a choice phase`);
        return null;
    }
}
