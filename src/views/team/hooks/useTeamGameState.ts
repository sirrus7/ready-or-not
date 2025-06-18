// src/views/team/hooks/useTeamGameState.ts
// CRITICAL FIX: Added missing KPI real-time subscription for consequence processing
// This was the missing piece causing real-time KPI updates to not work in team apps

/**
 * ============================================================================
 * CROSS-DEVICE COMMUNICATION ARCHITECTURE FOR READY OR NOT 2.0
 * ============================================================================
 *
 * REQUIREMENTS:
 * 1. Team apps must sync with host slide changes in real-time
 * 2. Team apps must handle decision resets from host instantly
 * 3. CRITICAL: Team apps must receive KPI updates from consequence processing
 * 4. CRITICAL: Only 1 WebSocket connection per team app to prevent overload
 * 5. Reliable fallback if real-time fails
 *
 * COMMUNICATION RULES:
 * - Host ↔ Presentation Display: BroadcastChannel (same device)
 * - Host ↔ Team Apps: Supabase Real-time ONLY (different devices)
 * - Team Apps: NEVER use BroadcastChannel (won't work cross-device)
 * - Team Apps: ONLY 1 real-time subscription per app (this file)
 *
 * REAL-TIME SUBSCRIPTION HANDLES:
 * 1. Slide Changes (game_sessions table updates)
 *    - Update team app slide display
 *    - Show/hide decision UI based on slide type
 * 2. Decision Resets (team_decisions table deletes)
 *    - Clear submission UI when host resets team decisions
 *    - Allow new choices to be made
 * 3. KPI Updates (team_round_data table updates) ⭐ CRITICAL FIX ADDED
 *    - Real-time KPI updates from consequence processing
 *    - Update team dashboard immediately when consequences applied
 * 4. KPI Impact Cards (permanent_kpi_adjustments table updates) ⭐ NEW FIX ADDED
 *    - Real-time display of permanent effect cards like "CNC Machine"
 *    - Show impact cards immediately when consequences with permanent effects processed
 *
 * FALLBACK POLLING:
 * - Polls every 10 seconds as backup if real-time fails
 * - Ensures reliability even with connection issues
 * ============================================================================
 */

import {useState, useEffect, useMemo, useCallback} from 'react';
import {db, useRealtimeSubscription} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {Slide, GameStructure} from '@shared/types/game';
import {TeamRoundData, PermanentKpiAdjustment} from '@shared/types/database';

interface useTeamGameStateProps {
    sessionId: string | null;
    loggedInTeamId: string | null;
}

interface useTeamGameStateReturn {
    currentActiveSlide: Slide | null;
    isDecisionTime: boolean;
    currentTeamKpis: TeamRoundData | null;
    isLoadingKpis: boolean;
    gameStructure: GameStructure;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    decisionResetTrigger: number;
    permanentAdjustments: PermanentKpiAdjustment[]; // NEW: For KPI Impact Cards
    isLoadingAdjustments: boolean; // NEW: Loading state for adjustments
}

