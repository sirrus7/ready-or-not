// src/core/game/DecisionEngine.ts
import {
    GameSession,
    Team,
    TeamDecision,
    TeamRoundData,
    GameStructure,
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
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

export class DecisionEngine {
    private props: DecisionEngineProps;

    constructor(props: DecisionEngineProps) {
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
            console.log(`[DecisionEngine] No existing round data found for team ${teamId} round ${roundNumber}, creating new.`);
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
            // Use the new idempotent upsert method
            await db.adjustments.upsert(adjustmentsToUpsert);
        }
    }

    /**
     * REFACTOR: This is the new primary processing method.
     * Processes decisions made during an interactive slide and applies consequences.
     * @param completedSlide The interactive slide that was just completed.
     */
    public async processInteractiveSlide(completedSlide: Slide): Promise<void> {
        const {currentDbSession, gameStructure, teams, teamDecisions, fetchTeamRoundDataFromHook} = this.props;
        const interactiveDataKey = completedSlide.interactive_data_key;

        if (!currentDbSession?.id || !gameStructure || !teams.length || !interactiveDataKey) {
            console.warn(`[DecisionEngine] Skipping processing for slide ${completedSlide.id} due to invalid state.`);
            return;
        }

        console.log(`[DecisionEngine] Processing decisions for interactive slide: ${completedSlide.id} (key: ${interactiveDataKey})`);

        try {
            for (const team of teams) {
                const teamKpis = await this.ensureTeamRoundData(team.id, completedSlide.round_number as 1 | 2 | 3);
                const decision = teamDecisions[team.id]?.[interactiveDataKey];

                const options = gameStructure.all_challenge_options[interactiveDataKey] || [];
                const selectedOptionId = decision?.selected_challenge_option_id || options.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    const consequenceKey = `${interactiveDataKey}-conseq`;
                    const allConsequencesForSlide = gameStructure.all_consequences[consequenceKey];
                    const consequence = allConsequencesForSlide?.find(c => c.challenge_option_id === selectedOptionId);

                    if (consequence && consequence.effects.length > 0) {
                        const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, consequence.effects);
                        await this.storePermanentAdjustments(team.id, currentDbSession.id, consequence.effects, `${interactiveDataKey} - ${selectedOptionId}`);
                        await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                        console.log(`[DecisionEngine] Team ${team.name}: Applied consequences for choice '${selectedOptionId}'.`);
                    } else {
                        console.warn(`[DecisionEngine] Team ${team.name}: No consequence found for key ${consequenceKey}, option ${selectedOptionId}.`);
                    }
                }
            }

            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`[DecisionEngine] Successfully processed interactive slide ${completedSlide.id} for all teams.`);
        } catch (err) {
            console.error(`[DecisionEngine] Error processing decisions for slide ${completedSlide.id}:`, err);
            throw err;
        }
    }
}
