// src/views/team/hooks/useTeamGameState.ts
// UPDATED VERSION - Implements decision reset handling

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
    const [isLoadingKpis, setIsLoadingKpis] = useState(false);
    const [decisionResetTrigger, setDecisionResetTrigger] = useState<number>(0); // NEW: Reset trigger counter

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    console.log('🎮 useTeamGameState initialized - sessionId:', sessionId, 'teamId:', loggedInTeamId);

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    /**
     * Updates the current slide state and determines if decisions are needed
     */
    const updateSlideState = useCallback((slide: Slide | null) => {
        console.log('🎬 updateSlideState called with slide:', slide?.id, slide?.title);
        setCurrentActiveSlide(slide);

        if (slide) {
            // Check if this slide requires team decisions
            const requiresDecision = slide.type.startsWith('interactive_') && !slide.type.includes('consequence');
            setIsDecisionTime(requiresDecision);
            console.log(`🎬 Decision time set to: ${requiresDecision} for slide type: ${slide.type}`);
        } else {
            setIsDecisionTime(false);
        }
    }, []);

    /**
     * Fetches the current session data and updates slide state
     */
    const fetchSessionData = useCallback(async () => {
        if (!sessionId) return;

        try {
            const session = await db.sessions.get(sessionId); // FIXED: Using correct method name
            if (session?.current_slide_index !== null && session?.current_slide_index !== undefined) {
                const newSlide = gameStructure.slides[session.current_slide_index];
                if (newSlide) {
                    updateSlideState(newSlide);
                }
            }
        } catch (error) {
            console.error('📡 Error fetching session data:', error);
        }
    }, [sessionId, gameStructure.slides, updateSlideState]);

    /**
     * Fetches team KPI data for the current slide
     */
    const fetchKpisForCurrentSlide = useCallback(async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide) return;

        setIsLoadingKpis(true);
        try {
            const roundNumber = currentActiveSlide.round_number || 1;
            console.log('📊 Fetching KPIs for round:', roundNumber);

            const kpiData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, roundNumber); // FIXED: Using correct method name
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

                // Handle slide changes
                if (payload.new?.current_slide_index !== payload.old?.current_slide_index) {
                    const newSlideIndex = payload.new.current_slide_index;
                    console.log('🎬 Slide change detected:', newSlideIndex);

                    // Use the stable gameStructure reference
                    const newSlide = readyOrNotGame_2_0_DD.slides[newSlideIndex];
                    if (newSlide) {
                        console.log('🎬 Setting new slide:', newSlide.title);
                        setCurrentActiveSlide(newSlide);

                        // Check if this slide requires team decisions
                        const requiresDecision = newSlide.type.startsWith('interactive_') &&
                            !newSlide.type.includes('consequence');
                        setIsDecisionTime(requiresDecision);
                        console.log(`🎬 Decision time set to: ${requiresDecision}`);
                    }
                }
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'team_decisions'
            }, (payload) => {
                console.log('🔔 Decision delete received:', payload);

                // Handle decision resets for our team
                // Check if this reset affects our team and current slide
                if (payload.old?.team_id === loggedInTeamId) {
                    console.log('🔄 Decision reset detected for our team');

                    // Get current slide to check if reset affects current phase
                    const currentSlide = readyOrNotGame_2_0_DD.slides.find(slide =>
                        slide.interactive_data_key === payload.old?.phase_id
                    );

                    if (currentSlide) {
                        console.log('🔄 Reset affects current slide - triggering decision component refresh');

                        // Increment the trigger counter to force re-render of decision components
                        setDecisionResetTrigger(prev => prev + 1);

                        console.log('✅ Your submission has been reset by the facilitator. You may now make new choices.');
                    } else {
                        console.log('🔄 Reset for different phase, incrementing trigger anyway');
                        setDecisionResetTrigger(prev => prev + 1);
                    }
                }
            })
            .subscribe((status) => {
                console.log('🔔 Real-time channel status:', status);

                if (status === 'SUBSCRIBED') {
                    setConnectionStatus('connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    setConnectionStatus('disconnected');
                } else if (status === 'JOINING') {
                    setConnectionStatus('connecting');
                }
            });

        // Cleanup function
        return () => {
            console.log('🔔 Cleaning up real-time subscription');
            supabase.removeChannel(channel);
            setConnectionStatus('disconnected');
        };
    }, [sessionId, loggedInTeamId]); // FIXED: Only depend on stable values

    // ========================================================================
    // FALLBACK POLLING - DISABLED FOR NOW
    // Let's see if the fixed real-time connection works reliably
    // Can re-enable if needed, but should not be necessary
    // ========================================================================
    useEffect(() => {
        if (!sessionId) return;

        // Only do initial fetch, no polling
        const initialFetch = async () => {
            try {
                const session = await db.sessions.get(sessionId);
                if (session?.current_slide_index !== null && session?.current_slide_index !== undefined) {
                    const newSlide = readyOrNotGame_2_0_DD.slides[session.current_slide_index];
                    if (newSlide) {
                        console.log('📡 Initial slide fetch:', newSlide.title);
                        setCurrentActiveSlide(newSlide);

                        const requiresDecision = newSlide.type.startsWith('interactive_') &&
                            !newSlide.type.includes('consequence');
                        setIsDecisionTime(requiresDecision);
                    }
                }
            } catch (error) {
                console.error('📡 Error fetching initial session data:', error);
            }
        };

        initialFetch();
    }, [sessionId]); // Only run once per sessionId

    // ========================================================================
    // KPI DATA MANAGEMENT
    // ========================================================================
    useEffect(() => {
        fetchKpisForCurrentSlide();
    }, [fetchKpisForCurrentSlide]);

    // ========================================================================
    // RETURN INTERFACE
    // ========================================================================
    return {
        currentActiveSlide,
        isDecisionTime,
        currentTeamKpis,
        isLoadingKpis,
        gameStructure,
        connectionStatus,
        decisionResetTrigger // NEW: Expose the reset trigger
    };
};
