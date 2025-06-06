// src/core/game/useGameProcessing.ts - Enhanced with proper investment processing
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
 * Enhanced useGameProcessing with proper investment processing integration
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
        console.log('[useGameProcessing] Processing choice phase decisions for:', phaseId);

        if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
            console.warn('[useGameProcessing] Skipping choice processing - insufficient data');
            return;
        }

        try {
            await decisionEngine.processChoicePhaseDecisions(phaseId, associatedSlide);
            console.log('[useGameProcessing] Choice processing completed successfully');
        } catch (error) {
            console.error('[useGameProcessing] Choice processing failed:', error);
            throw error;
        }
    }, [decisionEngine, currentDbSession, gameStructure, teams]);

    // Enhanced investment payoff processing with better error handling and logging
    const {
        execute: processInvestmentPayoffsExecute,
        isLoading: isProcessingPayoffs,
        error: payoffProcessingError
    } = useSupabaseMutation(
        async (data: { roundNumber: 1 | 2 | 3; currentPhaseId: string | null }) => {
            console.log('[useGameProcessing] Starting investment payoff processing:', {
                round: data.roundNumber,
                phase: data.currentPhaseId,
                teamsCount: teams.length
            });

            if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
                throw new Error('Insufficient data for investment processing');
            }

            // Log current team decisions for debugging
            console.log('[useGameProcessing] Current team decisions:', {
                sessionsWithDecisions: Object.keys(teamDecisions).length,
                totalDecisions: Object.values(teamDecisions).reduce((sum, teamDecs) => sum + Object.keys(teamDecs).length, 0)
            });

            // Delegate to InvestmentEngine
            await investmentEngine.processInvestmentPayoffs(data.roundNumber, data.currentPhaseId);

            console.log('[useGameProcessing] Investment payoffs processing completed');
        },
        {
            onSuccess: (_, data) => {
                console.log('[useGameProcessing] Investment payoffs processed successfully for round', data.roundNumber);
                // Data refresh is handled by InvestmentEngine
            },
            onError: (error, data) => {
                console.error('[useGameProcessing] Failed to process investment payoffs for round', data?.roundNumber, ':', error);
            }
        }
    );

    // KPI finalization processing
    const {
        execute: calculateKPIsExecute,
        isLoading: isCalculatingKPIs,
        error: kpiCalculationError
    } = useSupabaseMutation(
        async (roundNumber: 1 | 2 | 3) => {
            console.log('[useGameProcessing] Finalizing KPIs for round', roundNumber);

            if (!currentDbSession?.id || !teams.length) {
                throw new Error('Cannot finalize KPIs - missing session or teams');
            }

            let updatedCount = 0;
            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis) {
                    const finalizedKpis = KpiCalculations.calculateFinalKpis(kpis);
                    await db.kpis.update(kpis.id, finalizedKpis);
                    updatedCount++;
                    console.log(`[useGameProcessing] Finalized KPIs for team ${team.name}`);
                } else {
                    console.warn(`[useGameProcessing] No KPI data found for team ${team.name} round ${roundNumber}`);
                }
            }

            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`[useGameProcessing] KPI finalization complete - updated ${updatedCount} teams`);
        },
        {
            onSuccess: (_, roundNumber) => {
                console.log('[useGameProcessing] Round KPIs calculated successfully for round', roundNumber);
            },
            onError: (error, roundNumber) => {
                console.error('[useGameProcessing] Failed to calculate round KPIs for round', roundNumber, ':', error);
            }
        }
    );

    // Game reset processing
    const {
        execute: resetGameProgressExecute,
        isLoading: isResettingGame,
        error: gameResetError
    } = useSupabaseMutation(
        async () => {
            if (!currentDbSession?.id || !gameStructure) {
                throw new Error('Cannot reset game - missing session or structure');
            }

            const confirmReset = window.confirm(
                "Are you sure you want to reset all game progress? This will:\n\n" +
                "• Clear all team decisions\n" +
                "• Reset all KPI data\n" +
                "• Remove all permanent adjustments\n" +
                "• Return to the first slide\n\n" +
                "This action cannot be undone."
            );

            if (!confirmReset) return;

            console.log('[useGameProcessing] Starting game reset for session:', currentDbSession.id);

            // Delete all related data
            await db.adjustments.deleteBySession(currentDbSession.id);
            console.log('[useGameProcessing] Cleared permanent adjustments');

            // Reset KPI data
            const allKpis = await db.kpis.getBySession(currentDbSession.id);
            for (const kpi of allKpis) {
                const resetKpis = KpiCalculations.resetKpiData(kpi as TeamRoundData);
                await db.kpis.update(kpi.id, resetKpis);
            }
            console.log('[useGameProcessing] Reset KPI data');

            // Delete all decisions
            const allDecisions = await db.decisions.getBySession(currentDbSession.id);
            for (const decision of allDecisions) {
                await db.decisions.delete(currentDbSession.id, decision.team_id, decision.phase_id);
            }
            console.log('[useGameProcessing] Cleared all decisions');

            // Reset session to initial state
            const initialPhase = gameStructure.allPhases[0];
            await updateSessionInDb({
                current_phase_id: initialPhase?.id || null,
                current_slide_id_in_phase: initialPhase ? 0 : null,
                is_playing: false,
                is_complete: false,
                teacher_notes: {}
            });

            console.log('[useGameProcessing] Game reset completed');
            alert("Game progress has been reset successfully.");
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

    // Wrapper functions for external use
    const processInvestmentPayoffs = useCallback((roundNumber: 1 | 2 | 3, currentPhaseId: string | null) => {
        return processInvestmentPayoffsExecute({roundNumber, currentPhaseId});
    }, [processInvestmentPayoffsExecute]);

    const resetGameProgress = useCallback(() => {
        return resetGameProgressExecute();
    }, [resetGameProgressExecute]);

    return {
        processInvestmentPayoffs,
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress,
        isLoadingProcessingDecisions: isProcessingPayoffs || isCalculatingKPIs || isResettingGame,
        processChoicePhaseDecisions
    };
};
