// src/core/game/useGameProcessing.ts
// SIMPLIFIED: Eliminates DecisionEngine, uses inline logic and utilities

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
import {KpiDataUtils} from './KpiDataUtils';
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
    processInvestmentPayoffs: (roundNumber: 1 | 2 | 3) => Promise<void>;
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

    // Update refs when core dependencies change
    if (currentDbSession?.id !== stableSessionIdRef.current) {
        stableSessionIdRef.current = currentDbSession?.id || null;
    }
    if (gameStructure !== stableGameStructureRef.current) {
        stableGameStructureRef.current = gameStructure;
    }

    // STABILIZED ConsequenceProcessor - only recreate on session/structure changes
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

    // Investment engine (CRITICAL: Must NOT include teams, teamDecisions, teamRoundData in dependencies)
    const investmentEngine = useMemo(() => new InvestmentEngine({
        currentDbSession,
        gameStructure,
        teams,
        teamDecisions,
        teamRoundData,
        fetchTeamRoundDataFromHook,
        setTeamRoundDataDirectly,
    }), [currentDbSession, gameStructure]); // ✅ CRITICAL: Only stable dependencies to prevent recreation loops

    // Update investment engine props dynamically without recreation
    if (investmentEngine) {
        investmentEngine.updateProps({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly,
        });
    }

    // Helper function to ensure all teams have choices recorded in database
    const ensureAllTeamsHaveChoices = useCallback(async (completedSlide: Slide) => {
        if (!currentDbSession?.id || !gameStructure || !completedSlide.interactive_data_key) return;
        if (completedSlide.type !== 'interactive_choice') return;

        const decisionKey = completedSlide.interactive_data_key;
        const challengeOptions = gameStructure.all_challenge_options[decisionKey] || [];
        const defaultOption = challengeOptions.find(opt => opt.is_default_choice);

        if (!defaultOption) {
            console.warn(`[useGameProcessing] No default option found for ${decisionKey}`);
            return;
        }

        console.log(`[useGameProcessing] Ensuring all teams have choices for ${decisionKey}`);

        for (const team of teams) {
            const existingDecision = teamDecisions[team.id]?.[decisionKey];

            if (!existingDecision) {
                try {
                    // Build proper TeamDecision object (minus id and created_at)
                    const defaultDecisionData = {
                        session_id: currentDbSession.id,
                        team_id: team.id,
                        phase_id: decisionKey,
                        round_number: completedSlide.round_number || 1,
                        selected_investment_ids: null,
                        selected_challenge_option_id: defaultOption.id,
                        double_down_sacrifice_id: null,
                        double_down_on_id: null,
                        total_spent_budget: 0,
                        submitted_at: new Date().toISOString(),
                        is_immediate_purchase: false,
                        immediate_purchase_type: null,
                        immediate_purchase_data: null,
                        report_given: false,
                        report_given_at: null
                    };

                    await db.decisions.create(defaultDecisionData);
                    console.log(`[useGameProcessing] ✅ Auto-submitted default choice "${defaultOption.id}" for team ${team.name}`);
                } catch (error) {
                    console.error(`[useGameProcessing] ❌ Failed to auto-submit for team ${team.name}:`, error);
                }
            }
        }
    }, [currentDbSession, gameStructure, teams, teamDecisions]);

    // SIMPLIFIED: Replace DecisionEngine with inline logic
    const processInteractiveSlide = useCallback(async (completedSlide: Slide) => {
        console.log('[useGameProcessing] Processing interactive slide:', completedSlide.id);

        if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
            console.warn('[useGameProcessing] Skipping processing - insufficient data');
            return;
        }

        await ensureAllTeamsHaveChoices(completedSlide);

        try {
            // Ensure KPI data exists for all teams
            for (const team of teams) {
                await KpiDataUtils.ensureTeamRoundData(
                    currentDbSession.id,
                    team.id,
                    completedSlide.round_number as 1 | 2 | 3,
                    teamRoundData,
                    setTeamRoundDataDirectly
                );
            }

            // Refresh data to update UI
            await Promise.all([
                fetchTeamDecisionsFromHook(currentDbSession.id),
                fetchTeamRoundDataFromHook(currentDbSession.id)
            ]);

            console.log('[useGameProcessing] Interactive slide processed successfully');

        } catch (error) {
            console.error('[useGameProcessing] Slide processing failed:', error);
            throw error;
        }
    }, [currentDbSession, gameStructure, teams, ensureAllTeamsHaveChoices, teamDecisions, teamRoundData, setTeamRoundDataDirectly, fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook,]);

    // Consequence processing (uses the real ConsequenceProcessor)
    const processConsequenceSlide = useCallback(async (consequenceSlide: Slide) => {
        console.log('[useGameProcessing] Processing consequence slide:', consequenceSlide.id);
        if (!currentDbSession?.id || !gameStructure || teams.length === 0 || !consequenceProcessor) {
            console.warn('[useGameProcessing] Skipping consequence processing - insufficient data or processor');
            return;
        }
        try {
            await consequenceProcessor.processConsequenceSlide(consequenceSlide);
            console.log('[useGameProcessing] Consequence slide processed successfully');
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
        async (roundNumber: 1 | 2 | 3) => {
            if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
                throw new Error('Invalid state for investment payoff processing');
            }
            console.log(`[useGameProcessing] Processing investment payoffs for round ${roundNumber}`);
            await investmentEngine.processInvestmentPayoffs(roundNumber);
            console.log(`[useGameProcessing] Investment payoffs processed for round ${roundNumber}`);
        }
    );

    // Calculate and finalize KPIs
    const {
        execute: calculateKPIsExecute,
        isLoading: isCalculatingKPIs,
    } = useSupabaseMutation(
        async (roundNumber: 1 | 2 | 3) => {
            if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
                throw new Error('Invalid state for KPI calculation');
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

    // Reset game progress
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
                // Reset consequence processing state
                if (consequenceProcessor) {
                    consequenceProcessor.resetProcessedSlides();
                    console.log('[useGameProcessing] Reset consequence processor state');
                }

                // Delete all team decisions, KPI data, and consequence applications for this session
                await Promise.all([
                    db.decisions.deleteBySession(currentDbSession.id),
                    db.kpis.deleteBySession(currentDbSession.id),
                    db.adjustments.deleteBySession(currentDbSession.id),
                    db.consequenceApplications.deleteBySession(currentDbSession.id)
                ]);

                // Reset session to slide 0
                await updateSessionInDb({
                    current_slide_index: 0,
                    is_complete: false,
                    host_notes: {}
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
        processInteractiveSlide,        // ✅ Simplified inline implementation
        processConsequenceSlide,        // ✅ Uses ConsequenceProcessor (real logic)
        processInvestmentPayoffs: async (roundNumber: 1 | 2 | 3): Promise<void> => {
            await processInvestmentPayoffsExecute(roundNumber);
        }, // ✅ Uses InvestmentEngine (real logic)
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress: resetGameProgressExecute,
        isLoadingProcessingDecisions: false,
        isLoadingProcessingPayoffs: isProcessingPayoffs,
        isLoadingCalculatingKPIs: isCalculatingKPIs,
        isLoadingResettingGame: isResettingGame,
    };
};
