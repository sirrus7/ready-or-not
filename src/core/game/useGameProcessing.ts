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
    updateSessionInDb: (updates: any) => Promise<void>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

interface UseGameProcessingReturn {
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => Promise<void>;
    resetGameProgress: () => Promise<void>;
    isLoadingProcessingDecisions: boolean;
    processInteractiveSlide: (completedSlide: Slide) => Promise<void>;
}

export const useGameProcessing = ({
                                      currentDbSession,
                                      gameStructure,
                                      teams,
                                      teamDecisions,
                                      teamRoundData,
                                      updateSessionInDb,
                                      fetchTeamRoundDataFromHook,
                                      setTeamRoundDataDirectly
                                  }: UseGameProcessingProps): UseGameProcessingReturn => {
    const navigate = useNavigate();

    const decisionEngine = useMemo(() => {
        return new DecisionEngine({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly
        });
    }, [currentDbSession, gameStructure, teams, teamDecisions, teamRoundData, fetchTeamRoundDataFromHook, setTeamRoundDataDirectly]);

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
    }, [currentDbSession, gameStructure, teams, teamDecisions, teamRoundData, fetchTeamRoundDataFromHook, setTeamRoundDataDirectly]);

    const processInteractiveSlide = useCallback(async (completedSlide: Slide) => {
        console.log('[useGameProcessing] Processing completed interactive slide:', completedSlide.id);
        if (!currentDbSession?.id || !gameStructure || teams.length === 0 || !completedSlide.interactive_data_key) {
            console.warn('[useGameProcessing] Skipping processing - insufficient data');
            return;
        }
        try {
            await decisionEngine.processInteractiveSlide(completedSlide);
        } catch (error) {
            console.error('[useGameProcessing] Slide processing failed:', error);
            throw error;
        }
    }, [decisionEngine, currentDbSession, gameStructure, teams]);

    const {
        execute: processInvestmentPayoffsExecute,
        isLoading: isProcessingPayoffs,
    } = useSupabaseMutation(
        (roundNumber: 1 | 2 | 3) => {
            if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
                throw new Error('Insufficient data for investment processing');
            }
            return investmentEngine.processInvestmentPayoffs(roundNumber);
        }
    );

    const {
        execute: calculateKPIsExecute,
        isLoading: isCalculatingKPIs,
    } = useSupabaseMutation(
        async (roundNumber: 1 | 2 | 3) => {
            if (!currentDbSession?.id || !teams.length) {
                throw new Error('Cannot finalize KPIs - missing session or teams');
            }
            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis) {
                    const finalizedKpis = KpiCalculations.calculateFinalKpis(kpis);
                    await db.kpis.update(kpis.id, finalizedKpis);
                }
            }
            await fetchTeamRoundDataFromHook(currentDbSession.id);
        }
    );

    const {
        execute: resetGameProgressExecute,
        isLoading: isResettingGame,
    } = useSupabaseMutation(
        async () => {
            if (!currentDbSession?.id || !gameStructure) {
                throw new Error('Cannot reset game - missing session or structure');
            }
            if (!window.confirm("Are you sure you want to reset all game progress? This will clear all decisions and KPI data and return to the first slide. This action cannot be undone.")) return;

            await db.adjustments.deleteBySession(currentDbSession.id);
            await db.kpis.deleteBySession(currentDbSession.id);
            await db.decisions.deleteBySession(currentDbSession.id);

            // REFACTOR: Use current_slide_index to reset to the start.
            await updateSessionInDb({
                current_slide_index: 0,
                is_playing: false,
                is_complete: false,
                teacher_notes: {}
            });
            alert("Game progress has been reset successfully.");
        },
        {
            onSuccess: () => navigate('/dashboard', {replace: true}),
            onError: (error) => console.error('[useGameProcessing] Failed to reset game progress:', error),
        }
    );

    const processInvestmentPayoffs = useCallback((roundNumber: 1 | 2 | 3) => processInvestmentPayoffsExecute(roundNumber), [processInvestmentPayoffsExecute]);
    const resetGameProgress = useCallback(() => resetGameProgressExecute(), [resetGameProgressExecute]);

    return {
        processInvestmentPayoffs,
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress,
        isLoadingProcessingDecisions: isProcessingPayoffs || isCalculatingKPIs || isResettingGame,
        processInteractiveSlide
    };
};
