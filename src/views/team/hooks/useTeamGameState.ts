// src/views/team/hooks/useTeamGameState.ts
import {useCallback, useEffect, useRef, useState} from 'react';
import {db, supabase} from '@shared/services/supabase';
import {InteractiveSlideData, SimpleRealtimeManager, TeamGameEvent} from '@core/sync/SimpleRealtimeManager';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';
import {GameStructure, PermanentKpiAdjustment, Slide, TeamRoundData} from '@shared/types';
import {useTeamGameContext} from "@app/providers/TeamGameProvider";

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
    sessionStatus: 'active' | 'deleted' | 'unknown';
    triggerDecisionRefresh: () => void;
    interactiveData: InteractiveSlideData | null;
}

interface PayloadData {
    new?: TeamRoundData | Record<string, unknown>;
    old?: TeamRoundData | Record<string, unknown>;
    eventType?: string;
}

interface SessionPayload {
    new?: {
        current_slide_index?: number;
        id?: string;
    };
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
    const [gameStructure, setGameStructure] = useState<GameStructure | null>(readyOrNotGame_2_0_DD);
    const [isLoadingKpis, setIsLoadingKpis] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
    const [decisionResetTrigger, setDecisionResetTrigger] = useState(0);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'deleted' | 'unknown'>('unknown');
    const [closedDecisionKeys, setClosedDecisionKeys] = useState<Set<string>>(new Set());
    const [interactiveData, setInteractiveData] = useState<InteractiveSlideData | null>(null);

    // Stable refs to prevent subscription recreation
    const stableSessionId = useRef<string | null>(null);
    const stableTeamId = useRef<string | null>(null);
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const teamGameContext = useTeamGameContext();
    const isSlideAfterKpiReset = (slide: any): boolean => {
        // Slide 143 follows 142 (KPI reset), Slide 68 follows 67 (KPI reset)
        return slide.id === 143 || slide.id === 68;
    };

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
        console.log("[useTeamGameState] currentActiveSlide: ", currentActiveSlide)

        setIsLoadingKpis(true);
        try {
            let targetRound = (currentActiveSlide?.round_number as 1 | 2 | 3) || 1;

            // PRODUCTION FIX: For KPI reset slides, wait for processing to complete
            if (targetRound > 1) {
                let newRoundData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, targetRound);

                // CRITICAL FIX: If this is a KPI reset slide and no data exists yet, wait for it
                if (!newRoundData && (currentActiveSlide.type === 'kpi_reset' || isSlideAfterKpiReset(currentActiveSlide))) {
                    // Retry logic: Wait up to 3 seconds for KPI reset processing to complete
                    let attempts = 0;
                    const maxAttempts = 6; // 6 attempts * 500ms = 3 seconds

                    while (attempts < maxAttempts && !newRoundData) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;

                        newRoundData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, targetRound);
                        if (newRoundData) {
                            break;
                        }
                    }

