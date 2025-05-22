// src/hooks/useTeamDataManager.ts
import {useState, useEffect, useCallback, Dispatch, SetStateAction} from 'react';
import {supabase} from '../lib/supabase';
import {Team, TeamDecision, TeamRoundData} from '../types';

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
            const {data, error: fetchError} = await supabase
                .from('teams')
                .select('*')
                .eq('session_id', sessionId);
            if (fetchError) throw fetchError;
            setTeams(data || []);
        } catch (err) {
            console.error("useTeamDataManager: Error fetching teams:", err);
            setError("Failed to load teams for the session.");
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
        console.log("useTeamDataManager: Fetching all team decisions for session:", sessionId);
        setIsLoadingDecisions(true);
        setError(null);
        try {
            const {data, error: fetchError} = await supabase
                .from('team_decisions')
                .select('*')
                .eq('session_id', sessionId);
            if (fetchError) throw fetchError;

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
            setError("Failed to load team decisions.");
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
        console.log("useTeamDataManager: Fetching all team round data for session:", sessionId);
        setIsLoadingRoundData(true);
        setError(null);
        try {
            const {data, error: fetchError} = await supabase
                .from('team_round_data')
                .select('*')
                .eq('session_id', sessionId);
            if (fetchError) throw fetchError;

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
            setError("Failed to load team KPI data.");
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
        const {error: deleteError} = await supabase
            .from('team_decisions')
            .delete()
            .eq('session_id', sessionId)
            .eq('team_id', teamId)
            .eq('phase_id', phaseId);
        if (deleteError) {
            console.error("useTeamDataManager: Error deleting team decision from DB:", deleteError);
            throw deleteError;
        }
        // The real-time subscription in AppContext should handle updating the local state.
        // Or, could manually update local state here:
        // setTeamDecisions(prev => {
        //   const updated = { ...prev };
        //   if (updated[teamId]) {
        //     delete updated[teamId][phaseId];
        //     if (Object.keys(updated[teamId]).length === 0) delete updated[teamId];
        //   }
        //   return updated;
        // });
    }, []);


    // Initial fetch when sessionId becomes available
    useEffect(() => {
        if (initialSessionId && initialSessionId !== 'new') {
            fetchTeamsForSession(initialSessionId);
            fetchTeamDecisionsForSession(initialSessionId);
            fetchTeamRoundDataForSession(initialSessionId);
        } else {
            // Clear data if no valid session ID
            setTeams([]);
            setTeamDecisions({});
            setTeamRoundData({});
        }
    }, [initialSessionId, fetchTeamsForSession, fetchTeamDecisionsForSession, fetchTeamRoundDataForSession]);

    // Real-time subscription for team_decisions (moved from AppContext)
    useEffect(() => {
        if (!initialSessionId || initialSessionId === 'new') return;

        const channelKey = `team-decisions-${initialSessionId}`;
        const decisionsChannel = supabase.channel(channelKey)
            .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'team_decisions',
                    filter: `session_id=eq.${initialSessionId}`
                },
                (payload) => {
                    console.log('useTeamDataManager: Team decision change received:', payload);
                    const newDecision = payload.new as TeamDecision;
                    const oldDecision = payload.old as TeamDecision;
                    setTeamDecisions(prev => {
                        const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            if (!updated[newDecision.team_id]) updated[newDecision.team_id] = {};
                            updated[newDecision.team_id][newDecision.phase_id] = newDecision;
                        } else if (payload.eventType === 'DELETE' && oldDecision?.team_id && oldDecision?.phase_id) {
                            if (updated[oldDecision.team_id]) {
                                delete updated[oldDecision.team_id][oldDecision.phase_id];
                                if (Object.keys(updated[oldDecision.team_id]).length === 0) delete updated[oldDecision.team_id];
                            }
                        }
                        return updated;
                    });
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(decisionsChannel);
        };
    }, [initialSessionId]);

    // TODO: Add real-time subscription for team_round_data if live KPI updates are desired

    return {
        teams, teamDecisions, teamRoundData,
        isLoadingTeams, isLoadingDecisions, isLoadingRoundData,
        error,
        fetchTeamsForSession, fetchTeamDecisionsForSession, fetchTeamRoundDataForSession,
        resetTeamDecisionInDb,
        setTeamRoundDataDirectly: setTeamRoundData // Export the setter function
    };
};