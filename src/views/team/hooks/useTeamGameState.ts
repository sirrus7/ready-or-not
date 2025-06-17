// src/views/team/hooks/useTeamGameState.ts
// FINAL PRODUCTION VERSION - Single Real-time Connection Architecture

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
            const requiresDecision = slide.type.startsWith('interactive_') && !!slide.interactive_data_key;
            setIsDecisionTime(requiresDecision);

            console.log(`🎬 Updated to slide ${slide.id}: "${slide.title}" | Decision Required: ${requiresDecision}`);
        } else {
            setIsDecisionTime(false);
        }
    }, []); // No dependencies - this function is stable

    /**
     * Handles consequence slides - checks if they affect our team and updates KPIs
     */
    const handleConsequenceSlide = useCallback(async (consequenceSlide: Slide) => {
        if (!consequenceSlide.interactive_data_key || !loggedInTeamId || !sessionId) {
            console.log('💥 Consequence slide missing data - skipping KPI check');
            return;
        }

        try {
            console.log('💥 Checking if consequence affects our team:', consequenceSlide.interactive_data_key);

            // Get our team's decision for this consequence phase
            const decision = await db.decisions.getForPhase(
                sessionId,
                loggedInTeamId,
                consequenceSlide.interactive_data_key
            );

            if (decision?.submitted_at) {
                console.log('💥 Consequence matches our choice - updating KPIs');

                // Refresh KPIs with delay to ensure database updates are complete
                setTimeout(() => {
                    fetchKpisForCurrentSlide();
                }, 1000);
            } else {
                console.log('💥 Consequence doesn\'t affect our team - no KPI update needed');
            }
        } catch (error) {
            console.error('💥 Error checking consequence relevance:', error);
        }
    }, [loggedInTeamId, sessionId]); // Stable dependencies

    /**
     * Fetches current session data from database
     */
    const fetchSessionData = async () => {
        if (!sessionId || sessionId === 'new') {
            console.log('📡 No valid sessionId - skipping fetch');
            return;
        }

        try {
            console.log('📡 Fetching session data...');
            const session = await db.sessions.get(sessionId);

            if (session && session.current_slide_index !== null) {
                console.log('📡 Session fetched - slide index:', session.current_slide_index);

                const slide = gameStructure.slides[session.current_slide_index] || null;
                updateSlideState(slide);

                // Handle consequence slides
                if (slide?.type === 'consequence_reveal') {
                    await handleConsequenceSlide(slide);
                }

                setConnectionStatus('connected');
            } else {
                console.log('📡 No session data or slide index');
                setConnectionStatus('disconnected');
            }
        } catch (error) {
            console.error('📡 Error fetching session:', error);
            setConnectionStatus('disconnected');
        }
    };

    /**
     * Fetches KPI data for the current slide's round
     */
    const fetchKpisForCurrentSlide = async () => {
        if (!sessionId || !loggedInTeamId || !currentActiveSlide || currentActiveSlide.round_number === 0) {
            setCurrentTeamKpis(null);
            return;
        }

        try {
            setIsLoadingKpis(true);
            const kpis = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, currentActiveSlide.round_number);
            setCurrentTeamKpis(kpis);
            console.log('📊 KPIs loaded for round', currentActiveSlide.round_number, ':', kpis);
        } catch (error) {
            console.error('📊 Error loading KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    };

    // ========================================================================
    // SINGLE REAL-TIME SUBSCRIPTION
    // This is the ONLY WebSocket connection per team app
    // ========================================================================
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) {
            setConnectionStatus('disconnected');
            return;
        }

        setConnectionStatus('connecting');

        const channel = supabase
            .channel(`team-updates-${sessionId}-${loggedInTeamId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public'
                // No table filter - listen to everything
            }, (payload) => {
                console.log('🔔 ALL EVENTS:', payload);

                // Handle slide changes
                if (payload.table === 'sessions' &&
                    payload.eventType === 'UPDATE' &&
                    payload.new?.id === sessionId) {

                    if (payload.new?.current_slide_index !== payload.old?.current_slide_index) {
                        const newSlideIndex = payload.new.current_slide_index;
                        const newSlide = gameStructure.slides[newSlideIndex];
                        setCurrentActiveSlide(newSlide);
                    }
                }

                // Handle decision resets
                if (payload.table === 'team_decisions' &&
                    payload.eventType === 'DELETE') {

                    // TODO: Handle that the host reset our team's choices. Now we need to reload the choices for the current slide so we can select and submit them again!
                }

                setConnectionStatus('connected');
            })
            .subscribe((status) => {
                console.log('🔔 Single channel status:', status);
            });

        // Cleanup: Unsubscribe when component unmounts or dependencies change
        return () => {
            console.log('🔔 REAL-TIME: Cleaning up subscription');
            channel.unsubscribe();
        };
    }, [sessionId, loggedInTeamId, gameStructure.slides]);

    // ========================================================================
    // FALLBACK POLLING
    // Backup mechanism in case real-time fails
    // ========================================================================
    useEffect(() => {
        if (!sessionId) return;

        console.log('📡 Setting up fallback polling (10 second intervals)');

        // Initial fetch
        fetchSessionData();

        // Backup polling every 10 seconds
        const pollInterval = setInterval(() => {
            console.log('📡 POLLING: Checking for updates...');
            fetchSessionData();
        }, 10000); // 10 seconds - less aggressive than before

        return () => {
            console.log('📡 POLLING: Cleaning up fallback polling');
            clearInterval(pollInterval);
        };
    }, [sessionId, gameStructure]);

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
        connectionStatus
    };
};
