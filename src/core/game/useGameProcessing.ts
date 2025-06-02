// src/core/game/useGameProcessing.ts
import {useCallback, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {db} from '@shared/services/supabase';
import {useSupabaseMutation} from '@shared/hooks/supabase';
import {
    Team,
    TeamDecision,
    TeamRoundData,
    GameStructure,
    GameSession,
    GamePhaseNode,
    KpiEffect,
    Slide
} from '@shared/types';
import {KpiCalculations} from './ScoringEngine';
import {DecisionEngine} from './DecisionEngine';
import {InvestmentEngine} from './InvestmentEngine';

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
    processChoicePhaseDecisions: (phaseId: string, associatedSlide: Slide | null) => Promise<void>;
}

/**
 * useGameProcessing orchestrates the application of game logic (payoffs, consequences, KPI finalization).
 * It instantiates and uses specialized "Engines" for specific processing tasks.
 */
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

    // Instantiate DecisionEngine
    const decisionEngine = useMemo(() => {
        return new DecisionEngine({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            allPhasesInOrder,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly
        });
    }, [
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        allPhasesInOrder,
        fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly
    ]);

    // Instantiate InvestmentEngine
    const investmentEngine = useMemo(() => {
        return new InvestmentEngine({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly
        });
    }, [
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly
    ]);

    // Process choice phase decisions (exposed via this hook to useGameController)
    const processChoicePhaseDecisions = useCallback(async (phaseId: string, associatedSlide: Slide | null) => {
        // Delegate to the DecisionEngine
        await decisionEngine.processChoicePhaseDecisions(phaseId, associatedSlide);
    }, [decisionEngine]);

    // Process investment payoffs (exposed via this hook to useGameController)
    // Wrapped in useSupabaseMutation to manage its loading state
    const {
        execute: processInvestmentPayoffsExecute,
        isLoading: isProcessingPayoffs, // Now correctly defined here
        error: payoffProcessingError
    } = useSupabaseMutation(
        async (data: { roundNumber: 1 | 2 | 3; currentPhaseId: string | null }) => {
            // Delegate to the InvestmentEngine's method
            await investmentEngine.processInvestmentPayoffs(data.roundNumber, data.currentPhaseId);
        },
        {
            onSuccess: () => {
                console.log('[useGameProcessing] Investment payoffs processed successfully');
                // fetchTeamRoundDataFromHook is already called by InvestmentEngine after processing
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

            // TODO: This should ideally be moved to GameSessionManager (it already has a resetSessionProgress method, but it only resets session properties, not related tables data) or a dedicated GameResetManager
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
            await updateSessionInDb({ // This calls updateSessionInDb from useSessionManager
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
            processInvestmentPayoffsExecute({roundNumber, currentPhaseId}),
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress: () => resetGameProgressExecute(),
        isLoadingProcessingDecisions: isProcessingPayoffs || isCalculatingKPIs || isResettingGame,
        processChoicePhaseDecisions: processChoicePhaseDecisions
    };
};
