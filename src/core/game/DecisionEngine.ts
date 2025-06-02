// src/core/game/DecisionEngine.ts - Implement DecisionEngine class with decision processing, integrating logic from useGameProcessing.ts and consequence logic

import {
    GameSession,
    Team,
    TeamDecision,
    TeamRoundData,
} from '@shared/types/database';
import {
    GameStructure,
    GamePhaseNode,
    KpiEffect,
    Slide
} from '@shared/types/game';
import {db} from '@shared/services/supabase';
import {KpiCalculations} from './ScoringEngine';
import {allConsequencesData} from '@core/content/ConsequenceContent';

// TODO: Implement DecisionEngine class with decision processing logic.
// This file should define methods to:
// 1. Process choice phase decisions, applying consequences to team KPIs.
// 2. Potentially handle double-down logic (dice roll outcomes).
// 3. Integrate logic from src/core/game/useGameProcessing.ts, especially `processChoicePhaseDecisionsInternal`.

interface DecisionEngineProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    allPhasesInOrder: GamePhaseNode[];
    updateSessionInDb: (updates: any) => Promise<void>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

export class DecisionEngine {
    private currentDbSession: GameSession | null;
    private gameStructure: GameStructure | null;
    private teams: Team[];
    private teamDecisions: Record<string, Record<string, TeamDecision>>;
    private teamRoundData: Record<string, Record<number, TeamRoundData>>;
    private allPhasesInOrder: GamePhaseNode[];
    private updateSessionInDb: (updates: any) => Promise<void>;
    private fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    private setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;

    constructor(props: DecisionEngineProps) {
        this.currentDbSession = props.currentDbSession;
        this.gameStructure = props.gameStructure;
        this.teams = props.teams;
        this.teamDecisions = props.teamDecisions;
        this.teamRoundData = props.teamRoundData;
        this.allPhasesInOrder = props.allPhasesInOrder;
        this.updateSessionInDb = props.updateSessionInDb;
        this.fetchTeamRoundDataFromHook = props.fetchTeamRoundDataFromHook;
        this.setTeamRoundDataDirectly = props.setTeamRoundDataDirectly;
    }

    // Existing helper logic for ensuring team round data (copied from useGameProcessing)
    private async ensureTeamRoundData(
        teamId: string,
        roundNumber: 1 | 2 | 3,
        sessionId: string
    ): Promise<TeamRoundData> {
        if (!sessionId || sessionId === 'new') throw new Error("Invalid sessionId");

        const existingKpis = this.teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

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
            console.log('[DecisionEngine] No existing round data found, creating new');
        }

        const newRoundData = await KpiCalculations.createNewRoundData(
            sessionId,
            teamId,
            roundNumber,
            this.teamRoundData[teamId]
        );

        const adjustments = await db.adjustments.getBySession(sessionId);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);

        const insertedData = await db.kpis.create(adjustedData);
        this.setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        return insertedData as TeamRoundData;
    }

    // Existing helper logic for storing permanent adjustments (copied from useGameProcessing)
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
     * Processes decisions made during a 'choice' phase and applies consequences.
     * This logic is moved from `useGameProcessing.ts`.
     */
    public async processChoicePhaseDecisions(phaseId: string, associatedSlide: Slide | null): Promise<void> {
        const currentPhase = this.allPhasesInOrder.find(p => p.id === phaseId);
        if (!this.currentDbSession?.id || !this.gameStructure || !currentPhase ||
            !this.teams.length || currentPhase.phase_type !== 'choice') {
            console.warn(`[DecisionEngine] Skipping choice phase processing due to invalid state for phase ${phaseId}.`);
            return;
        }

        try {
            for (const team of this.teams) {
                const teamKpis = await this.ensureTeamRoundData(team.id, currentPhase.round_number as 1 | 2 | 3, this.currentDbSession.id);
                const decision = this.teamDecisions[team.id]?.[phaseId];
                const effectsToApply: KpiEffect[] = [];

                const optionsKey = currentPhase.interactive_data_key || phaseId;
                const options = this.gameStructure.all_challenge_options[optionsKey] || [];
                const selectedOptionId = decision?.selected_challenge_option_id ||
                    options.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    const consequenceKey = `${phaseId}-conseq`;
                    // --- IMPORTANT: Reference allConsequencesData here ---
                    const consequence = allConsequencesData[consequenceKey]
                        ?.find(c => c.challenge_option_id === selectedOptionId);
                    if (consequence) effectsToApply.push(...consequence.effects);
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    await this.storePermanentAdjustments(team.id, this.currentDbSession.id, effectsToApply,
                        `${currentPhase.label} - ${selectedOptionId}`);

                    await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                }
            }

            await this.fetchTeamRoundDataFromHook(this.currentDbSession.id);
            console.log(`[DecisionEngine] Successfully processed choice phase ${phaseId} decisions.`);
        } catch (err) {
            console.error('[DecisionEngine] Error processing choice decisions:', err);
            throw err;
        }
    }

    // TODO: Implement other methods like processDoubleDown() here, if applicable
    // TODO: Potentially integrate `calculateAndFinalizeRoundKPIs` from `useGameProcessing.ts` into this class.
}

// NOTE: The `useGameProcessing` hook at `src/core/game/useGameProcessing.ts` will need to be updated
// to instantiate and use this `DecisionEngine` class instead of containing the logic itself.
// After implementing this class, you should remove the `processChoicePhaseDecisionsInternal`
// function from `useGameProcessing.ts` and modify `useGameProcessing` to use a `new DecisionEngine(...)` instance.