// src/core/game/useGameProcessing.ts
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
    Slide, ChallengeOption
} from '@shared/types';
import {ScoringEngine} from './ScoringEngine';
import {KpiDataUtils} from './KpiDataUtils';
import {TeamBroadcaster, UnifiedEffectsProcessor} from './UnifiedEffectsProcessor';
import {SimpleRealtimeManager} from "@core/sync";
import {ForcedSelectionTracker} from "@core/game/ForcedSelectionTracker";

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
    processPayoffSlide: (payoffSlide: Slide) => Promise<void>;
    processKpiResetSlide: (kpiResetSlide: Slide) => Promise<void>;
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

    // CRITICAL FIX: Use refs to track stable values for UnifiedEffectsProcessor
    const stableSessionIdRef = useRef<string | null>(null);
    const stableGameStructureRef = useRef<GameStructure | null>(null);

    // Update refs when core dependencies change
    if (currentDbSession?.id !== stableSessionIdRef.current) {
        stableSessionIdRef.current = currentDbSession?.id || null;
    }
    if (gameStructure !== stableGameStructureRef.current) {
        stableGameStructureRef.current = gameStructure;
    }

    // UNIFIED EFFECTS PROCESSOR - replaces both ConsequenceProcessor and InvestmentEngine
    const unifiedEffectsProcessor = useMemo(() => {
        if (!currentDbSession || !gameStructure) return null;

        // Get realtime manager for team broadcasting
        const realtimeManager = SimpleRealtimeManager.getInstance(currentDbSession.id, 'host');

        return new UnifiedEffectsProcessor({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly,
            // NEW: Add team broadcaster
            teamBroadcaster: {
                broadcastKpiUpdated: (slide, kpiData) => realtimeManager.sendKpiUpdated(slide, kpiData),
            }
        });
    }, [
        currentDbSession?.id,  // CRITICAL: Only session ID, not the full object
        gameStructure,         // CRITICAL: Only recreate if structure changes
    ]);

    // Update processor props dynamically without recreation
    if (unifiedEffectsProcessor) {
        const teamBroadcaster: TeamBroadcaster | undefined = currentDbSession ? {
            broadcastKpiUpdated: (slide: Slide, kpiData: Record<string, any> | undefined): void => {
                const realtimeManager: SimpleRealtimeManager = SimpleRealtimeManager.getInstance(currentDbSession.id, 'host');
                realtimeManager.sendKpiUpdated(slide, kpiData);
            }
        } : undefined;

        unifiedEffectsProcessor.updateProps({
            currentDbSession,
            gameStructure,
            teams,
            teamDecisions,
            teamRoundData,
            fetchTeamRoundDataFromHook,
            setTeamRoundDataDirectly,
            teamBroadcaster
        });
    }

    // Helper function to ensure all teams have choices recorded in database
    const ensureAllTeamsHaveChoices = useCallback(async (completedSlide: Slide) => {
        if (!currentDbSession?.id || !gameStructure || !completedSlide.interactive_data_key) return;
        if (completedSlide.type !== 'interactive_choice') return;

        const decisionKey: string = completedSlide.interactive_data_key;
        if (!decisionKey) return;

        const challengeOptions: ChallengeOption[] = gameStructure.all_challenge_options[decisionKey];
        if (!challengeOptions) return;

        const defaultOption: ChallengeOption | undefined = challengeOptions.find(option => option.is_default_choice);
        if (!defaultOption) return;

        // Collect all teams that need default decisions
        const decisionsToInsert: Partial<TeamDecision>[] = [];
        const submittedAt: string = new Date().toISOString();

        // Prepare batch data for teams missing decisions
        for (const team of teams) {
            const existingDecision = teamDecisions[team.id]?.[decisionKey];

            if (!existingDecision || !existingDecision.selected_challenge_option_id) {
                try {
                    // Check for forced selection first
                    const forcedSelection: string | null = await ForcedSelectionTracker.getForcedSelection(
                        currentDbSession.id,
                        team.id,
                        decisionKey
                    );

                    // Use forced selection if available, otherwise use default option
                    const selectedOptionId: string = forcedSelection || defaultOption.id;

                    decisionsToInsert.push({
                        session_id: currentDbSession.id,
                        team_id: team.id,
                        phase_id: decisionKey,
                        round_number: completedSlide.round_number as (1 | 2 | 3),
                        selected_challenge_option_id: selectedOptionId,
                        submitted_at: submittedAt,
                    });
                } catch (error) {
                    console.error(`[useGameProcessing] Failed to prepare default decision for team ${team.name}:`, error);
                }
            }
        }

        // Execute single batch insert instead of individual calls
        if (decisionsToInsert.length > 0) {
            try {
                console.log(`[useGameProcessing] Batch defaulting ${decisionsToInsert.length} team decisions`);
                await db.decisions.batchUpsert(decisionsToInsert);
            } catch (error) {
                console.error(`[useGameProcessing] Batch upsert failed:`, error);
            }
        }
    }, [currentDbSession, gameStructure, teamDecisions, teams]);

    // Interactive slide processing (simplified inline implementation)
    const processInteractiveSlide = useCallback(async (completedSlide: Slide) => {
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
        } catch (error) {
            console.error('[useGameProcessing] Slide processing failed:', error);
            throw error;
        }
    }, [currentDbSession, gameStructure, teams, ensureAllTeamsHaveChoices, teamDecisions, teamRoundData, setTeamRoundDataDirectly, fetchTeamDecisionsFromHook, fetchTeamRoundDataFromHook]);

    // Consequence processing (uses UnifiedEffectsProcessor)
    const processConsequenceSlide = useCallback(async (consequenceSlide: Slide) => {
        if (!currentDbSession?.id || !gameStructure || teams.length === 0 || !unifiedEffectsProcessor) {
            console.warn('[useGameProcessing] Skipping consequence processing - insufficient data or processor');
            return;
        }
        try {
            await unifiedEffectsProcessor.processEffectSlide(consequenceSlide);
        } catch (error) {
            console.error('[useGameProcessing] Consequence processing failed:', error);
            throw error;
        }
    }, [unifiedEffectsProcessor, currentDbSession, gameStructure, teams]);

    // Payoff processing (NEW - uses UnifiedEffectsProcessor for slide-specific processing)
    const processPayoffSlide = useCallback(async (payoffSlide: Slide) => {
        if (!currentDbSession?.id || !gameStructure || teams.length === 0 || !unifiedEffectsProcessor) {
            console.warn('[useGameProcessing] Skipping payoff processing - insufficient data or processor');
            return;
        }
        try {
            await unifiedEffectsProcessor.processEffectSlide(payoffSlide);
        } catch (error) {
            console.error('[useGameProcessing] Payoff processing failed:', error);
            throw error;
        }
    }, [unifiedEffectsProcessor, currentDbSession, gameStructure, teams]);

    // Add this method alongside processConsequenceSlide and processPayoffSlide
    const processKpiResetSlide = useCallback(async (kpiResetSlide: Slide) => {
        if (!currentDbSession?.id || !gameStructure || teams.length === 0 || !unifiedEffectsProcessor) {
            console.warn('[useGameProcessing] Skipping KPI reset processing - insufficient data or processor');
            return;
        }
        try {
            await unifiedEffectsProcessor.processEffectSlide(kpiResetSlide);
        } catch (error) {
            console.error('[useGameProcessing] KPI reset processing failed:', error);
            throw error;
        }
    }, [unifiedEffectsProcessor, currentDbSession, gameStructure, teams]);

    // Calculate and finalize KPIs
    const {
        execute: calculateKPIsExecute,
        isLoading: isCalculatingKPIs,
    } = useSupabaseMutation(
        async (roundNumber: 1 | 2 | 3) => {
            if (!currentDbSession?.id || !gameStructure || teams.length === 0) {
                throw new Error('Invalid state for KPI calculation');
            }

            for (const team of teams) {
                const kpis = teamRoundData[team.id]?.[roundNumber];
                if (kpis?.id) {
                    const financialMetrics = ScoringEngine.calculateFinancialMetrics(kpis);
                    await db.kpis.update(kpis.id, {
                        ...kpis,
                        ...financialMetrics,
                    });
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
            if (!currentDbSession?.id) {
                throw new Error('No session to reset');
            }

            if (!confirm("Are you sure you want to reset all game progress? This will clear all decisions and KPI data and return to the first slide. This action cannot be undone.")) {
                return;
            }

            try {
                // Reset unified effects processor state
                if (unifiedEffectsProcessor) {
                    unifiedEffectsProcessor.resetProcessedSlides();
                }

                // Delete all team decisions, KPI data, and applications for this session
                await Promise.all([
                    db.decisions.deleteBySession(currentDbSession.id),
                    db.kpis.deleteBySession(currentDbSession.id),
                    db.adjustments.deleteBySession(currentDbSession.id),
                    db.payoffApplications.deleteBySession(currentDbSession.id), // NEW: Clean up payoff applications
                ]);

                // Reset session to slide 0
                await updateSessionInDb({
                    current_slide_index: 0,
                    is_complete: false,
                    host_notes: {}
                });

                // Redirect to first slide
                navigate(`/host/${currentDbSession.id}`);
            } catch (error) {
                console.error('Error resetting game progress:', error);
                throw error;
            }
        }
    );

    return useMemo(() => ({
        processInteractiveSlide,
        processConsequenceSlide,
        processPayoffSlide,
        processKpiResetSlide,
        calculateAndFinalizeRoundKPIs: calculateKPIsExecute,
        resetGameProgress: resetGameProgressExecute,
        isLoadingProcessingDecisions: false,
        isLoadingProcessingPayoffs: false,
        isLoadingCalculatingKPIs: isCalculatingKPIs,
        isLoadingResettingGame: isResettingGame,
    }), [
        processInteractiveSlide,
        processConsequenceSlide,
        processPayoffSlide,
        processKpiResetSlide,
        calculateKPIsExecute,
        resetGameProgressExecute,
        isCalculatingKPIs,
        isResettingGame,
    ]);
};
