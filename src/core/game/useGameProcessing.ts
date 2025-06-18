// src/core/game/useGameProcessing.ts
// CRITICAL FIX: Stabilized ConsequenceProcessor to prevent infinite loop recreation

import {useCallback, useMemo, useRef} from 'react';
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
    fetchTeamDecisionsFromHook: (sessionId: string) => Promise<void>;
    setTeamRoundDataDirectly: (updater: (prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>) => void;
}

interface UseGameProcessingReturn {
    processInteractiveSlide: (completedSlide: Slide) => Promise<void>;
    processConsequenceSlide: (consequenceSlide: Slide) => Promise<void>;
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => void;
    calculateAndFinalizeRoundKPIs: (roundNumber: 1 | 2 | 3) => void;
    resetGameProgress: () => void;
    isLoadingProcessingDecisions: boolean;
    isLoadingProcessingPayoffs: boolean;
    isLoadingCalculatingKPIs: boolean;
    isLoadingResettingGame: boolean;
}

export const useGameProcessing = (props: UseGameProcessingProps): UseGameProcessingReturn => {
    const {
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        updateSessionInDb,
        fetchTeamRoundDataFromHook,
        fetchTeamDecisionsFromHook,
        setTeamRoundDataDirectly,
    } = props;

    const navigate = useNavigate();

    // CRITICAL FIX: Use refs to track stable values for ConsequenceProcessor
    const stableSessionIdRef = useRef<string | null>(null);
    const stableGameStructureRef = useRef<GameStructure | null>(null);
    const stableTeamsRef = useRef<Team[]>([]);

    // Update refs when core dependencies change
    if (currentDbSession?.id !== stableSessionIdRef.current) {
        stableSessionIdRef.current = currentDbSession?.id || null;
    }
    if (gameStructure !== stableGameStructureRef.current) {
        stableGameStructureRef.current = gameStructure;
    }
    if (teams !== stableTeamsRef.current) {
        stableTeamsRef.current = teams;
    }

    // CRITICAL FIX: Stabilized ConsequenceProcessor - only recreate on session/structure changes
    const consequenceProcessor = useMemo(() => {
        if (!currentDbSession || !gameStructure) return null;

        console.log('[useGameProcessing] Creating ConsequenceProcessor instance for session:', currentDbSession.id);

        return new ConsequenceProcessor({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly,
        });
    }, [
        currentDbSession?.id,  // CRITICAL: Only session ID, not the full object
        gameStructure,         // CRITICAL: Only recreate if structure changes
        // REMOVED: teamDecisions, teamRoundData, teams - these cause recreation loops
    ]);

    // Update processor props dynamically without recreation
    if (consequenceProcessor) {
        consequenceProcessor.updateProps({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly,
        });
    }

    // Standard engines that can be recreated safely
    const decisionEngine = useMemo(() => new DecisionEngine({
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        fetchTeamRoundDataFromHook,
        fetchTeamDecisionsFromHook,
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

    // Process interactive slides
    const processInteractiveSlide = useCallback(async (completedSlide: Slide) => {
        console.log('[useGameProcessing] Processing interactive slide:', completedSlide.id);
        if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
            console.warn('[useGameProcessing] Skipping processing - insufficient data');
            return;
        }
        try {
            await decisionEngine.processInteractiveSlide(completedSlide);
            console.log('[useGameProcessing] Interactive slide processed, decision history updated');

            // Additional decision refresh to ensure timeline updates
            await fetchTeamDecisionsFromHook(currentDbSession.id);
            console.log('[useGameProcessing] Forced decision history refresh complete');
        } catch (error) {
            console.error('[useGameProcessing] Slide processing failed:', error);
            throw error;
        }
    }, [decisionEngine, currentDbSession, gameStructure, teams, fetchTeamDecisionsFromHook]);

    // CRITICAL FIX: Stabilized consequence processing
    const processConsequenceSlide = useCallback(async (consequenceSlide: Slide) => {
        console.log('[useGameProcessing] Processing consequence slide:', consequenceSlide.id);
        if (!currentDbSession?.id || !gameStructure || teams.length === 0 || !consequenceProcessor) {
            console.warn('[useGameProcessing] Skipping consequence processing - insufficient data or no processor');
            return;
        }
        try {
            await consequenceProcessor.processConsequenceSlide(consequenceSlide);
            console.log('[useGameProcessing] Consequence slide processed, refreshing all data');

            // CRITICAL: Refresh both KPI data and decision history after consequence processing
            await Promise.all([
                fetchTeamRoundDataFromHook(currentDbSession.id),
                fetchTeamDecisionsFromHook(currentDbSession.id)
            ]);
            console.log('[useGameProcessing] Complete data refresh after consequence processing');
        } catch (error) {
            console.error('[useGameProcessing] Consequence processing failed:', error);
            throw error;
        }
    }, [consequenceProcessor, currentDbSession?.id, gameStructure, teams.length, fetchTeamRoundDataFromHook, fetchTeamDecisionsFromHook]);

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

            console.log(`[useGameProcessing] Calculating and finalizing KPIs for round ${roundNumber}`);

            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis?.id) {
                    const financialMetrics = KpiCalculations.calculateFinancialMetrics(kpis);
                    await db.kpis.update(kpis.id, {
                        ...kpis,
                        ...financialMetrics,
                        is_final: true
                    });
                }
            }

            await fetchTeamRoundDataFromHook(currentDbSession.id);
            console.log(`[useGameProcessing] KPIs finalized for round ${roundNumber}`);
        }
    );

    // FIXED: Reset game progress
    const {
        execute: resetGameProgressExecute,
        isLoading: isResettingGame,
    } = useSupabaseMutation(
        async (_variables: void) => {
            if (!currentDbSession?.id) {
                throw new Error('No session to reset');
            }

            if (!confirm("Are you sure you want to reset all game progress? This will clear all decisions and KPI data and return to the first slide. This action cannot be undone.")) {
                return;
            }

            try {
                // CRITICAL FIX: Reset consequence processing state
                if (consequenceProcessor) {
                    consequenceProcessor.resetProcessedSlides();
                    console.log('[useGameProcessing] Reset consequence processor state');
                }

                // Delete all team decisions and KPI data for this session
                await Promise.all([
                    db.decisions.deleteBySession(currentDbSession.id),
                    db.kpis.deleteBySession(currentDbSession.id),
                    db.adjustments.deleteBySession(currentDbSession.id)
                ]);

                // Reset session to slide 0
                await updateSessionInDb({
                    current_slide_index: 0,
                    is_complete: false,
                    teacher_notes: {}
                });

                // Redirect to first slide
                navigate(`/host/${currentDbSession.id}`);

                console.log('[useGameProcessing] Game progress reset successfully');
            } catch (error) {
                console.error('Error resetting game progress:', error);
                throw error;
            }
        }
    );

    return {
        processInteractiveSlide,
        processConsequenceSlide,
        processInvestmentPayoffs: processInvestmentPayoffsExecute,
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress: resetGameProgressExecute,
        isLoadingProcessingDecisions: false,
        isLoadingProcessingPayoffs: isProcessingPayoffs,
        isLoadingCalculatingKPIs: isCalculatingKPIs,
        isLoadingResettingGame: isResettingGame,
    };
};
