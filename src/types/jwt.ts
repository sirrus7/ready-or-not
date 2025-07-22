/**
 * JWT Types and Interfaces
 * Ready-or-Not JWT Token Generation System
 *
 * File: src/types/jwt.ts
 *
 * This module defines all TypeScript interfaces for JWT operations,
 * including claims, verification results, and configuration options.
 */

import { SSOUser } from '../services/sso-service';

// =====================================================
// JWT CLAIMS INTERFACES
// =====================================================

/**
 * Standard JWT Claims - following RFC 7519
 */
export interface JWTStandardClaims {
    /** Issuer - identifies the system that issued the JWT */
    iss: string;
    /** Audience - identifies the recipients the JWT is intended for */
    aud: string;
    /** Expiration time - unix timestamp when token expires */
    exp: number;
    /** Issued at - unix timestamp when token was issued */
    iat: number;
    /** Subject - identifies the principal that is the subject of the JWT */
    sub?: string;
    /** JWT ID - unique identifier for the JWT */
    jti?: string;
    /** Not before - unix timestamp before which JWT must not be accepted */
    nbf?: number;
}

/**
 * User permissions for game and system access
 */
export interface UserPermissions {
    /** Can create new game sessions */
    can_create_sessions: boolean;
    /** Can manage teams within sessions */
    can_manage_teams: boolean;
    /** Can view analytics and reports */
    can_view_analytics: boolean;
    /** Has administrative privileges */
    is_admin: boolean;
    /** Can manage other users (org_admin and super_admin only) */
    can_manage_users?: boolean;
    /** Can access system settings (super_admin only) */
    can_manage_system?: boolean;
}

/**
 * Game-specific information and permissions
 */
export interface GameAccess {
    /** Game identifier */
    name: string;
    /** User's permission level for this specific game */
    permission_level: 'host' | 'org_admin' | 'super_admin';
    /** Game-specific features this user can access */
    features?: string[];
    /** Maximum number of teams user can create (for hosts) */
    max_teams?: number;
}

/**
 * Organization information for school/district context
 */
export interface OrganizationInfo {
    /** Organization ID */
    id: string;
    /** Organization name */
    name: string;
    /** Organization type */
    type: 'school' | 'district';
    /** Parent organization (school's district) */
    parent_id?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Complete JWT Claims for Ready-or-Not SSO
 * Combines standard JWT claims with custom application claims
 */
export interface JWTClaims extends JWTStandardClaims {
    // ===== USER IDENTITY =====
    /** User's unique identifier */
    user_id: string;
    /** User's email address */
    email: string;
    /** User's full name */
    full_name: string;
    /** User's first name */
    first_name?: string;
    /** User's last name */
    last_name?: string;

    // ===== ROLE AND PERMISSIONS =====
    /** User's primary role */
    role: 'host' | 'org_admin' | 'super_admin';
    /** Detailed permissions object */
    permissions: UserPermissions;

    // ===== GAME ACCESS =====
    /** Games this user can access with their permission levels */
    allowed_games: GameAccess[];

    // ===== ORGANIZATION CONTEXT =====
    /** Primary organization ID (school for hosts, district for org_admins) */
    organization_id?: string;
    /** Organization information */
    organization?: OrganizationInfo;
    /** School information (for hosts and org_admins) */
    school_info?: OrganizationInfo;
    /** District information (for org_admins and hosts via school) */
    district_info?: OrganizationInfo;

