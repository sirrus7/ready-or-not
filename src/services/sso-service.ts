/**
 * Streamlined SSO Service - Phase 4B Complete
 * Pure JWT integration with all dual-mode complexity removed
 *
 * File: src/services/sso-service.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jwtService } from './jwt-service';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface GamePermission {
    name: string;
    permission_level: 'host' | 'org_admin' | 'super_admin';
}

export interface SSOUser {
    id: string;
    email: string;
    full_name: string;
    first_name: string;
    last_name: string;
    role: 'host' | 'org_admin' | 'super_admin';
    games: GamePermission[];
    organization_type: 'school' | 'district';
    organization_id: string;
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
    role: 'host' | 'org_admin' | 'super_admin';
    organization_id: string;
    organization_type: 'school' | 'district';
    games: GamePermission[];
    exp: number;
    iat: number;
    iss: string;
    aud: string;
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
}

export interface ValidationResponse {
    valid: boolean;
    user?: SSOUser;
    error?: string;
    message?: string;
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
    game_context?: {
        game: string;
        source: string;
        timestamp: string;
    };
}

export interface AuthenticationResponse {
    valid: boolean;
    user?: SSOUser;
    session?: LocalSession;
    error?: string;
    message?: string;
}

// =====================================================
// SSO SERVICE CLASS
// =====================================================

export class SSOService {
    private supabase: SupabaseClient;
    private supabaseUrl: string;
    private supabaseKey: string;

    constructor(supabaseUrl?: string, supabaseKey?: string) {
        // Use provided credentials or fall back to environment variables
        this.supabaseUrl = supabaseUrl !== undefined ? supabaseUrl : (import.meta.env.VITE_SUPABASE_URL || '');
        this.supabaseKey = supabaseKey !== undefined ? supabaseKey : (import.meta.env.VITE_SUPABASE_ANON_KEY || '');

        // Validate required credentials
        if (!this.supabaseUrl || !this.supabaseKey || this.supabaseUrl.trim() === '' || this.supabaseKey.trim() === '') {
            throw new Error('Supabase URL and Anon Key are required');
        }

        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    }

    // =====================================================
    // JWT TOKEN PARSING - STREAMLINED (Phase 4B)
    // =====================================================

    /**
     * Parse and validate JWT token using JWT service
     * ✅ STREAMLINED: Pure JWT service integration, no fallback complexity
     */
    async parseJWT(token: string): Promise<{ valid: boolean; payload?: SSOToken; error?: string }> {
        try {
            // Remove 'Bearer ' prefix if present
            const cleanToken = token.replace(/^Bearer\s+/, '');

            // Use JWT service for validation
            const jwtResult = await jwtService.verifyToken(cleanToken);

            if (!jwtResult.valid || !jwtResult.claims) {
                return {
                    valid: false,
                    error: jwtResult.message || 'Token validation failed'
                };
            }

            // Convert JWT claims to SSOToken format
            const ssoToken: SSOToken = this.claimsToSSOToken(jwtResult.claims);

            return {
                valid: true,
                payload: ssoToken
            };

        } catch (error) {
            console.error('[SSOService] JWT parsing error:', error);
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Token parsing failed'
            };
        }
    }

    // =====================================================
    // JWT CLAIMS CONVERSION - STREAMLINED
    // =====================================================

    /**
     * Convert JWT claims to SSOToken format
     * ✅ STREAMLINED: Single conversion point, no dual-mode complexity
     */
    private claimsToSSOToken(claims: any): SSOToken {
        return {
            user_id: claims.user_id,
            email: claims.email,
            full_name: claims.full_name,
            role: claims.role,
            organization_id: claims.organization_id || '',
            organization_type: this.inferOrganizationType(claims.role),
            games: this.convertGameAccess(claims.allowed_games || []),
            exp: claims.exp,
            iat: claims.iat,
            iss: claims.iss,
            aud: claims.aud,
            // Optional fields
            ...(claims.district_info && { district_info: claims.district_info }),
            ...(claims.school_info && { school_info: claims.school_info }),
        };
    }

    /**
     * Helper: Infer organization type from role
     */
    private inferOrganizationType(role: string): 'school' | 'district' {
        return role === 'host' ? 'school' : 'district';
    }

    /**
     * Helper: Convert JWT GameAccess to legacy GamePermission format
     */
    private convertGameAccess(gameAccess: any[]): GamePermission[] {
        return gameAccess.map(game => ({
            name: game.game_name || 'ready-or-not',
            permission_level: game.permission_level || 'host'
        }));
    }

    // =====================================================
    // SSO TOKEN VALIDATION - STREAMLINED (Phase 4B)
    // =====================================================

    /**
     * Validate SSO token and return user information
     * ✅ STREAMLINED: Pure JWT flow, no dual-mode complexity
     */
    async validateSSOToken(token: string): Promise<ValidationResponse> {
        try {
            if (!token || token.trim() === '') {
                return {
                    valid: false,
                    error: 'missing_token',
                    message: 'No token provided'
                };
            }

            // Parse and validate the JWT token
            const parseResult = await this.parseJWT(token);

            if (!parseResult.valid || !parseResult.payload) {
                return {
                    valid: false,
                    error: 'invalid_token',
                    message: parseResult.error || 'Token validation failed'
                };
            }

            const tokenData = parseResult.payload;

            // Convert token data to SSOUser format
            const user: SSOUser = {
                id: tokenData.user_id,
                email: tokenData.email,
                full_name: tokenData.full_name,
                first_name: tokenData.full_name.split(' ')[0],
                last_name: tokenData.full_name.split(' ').slice(1).join(' '),
                role: tokenData.role,
                games: tokenData.games,
                organization_type: tokenData.organization_type,
                organization_id: tokenData.organization_id,
                district_info: tokenData.district_info,
                school_info: tokenData.school_info,
                metadata: {
                    jwt_validated: true,
                    validated_at: new Date().toISOString(),
                    token_iss: tokenData.iss,
                    token_aud: tokenData.aud
                }
            };

            return {
                valid: true,
                user,
                message: `Token validated successfully for ${user.email} (${user.role})`
            };

        } catch (error) {
            console.error('[SSOService] Token validation error:', error);
            return {
                valid: false,
                error: 'server_error',
                message: error instanceof Error ? error.message : 'Token validation failed'
            };
        }
    }

    // =====================================================
    // AUTHENTICATION WORKFLOW - STREAMLINED
    // =====================================================

    /**
     * Authenticate user with SSO token and create local session
     * ✅ STREAMLINED: Pure JWT authentication workflow
     */
    async authenticateWithSSO(token: string, gameContext?: { game: string; source: string }): Promise<AuthenticationResponse> {
        try {
            // Validate the token
            const validationResult = await this.validateSSOToken(token);

            if (!validationResult.valid || !validationResult.user) {
                return {
                    valid: false,
                    error: validationResult.error || 'authentication_failed',
                    message: validationResult.message || 'Authentication failed'
                };
            }

            const user = validationResult.user;

            // Create local session
            const sessionResult = await this.createLocalSession(user, gameContext);

            if (!sessionResult.success || !sessionResult.session) {
                return {
                    valid: false,
                    error: 'session_creation_failed',
                    message: sessionResult.error || 'Failed to create local session'
                };
            }

            return {
                valid: true,
                user,
                session: sessionResult.session,
                message: `Authentication successful for ${user.email}`
            };

        } catch (error) {
            console.error('[SSOService] Authentication error:', error);
            return {
                valid: false,
                error: 'server_error',
                message: error instanceof Error ? error.message : 'Authentication failed'
            };
        }
    }

    // =====================================================
    // LOCAL SESSION MANAGEMENT
    // =====================================================

    /**
     * Create local session in Supabase
     */
    async createLocalSession(user: SSOUser, gameContext?: { game: string; source: string }): Promise<{
        success: boolean;
        session?: LocalSession;
        error?: string;
    }> {
        try {
            const sessionData = {
                user_id: user.id,
                email: user.email,
                permission_level: user.role,
                game_context: gameContext ? {
                    game: gameContext.game,
                    source: gameContext.source,
                    timestamp: new Date().toISOString()
                } : null
            };

            const { data, error } = await this.supabase
                .rpc('create_sso_session', sessionData);

            if (error) {
                console.error('[SSOService] Session creation error:', error);
                return {
                    success: false,
                    error: error.message || 'Failed to create session'
                };
            }

            return {
                success: true,
                session: data
            };

        } catch (error) {
            console.error('[SSOService] Session creation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create session'
            };
        }
    }

    /**
     * Validate local session
     */
    async validateLocalSession(sessionId: string): Promise<{
        valid: boolean;
        session?: LocalSession;
        error?: string;
    }> {
        try {
            const { data, error } = await this.supabase
                .from('sso_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                return {
                    valid: false,
                    error: 'Session not found'
                };
            }

            // Check if session is expired
            const expiresAt = new Date(data.expires_at).getTime();
            const now = Date.now();

            if (expiresAt <= now) {
                return {
                    valid: false,
                    error: 'Session expired'
                };
            }

            return {
                valid: true,
                session: data
            };

        } catch (error) {
            console.error('[SSOService] Session validation error:', error);
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Session validation failed'
            };
        }
    }

    /**
     * Extend local session
     */
    async extendLocalSession(sessionId: string, extensionHours: number = 8): Promise<{
        success: boolean;
        session?: LocalSession;
        error?: string;
    }> {
        try {
            const { data, error } = await this.supabase
                .rpc('extend_sso_session', {
                    p_session_id: sessionId,
                    p_extension_hours: extensionHours
                });

            if (error) {
                return {
                    success: false,
                    error: error.message || 'Failed to extend session'
                };
            }

            return {
                success: true,
                session: data
            };

        } catch (error) {
            console.error('[SSOService] Session extension error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Session extension failed'
            };
        }
    }

    /**
     * Cleanup session
     */
    async cleanupSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await this.supabase
                .rpc('revoke_sso_session', {
                    p_session_id: sessionId
                });

            if (error) {
                return {
                    success: false,
                    error: error.message || 'Failed to cleanup session'
                };
            }

            return { success: true };

        } catch (error) {
            console.error('[SSOService] Session cleanup error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Session cleanup failed'
            };
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Generate mock users for testing
     */
    generateMockUsers() {
        return [
            {
                id: 'host-user-123',
                email: 'host@school.edu',
                full_name: 'Host Teacher',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            },
            {
                id: 'admin-user-456',
                email: 'admin@district.org',
                full_name: 'District Administrator',
                role: 'org_admin' as const,
                games: [{ name: 'ready-or-not', permission_level: 'org_admin' as const }]
            }
        ];
    }

    /**
     * Generate mock token using JWT service
     */
    async generateMockToken(user: Partial<SSOUser>): Promise<string> {
        const fullUser: SSOUser = {
            id: user.id || 'mock-user-123',
            email: user.email || 'mock@example.com',
            full_name: user.full_name || 'Mock User',
            first_name: user.first_name || 'Mock',
            last_name: user.last_name || 'User',
            role: user.role || 'host',
            games: user.games || [{ name: 'ready-or-not', permission_level: 'host' }],
            organization_type: user.organization_type || 'school',
            organization_id: user.organization_id || 'org-123',
            metadata: { mock: true }
        };

        return await jwtService.generateToken(fullUser);
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<{ healthy: boolean; service: string; timestamp: string }> {
        try {
            const jwtHealth = await jwtService.healthCheck();

            return {
                healthy: jwtHealth.healthy,
                service: 'SSO Service',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                service: 'SSO Service',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get active sessions
     */
    async getActiveSessions(): Promise<LocalSession[]> {
        try {
            const { data, error } = await this.supabase
                .from('active_sso_sessions')
                .select('*')
                .order('last_activity', { ascending: false });

            if (error) {
                console.error('[SSOService] Error fetching active sessions:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            console.error('[SSOService] Error fetching active sessions:', error);
            return [];
        }
    }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const ssoService = new SSOService();