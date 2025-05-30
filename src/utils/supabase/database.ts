// src/utils/supabase/database.ts - Database operations
import { supabase } from './client';

// Simple error formatter
export const formatSupabaseError = (error: any): string => {
    if (!error) return 'Unknown error occurred';

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
            default:
                if (error.details) message += ` (${error.details})`;
                if (error.hint) message += ` Hint: ${error.hint}`;
        }
        return message;
    }

    return error.message || error.toString();
};

// Simple retry wrapper for database operations
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    delay: number = 1000
): Promise<T> => {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            console.warn(`[Supabase DB] Attempt ${attempt + 1} failed:`, formatSupabaseError(error));

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
};

// Database operations organized by domain
export const db = {
    // Teams domain
    teams: {
        async getBySession(sessionId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('session_id', sessionId);
                if (error) throw error;
                return data || [];
            });
        },

        async verifyLogin(teamId: string, sessionId: string, passcode: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .rpc('verify_team_login', {
                        p_team_id: teamId,
                        p_session_id: sessionId,
                        p_passcode: passcode.trim()
                    });
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
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
            });
        },

        async update(sessionId: string, updates: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('sessions')
                    .update({ ...updates, updated_at: new Date().toISOString() })
                    .eq('id', sessionId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            });
        },

        async create(sessionData: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('sessions')
                    .insert(sessionData)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            });
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
            });
        },

        async delete(sessionId: string) {
            return withRetry(async () => {
                const { error } = await supabase
                    .from('sessions')
                    .delete()
                    .eq('id', sessionId);
                if (error) throw error;
            });
        },
    },

    // Team decisions domain
    decisions: {
        async getBySession(sessionId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('team_decisions')
                    .select('*')
                    .eq('session_id', sessionId);
                if (error) throw error;
                return data || [];
            });
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
            });
        },

        async getForPhase(sessionId: string, teamId: string, phaseId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .rpc('get_student_team_decision_for_phase', {
                        target_session_id: sessionId,
                        target_team_id: teamId,
                        target_phase_id: phaseId
                    });
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
        },

        async create(decisionData: any) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('team_decisions')
                    .insert(decisionData)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            });
        }
    },

    // Team KPIs/round data domain
    kpis: {
        async getBySession(sessionId: string) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .from('team_round_data')
                    .select('*')
                    .eq('session_id', sessionId);
                if (error) throw error;
                return data || [];
            });
        },

        async getForTeamRound(sessionId: string, teamId: string, roundNumber: number) {
            return withRetry(async () => {
                const { data, error } = await supabase
                    .rpc('get_team_kpis_for_student', {
                        target_session_id: sessionId,
                        target_team_id: teamId,
                        target_round_number: roundNumber
                    });
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
        }
    },

    // Health check
    async healthCheck() {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('count')
                .limit(1);
            return !error;
        } catch {
            return false;
        }
    }
};