    // ===== TOKEN METADATA =====
    /** Token generation timestamp for tracking */
    token_version?: number;
    /** Environment this token was issued for */
    environment?: 'development' | 'staging' | 'production';
    /** IP address token was issued from (for security logging) */
    issued_ip?: string;
    /** User agent token was issued from (for security logging) */
    issued_user_agent?: string;
}

// =====================================================
// JWT SERVICE INTERFACES
// =====================================================

/**
 * Configuration options for JWT token generation
 */
export interface TokenGenerationOptions {
    /** Token expiration time in hours (default: 2) */
    expirationHours?: number;
    /** Additional audiences to include */
    additionalAudiences?: string[];
    /** Custom claims to add to the token */
    customClaims?: Record<string, unknown>;
    /** Environment to set in token */
    environment?: 'development' | 'staging' | 'production';
    /** Include IP address in token claims */
    includeIssueContext?: boolean;
    /** IP address for security context */
    issueIP?: string;
    /** User agent for security context */
    issueUserAgent?: string;
}

/**
 * JWT verification and validation result
 */
export interface JWTVerificationResult {
    /** Whether the token is valid and verified */
    valid: boolean;
    /** Decoded and verified claims (only if valid) */
    claims?: JWTClaims;
    /** Error code if validation failed */
    error?: 'expired' | 'invalid_signature' | 'malformed' | 'invalid_issuer' | 'invalid_audience' | 'not_yet_valid' | 'invalid_claims';
    /** Human-readable error message */
    message?: string;
    /** Additional verification details */
    details?: {
        /** Token expiration timestamp */
        exp?: number;
        /** Current timestamp */
        now?: number;
        /** Issuer from token */
        iss?: string;
        /** Audience from token */
        aud?: string | string[];
    };
}

/**
 * JWT Service configuration
 */
export interface JWTServiceConfig {
    /** JWT signing secret for development (HMAC) */
    devSecret?: string;
    /** JWT signing key for production (RSA private key) */
    prodPrivateKey?: string;
    /** JWT verification key for production (RSA public key) */
    prodPublicKey?: string;
    /** Default issuer for all tokens */
    issuer: string;
    /** Default audience for all tokens */
    audience: string;
    /** Default token expiration in hours */
    defaultExpirationHours: number;
    /** Environment mode */
    environment: 'development' | 'staging' | 'production';
    /** Algorithm to use (HS256 for dev, RS256 for prod) */
    algorithm: 'HS256' | 'RS256';
}

/**
 * Token generation request payload
 */
export interface TokenGenerationRequest {
    /** User to generate token for */
    user: SSOUser;
    /** Token generation options */
    options?: TokenGenerationOptions;
    /** Request context */
    context?: {
        ip_address?: string;
        user_agent?: string;
        requested_by?: string;
        purpose?: string;
    };
}

/**
 * Token generation response
 */
export interface TokenGenerationResponse {
    /** Whether token generation succeeded */
    success: boolean;
    /** Generated JWT token (only if success) */
    token?: string;
    /** Token claims summary */
    claims?: Partial<JWTClaims>;
    /** Error message if generation failed */
    error?: string;
    /** Token metadata */
    metadata?: {
        expires_at: number;
        issued_at: number;
        token_length: number;
        algorithm_used: string;
    };
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * JWT Header for jose library compatibility
 */
export interface JWTHeader {
    alg: 'HS256' | 'RS256';
    typ: 'JWT';
    kid?: string; // Key ID for key rotation (future use)
}

/**
 * Claims validation rules
 */
export interface ClaimsValidationRules {
    /** Required claims that must be present */
    requiredClaims: (keyof JWTClaims)[];
    /** Maximum age in seconds for token acceptance */
    maxAge?: number;
    /** Allowed issuers */
    allowedIssuers: string[];
    /** Allowed audiences */
    allowedAudiences: string[];
    /** Custom validation functions */
    customValidators?: Array<(claims: JWTClaims) => { valid: boolean; error?: string }>;
}

/**
 * Export all types for easy importing
 */
export type {
    JWTStandardClaims,
    UserPermissions,
    GameAccess,
    OrganizationInfo,
    JWTClaims,
    TokenGenerationOptions,
    JWTVerificationResult,
    JWTServiceConfig,
    TokenGenerationRequest,
    TokenGenerationResponse,
    JWTHeader,
    ClaimsValidationRules,
};

// =====================================================
// CONSTANTS AND DEFAULTS
// =====================================================

/**
 * Default configuration values
 */
export const JWT_DEFAULTS = {
    ISSUER: 'ready-or-not-sso',
    AUDIENCE: 'ready-or-not',
    EXPIRATION_HOURS: 2,
    ALGORITHM_DEV: 'HS256' as const,
    ALGORITHM_PROD: 'RS256' as const,
    MAX_TOKEN_AGE: 7200, // 2 hours in seconds
    REQUIRED_CLAIMS: ['user_id', 'email', 'role', 'iss', 'aud', 'exp', 'iat'] as const,
} as const;

/**
 * Default permissions by role
 */
export const DEFAULT_PERMISSIONS: Record<'host' | 'org_admin' | 'super_admin', UserPermissions> = {
    host: {
        can_create_sessions: true,
        can_manage_teams: true,
        can_view_analytics: true,
        is_admin: false,
        can_manage_users: false,
        can_manage_system: false,
    },
    org_admin: {
        can_create_sessions: true,
        can_manage_teams: true,
        can_view_analytics: true,
        is_admin: true,
        can_manage_users: true,
        can_manage_system: false,
    },
    super_admin: {
        can_create_sessions: true,
        can_manage_teams: true,
        can_view_analytics: true,
        is_admin: true,
        can_manage_users: true,
        can_manage_system: true,
    },
} as const;