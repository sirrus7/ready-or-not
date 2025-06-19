// src/shared/hooks/useTeamDataManager.ts
// Handles both KPIs AND permanent adjustments in one place
// This extends the proven KPI update system to also handle impact cards

import {useState, useEffect, useCallback, Dispatch, SetStateAction} from 'react';
import {db, formatSupabaseError, useRealtimeSubscription} from '@shared/services/supabase';
import {Team, TeamDecision, TeamRoundData, PermanentKpiAdjustment} from '@shared/types';

interface TeamDataManagerOutput {
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    permanentAdjustments: PermanentKpiAdjustment[]; // ADDED: Impact cards data
    isLoadingTeams: boolean;
    isLoadingDecisions: boolean;
    isLoadingRoundData: boolean;
    isLoadingAdjustments: boolean; // ADDED: Loading state for adjustments
    error: string | null;
    fetchTeamsForSession: (sessionId: string) => Promise<void>;
    fetchTeamDecisionsForSession: (sessionId: string) => Promise<void>;
    fetchTeamRoundDataForSession: (sessionId: string) => Promise<void>; // NOW ALSO FETCHES ADJUSTMENTS
    resetTeamDecisionInDb: (sessionId: string, teamId: string, phaseId: string) => Promise<void>;
    setTeamRoundDataDirectly: Dispatch<SetStateAction<Record<string, Record<number, TeamRoundData>>>>;
}

