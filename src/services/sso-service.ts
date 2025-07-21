/**
 * SSO Service - Phase 2 Implementation
 * Ready-or-Not SSO Authentication Service
 *
 * This service handles SSO token validation and session management
 * using the database functions created in Phase 1.
 *
 * File: src/services/sso-service.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// TYPESCRIPT INTERFACES
// =====================================================

export interface SSOUser {
    id: string;
    email: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    role: 'super_admin' | 'org_admin' | 'host';
    organization_id?: string;
    organization_type?: 'district' | 'school';
    games: Array<{
        name: string;
        permission_level: 'super_admin' | 'org_admin' | 'host';
    }>;
    district_info?: {
        id: string;
        name: string;
        state: string;
    };
    school_info?: {
        id: string;
        name: string;
        district_id: string;
        district_name: string;
    };
    metadata?: Record<string, any>;
}

export interface SSOToken {
    user_id: string;
    email: string;
    full_name: string;
    role: string;
    organization_id?: string;
    organization_type?: string;
    games: Array<{
        name: string;
        permission_level: string;
    }>;
    district_info?: any;
    school_info?: any;
    exp: number;
    iat: number;
    iss?: string;
    aud?: string;
}

export interface LocalSession {
    session_id: string;
    user_id: string;
    email: string;
    permission_level: string;
    expires_at: string;
    created_at: string;
    last_activity: string;
    is_active: boolean;
    game_context: Record<string, any>;
}

export interface ValidationResponse {
    valid: boolean;
    user?: SSOUser;
    session?: LocalSession;
    error?: string;
    message?: string;
}

export interface SessionCreationOptions {
    duration_hours?: number;
    ip_address?: string;
    user_agent?: string;
    game_context?: Record<string, any>;
}

export interface HealthCheckResult {
    healthy: boolean;
    database: boolean;
    functions: boolean;
    message: string;
    timestamp: string;
}

// =====================================================
// SSO SERVICE CLASS
// =====================================================

export class SSOService {
    private supabase: SupabaseClient;
    private supabaseUrl: string;
    private supabaseKey: string;
    private jwtSecret: Uint8Array;

    constructor(supabaseUrl?: string, supabaseKey?: string, jwtSecret?: string) {
        // Use provided credentials or fall back to environment variables
        this.supabaseUrl = supabaseUrl !== undefined ? supabaseUrl : (import.meta.env.VITE_SUPABASE_URL || '');
        this.supabaseKey = supabaseKey !== undefined ? supabaseKey : (import.meta.env.VITE_SUPABASE_ANON_KEY || '');

        // Initialize JWT secret (for future JWT signing in Phase 4)
        if (jwtSecret) {
            this.jwtSecret = new TextEncoder().encode(jwtSecret);
        } else {
            // Use a mock secret for Phase 2 (will be replaced in Phase 4)
            this.jwtSecret = new TextEncoder().encode('mock-jwt-secret-for-phase-2');
        }

        // Initialize Supabase client
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    }

    // =====================================================
    // JWT TOKEN PARSING
    // =====================================================

    /**
     * Parse JWT token payload
     */
    parseJWT(token: string): SSOToken | null {
        try {
            // Split the token into parts
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            // Decode the payload (second part)
            const payload = JSON.parse(atob(parts[1]));

            // Validate required fields
            if (!payload.user_id || !payload.email || !payload.role) {
                throw new Error('Invalid JWT payload: missing required fields');
            }

            return payload as SSOToken;
        } catch (error) {
            console.error('JWT parsing error:', error);
            return null;
        }
    }

    // =====================================================
    // TOKEN VALIDATION
    // =====================================================

    /**
     * Validate SSO token and create local session
     */
    async authenticateWithSSO(token: string, options: SessionCreationOptions = {}): Promise<ValidationResponse> {
        try {
            // Phase 2: Mock validation - always return success for any token
            // In Phase 5, this will include proper JWT signature verification
            const tokenData = this.parseJWT(token);

            if (!tokenData) {
                return {
                    valid: false,
                    error: 'invalid_token',
                    message: 'Token is invalid'
                };
            }

            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (tokenData.exp && tokenData.exp < now) {
                return {
                    valid: false,
                    error: 'token_expired',
                    message: 'Token has expired'
                };
            }

            // Convert token data to SSOUser
            const user: SSOUser = {
                id: tokenData.user_id,
                email: tokenData.email,
                full_name: tokenData.full_name,
                first_name: tokenData.full_name?.split(' ')[0],
                last_name: tokenData.full_name?.split(' ').slice(1).join(' '),
                role: tokenData.role as 'super_admin' | 'org_admin' | 'host',
                organization_id: tokenData.organization_id,
                organization_type: tokenData.organization_type as 'district' | 'school',
                games: tokenData.games?.map(game => ({
                    name: game.name,
                    permission_level: game.permission_level as 'super_admin' | 'org_admin' | 'host'
                })) || [],
                district_info: tokenData.district_info,
                school_info: tokenData.school_info,
                metadata: { validated_at: new Date().toISOString() }
            };

            // Create local session
            const sessionResult = await this.createLocalSession(user, options);

            if (!sessionResult.valid) {
                return {
                    valid: false,
                    error: 'session_creation_failed',
                    message: sessionResult.message || 'Failed to create local session'
                };
            }

            return {
                valid: true,
                user,
                session: sessionResult.session,
                message: 'Authentication successful'
            };

        } catch (error) {
            console.error('SSO authentication error:', error);
            return {
                valid: false,
                error: 'authentication_error',
                message: 'Authentication failed due to server error'
            };
        }
    }

    // =====================================================
    // SESSION MANAGEMENT
    // =====================================================

    /**
     * Create local session using database function
     */
    async createLocalSession(user: SSOUser, options: SessionCreationOptions = {}): Promise<ValidationResponse> {
        try {
            const { data, error } = await this.supabase.rpc('create_sso_session', {
                p_user_id: user.id,
                p_email: user.email,
                p_permission_level: user.role,
                p_duration_hours: options.duration_hours || 8,
                p_ip_address: options.ip_address || 'unknown',
                p_user_agent: options.user_agent || 'unknown',
                p_game_context: options.game_context || {}
            });

            if (error) {
                console.error('Session creation error:', error);
                return {
                    valid: false,
                    error: 'database_error',
                    message: `Failed to create session: ${error.message}`
                };
            }

            // data contains the session information returned from the function
            const session: LocalSession = {
                session_id: data.session_id,
                user_id: user.id,
                email: user.email,
                permission_level: user.role,
                expires_at: data.expires_at,
                created_at: data.created_at,
                last_activity: data.last_activity,
                is_active: true,
                game_context: options.game_context || {}
            };

            return {
                valid: true,
                session,
                message: 'Session created successfully'
            };

        } catch (error) {
            console.error('Local session creation error:', error);
            return {
                valid: false,
                error: 'session_error',
                message: 'Failed to create local session'
            };
        }
    }

    /**
     * Validate local session using database function
     */
    async validateLocalSession(sessionId: string): Promise<ValidationResponse> {
        try {
            const { data, error } = await this.supabase
                .from('active_sso_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('is_active', true)
                .single();

            if (error) {
                console.error('Session validation error:', error);
                return {
                    valid: false,
                    error: 'invalid_session',
                    message: 'Session not found or expired'
                };
            }

            // Check if session is expired
            const now = new Date();
            const expiresAt = new Date(data.expires_at);

            if (expiresAt <= now) {
                return {
                    valid: false,
                    error: 'session_expired',
                    message: 'Session has expired'
                };
            }

            const session: LocalSession = {
                session_id: data.session_id,
                user_id: data.user_id,
                email: data.email,
                permission_level: data.permission_level,
                expires_at: data.expires_at,
                created_at: data.created_at,
                last_activity: data.last_activity,
                is_active: data.is_active,
                game_context: data.game_context || {}
            };

            return {
                valid: true,
                session,
                message: 'Session is valid'
            };

        } catch (error) {
            console.error('Session validation error:', error);
            return {
                valid: false,
                error: 'validation_error',
                message: 'Session validation failed'
            };
        }
    }

    /**
     * Extend local session using database function
     */
    async extendLocalSession(sessionId: string, hoursToAdd: number = 4): Promise<ValidationResponse> {
        try {
            const { data, error } = await this.supabase.rpc('extend_sso_session', {
                p_session_id: sessionId,
                p_hours_to_add: hoursToAdd
            });

            if (error) {
                console.error('Session extension error:', error);
                return {
                    valid: false,
                    error: 'extension_failed',
                    message: `Failed to extend session: ${error.message}`
                };
            }

            return {
                valid: true,
                message: `Session extended by ${hoursToAdd} hours`
            };

        } catch (error) {
            console.error('Session extension error:', error);
            return {
                valid: false,
                error: 'extension_error',
                message: 'Session extension failed'
            };
        }
    }

    /**
     * Clean up session using database function
     */
    async cleanupSession(sessionId: string, reason: string = 'User logout'): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await this.supabase.rpc('revoke_sso_session', {
                p_session_id: sessionId,
                p_revocation_reason: reason
            });

            if (error) {
                console.error('Session cleanup error:', error);
                return {
                    success: false,
                    message: `Failed to cleanup session: ${error.message}`
                };
            }

            return {
                success: true,
                message: 'Session cleaned up successfully'
            };

        } catch (error) {
            console.error('Session cleanup error:', error);
            return {
                success: false,
                message: 'Session cleanup failed'
            };
        }
    }

    // =====================================================
    // UTILITY FUNCTIONS
    // =====================================================

    /**
     * Generate a unique session ID
     */
    generateSessionId(): string {
        return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    /**
     * Get active sessions (for admin/debugging)
     */
    async getActiveSessions(): Promise<LocalSession[]> {
        try {
            const { data, error } = await this.supabase
                .from('active_sso_sessions')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Failed to get active sessions:', error);
                return [];
            }

            return data.map(session => ({
                session_id: session.session_id,
                user_id: session.user_id,
                email: session.email,
                permission_level: session.permission_level,
                expires_at: session.expires_at,
                created_at: session.created_at,
                last_activity: session.last_activity,
                is_active: session.is_active,
                game_context: session.game_context || {}
            }));

        } catch (error) {
            console.error('Failed to get active sessions:', error);
            return [];
        }
    }

    /**
     * Health check for SSO service
     */
    async healthCheck(): Promise<HealthCheckResult> {
        try {
            // Test database connection
            const { data, error } = await this.supabase.rpc('get_current_sso_user_id');

            const databaseHealthy = !error;
            const functionsHealthy = databaseHealthy; // If DB works, functions should work

            return {
                healthy: databaseHealthy && functionsHealthy,
                database: databaseHealthy,
                functions: functionsHealthy,
                message: (databaseHealthy && functionsHealthy) ?
                    'SSO service is healthy' : 'SSO service has issues',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                database: false,
                functions: false,
                message: 'SSO service health check failed',
                timestamp: new Date().toISOString()
            };
        }
    }

    // =====================================================
    // SESSION PERSISTENCE (CLIENT-SIDE)
    // =====================================================

    /**
     * Save session to localStorage (client-side persistence)
     */
    saveSessionToStorage(sessionId: string, user: SSOUser): void {
        try {
            const sessionData = {
                session_id: sessionId,
                user,
                saved_at: new Date().toISOString()
            };

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('Failed to save session to storage:', error);
        }
    }

    /**
     * Load session from localStorage
     */
    loadSessionFromStorage(): { session_id: string; user: SSOUser } | null {
        try {
            const saved = localStorage.getItem('ready_or_not_sso_session');
            if (!saved) return null;

            const sessionData = JSON.parse(saved);
            return {
                session_id: sessionData.session_id,
                user: sessionData.user
            };
        } catch (error) {
            console.error('Failed to load session from storage:', error);
            return null;
        }
    }

    /**
     * Clear session from localStorage
     */
    clearSessionFromStorage(): void {
        try {
            localStorage.removeItem('ready_or_not_sso_session');
        } catch (error) {
            console.error('Failed to clear session from storage:', error);
        }
    }

    // =====================================================
    // MOCK DATA GENERATION (FOR TESTING)
    // =====================================================

    /**
     * Generate mock users for testing
     */
    generateMockUsers(): SSOUser[] {
        return [
            {
                id: '550e8400-e29b-41d4-a716-446655440000',
                email: 'super.admin@globalloader.com',
                full_name: 'Super Admin User',
                first_name: 'Super',
                last_name: 'Admin User',
                role: 'super_admin',
                games: [
                    { name: 'ready-or-not', permission_level: 'super_admin' }
                ],
                metadata: { mock: true, created_for: 'testing' }
            },
            {
                id: '550e8400-e29b-41d4-a716-446655440001',
                email: 'district.admin@springfield.edu',
                full_name: 'District Admin User',
                first_name: 'District',
                last_name: 'Admin User',
                role: 'org_admin',
                organization_id: '550e8400-e29b-41d4-a716-446655440001',
                organization_type: 'district',
                games: [
                    { name: 'ready-or-not', permission_level: 'org_admin' }
                ],
                district_info: {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    name: 'Springfield Public Schools',
                    state: 'IL'
                },
                metadata: { mock: true, created_for: 'testing' }
            },
            {
                id: '550e8400-e29b-41d4-a716-446655440002',
                email: 'teacher@lincoln.springfield.edu',
                full_name: 'Host Teacher User',
                first_name: 'Host',
                last_name: 'Teacher User',
                role: 'host',
                organization_id: '660e8400-e29b-41d4-a716-446655440001',
                organization_type: 'school',
                games: [
                    { name: 'ready-or-not', permission_level: 'host' }
                ],
                district_info: {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    name: 'Springfield Public Schools',
                    state: 'IL'
                },
                school_info: {
                    id: '660e8400-e29b-41d4-a716-446655440001',
                    name: 'Lincoln Elementary School',
                    district_id: '550e8400-e29b-41d4-a716-446655440001',
                    district_name: 'Springfield Public Schools'
                },
                metadata: { mock: true, created_for: 'testing' }
            }
        ];
    }

    /**
     * Generate mock JWT token for testing
     */
    async generateMockToken(user: SSOUser): Promise<string> {
        try {
            const payload = {
                user_id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                organization_id: user.organization_id,
                organization_type: user.organization_type,
                games: user.games,
                district_info: user.district_info,
                school_info: user.school_info,
                exp: Math.floor(Date.now() / 1000) + (8 * 3600), // 8 hours
                iat: Math.floor(Date.now() / 1000),
                iss: 'global-game-loader',
                aud: 'ready-or-not'
            };

            // For Phase 2, create a simple token without signature
            // In Phase 4, we'll use proper JWT signing
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payloadEncoded = btoa(JSON.stringify(payload));
            const signature = 'mock-signature-for-phase-2';

            return `${header}.${payloadEncoded}.${signature}`;
        } catch (error) {
            console.error('Mock token generation error:', error);
            throw error;
        }
    }
}

// =====================================================
// EXPORT SINGLETON INSTANCE AND CLASS
// =====================================================

// Create singleton instance - this is what components will import
export const ssoService = new SSOService();

// Export function to get singleton (alternative access method)
export function getSSOService(): SSOService {
    return ssoService;
}

// Export the class for creating custom instances if needed
export default SSOService;