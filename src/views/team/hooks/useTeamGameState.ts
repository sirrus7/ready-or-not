// src/views/team/hooks/useTeamGameState.ts
// MINIMAL FIX VERSION - Only fixed database field name, removed enhanced features causing loops

/**
 * ============================================================================
 * CROSS-DEVICE COMMUNICATION ARCHITECTURE FOR READY OR NOT 2.0
 * ============================================================================
 *
 * REQUIREMENTS:
 * 1. Team apps must sync with host slide changes in real-time
 * 2. Team apps must handle decision resets from host instantly
 * 3. CRITICAL: Only 1 WebSocket connection per team app to prevent overload
 * 4. Must handle consequence slides that affect team KPIs
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
 *    - Process consequence slides for KPI updates
 * 2. Decision Resets (team_decisions table deletes)
 *    - Clear submission UI when host resets team decisions
 *    - Allow new choices to be made
 *    - Trigger refresh of decision-making components
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
    decisionResetTrigger: number; // NEW: Trigger for decision component refreshes
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

    // Game structure is static
    const gameStructure: GameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    // ========================================================================
    // SLIDE STATE MANAGEMENT
    // ========================================================================
    const updateSlideState = useCallback((slideIndex: number) => {
        const newSlide = gameStructure.slides.find(s => s.id === slideIndex);
        if (newSlide) {
            console.log('📺 Team app: Slide changed to:', newSlide.id, newSlide.title);
            setCurrentActiveSlide(newSlide);

            // Update decision state based on slide type
            const isDecisionSlide = ['interactive_invest', 'interactive_choice', 'interactive_double_down_select'].includes(newSlide.type);
            setIsDecisionTime(isDecisionSlide);

            console.log('📺 Team app: Decision time =', isDecisionSlide);
        } else {
            console.warn('📺 Team app: Unknown slide ID:', slideIndex);
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

            if (sessionData && sessionData.current_slide_index !== null) {
                updateSlideState(sessionData.current_slide_index);
            }
        } catch (error) {
            console.error('📡 Error fetching session data:', error);
        }
    }, [sessionId, updateSlideState]);

    /**
     * Fetches team KPI data for the current slide
     */
    const fetchKpisForCurrentSlide = useCallback(async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) return;

        setIsLoadingKpis(true);
        try {
            const roundNumber = currentActiveSlide.round_number || 1;
            console.log('📊 Fetching KPIs for round:', roundNumber);

            const kpiData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, roundNumber);
            console.log('📊 KPIs loaded:', kpiData);
            setCurrentTeamKpis(kpiData);
        } catch (error) {
            console.error('📊 Error loading KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide]);

    /**
     * NEW: Handles decision reset notifications from the host
     */
    const handleDecisionReset = useCallback((payload: any) => {
        console.log('🔄 Decision reset detected:', payload);

        // Check if this reset affects our team and current slide
        if (payload.old?.team_id === loggedInTeamId &&
            payload.old?.phase_id === currentActiveSlide?.interactive_data_key) {

            console.log('🔄 Reset affects our team - triggering decision component refresh');

            // Increment the trigger counter to force re-render of decision components
            setDecisionResetTrigger(prev => prev + 1);

            // Optional: Show a brief notification to the user
            console.log('✅ Your submission has been reset by the facilitator. You may now make new choices.');
        }
    }, [loggedInTeamId, currentActiveSlide?.interactive_data_key]);

    // ========================================================================
    // SINGLE REAL-TIME SUBSCRIPTION
    // This is the ONLY WebSocket connection per team app
    // FIXED: Stable dependencies to prevent connection loop
    // ========================================================================
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            setConnectionStatus('disconnected');
            return;
        }

        console.log('🔔 Setting up real-time subscription for:', sessionId, loggedInTeamId);
        setConnectionStatus('connecting');

        const channelName = `team-updates-${sessionId}-${loggedInTeamId}`;
        const channel = supabase.channel(channelName);

        channel
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'sessions',
                filter: `id=eq.${sessionId}`
            }, (payload) => {
                console.log('🔔 Session update received:', payload);
                // FIXED: Use current_slide_index instead of current_slide_id
                const newSlideIndex = payload.new?.current_slide_index;
                if (newSlideIndex !== null && newSlideIndex !== undefined) {
                    updateSlideState(newSlideIndex);
                }
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'team_decisions',
                filter: `session_id=eq.${sessionId}`
            }, handleDecisionReset)
            .subscribe((status) => {
                console.log('🔔 Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    setConnectionStatus('connected');
                    console.log('✅ Real-time connection established');
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
    }, [sessionId, loggedInTeamId, updateSlideState, handleDecisionReset]);

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
            if (connectionStatus !== 'connected') {
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
        decisionResetTrigger
    };
};