export const useTeamDataManager = (initialSessionId: string | null): TeamDataManagerOutput => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamDecisions, setTeamDecisions] = useState<Record<string, Record<string, TeamDecision>>>({});
    const [teamRoundData, setTeamRoundData] = useState<Record<string, Record<number, TeamRoundData>>>({});

    // ADDED: Permanent adjustments (impact cards) to centralized system
    const [permanentAdjustments, setPermanentAdjustments] = useState<PermanentKpiAdjustment[]>([]);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState<boolean>(false);

    const [isLoadingTeams, setIsLoadingTeams] = useState<boolean>(false);
    const [isLoadingDecisions, setIsLoadingDecisions] = useState<boolean>(false);
    const [isLoadingRoundData, setIsLoadingRoundData] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTeamsForSession = useCallback(async (sessionId: string) => {
        if (!sessionId || sessionId === 'new') {
            setTeams([]);
            return;
        }

        console.log("useTeamDataManager: Fetching teams for session:", sessionId);
        setIsLoadingTeams(true);
        setError(null);

        try {
            const data = await db.teams.getBySession(sessionId);
            setTeams(data as Team[]);
        } catch (err) {
            console.error("useTeamDataManager: Error fetching teams:", err);
            setError(`Failed to load teams: ${formatSupabaseError(err)}`);
            setTeams([]);
        } finally {
            setIsLoadingTeams(false);
        }
    }, []);

    const fetchTeamDecisionsForSession = useCallback(async (sessionId: string) => {
        if (!sessionId || sessionId === 'new') {
            setTeamDecisions({});
            return;
        }

        console.log("useTeamDataManager: Fetching team decisions for session:", sessionId);
        setIsLoadingDecisions(true);
        setError(null);

        try {
            const data = await db.decisions.getBySession(sessionId);

            const structuredDecisions: Record<string, Record<string, TeamDecision>> = {};
            (data || []).forEach(decision => {
                if (!structuredDecisions[decision.team_id]) {
                    structuredDecisions[decision.team_id] = {};
                }
                structuredDecisions[decision.team_id][decision.phase_id] = decision as TeamDecision;
            });
            setTeamDecisions(structuredDecisions);
        } catch (err) {
            console.error("useTeamDataManager: Error fetching team decisions:", err);
            setError(`Failed to load team decisions: ${formatSupabaseError(err)}`);
            setTeamDecisions({});
        } finally {
            setIsLoadingDecisions(false);
        }
    }, []);

    // UNIFIED: This function now fetches BOTH KPIs and adjustments
    // This is the key to making both systems work with the same reliability
    const fetchTeamRoundDataForSession = useCallback(async (sessionId: string) => {
        if (!sessionId || sessionId === 'new') {
            setTeamRoundData({});
            setPermanentAdjustments([]);
            return;
        }

        console.log("useTeamDataManager: Fetching team round data AND adjustments for session:", sessionId);
        setIsLoadingRoundData(true);
        setIsLoadingAdjustments(true);
        setError(null);

        try {
            // UNIFIED: Fetch both KPIs and adjustments in parallel
            // This ensures both update together reliably
            const [kpiData, adjustmentData] = await Promise.all([
                db.kpis.getBySession(sessionId),
                db.adjustments.getBySession(sessionId)
            ]);

            // Update KPIs (existing logic)
            const structuredRoundData: Record<string, Record<number, TeamRoundData>> = {};
            (kpiData || []).forEach(rd => {
                if (!structuredRoundData[rd.team_id]) {
                    structuredRoundData[rd.team_id] = {};
                }
                structuredRoundData[rd.team_id][rd.round_number] = rd as TeamRoundData;
            });
            setTeamRoundData(structuredRoundData);

            // ADDED: Update adjustments (for impact cards)
            setPermanentAdjustments(adjustmentData || []);

            console.log(`useTeamDataManager: Updated ${Object.keys(structuredRoundData).length} teams' KPIs and ${adjustmentData?.length || 0} adjustments`);

        } catch (err) {
            console.error("useTeamDataManager: Error fetching team data:", err);
            setError(`Failed to load team data: ${formatSupabaseError(err)}`);
            setTeamRoundData({});
            setPermanentAdjustments([]);
        } finally {
            setIsLoadingRoundData(false);
            setIsLoadingAdjustments(false);
        }
    }, []);

    // FIXED: Updated to protect immediate purchases from being reset
    const resetTeamDecisionInDb = useCallback(async (sessionId: string, teamId: string, phaseId: string) => {
        console.log(`[useTeamDataManager] resetTeamDecisionInDb called with:`, {
            sessionId: sessionId || 'MISSING',
            teamId: teamId || 'MISSING',
            phaseId: phaseId || 'MISSING'
        });

        if (!sessionId || !teamId || !phaseId) {
            const errorMsg = `Missing required IDs for reset: sessionId=${!!sessionId}, teamId=${!!teamId}, phaseId=${!!phaseId}`;
            console.error("[useTeamDataManager]", errorMsg);
            throw new Error("Missing session, team, or phase ID for reset.");
        }

        console.log(`useTeamDataManager: Resetting decision in DB for session ${sessionId}, team ${teamId}, phase ${phaseId}`);

        try {
            // This will now use the FIXED delete function that protects immediate purchases
            await db.decisions.delete(sessionId, teamId, phaseId);

            console.log(`useTeamDataManager: Successfully deleted regular decisions from DB, updating local state`);

            setTeamDecisions(prev => {
                const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
                if (updated[teamId] && updated[teamId][phaseId]) {
                    delete updated[teamId][phaseId];
                    // If this was the last decision for this team, remove the team entry entirely
                    if (Object.keys(updated[teamId]).length === 0) {
                        delete updated[teamId];
                    }
                    console.log(`useTeamDataManager: Updated local state after reset - removed ${teamId}/${phaseId} (preserved immediate purchases)`);
                }
                return updated;
            });

            // ADDED: Force refresh team decisions to get fresh data from database
            await fetchTeamDecisionsForSession(sessionId);

        } catch (err) {
            console.error("useTeamDataManager: Error resetting team decision:", err);
            throw new Error(`Failed to reset decision: ${formatSupabaseError(err)}`);
        }
    }, [fetchTeamDecisionsForSession]);

    // Initial fetch when sessionId becomes available
    useEffect(() => {
        if (initialSessionId && initialSessionId !== 'new') {
            fetchTeamsForSession(initialSessionId);
            fetchTeamDecisionsForSession(initialSessionId);
            fetchTeamRoundDataForSession(initialSessionId); // Now fetches both KPIs and adjustments
        } else {
            setTeams([]);
            setTeamDecisions({});
            setTeamRoundData({});
            setPermanentAdjustments([]);
        }
    }, [initialSessionId, fetchTeamsForSession, fetchTeamDecisionsForSession, fetchTeamRoundDataForSession]);

    // Existing subscription for team decisions
    useRealtimeSubscription(
        `team-decisions-${initialSessionId}`,
        {
            table: 'team_decisions',
            filter: `session_id=eq.${initialSessionId}`,
            onchange: (payload) => {
                console.log('useTeamDataManager: Team decision change received:', payload.eventType);

                if (initialSessionId) {
                    fetchTeamDecisionsForSession(initialSessionId);
                }
            }
        },
        !!initialSessionId && initialSessionId !== 'new'
    );

    // Existing subscription for team KPI updates
    useRealtimeSubscription(
        `team-kpis-${initialSessionId}`,
        {
            table: 'team_round_data',
            filter: `session_id=eq.${initialSessionId}`,
            onchange: (payload) => {
                console.log('useTeamDataManager: Team KPI change received:', payload.eventType, payload.new);
                const newKpiData = payload.new as TeamRoundData;
                const oldKpiData = payload.old as TeamRoundData;

                setTeamRoundData(prev => {
                    const updated = JSON.parse(JSON.stringify(prev));
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        if (!updated[newKpiData.team_id]) updated[newKpiData.team_id] = {};
                        updated[newKpiData.team_id][newKpiData.round_number] = newKpiData;
                        console.log(`useTeamDataManager: Updated KPIs for team ${newKpiData.team_id}, round ${newKpiData.round_number}`);
                    } else if (payload.eventType === 'DELETE' && oldKpiData?.team_id && oldKpiData?.round_number) {
                        if (updated[oldKpiData.team_id]) {
                            delete updated[oldKpiData.team_id][oldKpiData.round_number];
                            if (Object.keys(updated[oldKpiData.team_id]).length === 0) delete updated[oldKpiData.team_id];
                        }
                    }
                    return updated;
                });

                // Refresh permanent adjustments when KPIs change
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    console.log('🎯 useTeamDataManager: KPI change detected, refreshing permanent adjustments...');

                    // Refresh permanent adjustments (don't await to avoid blocking KPI updates)
                    db.adjustments.getBySession(initialSessionId!).then(adjustmentData => {
                        setPermanentAdjustments(adjustmentData || []);
                        console.log(`🎯 useTeamDataManager: Refreshed ${adjustmentData?.length || 0} permanent adjustments`);
                    }).catch(err => {
                        console.error('🎯 useTeamDataManager: Error refreshing adjustments:', err);
                    });
                }
            }
        },
        !!initialSessionId && initialSessionId !== 'new'
    );

    return {
        teams,
        teamDecisions,
        teamRoundData,
        permanentAdjustments, // ADDED: Now available globally
        isLoadingTeams,
        isLoadingDecisions,
        isLoadingRoundData,
        isLoadingAdjustments, // ADDED: Loading state for adjustments
        error,
        fetchTeamsForSession,
        fetchTeamDecisionsForSession,
        fetchTeamRoundDataForSession, // Now updates both KPIs and adjustments
        resetTeamDecisionInDb,
        setTeamRoundDataDirectly: setTeamRoundData
    };
};
