// src/utils/supabase/database.ts - Enhanced Database Operations
import { supabase } from './client';

// Enhanced error formatter with specific Supabase error handling
export const formatSupabaseError = (error: any): string => {
    if (!error) return 'Unknown error occurred';

    // Handle network/connection errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        return 'Connection error - please check your internet connection';
    }

    if (error && typeof error === 'object' && 'message' in error) {
        let message = error.message;

        // Add helpful context for common Postgres errors
        switch (error.code) {
            case 'PGRST116':
                return 'No data found for the requested resource';
            case '23505':
                return 'This record already exists (duplicate entry)';
            case '23503':
                return 'Cannot delete - this record is referenced by other data';
            case '42501':
                return 'Permission denied - you may not have access to this resource';
            case 'PGRST301':
                return 'Request timeout - please try again';
            case 'PGRST204':
                return 'Resource not found';
            default:
                if (error.details) message += ` (${error.details})`;
                if (error.hint) message += ` Hint: ${error.hint}`;
        }
        return message;
    }

    return error.message || error.toString();
};

// Enhanced retry wrapper with exponential backoff
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context: string = 'Database operation'
): Promise<T> => {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            if (attempt > 0) {
                console.log(`[Supabase DB] ${context} succeeded on attempt ${attempt + 1}`);
            }
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`[Supabase DB] ${context} attempt ${attempt + 1} failed:`, formatSupabaseError(error));

            if (attempt < maxRetries) {
                // Exponential backoff with jitter
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`[Supabase DB] ${context} failed after ${maxRetries + 1} attempts`);
    throw lastError;
};

// Type-safe RPC wrapper
export const callRPC = async <T = any>(
    functionName: string,
    params: Record<string, any> = {},
    options: {
        expectedSingle?: boolean;
        context?: string;
        maxRetries?: number;
    } = {}
): Promise<T> => {
    const { expectedSingle = false, context = `RPC ${functionName}`, maxRetries = 2 } = options;

    return withRetry(async () => {
        console.log(`[Supabase RPC] Calling ${functionName} with params:`, params);

        const { data, error } = await supabase.rpc(functionName, params);

        if (error) {
            console.error(`[Supabase RPC] ${functionName} error:`, error);
            throw error;
        }

        if (expectedSingle) {
            return (data && data.length > 0) ? data[0] : null;
        }

        return data || [];
    }, maxRetries, 1000, context);
};

