// src/hooks/useGameProcessing.ts
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../utils/supabase';
import { useSupabaseMutation } from './supabase';
import {
    Team,
    TeamDecision,
    TeamRoundData,
    GameStructure,
    GameSession,
    GamePhaseNode,
    KpiEffect
} from '../types';
import { KpiCalculations } from '../utils/kpiCalculations';

interface UseGameProcessingProps {
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

interface UseGameProcessingReturn {
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3, currentPhaseId: string | null) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => Promise<void>;
    isLoadingProcessingDecisions: boolean;
    processChoicePhaseDecisions: (phaseId: string) => Promise<void>;
}

export const useGameProcessing = ({
                                      currentDbSession,
                                      gameStructure,
                                      teams,
                                      teamDecisions,
                                      teamRoundData,
                                      allPhasesInOrder,
                                      updateSessionInDb,
                                      fetchTeamRoundDataFromHook,
                                      setTeamRoundDataDirectly
                                  }: UseGameProcessingProps): UseGameProcessingReturn => {
    const navigate = useNavigate();

    // Ensure team round data exists
    const ensureTeamRoundData = useCallback(async (
        teamId: string,
        roundNumber: 1 | 2 | 3,
        sessionId: string
    ): Promise<TeamRoundData> => {
        if (!sessionId || sessionId === 'new') throw new Error("Invalid sessionId");

        const existingKpis = teamRoundData[teamId]?.[roundNumber];
        if (existingKpis) return existingKpis;

        // Try to fetch from database
        try {
            const existingData = await db.kpis.getForTeamRound(sessionId, teamId, roundNumber);
            if (existingData) {
                setTeamRoundDataDirectly(prev => ({
                    ...prev,
                    [teamId]: {...(prev[teamId] || {}), [roundNumber]: existingData as TeamRoundData}
                }));
                return existingData as TeamRoundData;
            }
        } catch (error) {
            console.log('[useGameProcessing] No existing round data found, creating new');
        }

        // Create new round data using utility functions
        const newRoundData = await KpiCalculations.createNewRoundData(
            sessionId,
            teamId,
            roundNumber,
            teamRoundData[teamId]
        );

        // Apply permanent adjustments
        const adjustments = await db.adjustments.getBySession(sessionId);
        const adjustedData = KpiCalculations.applyPermanentAdjustments(newRoundData, adjustments, teamId, roundNumber);

        const insertedData = await db.kpis.create(adjustedData);
        setTeamRoundDataDirectly(prev => ({
            ...prev,
            [teamId]: {...(prev[teamId] || {}), [roundNumber]: insertedData as TeamRoundData}
        }));

        return insertedData as TeamRoundData;
    }, [teamRoundData, setTeamRoundDataDirectly]);

    // Store permanent adjustments
    const storePermanentAdjustments = useCallback(async (
        teamId: string,
        sessionId: string,
        effects: KpiEffect[],
        phaseSourceLabel: string
    ) => {
        const adjustmentsToInsert = KpiCalculations.createPermanentAdjustments(
            effects,
            sessionId,
            teamId,
            phaseSourceLabel
        );

        if (adjustmentsToInsert.length > 0) {
            await db.adjustments.create(adjustmentsToInsert);
        }
    }, []);

    // Process choice phase decisions
    const processChoicePhaseDecisionsInternal = useCallback(async (phaseId: string) => {
        const currentPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (!currentDbSession?.id || !gameStructure || !currentPhase ||
            !teams.length || currentPhase.phase_type !== 'choice') {
            return;
        }

        try {
            for (const team of teams) {
                const teamKpis = await ensureTeamRoundData(team.id, currentPhase.round_number as 1 | 2 | 3, currentDbSession.id);
                const decision = teamDecisions[team.id]?.[phaseId];
                const effectsToApply: KpiEffect[] = [];

                const optionsKey = currentPhase.interactive_data_key || phaseId;
                const options = gameStructure.all_challenge_options[optionsKey] || [];
                const selectedOptionId = decision?.selected_challenge_option_id ||
                    options.find(opt => opt.is_default_choice)?.id;

                if (selectedOptionId) {
                    const consequenceKey = `${phaseId}-conseq`;
                    const consequence = gameStructure.all_consequences[consequenceKey]
                        ?.find(c => c.challenge_option_id === selectedOptionId);
                    if (consequence) effectsToApply.push(...consequence.effects);
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply,
                        `${currentPhase.label} - ${selectedOptionId}`);

                    await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                }
            }

            await fetchTeamRoundDataFromHook(currentDbSession.id);
        } catch (err) {
            console.error('[useGameProcessing] Error processing choice decisions:', err);
            throw err;
        }
    }, [currentDbSession, teams, teamDecisions, gameStructure, ensureTeamRoundData,
        storePermanentAdjustments, fetchTeamRoundDataFromHook, allPhasesInOrder]);

    // Enhanced mutations for game processing
    const {
        execute: processInvestmentPayoffsExecute,
        isLoading: isProcessingPayoffs,
        error: payoffProcessingError
    } = useSupabaseMutation(
        async (data: { roundNumber: 1 | 2 | 3; currentPhaseId: string | null }) => {
            if (!currentDbSession?.id || !gameStructure || !teams.length) return;

            const payoffKey = `rd${data.roundNumber}-payoff`;
            const payoffs = gameStructure.all_investment_payoffs[payoffKey] || [];

            for (const team of teams) {
                const teamKpis = await ensureTeamRoundData(team.id, data.roundNumber, currentDbSession.id);
                const investPhaseId = `rd${data.roundNumber}-invest`;
                const investmentDecision = teamDecisions[team.id]?.[investPhaseId];
                const selectedInvestmentIds = investmentDecision?.selected_investment_ids || [];

                const effectsToApply: KpiEffect[] = [];
                selectedInvestmentIds.forEach(investId => {
                    const payoff = payoffs.find(p => p.investment_option_id === investId);
                    if (payoff) effectsToApply.push(...payoff.effects);
                });

                // Handle unspent budget for RD1
                if (data.roundNumber === 1 && data.currentPhaseId === 'rd1-payoff') {
                    const budget = gameStructure.investment_phase_budgets['rd1-invest'];
                    const spent = investmentDecision?.total_spent_budget ?? 0;
                    const unspent = budget - spent;
                    if (unspent > 0) {
                        effectsToApply.push({
                            kpi: 'cost',
                            change_value: -unspent,
                            timing: 'immediate',
                            description: 'RD-1 Unspent Budget Cost Reduction'
                        });
                    }
                }

                if (effectsToApply.length > 0) {
                    const updatedKpis = KpiCalculations.applyKpiEffects(teamKpis, effectsToApply);
                    await storePermanentAdjustments(team.id, currentDbSession.id, effectsToApply,
                        `RD${data.roundNumber} Investment Payoff`);

                    await db.kpis.upsert({...updatedKpis, id: teamKpis.id});
                }
            }
        },
        {
            onSuccess: () => {
                console.log('[useGameProcessing] Investment payoffs processed successfully');
                if (currentDbSession?.id) {
                    fetchTeamRoundDataFromHook(currentDbSession.id);
                }
            },
            onError: (error) => {
                console.error('[useGameProcessing] Failed to process investment payoffs:', error);
            }
        }
    );

    const {
        execute: calculateKPIsExecute,
        isLoading: isCalculatingKPIs,
        error: kpiCalculationError
    } = useSupabaseMutation(
        async (roundNumber: 1 | 2 | 3) => {
            if (!currentDbSession?.id || !teams.length) return;

            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis) {
                    const finalizedKpis = KpiCalculations.calculateFinalKpis(kpis);
                    await db.kpis.update(kpis.id, finalizedKpis);
                }
            }

            await fetchTeamRoundDataFromHook(currentDbSession.id);
        },
        {
            onSuccess: () => {
                console.log('[useGameProcessing] Round KPIs calculated successfully');
                if (currentDbSession?.id) {
                    fetchTeamRoundDataFromHook(currentDbSession.id);
                }
            },
            onError: (error) => {
                console.error('[useGameProcessing] Failed to calculate round KPIs:', error);
            }
        }
    );

    const {
        execute: resetGameProgressExecute,
        isLoading: isResettingGame,
        error: gameResetError
    } = useSupabaseMutation(
        async () => {
            if (!currentDbSession?.id || !gameStructure) return;

            const confirmReset = window.confirm("Are you sure you want to reset all game progress?");
            if (!confirmReset) return;

            // Enhanced database services for cleanup
            await db.adjustments.deleteBySession(currentDbSession.id);
            await db.kpis.getBySession(currentDbSession.id).then(async (kpis) => {
                for (const kpi of kpis) {
                    const resetKpis = KpiCalculations.resetKpiData(kpi as TeamRoundData);
                    await db.kpis.update(kpi.id, resetKpis);
                }
            });
            await db.decisions.getBySession(currentDbSession.id).then(async (decisions) => {
                for (const decision of decisions) {
                    await db.decisions.delete(currentDbSession.id, decision.team_id, decision.phase_id);
                }
            });

            const initialPhase = gameStructure.allPhases[0];
            await updateSessionInDb({
                current_phase_id: initialPhase?.id || null,
                current_slide_id_in_phase: initialPhase ? 0 : null,
                is_playing: false,
                is_complete: false,
                teacher_notes: {}
            });

            alert("Game progress has been reset.");
        },
        {
            onSuccess: () => {
                console.log('[useGameProcessing] Game progress reset successfully');
                navigate('/dashboard', {replace: true});
            },
            onError: (error) => {
                console.error('[useGameProcessing] Failed to reset game progress:', error);
            }
        }
    );

    return {
        processInvestmentPayoffs: (roundNumber, currentPhaseId) =>
            processInvestmentPayoffsExecute({ roundNumber, currentPhaseId }),
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress: () => resetGameProgressExecute(),
        isLoadingProcessingDecisions: isProcessingPayoffs || isCalculatingKPIs || isResettingGame,
        processChoicePhaseDecisions: processChoicePhaseDecisionsInternal
    };
};