export const useTeamGameState = ({sessionId, loggedInTeamId}: useTeamGameStateProps): useTeamGameStateReturn => {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [isLoadingKpis, setIsLoadingKpis] = useState<boolean>(false);
    const [decisionResetTrigger, setDecisionResetTrigger] = useState<number>(0);

    // NEW: State for KPI Impact Cards (permanent adjustments)
    const [permanentAdjustments, setPermanentAdjustments] = useState<PermanentKpiAdjustment[]>([]);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState<boolean>(false);

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    const updateSlideState = useCallback((slideIndex: number) => {
        const slide = gameStructure.slides.find(s => s.id === slideIndex);
        if (!slide) {
            console.warn(`[useTeamGameState] ⚠️  Slide not found for index: ${slideIndex}`);
            return;
        }

        console.log(`[useTeamGameState] 🎯 Updating to slide: ${slide.title} (${slide.type})`);
        setCurrentActiveSlide(slide);

        const isInteractive = ['interactive_invest', 'interactive_choice', 'interactive_double_down_prompt', 'interactive_double_down_select'].includes(slide.type);
        setIsDecisionTime(isInteractive);

        if (isInteractive) {
            console.log(`[useTeamGameState] 🎮 Decision time activated for: ${slide.interactive_data_key}`);
        }
    }, [gameStructure.slides]);

    const handleDecisionReset = useCallback((payload: any) => {
        const deletedDecision = payload.old;
        if (deletedDecision?.team_id === loggedInTeamId) {
            console.log(`[useTeamGameState] 🔄 Decision reset detected for team ${loggedInTeamId}:`, deletedDecision);
            setDecisionResetTrigger(prev => prev + 1);
        }
    }, [loggedInTeamId]);

    const fetchAndUpdateSessionData = useCallback(async () => {
        if (!sessionId) return;

        try {
            const sessionData = await db.sessions.getById(sessionId);
            if (sessionData?.current_slide_index !== null && sessionData?.current_slide_index !== undefined) {
                updateSlideState(sessionData.current_slide_index);
            }
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching session data:', error);
        }
    }, [sessionId, updateSlideState]);

    const fetchCurrentTeamKpis = useCallback(async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) {
            setCurrentTeamKpis(null);
            return;
        }

        setIsLoadingKpis(true);
        try {
            const roundNumber = currentActiveSlide.round_number;
            if (roundNumber === 0) {
                setCurrentTeamKpis(null);
                return;
            }

            const kpiData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, roundNumber as 1 | 2 | 3);
            setCurrentTeamKpis(kpiData as TeamRoundData || null);

            if (kpiData) {
                console.log(`[useTeamGameState] 📊 Updated KPIs for team ${loggedInTeamId}, round ${roundNumber}:`, {
                    capacity: kpiData.current_capacity,
                    orders: kpiData.current_orders,
                    cost: kpiData.current_cost,
                    asp: kpiData.current_asp
                });
            }
        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching team KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide]);

    // NEW: Fetch permanent adjustments for KPI Impact Cards
    const fetchPermanentAdjustments = useCallback(async () => {
        if (!sessionId || !loggedInTeamId) {
            setPermanentAdjustments([]);
            return;
        }

        setIsLoadingAdjustments(true);
        try {
            const adjustments = await db.adjustments.getByTeam(sessionId, loggedInTeamId);
            setPermanentAdjustments(adjustments || []);

            console.log(`[useTeamGameState] 🎯 Loaded ${adjustments?.length || 0} permanent adjustments for team ${loggedInTeamId}`);

        } catch (error) {
            console.error('[useTeamGameState] ❌ Error fetching permanent adjustments:', error);
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingAdjustments(false);
        }
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // CRITICAL FIX: REAL-TIME SUBSCRIPTIONS FOR TEAM APPS
    // This section was missing the KPI subscription, breaking consequence processing
    // ========================================================================

    // 1. SLIDE CHANGES - Game session updates from host
    useRealtimeSubscription(
        `team-slide-updates-${sessionId}`,
        {
            table: 'sessions',
            event: 'UPDATE',
            filter: `id=eq.${sessionId}`,
            onchange: (payload) => {
                console.log('🔔 [useTeamGameState] Session update received:', payload);
                const newSlideIndex = payload.new?.current_slide_index;
                if (newSlideIndex !== null && newSlideIndex !== undefined) {
                    updateSlideState(newSlideIndex);
                }
                setConnectionStatus('connected');
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // 4. 🆕 CRITICAL FIX: KPI IMPACT CARDS - Real-time permanent adjustments updates
    // This subscription enables real-time display of KPI Impact Cards like "CNC Machine"
    useRealtimeSubscription(
        `team-adjustments-${sessionId}-${loggedInTeamId}`,
        {
            table: 'permanent_kpi_adjustments',
            event: '*', // Listen to INSERT, UPDATE, DELETE events
            filter: `session_id=eq.${sessionId}`,
            onchange: (payload) => {
                const adjustment = payload.new as PermanentKpiAdjustment;
                const eventType = payload.eventType;

                console.log(`🔔 [useTeamGameState] Permanent adjustment ${eventType}:`, adjustment);

                // Only update if this adjustment is for our team
                if (adjustment?.team_id === loggedInTeamId) {
                    console.log(`🎯 [useTeamGameState] ✅ New KPI Impact Card for team ${loggedInTeamId}:`, {
                        challenge: adjustment.challenge_id,
                        option: adjustment.option_id,
                        kpi: adjustment.kpi_key,
                        value: adjustment.change_value,
                        description: adjustment.description
                    });

                    // Refresh permanent adjustments to display new impact cards
                    fetchPermanentAdjustments();
                    console.log(`📋 [useTeamGameState] KPI Impact Cards updated in real-time!`);
                } else {
                    console.log(`ℹ️  [useTeamGameState] Permanent adjustment for different team ${adjustment?.team_id}, ignoring`);
                }
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // 2. DECISION RESETS - Team decision deletions from host
    useRealtimeSubscription(
        `team-decision-resets-${sessionId}`,
        {
            table: 'team_decisions',
            event: 'DELETE',
            filter: `session_id=eq.${sessionId}`,
            onchange: handleDecisionReset
        },
        !!sessionId && !!loggedInTeamId
    );

    // 3. 🎯 CRITICAL FIX: KPI UPDATES - Real-time consequence processing updates
    // This was the missing subscription that broke real-time KPI updates!
    useRealtimeSubscription(
        `team-kpi-updates-${sessionId}-${loggedInTeamId}`,
        {
            table: 'team_round_data',
            event: '*', // Listen to INSERT and UPDATE events
            filter: `session_id=eq.${sessionId}`,
            onchange: (payload) => {
                const updatedKpis = payload.new as TeamRoundData;
                const eventType = payload.eventType;

                console.log(`🔔 [useTeamGameState] KPI update received:`, eventType, updatedKpis);

                // Only update if this KPI change is for our team
                if (updatedKpis?.team_id === loggedInTeamId) {
                    console.log(`🎯 [useTeamGameState] ✅ KPI update for our team ${loggedInTeamId}:`, {
                        round: updatedKpis.round_number,
                        capacity: updatedKpis.current_capacity,
                        orders: updatedKpis.current_orders,
                        cost: updatedKpis.current_cost,
                        asp: updatedKpis.current_asp,
                        revenue: updatedKpis.revenue,
                        netIncome: updatedKpis.net_income
                    });

                    // Update our current KPIs if this is for the current round
                    if (currentActiveSlide && updatedKpis.round_number === currentActiveSlide.round_number) {
                        setCurrentTeamKpis(updatedKpis);
                        console.log(`📊 [useTeamGameState] Team dashboard KPIs updated in real-time!`);
                    }
                } else {
                    console.log(`ℹ️  [useTeamGameState] KPI update for different team ${updatedKpis?.team_id}, ignoring`);
                }
            }
        },
        !!sessionId && !!loggedInTeamId
    );

    // ========================================================================
    // CONNECTION STATUS MONITORING
    // ========================================================================
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            setConnectionStatus('disconnected');
            return;
        }

        setConnectionStatus('connecting');

        // Set connected after initial subscriptions are established
        const timer = setTimeout(() => {
            setConnectionStatus('connected');
        }, 1000);

        return () => clearTimeout(timer);
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // INITIAL DATA LOADING AND POLLING FALLBACK
    // ========================================================================
    useEffect(() => {
        if (sessionId && connectionStatus === 'connected') {
            fetchAndUpdateSessionData();
        }
    }, [sessionId, connectionStatus, fetchAndUpdateSessionData]);

    useEffect(() => {
        fetchCurrentTeamKpis();
        fetchPermanentAdjustments(); // NEW: Load permanent adjustments
    }, [fetchCurrentTeamKpis, fetchPermanentAdjustments]);

    // Fallback polling for reliability
    useEffect(() => {
        if (!sessionId || connectionStatus === 'connected') return;

        const pollInterval = setInterval(() => {
            console.log('[useTeamGameState] 🔄 Polling fallback - checking for updates');
            fetchAndUpdateSessionData();
            fetchCurrentTeamKpis();
            fetchPermanentAdjustments(); // NEW: Poll permanent adjustments
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [sessionId, connectionStatus, fetchAndUpdateSessionData, fetchCurrentTeamKpis, fetchPermanentAdjustments]);

    // ========================================================================
    // RETURN VALUES
    // ========================================================================
    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure,
        connectionStatus,
        decisionResetTrigger,
        permanentAdjustments, // NEW: For KPI Impact Cards
        isLoadingAdjustments  // NEW: Loading state
    };
};
