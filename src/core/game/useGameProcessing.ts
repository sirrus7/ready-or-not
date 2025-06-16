// src/core/game/useGameProcessing.ts
// FIXED VERSION - Includes decision refresh for decision history update

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
import {ConsequenceProcessor} from './ConsequenceProcessor';

interface UseGameProcessingProps {
    currentDbSession: GameSession | null;
    gameStructure: GameStructure | null;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    updateSessionInDb: (updates: any) => Promise<void>;
    fetchTeamRoundDataFromHook: (sessionId: string) => Promise<void>;
    fetchTeamDecisionsFromHook: (sessionId: string) => Promise<void>; // ADDED: For decision history refresh
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

interface UseGameProcessingReturn {
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => void;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => void;
    resetGameProgress: () => void;
    isLoadingProcessingDecisions: boolean;
    processInteractiveSlide: (completedSlide: Slide) => Promise<void>;
    processConsequenceSlide: (consequenceSlide: Slide) => Promise<void>;
}

export const useGameProcessing = ({
                                      currentDbSession,
                                      gameStructure,
                                      teams,
                                      teamDecisions,
                                      teamRoundData,
                                      updateSessionInDb,
                                      fetchTeamRoundDataFromHook,
                                      fetchTeamDecisionsFromHook, // ADDED
                                      setTeamRoundDataDirectly,
                                  }: UseGameProcessingProps): UseGameProcessingReturn => {
    const navigate = useNavigate();

    // FIXED: Initialize processing engines with decision refresh capability
    const decisionEngine = useMemo(() => new DecisionEngine({
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        fetchTeamRoundDataFromHook,
        fetchTeamDecisionsFromHook, // ADDED
        setTeamRoundDataDirectly,
    }), [currentDbSession, gameStructure, teams, teamDecisions, teamRoundData, fetchTeamRoundDataFromHook, fetchTeamDecisionsFromHook, setTeamRoundDataDirectly]);

    const investmentEngine = useMemo(() => new InvestmentEngine({
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly,
    }), [currentDbSession, gameStructure, teams, teamDecisions, teamRoundData, fetchTeamRoundDataFromHook, setTeamRoundDataDirectly]);

    const consequenceProcessor = useMemo(() => new ConsequenceProcessor({
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly,
    }), [currentDbSession, gameStructure, teams, teamDecisions, teamRoundData, fetchTeamRoundDataFromHook, setTeamRoundDataDirectly]);

    // FIXED: Process interactive slides with decision history refresh
    const processInteractiveSlide = useCallback(async (completedSlide: Slide) => {
        console.log('[useGameProcessing] Processing interactive slide:', completedSlide.id);
        if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
            console.warn('[useGameProcessing] Skipping processing - insufficient data');
            return;
        }
        try {
            await decisionEngine.processInteractiveSlide(completedSlide);
            console.log('[useGameProcessing] Interactive slide processed, decision history should be updated');
        } catch (error) {
            console.error('[useGameProcessing] Slide processing failed:', error);
            throw error;
        }
    }, [decisionEngine, currentDbSession, gameStructure, teams]);

    // Process consequence slides
    const processConsequenceSlide = useCallback(async (consequenceSlide: Slide) => {
        console.log('[useGameProcessing] Processing consequence slide:', consequenceSlide.id);
        if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
            console.warn('[useGameProcessing] Skipping consequence processing - insufficient data');
            return;
        }
        try {
            await consequenceProcessor.processConsequenceSlide(consequenceSlide);
        } catch (error) {
            console.error('[useGameProcessing] Consequence processing failed:', error);
            throw error;
        }
    }, [consequenceProcessor, currentDbSession, gameStructure, teams]);

    // Process investment payoffs
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

    // Calculate and finalize KPIs
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

    // Reset game progress
    const {
        execute: resetGameProgressExecute,
        isLoading: isResettingGame,
    } = useSupabaseMutation(
        async (_variables: void) => {
            if (!currentDbSession?.id || !gameStructure) {
                throw new Error('Cannot reset game - missing session or structure');
            }
            if (!window.confirm("Are you sure you want to reset all game progress? This will clear all decisions and KPI data and return to the first slide. This action cannot be undone.")) {
                return;
            }

            console.log('[useGameProcessing] Resetting game progress...');

            // Clear all game data
            await db.decisions.deleteBySession(currentDbSession.id);
            await db.kpis.deleteBySession(currentDbSession.id);
            await db.adjustments.deleteBySession(currentDbSession.id);

            // Reset session to first slide
            await updateSessionInDb({
                current_slide_id: gameStructure.slides[0]?.id || 1,
                current_slide_index: 0
            });

            // FIXED: Refresh both KPI and decision data
            await fetchTeamRoundDataFromHook(currentDbSession.id);
            await fetchTeamDecisionsFromHook(currentDbSession.id);

            console.log('[useGameProcessing] Game progress reset complete');
        }
    );

    return {
        processInvestmentPayoffs: processInvestmentPayoffsExecute,
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress: resetGameProgressExecute,
        isLoadingProcessingDecisions: isProcessingPayoffs || isCalculatingKPIs || isResettingGame,
        processInteractiveSlide,
        processConsequenceSlide,
    };
};
