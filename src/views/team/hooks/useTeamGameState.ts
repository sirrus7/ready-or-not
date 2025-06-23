// src/views/team/hooks/useTeamGameState.ts
// CLEAN VERSION: Uses centralized adjustment system, no redundant code

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
    // Pass in centralized adjustments instead of managing separately
    permanentAdjustments?: PermanentKpiAdjustment[];
    isLoadingAdjustments?: boolean;
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
}

export const useTeamGameState = ({
                                     sessionId,
                                     loggedInTeamId,
                                     permanentAdjustments = [], // Use centralized data
                                     isLoadingAdjustments = false // Use centralized loading state
                                 }: UseTeamGameStateProps): UseTeamGameStateReturn => {

    // ========================================================================
    // STATE MANAGEMENT - CLEAN
    // ========================================================================
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [gameStructure, setGameStructure] = useState<GameStructure | null>(null);
    const [isLoadingKpis, setIsLoadingKpis] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
    const [decisionResetTrigger, setDecisionResetTrigger] = useState(0);

    // Stable refs to prevent subscription recreation
    const stableSessionId = useRef<string | null>(null);
    const stableTeamId = useRef<string | null>(null);
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Update stable refs
    if (sessionId !== stableSessionId.current) {
        stableSessionId.current = sessionId;
    }
    if (loggedInTeamId !== stableTeamId.current) {
        stableTeamId.current = loggedInTeamId;
    }

    // ========================================================================
    // DATA FETCHING - Only KPIs (adjustments handled centrally)
    // ========================================================================
    const fetchCurrentKpis = useCallback(async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) return;

        setIsLoadingKpis(true);
        try {
            // MODIFIED: Don't immediately jump to new round - check if new round data exists first
            let targetRound = (currentActiveSlide?.round_number as 1 | 2 | 3) || 1;

            // If we're on a new round slide but no data exists for that round, keep showing previous round
            if (targetRound > 1) {
                const newRoundData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, targetRound);
                if (!newRoundData) {
                    console.log(`[useTeamGameState] Round ${targetRound} slide detected but no R${targetRound} data exists, keeping R${targetRound - 1} display`);
                    targetRound = (targetRound - 1) as 1 | 2 | 3;
                }
            }

            const kpis = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, targetRound);
            console.log('📊 [useTeamGameState] KPIs fetched:', kpis?.current_round);
        } catch (error) {
            console.error('📊 [useTeamGameState] Error fetching KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide]);

    // ========================================================================
    // REAL-TIME EVENT HANDLERS - CLEAN
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

                // Auto-refresh KPIs on slide changes
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

    // ========================================================================
    // REAL-TIME SUBSCRIPTIONS - CLEAN (no adjustment subscription)
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

    // 3. KPI Updates - Team-specific filter
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

    // NOTE: Permanent Adjustments subscription removed - now handled centrally

    // ========================================================================
    // EFFECTS - CLEAN
    // ========================================================================

    // CRITICAL: Controlled KPI refresh on slide changes - OPTIMIZED to prevent loading flashes
    useEffect(() => {
        if (currentActiveSlide && sessionId && loggedInTeamId) {
            // Only refresh if we don't have KPIs or the round changed
            const needsRefresh = !currentTeamKpis ||
                currentTeamKpis.round_number !== (currentActiveSlide.round_number || 1);

            if (needsRefresh) {
                console.log(`🎬 [useTeamGameState] Slide changed to ${currentActiveSlide.id}, refreshing KPIs`);
                fetchCurrentKpis();
            }
        }
    }, [currentActiveSlide?.id, currentActiveSlide?.round_number, fetchCurrentKpis, currentTeamKpis?.round_number]);

    // Load game structure and initialize slide
    useEffect(() => {
        const loadGameStructure = async () => {
            if (!sessionId) return;

            try {
                // Load session data to get current slide
                const session = await db.sessions.getById(sessionId);
                if (!session) return;

                // Load game structure
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
        };
    }, []);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    const isDecisionTime = !!(
        currentActiveSlide?.interactive_data_key &&
        currentActiveSlide?.type?.startsWith('interactive_')
    );

    // Filter adjustments for this specific team
    const teamAdjustments = permanentAdjustments.filter(adj => adj.team_id === loggedInTeamId);

    // ========================================================================
    // RETURN STATE AND FUNCTIONS - CLEAN
    // ========================================================================
    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        permanentAdjustments: teamAdjustments, // Filtered for this team
        gameStructure,
        isLoadingKpis,
        isLoadingAdjustments, // From centralized system
        connectionStatus,
        decisionResetTrigger,
        fetchCurrentKpis
    };
};
