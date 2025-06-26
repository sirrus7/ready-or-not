// src/views/team/hooks/useTeamGameState.ts
import {useEffect, useCallback, useState, useRef} from 'react';
import {db, supabase} from '@shared/services/supabase';
import type { TeamGameEvent } from '@core/sync/SimpleRealtimeManager';
import { readyOrNotGame_2_0_DD } from '@core/content/GameStructure';
import {
    Slide,
    TeamRoundData,
    PermanentKpiAdjustment,
    GameStructure
} from '@shared/types';
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
    const [gameStructure, setGameStructure] = useState<GameStructure | null>(null);
    const [isLoadingKpis, setIsLoadingKpis] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
    const [decisionResetTrigger, setDecisionResetTrigger] = useState(0);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'deleted' | 'unknown'>('unknown');
    const [closedDecisionKeys, setClosedDecisionKeys] = useState<Set<string>>(new Set());

    // Stable refs to prevent subscription recreation
    const stableSessionId = useRef<string | null>(null);
    const stableTeamId = useRef<string | null>(null);
    const resetDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const teamGameContext = useTeamGameContext();

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
            let targetRound = (currentActiveSlide?.round_number as 1 | 2 | 3) || 1;

            // PRODUCTION FIX: For KPI reset slides, wait for processing to complete
            if (targetRound > 1) {
                let newRoundData = await db.kpis.getForTeamRound(sessionId, loggedInTeamId, targetRound);

                // CRITICAL FIX: If this is a KPI reset slide and no data exists yet, wait for it
                if (!newRoundData && currentActiveSlide.type === 'kpi_reset') {
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

        if (updatedSession?.current_slide_index !== undefined && gameStructure) {
            const newSlide = gameStructure.slides[updatedSession.current_slide_index];
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
            case 'decision_time':
                if (event.data?.slideId && gameStructure) {
                    const slide = gameStructure.slides.find(s => s.id === event.data.slideId);
                    if (slide) {
                        handleSlideUpdate({ new: { current_slide_index: slide.id } });

                        // Reopen the decision when host navigates back
                        if (slide.interactive_data_key) {
                            setClosedDecisionKeys(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(slide.interactive_data_key!);
                                return newSet;
                            });
                        }
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
            case 'round_transition':
                if (event.data?.resetRequired) {
                    fetchCurrentKpis();
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

        channel.on('broadcast', { event: 'team_game_event' }, (payload: any) => {
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
    }, [sessionId, loggedInTeamId, handleTeamEvent]);

    // ========================================================================
    // EFFECTS - CLEAN
    // ========================================================================

    // CRITICAL: Controlled KPI refresh on slide changes - OPTIMIZED to prevent loading flashes
    useEffect(() => {
        if (currentActiveSlide && sessionId && loggedInTeamId) {
            // PRODUCTION FIX: Always refresh for KPI reset slides to handle round transitions
            const isKpiResetSlide = currentActiveSlide.type === 'kpi_reset';
            const roundChanged = currentTeamKpis?.round_number !== (currentActiveSlide.round_number || 1);
            const needsRefresh = !currentTeamKpis || roundChanged || isKpiResetSlide;

            if (needsRefresh) fetchCurrentKpis();
        }
    }, [currentActiveSlide?.id, currentActiveSlide?.round_number, currentActiveSlide?.type, fetchCurrentKpis, currentTeamKpis?.round_number]);

    // Load game structure and initialize slide
    useEffect(() => {
        const loadGameStructure = async () => {
            if (!sessionId) return;

            try {
                // Load session data to get current slide
                const session = await db.sessions.getById(sessionId);
                if (!session) return;

                // Load game structure
                setGameStructure(readyOrNotGame_2_0_DD);

                // Set initial slide
                const slideIndex = session.current_slide_index || 0;
                const initialSlide = readyOrNotGame_2_0_DD.slides[slideIndex];
                if (initialSlide) {
                    setCurrentActiveSlide(initialSlide);
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
    };
};
