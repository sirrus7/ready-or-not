// src/core/game/DecisionEngine.ts

import {
    GameSession,
    Team,
    TeamDecision,
    TeamRoundData,
    GameStructure,
    GamePhaseNode,
    KpiEffect,
    Slide
} from '@shared/types';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';

interface DecisionEngineProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>; // Passed by reference for internal mutation
    allPhasesInOrder: GamePhaseNode[]; // Needed to find current phase
    // Callbacks to update external state (used by useGameProcessing)
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

/**
 * The DecisionEngine processes decisions made during 'choice' and 'double-down-prompt' phases,
 * applying their consequences to team KPIs and storing permanent adjustments.
 */
export class DecisionEngine {
    private currentDbSession: GameSession | null;
    private gameStructure: GameStructure | null;
    private teams: Team[];
    private teamDecisions: Record<string, Record<string, TeamDecision>>;
    private teamRoundData: Record<string, Record<number, TeamRoundData>>;
    private allPhasesInOrder: GamePhaseNode[];
    private fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    private setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;

    constructor(props: DecisionEngineProps) {
        this.currentDbSession = props.currentDbSession;
        this.gameStructure = props.gameStructure;
        this.teams = props.teams;
        this.teamDecisions = props.teamDecisions;
        this.teamRoundData = props.teamRoundData;
        this.allPhasesInOrder = props.allPhasesInOrder;
        this.fetchTeamRoundDataFromHook = props.fetchTeamRoundDataFromHook;
        this.setTeamRoundDataDirectly = props.setTeamRoundDataDirectly;
    }

    /**
     * Ensures that the TeamRoundData for a given team and round exists in the local state
     * (and DB if necessary), creating it with initial values if it doesn't.
     * @param teamId The ID of the team.
     * @param roundNumber The round number.
     * @param sessionId The ID of the current session.
     * @returns The TeamRoundData object for the specified team and round.
     * @private
     */
    private async ensureTeamRoundData(
        teamId: string,
        roundNumber: 1 | 2 | 3,
        sessionId: string
    ): Promise<TeamRoundData> {
        if (!sessionId || sessionId === 'new') throw new Error("Invalid sessionId for KPI data.");

        const existingKpis = this.teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

        // Try to fetch from database if not in local state
        try {
            const existingData = await db.kpis.getForTeamRound(sessionId, teamId, roundNumber);
            if (existingData) {
                this.setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.log(`[DecisionEngine] No existing round data found for team ${teamId} round ${roundNumber}, creating new.`);
        }

        // If not found, create new round data
        const newRoundData = await KpiCalculations.createNewRoundData(
            sessionId,
            teamId,
            roundNumber,
            this.teamRoundData[teamId]
        );

        // Apply permanent adjustments accumulated from previous rounds/decisions
        const adjustments = await db.adjustments.getBySession(sessionId);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);

        const insertedData = await db.kpis.create(adjustedData);
        this.setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        return insertedData as TeamRoundData;
    }

    /**
     * Stores permanent KPI adjustments in the database, to be applied in future rounds.
     * @param teamId The ID of the team.
     * @param sessionId The ID of the current session.
     * @param effects The KPI effects, which may include permanent effects.
     * @param phaseSourceLabel A label indicating the source of the adjustment (e.g., "CH1 - Option A").
     * @private
     */
    private async storePermanentAdjustments(
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        phaseSourceLabel: string
    ) {
        const adjustmentsToInsert = KpiCalculations.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            phaseSourceLabel
        );

        if (adjustmentsToInsert.length > 0) {
            await db.adjustments.create(adjustmentsToInsert);
        }
    }


    /**
     * Processes decisions made during a 'choice' phase and applies consequences to team KPIs.
     * This method is called when advancing past a 'choice' phase's last slide.
     * @param phaseId The ID of the choice phase to process.
     * @param associatedSlide The slide associated with this phase (optional, for debugging/logging).
     * @returns A promise that resolves when all decisions for the phase have been processed.
     * @throws Error if any step of the processing fails.
     */
    public async processChoicePhaseDecisions(phaseId: string, associatedSlide: Slide | null): Promise<void> {
        const currentPhase = this.allPhasesInOrder.find(p => p.id === phaseId);
        if (!this.currentDbSession?.id || !this.gameStructure || !currentPhase ||
            !this.teams.length || (currentPhase.phase_type !== 'choice' && currentPhase.phase_type !== 'double-down-prompt')) {
            console.warn(`[DecisionEngine] Skipping choice phase processing due to invalid state or phase type for phase ${phaseId}.`);
            return;
        }

        console.log(`[DecisionEngine] Processing decisions for interactive phase: ${phaseId} (Slide ID: ${associatedSlide?.id})`);

        try {
            for (const team of this.teams) {
                const teamKpis = await this.ensureTeamRoundData(team.id, currentPhase.round_number as 1 | 2 | 3, this.currentDbSession.id);
                const decision = this.teamDecisions[team.id]?.[phaseId];
                const effectsToApply: KpiEffect[] = [];

                const optionsKey = currentPhase.interactive_data_key || phaseId;
                const options = this.gameStructure.all_challenge_options[optionsKey] || [];
                const selectedOptionId = decision?.selected_challenge_option_id ||
                    options.find(opt => opt.is_default_choice)?.id;

                if (!selectedOptionId) {
                    console.warn(`[DecisionEngine] Team ${team.name} (${team.id}) had no selected option for phase ${phaseId}. Using default if available.`);
                }

                // Apply consequence effects
                if (selectedOptionId) {
                    const consequenceKey = `${phaseId}-conseq`; // Example: ch1-conseq, ch2-conseq
                    // The 'double-down-prompt' phase doesn't have a direct consequence, its impact is via the 'double-down-payoff'
                    if (currentPhase.phase_type === 'choice') {
                        const consequence = this.gameStructure.all_consequences[consequenceKey]
                            ?.find(c => c.challenge_option_id === selectedOptionId);
                        if (consequence) {
                            effectsToApply.push(...consequence.effects);
                            console.log(`[DecisionEngine] Team ${team.name}: Applying consequences for choice '${selectedOptionId}'.`);
                        } else {
                            console.warn(`[DecisionEngine] Team ${team.name}: No consequence found for phase ${phaseId} option ${selectedOptionId}.`);
                        }
                    }
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    await this.storePermanentAdjustments(team.id, this.currentDbSession.id, effectsToApply,
                        `${currentPhase.label} - ${selectedOptionId || 'No Option'}`);

                    await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                    console.log(`[DecisionEngine] Team ${team.name}: KPIs updated for phase ${phaseId}.`);
                }
            }

            // After processing all teams, refetch the latest KPI data to update the UI
            await this.fetchTeamRoundDataFromHook(this.currentDbSession.id);
            console.log(`[DecisionEngine] Successfully processed choice phase ${phaseId} decisions for all teams.`);
        } catch (err) {
            console.error(`[DecisionEngine] Error processing choice decisions for phase ${phaseId}:`, err);
            throw err; // Re-throw to be caught by the caller (e.g., useGameProcessing)
        }
    }

    // TODO: Implement other methods like processDoubleDown() here, if applicable
    // (This would involve a dice roll and applying its multiplier, likely calling InvestmentEngine after the roll)
}