// Database operations organized by domain with enhanced error handling
export const db = {
    // Teams domain
    teams: {
        async getBySession(sessionId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('name');
                if (error) throw error;
                return data || [];
            }, 3, 1000, `Fetch teams for session ${sessionId.substring(0, 8)}`);
        },

        async verifyLogin(teamId: string, sessionId: string, passcode: string) {
            return callRPC('verify_team_login', {
                p_team_id: teamId,
                p_session_id: sessionId,
                p_passcode: passcode.trim()
            }, {
                expectedSingle: true,
                context: `Team login verification for ${teamId}`,
                maxRetries: 2
            });
        },

        async create(teamData: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('teams')
                    .insert(teamData)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }, 2, 1000, 'Create team');
        },

        async update(teamId: string, updates: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('teams')
                    .update(updates)
                    .eq('id', teamId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }, 2, 1000, `Update team ${teamId}`);
        },

        async delete(teamId: string) {
            return withRetry(async () => {
                const { error } = await supabase
                    .from('teams')
                    .delete()
                    .eq('id', teamId);
                if (error) throw error;
            }, 2, 1000, `Delete team ${teamId}`);
        }
    },

    // Sessions domain
    sessions: {
        async get(sessionId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('id', sessionId)
                    .single();
                if (error) throw error;
                return data;
            }, 3, 1000, `Fetch session ${sessionId.substring(0, 8)}`);
        },

        async update(sessionId: string, updates: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('sessions')
                    .update({
                        ...updates,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', sessionId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }, 2, 1000, `Update session ${sessionId.substring(0, 8)}`);
        },

        async create(sessionData: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('sessions')
                    .insert({
                        ...sessionData,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }, 2, 1000, 'Create session');
        },

        async getByTeacher(teacherId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('teacher_id', teacherId)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            }, 3, 1000, `Fetch sessions for teacher ${teacherId.substring(0, 8)}`);
        },

        async delete(sessionId: string) {
            return withRetry(async () => {
                // Delete in correct order to respect foreign key constraints
                await supabase.from('permanent_kpi_adjustments').delete().eq('session_id', sessionId);
                await supabase.from('team_round_data').delete().eq('session_id', sessionId);
                await supabase.from('team_decisions').delete().eq('session_id', sessionId);
                await supabase.from('teams').delete().eq('session_id', sessionId);

                const { error } = await supabase
                    .from('sessions')
                    .delete()
                    .eq('id', sessionId);
                if (error) throw error;
            }, 2, 1000, `Delete session ${sessionId.substring(0, 8)}`);
        },
    },

    // Team decisions domain
    decisions: {
        async getBySession(sessionId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('team_decisions')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('submitted_at', { ascending: false });
                if (error) throw error;
                return data || [];
            }, 3, 1000, `Fetch decisions for session ${sessionId.substring(0, 8)}`);
        },

        async delete(sessionId: string, teamId: string, phaseId: string) {
            return withRetry(async () => {
                const { error } = await supabase
                    .from('team_decisions')
                    .delete()
                    .eq('session_id', sessionId)
                    .eq('team_id', teamId)
                    .eq('phase_id', phaseId);
                if (error) throw error;
            }, 2, 1000, `Delete decision for team ${teamId.substring(0, 8)} phase ${phaseId}`);
        },

        async getForPhase(sessionId: string, teamId: string, phaseId: string) {
            return callRPC('get_student_team_decision_for_phase', {
                target_session_id: sessionId,
                target_team_id: teamId,
                target_phase_id: phaseId
            }, {
                expectedSingle: true,
                context: `Get decision for team ${teamId.substring(0, 8)} phase ${phaseId}`,
                maxRetries: 2
            });
        },

        async create(decisionData: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('team_decisions')
                    .insert({
                        ...decisionData,
                        submitted_at: decisionData.submitted_at || new Date().toISOString()
                    })
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }, 2, 1000, `Create decision for team ${decisionData.team_id?.substring(0, 8)} phase ${decisionData.phase_id}`);
        },

        async update(decisionId: string, updates: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('team_decisions')
                    .update(updates)
                    .eq('id', decisionId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }, 2, 1000, `Update decision ${decisionId}`);
        }
    },

    // Team KPIs/round data domain
    kpis: {
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
    },

    // Permanent KPI adjustments domain
    adjustments: {
        async getBySession(sessionId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('permanent_kpi_adjustments')
                    .select('*')
                    .eq('session_id', sessionId);
                if (error) throw error;
                return data || [];
            }, 3, 1000, `Fetch adjustments for session ${sessionId.substring(0, 8)}`);
        },

        async create(adjustmentData: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('permanent_kpi_adjustments')
                    .insert(adjustmentData)
                    .select();
                if (error) throw error;
                return data;
            }, 2, 1000, 'Create KPI adjustments');
        },

        async deleteBySession(sessionId: string) {
            return withRetry(async () => {
                const { error } = await supabase
                    .from('permanent_kpi_adjustments')
                    .delete()
                    .eq('session_id', sessionId);
                if (error) throw error;
            }, 2, 1000, `Delete adjustments for session ${sessionId.substring(0, 8)}`);
        }
    },

    // Health check and utilities
    async healthCheck(): Promise<{ isHealthy: boolean; latency: number; error?: string }> {
        const startTime = Date.now();
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('count')
                .limit(1);

            const latency = Date.now() - startTime;

            if (error) {
                return { isHealthy: false, latency, error: formatSupabaseError(error) };
            }

            return { isHealthy: true, latency };
        } catch (error) {
            const latency = Date.now() - startTime;
            return { isHealthy: false, latency, error: formatSupabaseError(error) };
        }
    },

    async getServerTime() {
        return withRetry(async () => {
            const { data, error } = await supabase.rpc('get_server_time');
            if (error) throw error;
            return data;
        }, 1, 500, 'Get server time');
    }
};