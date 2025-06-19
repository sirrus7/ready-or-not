// src/core/game/ConsequenceProcessor.ts
// SIMPLIFIED: Uses KpiDataUtils instead of inheritance

import {Slide, GameStructure, GameSession, Team, TeamRoundData, TeamDecision} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {KpiDataUtils} from './KpiDataUtils';
import {SLIDE_TO_CHALLENGE_MAP, getChallengeBySlideId} from '@core/content/ChallengeRegistry';
import {allConsequencesData} from '@core/content/ConsequenceContent';

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
    public updateProps(newProps: ConsequenceProcessorProps): void {
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
     * Reset processed slides (used during game reset)
     */
    public resetProcessedSlides(): void {
        this.processedSlides.clear();
        this.isProcessing = false;
        console.log('[ConsequenceProcessor] 🔄 Reset processed slides tracking');
    }

    /**
     * MAIN METHOD: Consequence processing with database-backed duplicate prevention
     */
    public async processConsequenceSlide(consequenceSlide: Slide): Promise<void> {
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

            const {
                currentDbSession,
                gameStructure,
                teams,
                teamDecisions,
                teamRoundData,
                setTeamRoundDataDirectly
            } = this.props;

            // Validate required data
            if (!currentDbSession?.id || !gameStructure || !teams.length) {
                console.warn('[ConsequenceProcessor] ⚠️ Missing required data for consequence processing');
                return;
            }

            // Determine which challenge this slide belongs to
            const challengeId = SLIDE_TO_CHALLENGE_MAP.get(consequenceSlide.id);
            if (!challengeId) {
                console.warn(`[ConsequenceProcessor] ❌ Could not determine challenge for slide ${consequenceSlide.id}`);
                return;
            }

            // Determine which option this consequence slide is for
            const slideOption = this.getSlideOption(consequenceSlide);
            if (!slideOption) {
                console.warn(`[ConsequenceProcessor] ❌ Could not determine option for slide ${consequenceSlide.id}`);
                return;
            }

            console.log(`[ConsequenceProcessor] 🎯 Processing challenge ${challengeId}, option ${slideOption}`);

            // Get consequences for this challenge
            const consequenceKey = `${challengeId}-conseq`;
            const allConsequencesForChoice = allConsequencesData[consequenceKey] || [];
            if (allConsequencesForChoice.length === 0) {
                console.warn(`[ConsequenceProcessor] ⚠️ No consequences defined for ${consequenceKey}`);
                return;
            }

            // Process each team
            for (const team of teams) {
                console.log(`[ConsequenceProcessor] 👥 Processing team: ${team.name}`);

                // Get team's decision for this challenge
                const teamDecision = teamDecisions[team.id]?.[challengeId];

                if (!teamDecision) {
                    console.log(`[ConsequenceProcessor] ⚠️ No decision found for team ${team.name} for challenge ${challengeId}. Skipping.`);
                    continue;
                }

                if (teamDecision.selected_challenge_option_id !== slideOption) {
                    console.log(`[ConsequenceProcessor] ℹ️ Team ${team.name} chose ${teamDecision.selected_challenge_option_id}, but this slide is for ${slideOption}. Skipping.`);
                    continue;
                }

                // Database-backed duplicate prevention
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

                // Ensure KPI data exists for this team and round using utility function
                const kpiRoundNumber = consequenceSlide.round_number === 0 ? 1 : consequenceSlide.round_number as (1 | 2 | 3);
                const teamKpis = await KpiDataUtils.ensureTeamRoundData(
                    currentDbSession.id,
                    team.id,
                    kpiRoundNumber,
                    teamRoundData,
                    setTeamRoundDataDirectly
                );

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
                        const changeSymbol = effect.change_value > 0 ? '+' : '';
                        console.log(`[ConsequenceProcessor] 📈 ${effect.kpi}: ${oldValue} → ${newValue} (${changeSymbol}${effect.change_value})`);
                        hasImmediateChanges = true;
                    }
                });

                // Update KPIs in database if there were immediate changes
                if (hasImmediateChanges) {
                    const finalKpis = KpiCalculations.calculateFinancialMetrics(updatedKpis);
                    await db.kpis.upsert({...updatedKpis, ...finalKpis, id: teamKpis.id});
                    console.log(`[ConsequenceProcessor] 💾 Updated immediate KPI effects for team ${team.name}`);
                }

                // Store permanent adjustments using utility function
                await KpiDataUtils.storePermanentAdjustments(
                    team.id,
                    currentDbSession.id,
                    consequence.effects,
                    challengeId,
                    slideOption
                );

                // Record that this consequence has been applied (database tracking)
                await db.consequenceApplications.recordApplication({
                    session_id: currentDbSession.id,
                    team_id: team.id,
                    challenge_id: challengeId,
                    option_id: slideOption,
                    slide_id: consequenceSlide.id
                });

                console.log(`[ConsequenceProcessor] ✅ Successfully applied consequence to team ${team.name}`);
            }

            // Mark slide as processed
            this.processedSlides.add(slideKey);

            // Refresh team round data to update UI
            await this.props.fetchTeamRoundDataFromHook(currentDbSession.id);

            console.log(`[ConsequenceProcessor] ✅ Completed processing consequence slide ${consequenceSlide.id}`);
            console.log('🎯 [ConsequenceProcessor] ==================== CONSEQUENCE PROCESSING COMPLETE ====================\n');

        } catch (error) {
            console.error(`[ConsequenceProcessor] ❌ Error processing consequence slide ${consequenceSlide.id}:`, error);
            throw error;
        } finally {
            this.isProcessing = false;
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

        // Fallback: Use challenge registry or slide ID pattern
        const challenge = getChallengeBySlideId(consequenceSlide.id);
        if (challenge?.consequence_slides) {
            const slideIndex = challenge.consequence_slides.indexOf(consequenceSlide.id);
            if (slideIndex >= 0) {
                return ['A', 'B', 'C', 'D'][slideIndex] || 'A';
            }
        }

        console.warn(`[ConsequenceProcessor] Could not determine option for slide ${consequenceSlide.id}, defaulting to 'A'`);
        return 'A';
    }
}
