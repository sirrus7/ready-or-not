// 1. FIXED: src/shared/services/supabase/services/kpiService.ts
import {supabase} from '../client';
import {withRetry} from '../database';

export const kpiService = {
    async getBySession(sessionId: string) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_round_data')
                .select('*')
                .eq('session_id', sessionId)
                .order('round_number', {ascending: true});
            if (error) throw error;
            return data || [];
        }, 3, 1000, `Fetch KPIs for session ${sessionId.substring(0, 8)}`);
    },

    // ✅ FIXED: Removed RPC call, replaced with direct query
    async getForTeamRound(sessionId: string, teamId: string, roundNumber: number) {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from('team_round_data')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('round_number', roundNumber)
                .single();
            if (error) {
                // If no data found, return null instead of throwing
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            return data;
        }, 3, 1000, `Get KPIs for team ${teamId.substring(0, 8)} round ${roundNumber}`);
    },

    async create(kpiData: any) {
        return withRetry(async () => {
            const {data, error} = await supabase
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
            const {data, error} = await supabase
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
            const {data, error} = await supabase
                .from('team_round_data')
                .upsert(kpiData, {onConflict: 'id'})
                .select()
                .single();
            if (error) throw error;
            return data;
        }, 2, 1000, `Upsert KPI data for team ${kpiData.team_id?.substring(0, 8)}`);
    },

    async deleteBySession(sessionId: string) {
        return withRetry(async () => {
            const {error} = await supabase
                .from('team_round_data')
                .delete()
                .eq('session_id', sessionId);
            if (error) throw error;
        }, 2, 1000, `Delete KPI data for session ${sessionId.substring(0, 8)}`);
    }
};
