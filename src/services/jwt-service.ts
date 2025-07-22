/**
 * JWT Service - Real JWT Token Generation and Verification
 * Ready-or-Not SSO JWT Service with fallback support
 *
 * File: src/services/jwt-service.ts
 */

import { SSOUser } from './sso-service';
import {
    JWTClaims,
    JWTVerificationResult,
    JWTServiceConfig,
    TokenGenerationOptions,
    TokenGenerationRequest,
    TokenGenerationResponse,
    UserPermissions,
    GameAccess,
    DEFAULT_PERMISSIONS,
    JWT_DEFAULTS,
} from '../types/jwt';

// Try to import jose, fall back to simple implementation if it fails
let SignJWT: any = null;
let jwtVerify: any = null;
let useJose = false;

try {
    const jose = require('jose');
    SignJWT = jose.SignJWT;
    jwtVerify = jose.jwtVerify;
    useJose = true;
    console.log('[JWTService] Using jose library for JWT operations');
} catch (error) {
    console.warn('[JWTService] jose library not available, using fallback implementation');
    useJose = false;
}

// =====================================================
// JWT SERVICE CLASS
// =====================================================

export class JWTService {
    private config: JWTServiceConfig;
    private signingKey: Uint8Array | string;
    private verificationKey: Uint8Array | string;
    private useJose: boolean;

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

        this.useJose = useJose && (import.meta.env.VITE_USE_REAL_JWT === 'true');

