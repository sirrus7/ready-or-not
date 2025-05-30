// src/hooks/useTeamDataManager.ts - UPDATED
import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { db, formatSupabaseError, useRealtimeSubscription } from '../utils/supabase';
import { Team, TeamDecision, TeamRoundData } from '../types';

interface TeamDataManagerOutput {
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    isLoadingTeams: boolean;
    isLoadingDecisions: boolean;
    isLoadingRoundData: boolean;
    error: string | null;
    fetchTeamsForSession: (sessionId: string) => Promise<void>;
    fetchTeamDecisionsForSession: (sessionId: string) => Promise<void>;
    fetchTeamRoundDataForSession: (sessionId: string) => Promise<void>;
    resetTeamDecisionInDb: (sessionId: string, teamId: string, phaseId: string) => Promise<void>;
    setTeamRoundDataDirectly: Dispatch<SetStateAction<Record<string, Record<number, TeamRoundData>>>>;
}

export const useTeamDataManager = (initialSessionId: string | null): TeamDataManagerOutput => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamDecisions, setTeamDecisions] = useState<Record<string, Record<string, TeamDecision>>>({});
    const [teamRoundData, setTeamRoundData] = useState<Record<string, Record<number, TeamRoundData>>>({});
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

    const fetchTeamRoundDataForSession = useCallback(async (sessionId: string) => {
        if (!sessionId || sessionId === 'new') {
            setTeamRoundData({});
            return;
        }

        console.log("useTeamDataManager: Fetching team round data for session:", sessionId);
        setIsLoadingRoundData(true);
        setError(null);

        try {
            const data = await db.kpis.getBySession(sessionId);

            const structuredRoundData: Record<string, Record<number, TeamRoundData>> = {};
            (data || []).forEach(rd => {
                if (!structuredRoundData[rd.team_id]) {
                    structuredRoundData[rd.team_id] = {};
                }
                structuredRoundData[rd.team_id][rd.round_number] = rd as TeamRoundData;
            });
            setTeamRoundData(structuredRoundData);
        } catch (err) {
            console.error("useTeamDataManager: Error fetching team round data:", err);
            setError(`Failed to load team KPI data: ${formatSupabaseError(err)}`);
            setTeamRoundData({});
        } finally {
            setIsLoadingRoundData(false);
        }
    }, []);

    const resetTeamDecisionInDb = useCallback(async (sessionId: string, teamId: string, phaseId: string) => {
        if (!sessionId || !teamId || !phaseId) {
            console.error("resetTeamDecisionInDb: Missing required IDs");
            throw new Error("Missing session, team, or phase ID for reset.");
        }

        console.log(`useTeamDataManager: Resetting decision in DB for session ${sessionId}, team ${teamId}, phase ${phaseId}`);

        try {
            await db.decisions.delete(sessionId, teamId, phaseId);

            console.log(`useTeamDataManager: Successfully deleted decision from DB, updating local state`);

            setTeamDecisions(prev => {
                const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
                if (updated[teamId] && updated[teamId][phaseId]) {
                    delete updated[teamId][phaseId];
                    // If this was the last decision for this team, remove the team entry entirely
                    if (Object.keys(updated[teamId]).length === 0) {
                        delete updated[teamId];
                    }
                    console.log(`useTeamDataManager: Updated local state after reset - removed ${teamId}/${phaseId}`);
                }
                return updated;
            });
        } catch (err) {
            console.error("useTeamDataManager: Error resetting team decision:", err);
            throw new Error(`Failed to reset decision: ${formatSupabaseError(err)}`);
        }
    }, []);

    // Initial fetch when sessionId becomes available
    useEffect(() => {
        if (initialSessionId && initialSessionId !== 'new') {
            fetchTeamsForSession(initialSessionId);
            fetchTeamDecisionsForSession(initialSessionId);
            fetchTeamRoundDataForSession(initialSessionId);
        } else {
            setTeams([]);
            setTeamDecisions({});
            setTeamRoundData({});
        }
    }, [initialSessionId, fetchTeamsForSession, fetchTeamDecisionsForSession, fetchTeamRoundDataForSession]);

    // Real-time subscription for team decisions using new hook
    useRealtimeSubscription(
        `team-decisions-${initialSessionId}`,
        {
            table: 'team_decisions',
            filter: `session_id=eq.${initialSessionId}`,
            onchange: (payload) => {
                console.log('useTeamDataManager: Team decision change received:', payload);
                const newDecision = payload.new as TeamDecision;
                const oldDecision = payload.old as TeamDecision;

                setTeamDecisions(prev => {
                    const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        if (!updated[newDecision.team_id]) updated[newDecision.team_id] = {};
                        updated[newDecision.team_id][newDecision.phase_id] = newDecision;
                        console.log(`useTeamDataManager: Updated decision for team ${newDecision.team_id}, phase ${newDecision.phase_id}`);
                    } else if (payload.eventType === 'DELETE' && oldDecision?.team_id && oldDecision?.phase_id) {
                        if (updated[oldDecision.team_id]) {
                            delete updated[oldDecision.team_id][oldDecision.phase_id];
                            if (Object.keys(updated[oldDecision.team_id]).length === 0) delete updated[oldDecision.team_id];
                            console.log(`useTeamDataManager: Removed decision for team ${oldDecision.team_id}, phase ${oldDecision.phase_id}`);
                        }
                    }
                    return updated;
                });
            }
        },
        !!initialSessionId && initialSessionId !== 'new'
    );

    return {
        teams, teamDecisions, teamRoundData,
        isLoadingTeams, isLoadingDecisions, isLoadingRoundData,
        error,
        fetchTeamsForSession, fetchTeamDecisionsForSession, fetchTeamRoundDataForSession,
        resetTeamDecisionInDb,
        setTeamRoundDataDirectly: setTeamRoundData
    };
};