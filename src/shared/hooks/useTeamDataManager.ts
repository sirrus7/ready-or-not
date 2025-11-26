// src/shared/hooks/useTeamDataManager.ts
// Handles both KPIs AND permanent adjustments in one place
// This extends the proven KPI update system to also handle impact cards

import {Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState} from 'react';
import {db, formatSupabaseError, useRealtimeSubscription} from '@shared/services/supabase';
import {PermanentKpiAdjustment, Team, TeamDecision, TeamRoundData} from '@shared/types';

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
    setPermanentAdjustmentsDirectly: Dispatch<SetStateAction<PermanentKpiAdjustment[]>>;
    addTeamToSession: (sessionId: string, teamName: string, passcode: string) => Promise<Team>;
    removeTeamFromSession: (sessionId: string, teamId: string) => Promise<void>;
}

// ADD THIS: Simple deep equality check for React state
const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
    return false;
};

export const useTeamDataManager = (initialSessionId: string | null): TeamDataManagerOutput => {
    const [teams, setTeamsState] = useState<Team[]>([]);
    const [teamDecisions, setTeamDecisionsState] = useState<Record<string, Record<string, TeamDecision>>>({});
    const [teamRoundData, setTeamRoundDataState] = useState<Record<string, Record<number, TeamRoundData>>>({});

    // ADDED: Permanent adjustments (impact cards) to centralized system
    const [permanentAdjustments, setPermanentAdjustmentsState] = useState<PermanentKpiAdjustment[]>([]);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState<boolean>(false);

    const [isLoadingTeams, setIsLoadingTeams] = useState<boolean>(false);
    const [isLoadingDecisions, setIsLoadingDecisions] = useState<boolean>(false);
    const [isLoadingRoundData, setIsLoadingRoundData] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // FIXED: Smart setters that prevent unnecessary re-renders
    const setTeams = useCallback((newTeams: Team[] | ((prev: Team[]) => Team[])) => {
        setTeamsState(prev => {
            const nextTeams = typeof newTeams === 'function' ? newTeams(prev) : newTeams;
            if (deepEqual(prev, nextTeams)) {
                return prev;
            }
            return nextTeams;
        });
    }, []);

    const setTeamDecisions = useCallback((newDecisions: Record<string, Record<string, TeamDecision>> | ((prev: Record<string, Record<string, TeamDecision>>) => Record<string, Record<string, TeamDecision>>)) => {
        setTeamDecisionsState(prev => {
            const nextDecisions = typeof newDecisions === 'function' ? newDecisions(prev) : newDecisions;
            if (deepEqual(prev, nextDecisions)) {
                return prev;
            }
            return nextDecisions;
        });
    }, []);

    const setTeamRoundData = useCallback((newRoundData: Record<string, Record<number, TeamRoundData>> | ((prev: Record<string, Record<number, TeamRoundData>>) => Record<string, Record<number, TeamRoundData>>)) => {
        setTeamRoundDataState(prev => {
            const nextRoundData = typeof newRoundData === 'function' ? newRoundData(prev) : newRoundData;
            if (deepEqual(prev, nextRoundData)) {
                return prev;
            }
            return nextRoundData;
        });
    }, []);

    const setPermanentAdjustments = useCallback((newAdjustments: PermanentKpiAdjustment[] | ((prev: PermanentKpiAdjustment[]) => PermanentKpiAdjustment[])) => {
        setPermanentAdjustmentsState(prev => {
            const nextAdjustments = typeof newAdjustments === 'function' ? newAdjustments(prev) : newAdjustments;
            if (deepEqual(prev, nextAdjustments)) {
                return prev;
            }
            return nextAdjustments;
        });
    }, []);

    const fetchTeamsForSession = useCallback(async (sessionId: string) => {
        if (!sessionId || sessionId === 'new') {
            setTeams([]);
            return;
        }
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
        setIsLoadingRoundData(true);
        setIsLoadingAdjustments(true);
        setError(null);
        try {
            const kpiData = await db.kpis.getBySession(sessionId);
            const adjustmentData = await db.adjustments.getBySession(sessionId);

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
        if (!sessionId || !teamId || !phaseId) {
            const errorMsg = `Missing required IDs for reset: sessionId=${!!sessionId}, teamId=${!!teamId}, phaseId=${!!phaseId}`;
            console.error("[useTeamDataManager]", errorMsg);
            throw new Error("Missing session, team, or phase ID for reset.");
        }
        try {
            // This will now use the FIXED delete function that protects immediate purchases
            await db.decisions.delete(sessionId, teamId, phaseId);
            setTeamDecisions(prev => {
                const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
                if (updated[teamId] && updated[teamId][phaseId]) {
                    delete updated[teamId][phaseId];
                    // If this was the last decision for this team, remove the team entry entirely
                    if (Object.keys(updated[teamId]).length === 0) {
                        delete updated[teamId];
                    }
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

    const addTeamToSession = useCallback(async (
        sessionId: string,
        teamName: string,
        passcode: string
    ): Promise<Team> => {
        if (!sessionId || sessionId === 'new') {
            throw new Error('Cannot add team: Invalid session ID');
        }
        try {
            const newTeam = await db.teams.create({
                session_id: sessionId,
                name: teamName,
                passcode: passcode
            });

            // Initialize KPI data for the new team in Round 1
            // Using Round 1 base values: orders=6250, cost=1200000, capacity=5000, asp=1000
            await db.kpis.create({
                session_id: sessionId,
                team_id: newTeam.id,
                round_number: 1,
                start_capacity: 5000,
                start_orders: 6250,
                start_cost: 1200000,
                start_asp: 1000,
                current_capacity: 5000,
                current_orders: 6250,
                current_cost: 1200000,
                current_asp: 1000,
                revenue: 0,
                net_margin: 0,
                net_income: 0,
            });

            // Refresh teams list
            await fetchTeamsForSession(sessionId);
            return newTeam as Team;
        } catch (err) {
            console.error("useTeamDataManager: Error adding team:", err);
            throw new Error(`Failed to add team: ${formatSupabaseError(err)}`);
        }
    }, [fetchTeamsForSession]);

    const removeTeamFromSession = useCallback(async (
        sessionId: string,
        teamId: string
    ): Promise<void> => {
        if (!sessionId || sessionId === 'new') {
            throw new Error('Cannot remove team: Invalid session ID');
        }
        try {
            await db.teams.delete(teamId);
            // Refresh teams list
            await fetchTeamsForSession(sessionId);
        } catch (err) {
            console.error("useTeamDataManager: Error removing team:", err);
            throw new Error(`Failed to remove team: ${formatSupabaseError(err)}`);
        }
    }, [fetchTeamsForSession]);

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
            onchange: (_u) => {
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
                const newKpiData = payload.new as TeamRoundData;
                const oldKpiData = payload.old as TeamRoundData;

                setTeamRoundData(prev => {
                    const updated = JSON.parse(JSON.stringify(prev));
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        if (!updated[newKpiData.team_id]) updated[newKpiData.team_id] = {};
                        updated[newKpiData.team_id][newKpiData.round_number] = newKpiData;
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
                    // Refresh permanent adjustments (don't await to avoid blocking KPI updates)
                    db.adjustments.getBySession(initialSessionId!).then(adjustmentData => {
                        setPermanentAdjustments(adjustmentData || []);
                    }).catch(err => {
                        console.error('🎯 useTeamDataManager: Error refreshing adjustments:', err);
                    });
                }
            }
        },
        !!initialSessionId && initialSessionId !== 'new'
    );

    // At the end of useTeamDataManager, memoize the returned values with strong typing
    return useMemo((): TeamDataManagerOutput => ({
        teams,
        teamDecisions,
        teamRoundData,
        permanentAdjustments,
        isLoadingTeams,
        isLoadingDecisions,
        isLoadingRoundData,
        isLoadingAdjustments,
        error,
        fetchTeamsForSession,
        fetchTeamDecisionsForSession,
        fetchTeamRoundDataForSession,
        resetTeamDecisionInDb,
        setTeamRoundDataDirectly: setTeamRoundData,
        setPermanentAdjustmentsDirectly: setPermanentAdjustments,
        addTeamToSession,
        removeTeamFromSession,
    }), [
        teams,
        teamDecisions,
        teamRoundData,
        permanentAdjustments,
        isLoadingTeams,
        isLoadingDecisions,
        isLoadingRoundData,
        isLoadingAdjustments,
        error,
        fetchTeamsForSession,
        fetchTeamDecisionsForSession,
        fetchTeamRoundDataForSession,
        resetTeamDecisionInDb,
        setTeamRoundData,
        setPermanentAdjustments,
        addTeamToSession,
        removeTeamFromSession,
    ]);
};
