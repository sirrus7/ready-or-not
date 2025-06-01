// src/utils/supabase/services/kpiService.ts - KPI/round data operations
import { supabase } from '../client';
import { withRetry, callRPC } from '../database';

export const kpiService = {
    async getBySession(sessionId: string) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('team_round_data')
                .select('*')
                .eq('session_id', sessionId)
                .order('round_number', { ascending: true });
            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch KPIs for session ${sessionId.substring(0, 8)}`);
    },

    async getForTeamRound(sessionId: string, teamId: string, roundNumber: number) {
        return callRPC('get_team_kpis_for_student', {
            target_session_id: sessionId,
            target_team_id: teamId,
            target_round_number: roundNumber
        }, {
            expectedSingle: true,
            context: `Get KPIs for team ${teamId.substring(0, 8)} round ${roundNumber}`,
            maxRetries: 2
        });
    },

    async create(kpiData: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('team_round_data')
                .insert(kpiData)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Create KPI data for team ${kpiData.team_id?.substring(0, 8)} round ${kpiData.round_number}`);
    },

    async update(kpiId: string, updates: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('team_round_data')
                .update(updates)
                .eq('id', kpiId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Update KPI data ${kpiId}`);
    },

    async upsert(kpiData: any) {
        return withRetry(async () => {
            const { data, error } = await supabase
                .from('team_round_data')
                .upsert(kpiData, { onConflict: 'id' })
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Upsert KPI data for team ${kpiData.team_id?.substring(0, 8)}`);
    }
};
