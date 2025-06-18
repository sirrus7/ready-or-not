// src/views/team/hooks/useTeamGameState.ts
// CRITICAL FIX: Enhanced real-time subscription handling for impact cards

import {useEffect, useCallback, useState, useRef} from 'react';
import {useRealtimeSubscription} from '@shared/services/supabase';
import {db} from '@shared/services/supabase';
import {
    Slide,
    TeamRoundData,
    PermanentKpiAdjustment,
    GameStructure
} from '@shared/types';

interface UseTeamGameStateProps {
    sessionId: string | null;
    loggedInTeamId: string | null;
}

interface UseTeamGameStateReturn {
    currentActiveSlide: Slide | null;
    isDecisionTime: boolean;
    currentTeamKpis: TeamRoundData | null;
    permanentAdjustments: PermanentKpiAdjustment[];
    gameStructure: GameStructure | null;
    isLoadingKpis: boolean;
    isLoadingAdjustments: boolean;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
    decisionResetTrigger: number;
    fetchCurrentKpis: () => Promise<void>;
    fetchAdjustments: () => Promise<void>;
}

export const useTeamGameState = ({
                                     sessionId,
                                     loggedInTeamId
                                 }: UseTeamGameStateProps): UseTeamGameStateReturn => {

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [permanentAdjustments, setPermanentAdjustments] = useState<PermanentKpiAdjustment[]>([]);
    const [gameStructure, setGameStructure] = useState<GameStructure | null>(null);
    const [isLoadingKpis, setIsLoadingKpis] = useState(false);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
    const [decisionResetTrigger, setDecisionResetTrigger] = useState(0);

    // Stable refs to prevent subscription recreation
    const stableSessionId = useRef<string | null>(null);
    const stableTeamId = useRef<string | null>(null);
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const adjustmentRefreshRef = useRef<NodeJS.Timeout | null>(null);

    // Update stable refs
    if (sessionId !== stableSessionId.current) {
        stableSessionId.current = sessionId;
    }
    if (loggedInTeamId !== stableTeamId.current) {
        stableTeamId.current = loggedInTeamId;
    }

    // ========================================================================
    // CRITICAL FIX: Enhanced data fetching functions
    // ========================================================================
    const fetchCurrentKpis = useCallback(async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) return;

        setIsLoadingKpis(true);
        try {
            // FIXED: Use getForTeamRound instead of getCurrentForTeam
            const kpis = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, currentActiveSlide.round_number || 1);
            setCurrentTeamKpis(kpis);
            console.log('📊 [useTeamGameState] KPIs fetched:', kpis?.current_round);
        } catch (error) {
            console.error('📊 [useTeamGameState] Error fetching KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide]);

    const fetchAdjustments = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) return;

        setIsLoadingAdjustments(true);
        try {
            const adjustments = await db.adjustments.getByTeam(sessionId, loggedInTeamId);
            setPermanentAdjustments(adjustments);
            console.log('🎯 [useTeamGameState] Permanent adjustments fetched:', adjustments.length);
        } catch (error) {
            console.error('🎯 [useTeamGameState] Error fetching adjustments:', error);
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingAdjustments(false);
        }
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // CRITICAL FIX: Enhanced real-time event handlers
    // ========================================================================
    const handleSlideUpdate = useCallback((payload: any) => {
        const updatedSession = payload.new;

        console.log('🎬 [useTeamGameState] Session update received:', {
            slideIndex: updatedSession?.current_slide_index,
            sessionId: updatedSession?.id
        });

        if (updatedSession?.current_slide_index !== undefined && gameStructure) {
            const newSlide = gameStructure.slides[updatedSession.current_slide_index];
            if (newSlide) {
                setCurrentActiveSlide(newSlide);
                console.log('🎬 [useTeamGameState] Active slide updated:', newSlide.id, newSlide.title);

                // Auto-refresh KPIs on slide changes for immediate updates
                if (fetchDebounceRef.current) {
                    clearTimeout(fetchDebounceRef.current);
                }
                fetchDebounceRef.current = setTimeout(() => {
                    fetchCurrentKpis();
                }, 500);
            }
        }
    }, [gameStructure, fetchCurrentKpis]);

    const handleDecisionDelete = useCallback((payload: any) => {
        console.log('🗑️ [useTeamGameState] Decision delete received - triggering reset');

        if (resetDebounceRef.current) {
            clearTimeout(resetDebounceRef.current);
        }

        resetDebounceRef.current = setTimeout(() => {
            setDecisionResetTrigger(prev => prev + 1);
        }, 100);
    }, []);

    const handleKpiUpdate = useCallback((payload: any) => {
        const currentTeamId = stableTeamId.current;
        const updatedKpis = payload.new as TeamRoundData;

        console.log('🔔 [useTeamGameState] KPI update received:', {
            eventType: payload.eventType,
            teamId: updatedKpis?.team_id,
            currentTeamId,
            roundNumber: updatedKpis?.round_number,
        });

        if (updatedKpis?.team_id === currentTeamId) {
            console.log('✅ [useTeamGameState] KPI update is for our team - applying update');
            setCurrentTeamKpis(updatedKpis);
        }
    }, []);

    // CRITICAL FIX: Enhanced Adjustment Update Handler for Impact Cards
    const handleAdjustmentUpdate = useCallback((payload: any) => {
        const currentTeamId = stableTeamId.current;
        const currentSessionId = stableSessionId.current;
        const adjustment = payload.new as PermanentKpiAdjustment;

        console.log('🔔 [useTeamGameState] Adjustment update received:', {
            eventType: payload.eventType,
            teamId: adjustment?.team_id,
            currentTeamId,
            sessionId: adjustment?.session_id,
            currentSessionId,
            challengeId: adjustment?.challenge_id,
            kpiKey: adjustment?.kpi_key,
            value: adjustment?.change_value
        });

        if (adjustment?.session_id === currentSessionId && adjustment?.team_id === currentTeamId) {
            console.log('✅ [useTeamGameState] Adjustment update is for our team - refreshing impact cards');

            // CRITICAL FIX: Force refresh adjustments to ensure impact cards appear
            if (adjustmentRefreshRef.current) {
                clearTimeout(adjustmentRefreshRef.current);
            }

            adjustmentRefreshRef.current = setTimeout(() => {
                fetchAdjustments();
            }, 200); // Small delay to ensure database is consistent
        }
    }, [fetchAdjustments]);

    // ========================================================================
    // CRITICAL FIX: STABILIZED REAL-TIME SUBSCRIPTIONS
    // ========================================================================

    // 1. Session/Slide Updates
    useRealtimeSubscription(
        `team-slide-${sessionId}`,
        {
            table: 'sessions',
            event: 'UPDATE',
            filter: `id=eq.${sessionId}`,
            onchange: handleSlideUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 2. Decision Deletes (for reset handling)
    useRealtimeSubscription(
        `team-deletes-${sessionId}`,
        {
            table: 'team_decisions',
            event: 'DELETE',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleDecisionDelete
        },
        !!sessionId && !!loggedInTeamId
    );

    // 3. CRITICAL FIX: KPI Updates - Team-specific filter
    useRealtimeSubscription(
        `team-kpis-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleKpiUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // 4. CRITICAL FIX: Permanent Adjustments - Enhanced for impact cards
    useRealtimeSubscription(
        `team-adj-${sessionId}-${loggedInTeamId}`,
        {
            table: 'permanent_kpi_adjustments',
            event: '*',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleAdjustmentUpdate
        },
        !!sessionId && !!loggedInTeamId
    );

    // ========================================================================
    // EFFECTS - Initial data loading and controlled updates
    // ========================================================================

    // Load initial data when session/team changes
    useEffect(() => {
        if (sessionId && loggedInTeamId) {
            console.log(`🚀 [useTeamGameState] Initializing for session ${sessionId}, team ${loggedInTeamId}`);
            fetchAdjustments();
        }
    }, [sessionId, loggedInTeamId, fetchAdjustments]);

    // CRITICAL: Controlled KPI refresh on slide changes
    useEffect(() => {
        if (currentActiveSlide && sessionId && loggedInTeamId) {
            console.log(`🎬 [useTeamGameState] Slide changed to ${currentActiveSlide.id}, refreshing KPIs`);
            fetchCurrentKpis();
        }
    }, [currentActiveSlide?.id, fetchCurrentKpis]); // CRITICAL: Only depend on slide ID

    // CRITICAL FIX: Force refresh adjustments on consequence slides
    useEffect(() => {
        if (currentActiveSlide?.type === 'consequence_reveal' && sessionId && loggedInTeamId) {
            console.log(`🎯 [useTeamGameState] On consequence slide - refreshing adjustments for impact cards`);
            setTimeout(() => {
                fetchAdjustments();
            }, 1000); // Allow time for consequence processing to complete
        }
    }, [currentActiveSlide?.type, currentActiveSlide?.id, fetchAdjustments]);

    // CRITICAL FIX: Load game structure and initialize slide
    useEffect(() => {
        const loadGameStructure = async () => {
            if (!sessionId) return;

            try {
                // Load session data to get current slide
                const session = await db.sessions.getById(sessionId);
                if (!session) return;

                // For now, we'll assume the game structure is available
                // In a real implementation, you'd load this from the database
                const structure = (await import('@core/content/GameStructure')).readyOrNotGame_2_0_DD;
                setGameStructure(structure);

                // Set initial slide
                const slideIndex = session.current_slide_index || 0;
                const initialSlide = structure.slides[slideIndex];
                if (initialSlide) {
                    setCurrentActiveSlide(initialSlide);
                    console.log('🎬 [useTeamGameState] Initial slide set:', initialSlide.id);
                }

                setConnectionStatus('connected');
            } catch (error) {
                console.error('🔌 [useTeamGameState] Error loading game structure:', error);
                setConnectionStatus('disconnected');
            }
        };

        loadGameStructure();
    }, [sessionId]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (resetDebounceRef.current) {
                clearTimeout(resetDebounceRef.current);
            }
            if (fetchDebounceRef.current) {
                clearTimeout(fetchDebounceRef.current);
            }
            if (adjustmentRefreshRef.current) {
                clearTimeout(adjustmentRefreshRef.current);
            }
        };
    }, []);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    const isDecisionTime = !!(
        currentActiveSlide?.interactive_data_key &&
        currentActiveSlide?.type?.startsWith('interactive_')
    );

    // ========================================================================
    // RETURN STATE AND FUNCTIONS
    // ========================================================================
    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        permanentAdjustments,
        gameStructure,
        isLoadingKpis,
        isLoadingAdjustments,
        connectionStatus,
        decisionResetTrigger,
        fetchCurrentKpis,
        fetchAdjustments
    };
};