                    if (!newRoundData) {
                        console.warn(`[useTeamGameState] ⚠️ Round ${targetRound} data still missing after ${maxAttempts * 500}ms, falling back to R${targetRound - 1}`);
                        targetRound = (targetRound - 1) as 1 | 2 | 3;
                    }
                }
                // For non-reset slides, fall back immediately if no new data
                else if (!newRoundData) {
                    targetRound = (targetRound - 1) as 1 | 2 | 3;
                }

                // If we found new round data, use it and exit early
                if (newRoundData) {
                    setCurrentTeamKpis(newRoundData);
                    return;
                }
            }

            // Fetch data for the determined target round
            console.log(`[useTeamGameState] 📊 Fetching KPIs for team ${loggedInTeamId}, round ${targetRound}`);
            const kpis = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, targetRound);
            console.log(`[useTeamGameState] 📊 Received KPIs:`, kpis);
            setCurrentTeamKpis(kpis);
        } catch (error) {
            console.error('📊 [useTeamGameState] Error fetching KPIs:', error);
            setCurrentTeamKpis(null);
        } finally {
            setIsLoadingKpis(false);
        }
    }, [sessionId, loggedInTeamId, currentActiveSlide]);

    const handleSlideUpdate = useCallback((payload: SessionPayload) => {
        const updatedSession = payload.new;

        console.log('📊 [useTeamGameState] handleSlideUpdate - updatedSession:', updatedSession);

        if (updatedSession?.current_slide_index !== undefined && gameStructure) {
            const newSlide = gameStructure.slides[updatedSession.current_slide_index];
            console.log('📊 [useTeamGameState] handleSlideUpdate - newSlide:', newSlide);
            if (newSlide) {
                setCurrentActiveSlide(newSlide);

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

    const handleDecisionDelete = useCallback((_payload: PayloadData) => {
        if (resetDebounceRef.current) {
            clearTimeout(resetDebounceRef.current);
        }

        resetDebounceRef.current = setTimeout(() => {
            setDecisionResetTrigger(prev => prev + 1);
        }, 100);
    }, []);

    const handleSessionDelete = useCallback((_payload: PayloadData) => {
        setSessionStatus('deleted');
    }, []);

    // ========================================================================
    // REAL-TIME EVENT HANDLERS - CLEAN
    // ========================================================================

    // NEW: Team event handler
    const handleTeamEvent = useCallback((event: TeamGameEvent) => {
        if (event.data?.teamId && event.data.teamId !== loggedInTeamId) {
            return;
        }

        console.log(`[useTeamGameState] 📱 Received ${event.type}:`, event.data);

        switch (event.type) {
            case 'interactive_slide_data':
                console.log('🔍 Processing interactive_slide_data event:', event.data);

                // Set the interactive data
                setInteractiveData(event.data);

                // Handle the decision time logic (previously in decision_time case)
                console.log('🔍 gameStructure exists:', !gameStructure);
                console.log('🔍 Looking for slideId:', event.data?.slideId);

                if (event.data?.slideId && gameStructure) {
                    const slide = gameStructure.slides.find(s => s.id === event.data.slideId);

                    console.log('🔍 Found slide:', slide);
                    console.log('🔍 Slide IDs in structure:', gameStructure.slides.slice(0, 10).map(s => s.id));

                    if (slide) {
                        // FIX: Find the INDEX of the slide, not the ID
                        const slideIndex = gameStructure.slides.findIndex(s => s.id === event.data.slideId);
                        console.log('🔍 Calling handleSlideUpdate with INDEX:', slideIndex, 'for slide ID:', slide.id);

                        // Pass the INDEX, not the ID
                        handleSlideUpdate({new: {current_slide_index: slideIndex}});

                        // Reopen the decision when host navigates back
                        if (slide.interactive_data_key) {
                            setClosedDecisionKeys(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(slide.interactive_data_key!);
                                return newSet;
                            });
                        }
                    } else {
                        console.error('🔍 Slide not found! slideId:', event.data.slideId);
                    }
                }
                break;
            case 'kpi_updated':
                console.log('🔍 kpi_updated debug detailed:', {
                    loggedInTeamId,
                    updatedKpis: event.data?.updatedKpis,
                    teamDataRaw: event.data?.updatedKpis?.[loggedInTeamId],
                    teamDataExists: !!(loggedInTeamId && event.data?.updatedKpis?.[loggedInTeamId]),
                    teamDataType: typeof event.data?.updatedKpis?.[loggedInTeamId],
                    data: event.data,
                    teamGameContext: teamGameContext,
                });

                // Fix: Use flat structure, not nested
                if (loggedInTeamId && event.data?.updatedKpis?.[loggedInTeamId]) {
                    setCurrentTeamKpis(event.data.updatedKpis[loggedInTeamId]);
                } else {
                    fetchCurrentKpis();
                }

                // Update permanent adjustments from realtime data if available
                if (event.data?.permanentAdjustments && teamGameContext) {
                    teamGameContext.updatePermanentAdjustments(event.data.permanentAdjustments);
                }
                break;
            case 'decision_reset':
                handleDecisionDelete({});
                break;
            case 'game_ended':
                handleSessionDelete({});
                break;
            case 'decision_closed':
                console.log(`[useTeamGameState] 🚫 Decision period ended for: ${event.data?.decisionKey}`);
                if (event.data?.decisionKey) {
                    setClosedDecisionKeys(prev => new Set([...prev, event.data.decisionKey]));
                }
                break;
        }
    }, [loggedInTeamId, gameStructure, handleSlideUpdate, handleDecisionDelete, handleSessionDelete, fetchCurrentKpis]);

    // NEW: Custom channel subscription - replaces all database subscriptions
    useEffect(() => {
        if (!sessionId || !loggedInTeamId) return;

        console.log(`[useTeamGameState] 🔗 Connecting to team-events-${sessionId}`);

        const channel = supabase.channel(`team-events-${sessionId}`);

        channel.on('broadcast', {event: 'team_game_event'}, (payload: any) => {
            try {
                const event = payload.payload as TeamGameEvent;
                handleTeamEvent(event);
            } catch (error) {
                console.error('[useTeamGameState] Error handling team event:', error);
            }
        });

        channel.subscribe((status: string) => {
            switch (status) {
                case 'SUBSCRIBED':
                    setConnectionStatus('connected');
                    console.log(`[useTeamGameState] ✅ Connected to team events`);

                    // Load/sync state on every connection (initial + reconnect)
                    if (sessionId && loggedInTeamId) {
                        const syncState = async () => {
                            try {
                                const session = await db.sessions.getById(sessionId);
                                if (!session) return;

                                const slideIndex = session.current_slide_index || 0;
                                const initialSlide = readyOrNotGame_2_0_DD.slides[slideIndex];
                                if (initialSlide) {
                                    setCurrentActiveSlide(initialSlide);
                                    const targetRound = (initialSlide.round_number as 1 | 2 | 3) || 1;
                                    const kpis = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, targetRound);
                                    setCurrentTeamKpis(kpis);
                                }
                            } catch (error) {
                                console.error('Error syncing state:', error);
                            }
                        };

                        syncState();
                    }
                    break;
                case 'CHANNEL_ERROR':
                case 'TIMED_OUT':
                    setConnectionStatus('disconnected');
                    console.error(`[useTeamGameState] ❌ Team events error: ${status}`);
                    break;
                case 'CLOSED':
                    setConnectionStatus('disconnected');
                    break;
            }
        });

        return () => {
            console.log(`[useTeamGameState] 🔌 Disconnecting team events`);
            supabase.removeChannel(channel);
        };
    }, [sessionId, loggedInTeamId]);

    // ========================================================================
    // EFFECTS - CLEAN
    // ========================================================================

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

    useEffect(() => {
        const verifySessionExists = async () => {
            if (!sessionId) {
                setSessionStatus('unknown');
                return;
            }

            try {
                const session = await db.sessions.getById(sessionId);
                setSessionStatus(session ? 'active' : 'deleted');
            } catch (error: unknown) {
                // If session not found, mark as deleted
                const isNotFoundError = error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116';
                setSessionStatus(isNotFoundError ? 'deleted' : 'unknown');
            }
        };

        verifySessionExists();
    }, [sessionId]);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    const isDecisionTime = !!(
        currentActiveSlide?.interactive_data_key &&
        currentActiveSlide?.type?.startsWith('interactive_') &&
        !closedDecisionKeys.has(currentActiveSlide.interactive_data_key)
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
        fetchCurrentKpis,
        sessionStatus,
        triggerDecisionRefresh: () => setDecisionResetTrigger(prev => prev + 1),
        interactiveData,
    };
};
