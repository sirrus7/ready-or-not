/**
 * Simplified JWT Service - Always-JWT Mode
 * Removes dual-mode complexity for cleaner implementation
 *
 * File: src/services/jwt-service.ts (Updated)
 */

import { SSOUser } from './sso-service';
import {
    JWTClaims,
    JWTVerificationResult,
    JWTServiceConfig,
    TokenGenerationOptions,
    UserPermissions,
    GameAccess,
    DEFAULT_PERMISSIONS,
    JWT_DEFAULTS,
} from '../types/jwt';

// Import jose library
import { SignJWT, jwtVerify } from 'jose';

export class JWTService {
    private config: JWTServiceConfig;
    private signingKey: Uint8Array;
    private verificationKey: Uint8Array;

    constructor(config?: Partial<JWTServiceConfig>) {
        // Initialize configuration with defaults
        this.config = {
            issuer: JWT_DEFAULTS.ISSUER,
            audience: JWT_DEFAULTS.AUDIENCE,
            defaultExpirationHours: JWT_DEFAULTS.EXPIRATION_HOURS,
            environment: (import.meta.env.VITE_NODE_ENV as 'development' | 'staging' | 'production') || 'development',
            algorithm: this.determineAlgorithm(),
            ...config
        };

        // Initialize signing and verification keys
        this.initializeKeys();

        console.log(`[JWTService] Initialized for ${this.config.environment} environment`);
    }

    // =====================================================
    // INITIALIZATION METHODS
    // =====================================================

    private determineAlgorithm(): 'HS256' | 'RS256' {
        const environment = import.meta.env.VITE_NODE_ENV || 'development';
        // Use HS256 for simplicity, can upgrade to RS256 later
        return 'HS256';
    }

    private initializeKeys(): void {
        try {
            // Get secret from environment
            const secretSource =
                import.meta.env.VITE_JWT_SECRET_DEV ||
                'default-dev-secret-change-in-production-at-least-32-chars-long';

            // Ensure secret is at least 32 characters for HS256
            const secret = secretSource.length >= 32 ? secretSource : secretSource.padEnd(32, '0');

            this.signingKey = new TextEncoder().encode(secret);
            this.verificationKey = this.signingKey;

            console.log('[JWTService] Keys initialized successfully');
        } catch (error) {
            console.error('[JWTService] Failed to initialize keys:', error);
            throw new Error(`JWT service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // =====================================================
    // CORE JWT OPERATIONS
    // =====================================================

    async generateToken(user: SSOUser, options: TokenGenerationOptions = {}): Promise<string> {
        try {
            const permissions = this.buildUserPermissions(user.role);
            const allowed_games = this.buildGameAccess(user);
            const now = Math.floor(Date.now() / 1000);
            const expirationHours = options.expirationHours || this.config.defaultExpirationHours;

            // Create JWT payload
            const payload = {
                user_id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                permissions,
                allowed_games,
                token_version: 1,
                environment: options.environment || this.config.environment,
                // Add optional context
                ...(user.school_info && { school_id: user.school_info.id }),
                ...(user.organization_id && { organization_id: user.organization_id }),
                ...(options.issueContext && { issue_context: options.issueContext })
            };

            const jwt = new SignJWT(payload)
                .setProtectedHeader({ alg: this.config.algorithm, typ: 'JWT' })
                .setIssuedAt(now)
                .setExpirationTime(now + (expirationHours * 3600))
                .setIssuer(this.config.issuer)
                .setAudience(this.config.audience)
                .setSubject(user.id);

            const token = await jwt.sign(this.signingKey);

            console.log(`[JWTService] Generated token for user: ${user.email} (role: ${user.role})`);
            return token;

        } catch (error) {
            console.error('[JWTService] Token generation failed:', error);
            throw new Error(`Failed to generate JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async verifyToken(token: string): Promise<JWTVerificationResult> {
        try {
            // Remove 'Bearer ' prefix if present
            const cleanToken = token.replace(/^Bearer\s+/, '');

            if (!cleanToken || cleanToken.trim() === '') {
                return {
                    valid: false,
                    error: 'Token is empty or undefined'
                };
            }

            // Verify token with jose
            const { payload } = await jwtVerify(cleanToken, this.signingKey, {
                issuer: this.config.issuer,
                audience: this.config.audience
            });

            // Transform payload to our JWTClaims format
            const claims: JWTClaims = {
                iss: payload.iss as string,
                aud: payload.aud as string,
                exp: payload.exp as number,
                iat: payload.iat as number,
                sub: payload.sub as string,
                user_id: payload.user_id as string,
                email: payload.email as string,
                full_name: payload.full_name as string,
                role: payload.role as 'host' | 'org_admin' | 'super_admin',
                permissions: payload.permissions as UserPermissions,
                allowed_games: payload.allowed_games as GameAccess[],
                token_version: payload.token_version as number,
                environment: payload.environment as string,
                school_id: payload.school_id as string | undefined,
                organization_id: payload.organization_id as string | undefined,
                issue_context: payload.issue_context as any
            };

            return {
                valid: true,
                claims,
                algorithm: this.config.algorithm
            };

        } catch (error) {
            console.error('[JWTService] Token verification failed:', error);
            return {
                valid: false,
                error: `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    // =====================================================
    // HELPER METHODS
    // =====================================================

    private buildUserPermissions(role: string): UserPermissions {
        switch (role) {
            case 'super_admin':
                return {
                    can_create_sessions: true,
                    can_manage_teams: true,
                    can_view_analytics: true,
                    is_admin: true
                };
            case 'org_admin':
                return {
                    can_create_sessions: true,
                    can_manage_teams: true,
                    can_view_analytics: true,
                    is_admin: false
                };
            case 'host':
                return {
                    can_create_sessions: true,
                    can_manage_teams: false,
                    can_view_analytics: false,
                    is_admin: false
                };
            default:
                return DEFAULT_PERMISSIONS;
        }
    }

    private buildGameAccess(user: SSOUser): GameAccess[] {
        return user.games?.map(game => ({
            game_name: game.name,
            permission_level: game.permission_level,
            can_host: ['host', 'org_admin', 'super_admin'].includes(user.role),
            can_moderate: ['org_admin', 'super_admin'].includes(user.role)
        })) || [{
            game_name: 'ready-or-not',
            permission_level: user.role,
            can_host: true,
            can_moderate: false
        }];
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    getConfiguration(): JWTServiceConfig {
        return { ...this.config };
    }

    async healthCheck(): Promise<{
        healthy: boolean;
        algorithm: string;
        environment: string;
        issuer: string;
        keyInitialized: boolean;
    }> {
        return {
            healthy: true,
            algorithm: this.config.algorithm,
            environment: this.config.environment,
            issuer: this.config.issuer,
            keyInitialized: !!this.signingKey
        };
    }
}

// =====================================================
// DEFAULT EXPORT - THIS WAS MISSING!
// =====================================================

// Default service instance (can be overridden for testing)
export const jwtService = new JWTService();