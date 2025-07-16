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

        // Validate required credentials
        if (!this.supabaseUrl || !this.supabaseKey || this.supabaseUrl.trim() === '' || this.supabaseKey.trim() === '') {
            throw new Error('Supabase URL and Anon Key are required');
        }

        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);

        // Initialize JWT secret (in production, use proper secret management)
        const secret = jwtSecret || import.meta.env.VITE_JWT_SECRET || 'default-development-secret';
        this.jwtSecret = new TextEncoder().encode(secret);
    }

    // =====================================================
    // JWT TOKEN PARSING
    // =====================================================

    /**
     * Parse JWT token (basic implementation for Phase 2)
     * In Phase 5, this will include proper signature verification
     */
    async parseJWT(token: string): Promise<{ valid: boolean; payload?: SSOToken; error?: string }> {
        try {
            // Remove 'Bearer ' prefix if present
            const cleanToken = token.replace(/^Bearer\s+/, '');

            // Split the token into parts
            const parts = cleanToken.split('.');
            if (parts.length !== 3) {
                return { valid: false, error: 'Invalid JWT format' };
            }

            // Decode the payload (middle part)
            const payload = parts[1];
            const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            const parsedPayload = JSON.parse(decodedPayload);

            // Validate required fields
            if (!parsedPayload.user_id || !parsedPayload.email) {
                return { valid: false, error: 'Missing required token fields' };
            }

            // Check expiration
            const currentTime = Math.floor(Date.now() / 1000);
            if (parsedPayload.exp && parsedPayload.exp < currentTime) {
                return { valid: false, error: 'Token expired' };
            }

            const ssoToken: SSOToken = {
                user_id: parsedPayload.user_id,
                email: parsedPayload.email,
                full_name: parsedPayload.full_name || parsedPayload.email,
                role: parsedPayload.role || 'host',
                organization_id: parsedPayload.organization_id,
                organization_type: parsedPayload.organization_type,
                games: parsedPayload.games || [],
                district_info: parsedPayload.district_info,
                school_info: parsedPayload.school_info,
                exp: parsedPayload.exp || Math.floor(Date.now() / 1000) + (8 * 3600),
                iat: parsedPayload.iat || Math.floor(Date.now() / 1000),
                iss: parsedPayload.iss,
                aud: parsedPayload.aud
            };

            return { valid: true, payload: ssoToken };
        } catch (error) {
            console.error('JWT parsing error:', error);
            return { valid: false, error: 'Failed to parse JWT token' };
        }
    }

    // =====================================================
    // TOKEN VALIDATION (MOCK FOR PHASE 2)
    // =====================================================

    /**
     * Validate SSO token (mock implementation for Phase 2)
     * In Phase 5, this will call the Global Game Loader for real validation
     */
    async validateSSOToken(token: string): Promise<ValidationResponse> {
        try {
            // Parse the token
            const parseResult = await this.parseJWT(token);
            if (!parseResult.valid || !parseResult.payload) {
                return {
                    valid: false,
                    error: 'invalid_token',
                    message: parseResult.error || 'Unable to parse JWT token'
                };
            }

            const parsedToken = parseResult.payload;

            // Mock validation - in Phase 2, we accept any valid-format token
            // In Phase 5, this will call Global Game Loader for real validation
            const mockUser: SSOUser = {
                id: parsedToken.user_id,
                email: parsedToken.email,
                full_name: parsedToken.full_name,
                first_name: parsedToken.full_name?.split(' ')[0],
                last_name: parsedToken.full_name?.split(' ').slice(1).join(' '),
                role: parsedToken.role as any,
                organization_id: parsedToken.organization_id,
                organization_type: parsedToken.organization_type as any,
                games: parsedToken.games as any,
                district_info: parsedToken.district_info,
                school_info: parsedToken.school_info,
                metadata: {
                    validated_at: new Date().toISOString(),
                    validation_method: 'mock',
                    token_iat: parsedToken.iat,
                    token_exp: parsedToken.exp
                }
            };

            return {
                valid: true,
                user: mockUser,
                message: 'Token validated successfully (mock)'
            };
        } catch (error) {
            console.error('Token validation error:', error);
            return {
                valid: false,
                error: 'validation_error',
                message: 'Failed to validate token'
            };
        }
    }

    // =====================================================
    // LOCAL SESSION MANAGEMENT
    // =====================================================

    /**
     * Create a local session using the database function from Phase 1
     */
    async createLocalSession(
        user: SSOUser,
        options: SessionCreationOptions = {}
    ): Promise<ValidationResponse> {
        try {
            const {
                duration_hours = 8,
                ip_address = null,
                user_agent = null,
                game_context = {
                    game: 'ready-or-not',
                    version: '2.0',
                    user_role: user.role,
                    organization_type: user.organization_type
                }
            } = options;

            // Call the database function to create a session
            const { data: sessionId, error } = await this.supabase.rpc('create_sso_session', {
                p_user_id: user.id,
                p_email: user.email,
                p_permission_level: user.role,
                p_duration_hours: duration_hours,
                p_ip_address: ip_address,
                p_user_agent: user_agent,
                p_game_context: game_context
            });

            if (error) {
                console.error('Session creation error:', error);
                return {
                    valid: false,
                    error: 'session_creation_failed',
                    message: `Failed to create local session: ${error.message}`
                };
            }

            // Get the created session details
            const session = await this.getSessionDetails(sessionId);
            if (!session) {
                return {
                    valid: false,
                    error: 'session_retrieval_failed',
                    message: 'Session created but could not retrieve details'
                };
            }

            return {
                valid: true,
                user,
                session,
                message: 'Local session created successfully'
            };
        } catch (error) {
            console.error('Local session creation error:', error);
            return {
                valid: false,
                error: 'session_creation_error',
                message: 'Failed to create local session'
            };
        }
    }

    /**
     * Validate a local session using the database helper functions
     */
    async validateLocalSession(sessionId: string): Promise<ValidationResponse> {
        try {
            // Set the session context for the database functions
            const { error: contextError } = await this.supabase.rpc('set_session_context', {
                session_id_value: sessionId
            });

            if (contextError) {
                console.error('Context setting error:', contextError);
                return {
                    valid: false,
                    error: 'context_error',
                    message: 'Failed to set session context'
                };
            }

            // Get the current SSO user ID using our helper function
            const { data: userId, error: userError } = await this.supabase.rpc('get_current_sso_user_id');

            if (userError || !userId) {
                return {
                    valid: false,
                    error: 'invalid_session',
                    message: 'Session not found or expired'
                };
            }

            // Get session details from the active sessions view
            const { data: sessionData, error: sessionError } = await this.supabase
                .from('active_sso_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('session_status', 'active')
                .single();

            if (sessionError || !sessionData) {
                return {
                    valid: false,
                    error: 'session_not_found',
                    message: 'Active session not found'
                };
            }

            // Construct user object from session data
            const user: SSOUser = {
                id: sessionData.user_id,
                email: sessionData.email,
                full_name: sessionData.email, // Will be enhanced in Phase 5
                role: sessionData.permission_level,
                games: [{ name: 'ready-or-not', permission_level: sessionData.permission_level }],
                metadata: {
                    session_id: sessionId,
                    last_activity: sessionData.last_activity,
                    expires_at: sessionData.expires_at
                }
            };

            const session: LocalSession = {
                session_id: sessionData.session_id,
                user_id: sessionData.user_id,
                email: sessionData.email,
                permission_level: sessionData.permission_level,
                expires_at: sessionData.expires_at,
                created_at: sessionData.created_at,
                last_activity: sessionData.last_activity,
                is_active: true,
                game_context: sessionData.game_context || {}
            };

            return {
                valid: true,
                user,
                session,
                message: 'Local session validated successfully'
            };
        } catch (error) {
            console.error('Local session validation error:', error);
            return {
                valid: false,
                error: 'session_validation_error',
                message: 'Failed to validate local session'
            };
        }
    }

    /**
     * Extend a local session using the database function
     */
    async extendLocalSession(
        sessionId: string,
        extensionHours: number = 8
    ): Promise<ValidationResponse> {
        try {
            const { data: success, error } = await this.supabase.rpc('extend_sso_session', {
                p_session_id: sessionId,
                p_extension_hours: extensionHours
            });

            if (error || !success) {
                return {
                    valid: false,
                    error: 'session_extension_failed',
                    message: `Failed to extend session: ${error?.message || 'Unknown error'}`
                };
            }

            // Validate the extended session
            return await this.validateLocalSession(sessionId);
        } catch (error) {
            console.error('Session extension error:', error);
            return {
                valid: false,
                error: 'session_extension_error',
                message: 'Failed to extend session'
            };
        }
    }

    /**
     * Cleanup (revoke) a session using the database function
     */
    async cleanupSession(
        sessionId: string,
        reason: string = 'User logout'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: success, error } = await this.supabase.rpc('revoke_sso_session', {
                p_session_id: sessionId,
                p_revoked_by: null, // Could be set to current user ID if available
                p_reason: reason
            });

            if (error) {
                console.error('Session cleanup error:', error);
                return { success: false, error: error.message };
            }

            return { success: success === true };
        } catch (error) {
            console.error('Session cleanup error:', error);
            return { success: false, error: 'Failed to cleanup session' };
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Get session details by session ID
     */
    private async getSessionDetails(sessionId: string): Promise<LocalSession | null> {
        try {
            const { data, error } = await this.supabase
                .from('active_sso_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (error || !data) {
                console.error('Session details error:', error);
                return null;
            }

            return {
                session_id: data.session_id,
                user_id: data.user_id,
                email: data.email,
                permission_level: data.permission_level,
                expires_at: data.expires_at,
                created_at: data.created_at,
                last_activity: data.last_activity,
                is_active: data.session_status === 'active',
                game_context: data.game_context || {}
            };
        } catch (error) {
            console.error('Error getting session details:', error);
            return null;
        }
    }

    /**
     * Generate a session ID (alternative to database function)
     */
    generateSessionId(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/[+/]/g, '')
            .substring(0, 43);
    }

    /**
     * Clean up all expired sessions (maintenance function)
     */
    async cleanupExpiredSessions(): Promise<{ count: number; error?: string }> {
        try {
            const { data: count, error } = await this.supabase.rpc('cleanup_expired_sso_sessions');

            if (error) {
                console.error('Cleanup expired sessions error:', error);
                return { count: 0, error: error.message };
            }

            return { count: count || 0 };
        } catch (error) {
            console.error('Cleanup expired sessions error:', error);
            return { count: 0, error: 'Failed to cleanup expired sessions' };
        }
    }

    /**
     * Get active sessions (for monitoring/debugging)
     */
    async getActiveSessions(): Promise<{ sessions: LocalSession[]; error?: string }> {
        try {
            const { data, error } = await this.supabase
                .from('active_sso_sessions')
                .select('*')
                .eq('session_status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get active sessions error:', error);
                return { sessions: [], error: error.message };
            }

            const sessions: LocalSession[] = data.map(session => ({
                session_id: session.session_id,
                user_id: session.user_id,
                email: session.email,
                permission_level: session.permission_level,
                expires_at: session.expires_at,
                created_at: session.created_at,
                last_activity: session.last_activity,
                is_active: true,
                game_context: session.game_context || {}
            }));

            return { sessions };
        } catch (error) {
            console.error('Get active sessions error:', error);
            return { sessions: [], error: 'Failed to get active sessions' };
        }
    }

    // =====================================================
    // FULL SSO AUTHENTICATION FLOW
    // =====================================================

    /**
     * Complete SSO authentication flow
     * 1. Validate token with Global Game Loader (mock in Phase 2)
     * 2. Create local session in database
     * 3. Return session details
     */
    async authenticateWithSSO(
        token: string,
        options: SessionCreationOptions = {}
    ): Promise<ValidationResponse> {
        try {
            // Step 1: Validate the SSO token
            const tokenValidation = await this.validateSSOToken(token);
            if (!tokenValidation.valid || !tokenValidation.user) {
                return tokenValidation;
            }

            // Step 2: Create local session
            const sessionCreation = await this.createLocalSession(tokenValidation.user, options);
            if (!sessionCreation.valid) {
                return sessionCreation;
            }

            // Step 3: Return combined result
            return {
                valid: true,
                user: tokenValidation.user,
                session: sessionCreation.session,
                message: 'SSO authentication completed successfully'
            };
        } catch (error) {
            console.error('SSO authentication error:', error);
            return {
                valid: false,
                error: 'authentication_error',
                message: 'Failed to complete SSO authentication'
            };
        }
    }

    // =====================================================
    // HEALTH CHECK
    // =====================================================

    /**
     * Check if the SSO service is healthy
     */
    async healthCheck(): Promise<HealthCheckResult> {
        try {
            // Test database connection
            const { data: dbTest, error: dbError } = await this.supabase
                .from('sso_sessions')
                .select('count', { count: 'exact', head: true });

            const databaseHealthy = !dbError;

            // Test database functions
            const { data: funcTest, error: funcError } = await this.supabase
                .rpc('cleanup_expired_sso_sessions');

            const functionsHealthy = !funcError;

            const overall = databaseHealthy && functionsHealthy;

            return {
                healthy: overall,
                database: databaseHealthy,
                functions: functionsHealthy,
                message: overall ? 'SSO service is healthy' : 'SSO service has issues',
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
     * Generate realistic mock SSO users matching your project structure
     */
    generateMockUsers(): SSOUser[] {
        return [
            {
                id: '770e8400-e29b-41d4-a716-446655440001',
                email: 'admin@readyornot.edu',
                full_name: 'System Administrator',
                first_name: 'System',
                last_name: 'Administrator',
                role: 'super_admin',
                games: [
                    { name: 'ready-or-not', permission_level: 'super_admin' },
                    { name: 'all-games', permission_level: 'super_admin' }
                ],
                metadata: { mock: true, created_for: 'testing' }
            },
            {
                id: '770e8400-e29b-41d4-a716-446655440002',
                email: 'mrodriguez@lausd.net',
                full_name: 'Dr. Maria Rodriguez',
                first_name: 'Maria',
                last_name: 'Rodriguez',
                role: 'org_admin',
                organization_id: '550e8400-e29b-41d4-a716-446655440001',
                organization_type: 'district',
                games: [{ name: 'ready-or-not', permission_level: 'org_admin' }],
                district_info: {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    name: 'Los Angeles Unified School District',
                    state: 'CA'
                },
                metadata: { mock: true, created_for: 'testing' }
            },
            {
                id: '770e8400-e29b-41d4-a716-446655440003',
                email: 'emily.carter@lincoln.springfield.edu',
                full_name: 'Emily Carter',
                first_name: 'Emily',
                last_name: 'Carter',
                role: 'host',
                organization_id: '660e8400-e29b-41d4-a716-446655440001',
                organization_type: 'school',
                games: [{ name: 'ready-or-not', permission_level: 'host' }],
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
            // In Phase 5, we'll use proper JWT signing
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
// EXPORT CLASS AND LAZY SINGLETON
// =====================================================

// Create singleton instance only when needed
let ssoServiceInstance: SSOService | null = null;

export function getSSOService(): SSOService {
    if (!ssoServiceInstance) {
        ssoServiceInstance = new SSOService();
    }
    return ssoServiceInstance;
}

// Export the class for custom instances
export default SSOService;