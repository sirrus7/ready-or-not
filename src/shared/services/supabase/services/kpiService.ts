// 1. FIXED: src/shared/services/supabase/services/kpiService.ts
import {supabase} from '../client';
import {withRetry} from '../database';
import {TeamRoundData} from "@shared/types";

const TEAM_ROUND_DATA_TABLE = 'team_round_data';

export const kpiService = {
    async getBySession(sessionId: string): Promise<TeamRoundData[]> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_ROUND_DATA_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .order('round_number', {ascending: true});
            if (error) {
                console.error(`[kpiService.getBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
            return data || [] as TeamRoundData[];
        }, 3, 1000, `Fetch KPIs for session ${sessionId.substring(0, 8)}`);
    },

    // ✅ FIXED: Removed RPC call, replaced with direct query
    async getForTeamRound(sessionId: string, teamId: string, roundNumber: number): Promise<TeamRoundData | null> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_ROUND_DATA_TABLE)
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('round_number', roundNumber)
                .maybeSingle();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Early return, no throw
                }
                console.error(`[kpiService.getForTeamRound(sessionId:${sessionId}, teamId:${teamId}, roundNumber:${roundNumber})] failed with error: ${error}`)
                throw error;
            }
            return data as TeamRoundData | null;
        }, 3, 1000, `Get KPIs for team ${teamId.substring(0, 8)} round ${roundNumber}`);
    },

    async create(kpiData: Omit<TeamRoundData, 'id' | 'created_at'>): Promise<TeamRoundData> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_ROUND_DATA_TABLE)
                .insert(kpiData)
                .select()
                .single();
            if (error) {
                console.error(`[kpiService.create(kpiData:${kpiData})] failed with error: ${error}`)
                throw error;
            }
            return data as TeamRoundData;
        }, 2, 1000, `Create KPI data for team ${kpiData.team_id?.substring(0, 8)} round ${kpiData.round_number}`);
    },

    async createBatch(kpiDataArray: Omit<TeamRoundData, 'id' | 'created_at'>[]): Promise<TeamRoundData[]> {
        return withRetry(async () => {
            if (kpiDataArray.length === 0) return [];

            console.log(`[kpiService.createBatch] Inserting ${kpiDataArray.length} KPI records in single batch`);

            const {data, error} = await supabase
                .from(TEAM_ROUND_DATA_TABLE)
                .insert(kpiDataArray)
                .select();

            if (error) {
                console.error(`[kpiService.createBatch] Batch insert of ${kpiDataArray.length} records failed:`, error);
                throw error;
            }

            console.log(`[kpiService.createBatch] ✅ Successfully inserted ${data?.length || 0} KPI records`);
            return data as TeamRoundData[];
        }, 2, 1000, `Batch create ${kpiDataArray.length} KPI records`);
    },

    async update(kpiId: string, updates: Partial<TeamRoundData>): Promise<TeamRoundData> {
        return withRetry(async () => {
            const {data, error} = await supabase
                .from(TEAM_ROUND_DATA_TABLE)
                .update(updates)
                .eq('id', kpiId)
                .select()
                .single();
            if (error) {
                console.error(`[kpiService.update(kpiId:${kpiId}, updates:${updates})] failed with error: ${error}`)
                throw error;
            }
            return data as TeamRoundData;
        }, 2, 1000, `Update KPI data ${kpiId}`);
    },

    async bulkUpsert(kpiDataArray: Partial<TeamRoundData>[]): Promise<void> {
        return withRetry(async () => {
            if (kpiDataArray.length === 0) return;

            const {error} = await supabase
                .from(TEAM_ROUND_DATA_TABLE)
                .upsert(kpiDataArray, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error(`[kpiService.bulkUpsert(${kpiDataArray.length} items)] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Bulk upsert ${kpiDataArray.length} KPI records`);
    },

    async deleteBySession(sessionId: string): Promise<void> {
        return withRetry(async () => {
            const {error} = await supabase
                .from(TEAM_ROUND_DATA_TABLE)
                .delete()
                .eq('session_id', sessionId);
            if (error) {
                console.error(`[kpiService.deleteBySession(sessionId:${sessionId})] failed with error: ${error}`)
                throw error;
            }
        }, 2, 1000, `Delete KPI data for session ${sessionId.substring(0, 8)}`);
    }
};