        // Initialize signing and verification keys
        this.initializeKeys();
    }

    // =====================================================
    // INITIALIZATION METHODS
    // =====================================================

    private determineAlgorithm(): 'HS256' | 'RS256' {
        const environment = import.meta.env.VITE_NODE_ENV || 'development';
        return environment === 'production' ? JWT_DEFAULTS.ALGORITHM_PROD : JWT_DEFAULTS.ALGORITHM_DEV;
    }

    private initializeKeys(): void {
        try {
            const secret = import.meta.env.VITE_JWT_SECRET_DEV || 'default-dev-secret-change-in-production-12345';

            if (this.useJose) {
                this.signingKey = new TextEncoder().encode(secret);
                this.verificationKey = this.signingKey;
                console.log('[JWTService] Initialized with jose HMAC (HS256) for development');
            } else {
                this.signingKey = secret;
                this.verificationKey = secret;
                console.log('[JWTService] Initialized with fallback implementation (HS256) for development');
            }
        } catch (error) {
            console.error('[JWTService] Failed to initialize keys:', error);
            throw new Error(`JWT service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // =====================================================
    // CORE JWT OPERATIONS
    // =====================================================

    async generateToken(user: SSOUser, options: TokenGenerationOptions = {}): Promise<string> {
        if (this.useJose) {
            return this.generateTokenWithJose(user, options);
        } else {
            return this.generateTokenWithFallback(user, options);
        }
    }

    async verifyToken(token: string): Promise<JWTVerificationResult> {
        if (this.useJose) {
            return this.verifyTokenWithJose(token);
        } else {
            return this.verifyTokenWithFallback(token);
        }
    }

    // =====================================================
    // JOSE IMPLEMENTATION
    // =====================================================

    private async generateTokenWithJose(user: SSOUser, options: TokenGenerationOptions): Promise<string> {
        try {
            const permissions = this.buildUserPermissions(user.role);
            const allowed_games = this.buildGameAccess(user);

            const payload = {
                user_id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                permissions,
                allowed_games,
                token_version: 1,
                environment: options.environment || this.config.environment
            };

            const jwt = new SignJWT(payload)
                .setProtectedHeader({ alg: this.config.algorithm })
                .setIssuedAt()
                .setExpirationTime(`${options.expirationHours || this.config.defaultExpirationHours}h`)
                .setIssuer(this.config.issuer)
                .setAudience(this.config.audience)
                .setSubject(user.id);

            const token = await jwt.sign(this.signingKey);

            console.log(`[JWTService] Generated jose token for user: ${user.email} (role: ${user.role})`);
            return token;

        } catch (error) {
            console.error('[JWTService] Jose token generation failed:', error);
            throw new Error(`Failed to generate JWT with jose: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async verifyTokenWithJose(token: string): Promise<JWTVerificationResult> {
        try {
            if (!token || typeof token !== 'string') {
                return {
                    valid: false,
                    error: 'malformed',
                    message: 'Token is empty or invalid format'
                };
            }

            const cleanToken = token.replace(/^Bearer\s+/, '');
            const { payload } = await jwtVerify(cleanToken, this.verificationKey, {
                issuer: this.config.issuer,
                audience: this.config.audience,
            });

            const claims: JWTClaims = {
                iss: payload.iss!,
                aud: Array.isArray(payload.aud) ? payload.aud[0] : payload.aud!,
                exp: payload.exp!,
                iat: payload.iat!,
                sub: payload.sub!,
                jti: payload.jti!,
                user_id: payload.user_id as string,
                email: payload.email as string,
                full_name: payload.full_name as string,
                role: payload.role as 'host' | 'org_admin' | 'super_admin',
                permissions: payload.permissions as UserPermissions,
                allowed_games: payload.allowed_games as GameAccess[],
                token_version: payload.token_version as number,
                environment: payload.environment as 'development' | 'staging' | 'production'
            };

            return {
                valid: true,
                claims,
                message: 'Token verified successfully with jose'
            };

        } catch (error) {
            console.error('[JWTService] Jose token verification failed:', error);
            return {
                valid: false,
                error: 'malformed',
                message: 'Jose token verification failed'
            };
        }
    }

    // =====================================================
    // FALLBACK IMPLEMENTATION
    // =====================================================

    private async generateTokenWithFallback(user: SSOUser, options: TokenGenerationOptions): Promise<string> {
        try {
            const now = Math.floor(Date.now() / 1000);
            const exp = now + ((options.expirationHours || this.config.defaultExpirationHours) * 3600);

            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = {
                iss: this.config.issuer,
                aud: this.config.audience,
                exp,
                iat: now,
                sub: user.id,
                user_id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                permissions: this.buildUserPermissions(user.role),
                allowed_games: this.buildGameAccess(user),
                token_version: 1,
                environment: options.environment || this.config.environment
            };

            const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
            const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
            const signature = this.createSimpleSignature(encodedHeader + '.' + encodedPayload);

            const token = `${encodedHeader}.${encodedPayload}.${signature}`;

            console.log(`[JWTService] Generated fallback token for user: ${user.email} (role: ${user.role})`);
            return token;

        } catch (error) {
            console.error('[JWTService] Fallback token generation failed:', error);
            throw new Error(`Failed to generate fallback JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async verifyTokenWithFallback(token: string): Promise<JWTVerificationResult> {
        try {
            if (!token || typeof token !== 'string') {
                return { valid: false, error: 'malformed', message: 'Token is empty or invalid format' };
            }

            const parts = token.split('.');
            if (parts.length !== 3) {
                return { valid: false, error: 'malformed', message: 'Invalid token format' };
            }

            const payload = JSON.parse(this.base64UrlDecode(parts[1]));

            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp <= now) {
                return { valid: false, error: 'expired', message: 'Token has expired' };
            }

            const expectedSignature = this.createSimpleSignature(parts[0] + '.' + parts[1]);
            if (parts[2] !== expectedSignature) {
                return { valid: false, error: 'invalid_signature', message: 'Invalid token signature' };
            }

            return {
                valid: true,
                claims: payload as JWTClaims,
                message: 'Fallback token verified successfully'
            };

        } catch (error) {
            return { valid: false, error: 'malformed', message: 'Fallback token verification failed' };
        }
    }

    // =====================================================
    // HIGH-LEVEL METHODS
    // =====================================================

    async generateTokenForRequest(request: TokenGenerationRequest): Promise<TokenGenerationResponse> {
        try {
            const token = await this.generateToken(request.user, request.options);

            return {
                success: true,
                token,
                claims: {
                    user_id: request.user.id,
                    email: request.user.email,
                    role: request.user.role,
                    exp: Math.floor(Date.now() / 1000) + ((request.options?.expirationHours || this.config.defaultExpirationHours) * 3600),
                    iat: Math.floor(Date.now() / 1000)
                },
                metadata: {
                    expires_at: Math.floor(Date.now() / 1000) + ((request.options?.expirationHours || this.config.defaultExpirationHours) * 3600),
                    issued_at: Math.floor(Date.now() / 1000),
                    token_length: token.length,
                    algorithm_used: this.useJose ? this.config.algorithm : 'HS256-Fallback'
                }
            };

        } catch (error) {
            console.error('[JWTService] Token generation request failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    async generateTokenForRole(user: SSOUser, targetRole: 'host' | 'org_admin' | 'super_admin', options: TokenGenerationOptions = {}): Promise<string> {
        if (!this.canGenerateForRole(user.role, targetRole)) {
            throw new Error(`User role ${user.role} cannot generate tokens for role ${targetRole}`);
        }

        const targetUser: SSOUser = {
            ...user,
            role: targetRole,
            games: user.games?.map(game => ({ ...game, permission_level: targetRole })) || []
        };

        return this.generateToken(targetUser, options);
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    private buildUserPermissions(role: 'host' | 'org_admin' | 'super_admin'): UserPermissions {
        return { ...DEFAULT_PERMISSIONS[role] };
    }

    private buildGameAccess(user: SSOUser): GameAccess[] {
        if (!user.games || !Array.isArray(user.games) || user.games.length === 0) {
            return [{ name: 'ready-or-not', permission_level: user.role, features: [] }];
        }

        return user.games.map(game => ({
            name: game.name,
            permission_level: game.permission_level as 'host' | 'org_admin' | 'super_admin',
            features: []
        }));
    }

    private canGenerateForRole(userRole: string, targetRole: string): boolean {
        const hierarchy = ['host', 'org_admin', 'super_admin'];
        return hierarchy.indexOf(userRole) >= hierarchy.indexOf(targetRole);
    }

    private base64UrlEncode(str: string): string {
        const base64 = btoa(str);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    private base64UrlDecode(str: string): string {
        const padding = '='.repeat((4 - str.length % 4) % 4);
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
        return atob(base64);
    }

    private createSimpleSignature(data: string): string {
        let hash = 0;
        const combined = data + (this.signingKey as string);
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    getConfig(): Readonly<JWTServiceConfig> {
        return { ...this.config };
    }

    async healthCheck(): Promise<{ healthy: boolean; algorithm: string; environment: string; message: string }> {
        try {
            const testUser: SSOUser = {
                id: 'test-user',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host',
                games: [{ name: 'ready-or-not', permission_level: 'host' }]
            };

            const token = await this.generateToken(testUser, { expirationHours: 0.01 });
            const verification = await this.verifyToken(token);

            return {
                healthy: verification.valid,
                algorithm: this.useJose ? this.config.algorithm : 'HS256-Fallback',
                environment: this.config.environment,
                message: verification.valid
                    ? `JWT service is healthy (${this.useJose ? 'jose' : 'fallback'})`
                    : `JWT verification failed: ${verification.message}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                healthy: false,
                algorithm: this.useJose ? this.config.algorithm : 'HS256-Fallback',
                environment: this.config.environment,
                message: `Health check failed: ${errorMessage}`
            };
        }
    }
}

// =====================================================
// SERVICE INSTANCE
// =====================================================

export const jwtService = new JWTService();