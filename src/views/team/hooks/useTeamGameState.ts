// src/views/team/hooks/useTeamGameState.ts
// ENHANCED VERSION - Implements proper real-time KPI updates from consequence processing

/**
 * ============================================================================
 * CROSS-DEVICE COMMUNICATION ARCHITECTURE FOR READY OR NOT 2.0
 * ============================================================================
 *
 * REQUIREMENTS:
 * 1. Team apps must sync with host slide changes in real-time
 * 2. Team apps must handle decision resets from host instantly
 * 3. CRITICAL: Only 1 WebSocket connection per team app to prevent overload
 * 4. Must handle consequence slides that affect team KPIs via real-time updates
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
 *    - Trigger refresh of decision-making components
 * 3. CRITICAL: KPI Updates (team_round_data table updates)
 *    - Immediately reflect consequence processing results
 *    - Update team KPI displays in real-time
 *    - Show impact cards and notifications
 *
 * FALLBACK POLLING:
 * - Polls every 10 seconds as backup if real-time fails
 * - Ensures reliability even with connection issues
 * ============================================================================
 */

import {useState, useEffect, useMemo, useCallback} from 'react';
import {db, supabase} from '@shared/services/supabase';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {Slide, GameStructure} from '@shared/types/game';
import {TeamRoundData} from '@shared/types/database';

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
    kpiUpdateTrigger: number; // NEW: Trigger for KPI update notifications
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
    const [kpiUpdateTrigger, setKpiUpdateTrigger] = useState<number>(0); // NEW: KPI update trigger

    // Game structure is static
    const gameStructure: GameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // ========================================================================
    // SLIDE STATE MANAGEMENT
    // ========================================================================
    const updateSlideState = useCallback((slideId: number) => {
        const newSlide = gameStructure.slides.find(s => s.id === slideId);
        if (newSlide) {
            console.log('📺 Team app: Slide changed to:', newSlide.id, newSlide.title);
            setCurrentActiveSlide(newSlide);

            // Update decision state based on slide type
            const isDecisionSlide = ['interactive_invest', 'interactive_choice', 'interactive_double_down_select'].includes(newSlide.type);
            setIsDecisionTime(isDecisionSlide);

            console.log('📺 Team app: Decision time =', isDecisionSlide);
        } else {
            console.warn('📺 Team app: Unknown slide ID:', slideId);
        }
    }, [gameStructure.slides]);

    /**
     * Fetches session data and updates slide state
     */
    const fetchAndUpdateSessionData = useCallback(async () => {
        if (!sessionId) return;

        try {
            console.log('📡 Fetching session data for:', sessionId);
            const sessionData = await db.sessions.get(sessionId);

            if (sessionData && sessionData.current_slide_id !== null) {
                updateSlideState(sessionData.current_slide_id);
            }
        } catch (error) {
            console.error('📡 Error fetching session data:', error);
        }
    }, [sessionId, updateSlideState]);

    /**
     * ENHANCED: Fetches team KPI data for the current slide with real-time awareness
     */
    const fetchKpisForCurrentSlide = useCallback(async (forceRefresh: boolean = false) => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) return;

        if (!forceRefresh && isLoadingKpis) {
            console.log('📊 KPI fetch already in progress, skipping...');
            return;
        }

        setIsLoadingKpis(true);
        try {
            const roundNumber = currentActiveSlide.round_number || 1;
            console.log('📊 Fetching KPIs for round:', roundNumber, forceRefresh ? '(forced refresh)' : '');

            const kpiData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, roundNumber);
            console.log('📊 KPIs loaded:', kpiData);
            setCurrentTeamKpis(kpiData);
        } catch (error) {
            console.error('📊 Error loading KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide, isLoadingKpis]);

    /**
     * NEW: Handles real-time KPI updates from consequence processing
     */
    const handleKpiUpdate = useCallback((payload: any) => {
        console.log('💰 Real-time KPI update received:', payload);

        // Check if this update affects our team
        const newKpiData = payload.new as TeamRoundData;
        const isOurTeam = newKpiData?.team_id === loggedInTeamId;
        const isCurrentRound = newKpiData?.round_number === currentActiveSlide?.round_number;

        if (isOurTeam && isCurrentRound) {
            console.log('💰 KPI update affects our team - updating display');

            // Update current KPI state immediately
            setCurrentTeamKpis(newKpiData);

            // Trigger KPI update notification (for impact cards, etc.)
            setKpiUpdateTrigger(prev => prev + 1);

            console.log('✅ KPI display updated:', {
                capacity: newKpiData.current_capacity,
                orders: newKpiData.current_orders,
                cost: newKpiData.current_cost,
                asp: newKpiData.current_asp,
                revenue: newKpiData.revenue,
                net_income: newKpiData.net_income,
                net_margin: newKpiData.net_margin
            });
        } else {
            console.log('💰 KPI update for different team/round, ignoring');
        }
    }, [loggedInTeamId, currentActiveSlide?.round_number]);

    /**
     * Handles decision reset notifications from the host
     */
    const handleDecisionReset = useCallback((payload: any) => {
        console.log('🔄 Decision reset detected:', payload);

        // Check if this reset affects our team and current slide
        if (payload.old?.team_id === loggedInTeamId &&
            payload.old?.phase_id === currentActiveSlide?.interactive_data_key) {

            console.log('🔄 Reset affects our team - triggering decision component refresh');
            setDecisionResetTrigger(prev => prev + 1);
            console.log('✅ Your submission has been reset by the facilitator. You may now make new choices.');
        }
    }, [loggedInTeamId, currentActiveSlide?.interactive_data_key]);

    // ========================================================================
    // SINGLE REAL-TIME SUBSCRIPTION WITH ENHANCED KPI HANDLING
    // This is the ONLY WebSocket connection per team app
    // ========================================================================
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            setConnectionStatus('disconnected');
            return;
        }

        console.log('🔔 Setting up enhanced real-time subscription for:', sessionId, loggedInTeamId);
        setConnectionStatus('connecting');

        const channelName = `team-updates-${sessionId}-${loggedInTeamId}`;
        const channel = supabase.channel(channelName);

        // 1. Session updates (slide changes)
        channel.on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${sessionId}`
        }, (payload) => {
            console.log('🔔 Session update received:', payload);
            const newSlideId = payload.new?.current_slide_id;
            if (newSlideId !== null && newSlideId !== undefined) {
                updateSlideState(newSlideId);
            }
        });

        // 2. Decision resets
        channel.on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'team_decisions',
            filter: `session_id=eq.${sessionId}`
        }, handleDecisionReset);

        // 3. CRITICAL: Real-time KPI updates from consequence processing
        channel.on('postgres_changes', {
            event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'team_round_data',
            filter: `session_id=eq.${sessionId}`
        }, handleKpiUpdate);

        // Subscribe and handle connection status
        channel.subscribe((status) => {
            console.log('🔔 Subscription status:', status);
            if (status === 'SUBSCRIBED') {
                setConnectionStatus('connected');
                console.log('✅ Real-time connection established with KPI update support');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                setConnectionStatus('disconnected');
                console.error('❌ Real-time connection failed');
            }
        });

        // Cleanup function
        return () => {
            console.log('🔔 Cleaning up real-time subscription');
            channel.unsubscribe();
            setConnectionStatus('disconnected');
        };
    }, [sessionId, loggedInTeamId, updateSlideState, handleDecisionReset, handleKpiUpdate]);

    // ========================================================================
    // INITIAL DATA LOADING
    // ========================================================================
    useEffect(() => {
        if (sessionId && connectionStatus === 'connected') {
            fetchAndUpdateSessionData();
        }
    }, [sessionId, connectionStatus, fetchAndUpdateSessionData]);

    // ========================================================================
    // KPI DATA LOADING (when slide changes)
    // ========================================================================
    useEffect(() => {
        if (currentActiveSlide && connectionStatus === 'connected') {
            fetchKpisForCurrentSlide();
        }
    }, [currentActiveSlide, connectionStatus, fetchKpisForCurrentSlide]);

    // ========================================================================
    // FALLBACK POLLING (backup mechanism)
    // ========================================================================
    useEffect(() => {
        if (!sessionId || connectionStatus === 'connected') return;

        console.log('🔄 Setting up fallback polling...');
        const pollInterval = setInterval(() => {
            if (connectionStatus === 'disconnected' || connectionStatus === 'connecting') {
                console.log('🔄 Polling fallback: fetching session data');
                fetchAndUpdateSessionData();
            }
        }, 10000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [sessionId, connectionStatus, fetchAndUpdateSessionData]);

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
        kpiUpdateTrigger // NEW: Return KPI update trigger for components
    };
};
