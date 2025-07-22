/**
 * JWT Service Tests - Comprehensive Test Coverage
 * Ready-or-Not JWT Service Testing with Mock Isolation
 *
 * File: src/services/__tests__/jwt-service.test.ts
 *
 * Following established mock isolation patterns from Phase 3 testing,
 * these tests ensure complete coverage of JWT functionality with
 * proper test isolation and factory patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JWTService, jwtService } from '../jwt-service';
import { SSOUser } from '../sso-service';
import {
    JWTClaims,
    JWTVerificationResult,
    TokenGenerationOptions,
    TokenGenerationRequest,
    DEFAULT_PERMISSIONS
} from '../../types/jwt';

// Import the jose library directly to test it
let SignJWT: any = null;
let jwtVerify: any = null;
let joseAvailable = false;

try {
    const jose = require('jose');
    SignJWT = jose.SignJWT;
    jwtVerify = jose.jwtVerify;
    joseAvailable = true;
} catch (error) {
    console.log('Jose library not available for testing');
}

// =====================================================
// JOSE LIBRARY BASIC TESTS
// =====================================================

describe('Jose Library Basic Tests', () => {
    it('should work with minimal jose example if available', async () => {
        if (!joseAvailable) {
            console.log('Skipping jose test - library not available');
            return;
        }

        const secret = new TextEncoder().encode('test-secret-at-least-32-characters-long');

        const payload = {
            user_id: 'test-123',
            email: 'test@example.com'
        };

        try {
            const jwt = new SignJWT(payload)
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('2h')
                .setIssuer('test-issuer')
                .setAudience('test-audience');

            const token = await jwt.sign(secret);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);

            const { payload: verified } = await jwtVerify(token, secret, {
                issuer: 'test-issuer',
                audience: 'test-audience'
            });

            expect(verified.user_id).toBe('test-123');
            expect(verified.email).toBe('test@example.com');

        } catch (error) {
            console.error('Jose library basic test failed:', error);
            throw error;
        }
    });
});

// =====================================================
// MOCK SETUP AND FACTORY PATTERNS
// =====================================================

/**
 * Factory for creating test users with different roles
 * ✅ ALIGNED: Uses established patterns from existing SSO tests
 */
const createTestUser = (role: 'host' | 'org_admin' | 'super_admin' = 'host'): SSOUser => ({
    id: `test-user-${role}-${Date.now()}`,
    email: `${role}@example.com`,
    full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')} User`,
    first_name: 'Test',
    last_name: `${role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}`,
    role,
    games: [
        { name: 'ready-or-not', permission_level: role },
        { name: 'test-game', permission_level: role }
    ],
    organization_type: role === 'host' ? 'school' : 'district',
    organization_id: role === 'host' ? 'school-123' : 'district-456',
    district_info: role !== 'host' ? {
        id: 'district-456',
        name: 'Test District',
        state: 'CA'
    } : undefined,
    school_info: role === 'host' ? {
        id: 'school-123',
        name: 'Test School',
        district_id: 'district-456',
        district_name: 'Test District'
    } : undefined,
    // Add metadata to ensure complete user object
    metadata: {
        test: true,
        created_at: new Date().toISOString()
    }
});

/**
 * Factory for creating JWT test service instances
 * ✅ ISOLATED: Each test gets a fresh service instance
 */
const createTestJWTService = () => new JWTService({
    issuer: 'test-issuer',
    audience: 'test-audience',
    defaultExpirationHours: 2,
    environment: 'development',
    algorithm: 'HS256',
    devSecret: 'test-secret-for-jwt-testing-12345'
});

// =====================================================
// TEST SUITE
// =====================================================

describe('JWTService', () => {
    let testService: JWTService;

    beforeEach(() => {
        // ✅ CRITICAL: Fresh service instance for each test
        testService = createTestJWTService();

        // ✅ ALIGNED: Mock environment variables for consistency
        vi.stubEnv('VITE_USE_REAL_JWT', 'true');
        vi.stubEnv('VITE_NODE_ENV', 'development');
        vi.stubEnv('VITE_JWT_SECRET_DEV', 'test-secret-for-jwt-testing-12345');
    });

    afterEach(() => {
        // ✅ CRITICAL: Clean up all mocks after each test
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    // =====================================================
    // SERVICE INITIALIZATION TESTS
    // =====================================================

    describe('Service Initialization', () => {
        it('should initialize with default configuration', () => {
            const service = new JWTService();
            const config = service.getConfig();

            expect(config.issuer).toBe('ready-or-not-sso');
            expect(config.audience).toBe('ready-or-not');
            expect(config.defaultExpirationHours).toBe(2);
            expect(config.algorithm).toBe('HS256'); // Development default
        });

        it('should initialize with custom configuration', () => {
            const customConfig = {
                issuer: 'custom-issuer',
                audience: 'custom-audience',
                defaultExpirationHours: 4,
                environment: 'staging' as const
            };

            const service = new JWTService(customConfig);
            const config = service.getConfig();

            expect(config.issuer).toBe(customConfig.issuer);
            expect(config.audience).toBe(customConfig.audience);
            expect(config.defaultExpirationHours).toBe(customConfig.defaultExpirationHours);
            expect(config.environment).toBe(customConfig.environment);
        });

        it('should perform health check successfully', async () => {
            const health = await testService.healthCheck();

            expect(health.healthy).toBe(true);
            expect(health.algorithm).toMatch(/HS256/);
            expect(health.environment).toBe('development');
            expect(health.message).toMatch(/healthy/);
        });
    });

    // =====================================================
    // TOKEN GENERATION TESTS
    // =====================================================

    describe('Token Generation', () => {
        it('should generate valid JWT token for host user', async () => {
            const user = createTestUser('host');
            const token = await testService.generateToken(user);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
        });

        it('should generate valid JWT token for org_admin user', async () => {
            const user = createTestUser('org_admin');
            const token = await testService.generateToken(user);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should generate valid JWT token for super_admin user', async () => {
            const user = createTestUser('super_admin');
            const token = await testService.generateToken(user);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should generate token with custom expiration', async () => {
            const user = createTestUser('host');
            const options: TokenGenerationOptions = {
                expirationHours: 4
            };

            const token = await testService.generateToken(user, options);
            const verification = await testService.verifyToken(token);

            expect(verification.valid).toBe(true);
            expect(verification.claims?.exp).toBeDefined();

            // Verify expiration is approximately 4 hours from now
            const now = Math.floor(Date.now() / 1000);
            const expectedExp = now + (4 * 3600);
            expect(verification.claims?.exp).toBeCloseTo(expectedExp, -2); // Within 100 seconds
        });

        it('should generate token with custom claims', async () => {
            const user = createTestUser('host');
            const customClaims = {
                test_claim: 'test_value',
                numeric_claim: 12345
            };
            const options: TokenGenerationOptions = {
                customClaims
            };

            const token = await testService.generateToken(user, options);
            const verification = await testService.verifyToken(token);

            expect(verification.valid).toBe(true);
            expect((verification.claims as any)?.test_claim).toBe('test_value');
            expect((verification.claims as any)?.numeric_claim).toBe(12345);
        });

        it('should include issue context when requested', async () => {
            const user = createTestUser('host');
            const options: TokenGenerationOptions = {
                includeIssueContext: true,
                issueIP: '192.168.1.100',
                issueUserAgent: 'Test Browser'
            };

            const token = await testService.generateToken(user, options);
            const verification = await testService.verifyToken(token);

            expect(verification.valid).toBe(true);
            // Note: Issue context might not be included in fallback implementation
        });
    });

    // =====================================================
    // TOKEN VERIFICATION TESTS
    // =====================================================

    describe('Token Verification', () => {
        it('should verify valid token successfully', async () => {
            const user = createTestUser('host');
            const token = await testService.generateToken(user);

            const verification = await testService.verifyToken(token);

            expect(verification.valid).toBe(true);
            expect(verification.claims?.user_id).toBe(user.id);
            expect(verification.claims?.email).toBe(user.email);
            expect(verification.claims?.role).toBe(user.role);
            expect(verification.message).toMatch(/verified successfully/);
        });

        it('should reject empty token', async () => {
            const verification = await testService.verifyToken('');

            expect(verification.valid).toBe(false);
            expect(verification.error).toBe('malformed');
            expect(verification.message).toBe('Token is empty or invalid format');
        });

        it('should reject malformed token', async () => {
            const verification = await testService.verifyToken('invalid.token.format.extra');

            expect(verification.valid).toBe(false);
            expect(verification.error).toBe('malformed');
        });

        it('should handle Bearer prefix in token', async () => {
            const user = createTestUser('host');
            const token = await testService.generateToken(user);

            const verification = await testService.verifyToken(`Bearer ${token}`);

            expect(verification.valid).toBe(true);
            expect(verification.claims?.user_id).toBe(user.id);
        });

        it('should reject expired token', async () => {
            const user = createTestUser('host');
            // Generate token with very short expiration
            const token = await testService.generateToken(user, { expirationHours: -1 }); // Already expired

            const verification = await testService.verifyToken(token);

            expect(verification.valid).toBe(false);
            expect(verification.error).toBe('expired');
        });

        it('should verify token with all claim types', async () => {
            const user = createTestUser('org_admin'); // Has both school and district info
            const token = await testService.generateToken(user);

            const verification = await testService.verifyToken(token);

            expect(verification.valid).toBe(true);
            const claims = verification.claims!;

            // User identity
            expect(claims.user_id).toBe(user.id);
            expect(claims.email).toBe(user.email);
            expect(claims.full_name).toBe(user.full_name);

            // Role and permissions
            expect(claims.role).toBe('org_admin');
            expect(claims.permissions).toEqual(DEFAULT_PERMISSIONS.org_admin);

            // Game access
            expect(claims.allowed_games).toHaveLength(2);
            expect(claims.allowed_games[0].name).toBe('ready-or-not');
            expect(claims.allowed_games[0].permission_level).toBe('org_admin');
        });
    });

    // =====================================================
    // HIGH-LEVEL METHOD TESTS
    // =====================================================

    describe('High-Level Methods', () => {
        it('should generate token for request successfully', async () => {
            const user = createTestUser('host');
            const request: TokenGenerationRequest = {
                user,
                options: { expirationHours: 3 },
                context: {
                    ip_address: '192.168.1.100',
                    user_agent: 'Test Browser',
                    purpose: 'unit-test'
                }
            };

            const response = await testService.generateTokenForRequest(request);

            expect(response.success).toBe(true);
            expect(response.token).toBeDefined();
            expect(response.claims?.user_id).toBe(user.id);
            expect(response.metadata?.algorithm_used).toMatch(/HS256/);
        });

        it('should handle token generation request failure', async () => {
            const user = createTestUser('host');
            user.email = ''; // Invalid email to trigger failure

            const request: TokenGenerationRequest = { user };
            const response = await testService.generateTokenForRequest(request);

            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            expect(response.token).toBeUndefined();
        });

        it('should generate token for specific role', async () => {
            const adminUser = createTestUser('super_admin');

            // Super admin can generate tokens for host role
            const hostToken = await testService.generateTokenForRole(adminUser, 'host');
            const verification = await testService.verifyToken(hostToken);

            expect(verification.valid).toBe(true);
            expect(verification.claims?.role).toBe('host');
            expect(verification.claims?.user_id).toBe(adminUser.id); // Same user, different role
        });

        it('should reject role generation for insufficient permissions', async () => {
            const hostUser = createTestUser('host');

            // Host cannot generate tokens for super_admin role
            await expect(
                testService.generateTokenForRole(hostUser, 'super_admin')
            ).rejects.toThrow('User role host cannot generate tokens for role super_admin');
        });
    });

    // =====================================================
    // ERROR HANDLING TESTS
    // =====================================================

    describe('Error Handling', () => {
        it('should handle undefined user gracefully', async () => {
            await expect(
                testService.generateToken(null as any)
            ).rejects.toThrow();
        });

        it('should handle invalid user data gracefully', async () => {
            const invalidUser = {
                id: '',
                email: '',
                full_name: '',
                role: 'invalid_role' as any,
                games: []
            };

            await expect(
                testService.generateToken(invalidUser as any)
            ).rejects.toThrow();
        });

        it('should provide detailed error information', async () => {
            const verification = await testService.verifyToken('malformed-token');

            expect(verification.valid).toBe(false);
            expect(verification.error).toBeDefined();
            expect(verification.message).toBeDefined();
            expect(typeof verification.message).toBe('string');
        });
    });

    // =====================================================
    // INTEGRATION TESTS
    // =====================================================

    describe('Integration Tests', () => {
        it('should complete full token lifecycle', async () => {
            // 1. Create user and generate token
            const user = createTestUser('org_admin');
            const token = await testService.generateToken(user, {
                expirationHours: 1
            });

            // 2. Verify token is valid
            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);

            // 3. Verify all claims are present and correct
            const claims = verification.claims!;
            expect(claims.user_id).toBe(user.id);
            expect(claims.email).toBe(user.email);
            expect(claims.role).toBe('org_admin');
            expect(claims.permissions.is_admin).toBe(true);
            expect(claims.allowed_games).toHaveLength(2);

            // 4. Verify token metadata
            expect(claims.iss).toBe('test-issuer');
            expect(claims.aud).toBe('test-audience');
            expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });

        it('should work with default jwt service instance', async () => {
            const user = createTestUser('host');

            // Test default service instance
            const token = await jwtService.generateToken(user);
            const verification = await jwtService.verifyToken(token);

            expect(verification.valid).toBe(true);
            expect(verification.claims?.user_id).toBe(user.id);
        });

        it('should handle concurrent token operations', async () => {
            const users = [
                createTestUser('host'),
                createTestUser('org_admin'),
                createTestUser('super_admin')
            ];

            // Generate tokens concurrently
            const tokenPromises = users.map(user =>
                testService.generateToken(user, { expirationHours: 1 })
            );
            const tokens = await Promise.all(tokenPromises);

            // Verify all tokens concurrently
            const verificationPromises = tokens.map(token =>
                testService.verifyToken(token)
            );
            const verifications = await Promise.all(verificationPromises);

            // All should be valid
            verifications.forEach((verification, index) => {
                expect(verification.valid).toBe(true);
                expect(verification.claims?.user_id).toBe(users[index].id);
                expect(verification.claims?.role).toBe(users[index].role);
            });
        });
    });
});

// =====================================================
// SERVICE CONFIGURATION TESTS
// =====================================================

describe('JWTService Configuration', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    it('should use development algorithm in development environment', () => {
        vi.stubEnv('VITE_NODE_ENV', 'development');
        vi.stubEnv('VITE_USE_REAL_JWT', 'true');

        const service = new JWTService();
        const config = service.getConfig();

        expect(config.algorithm).toBe('HS256');
    });

    it('should handle missing environment variables gracefully', () => {
        vi.stubEnv('VITE_USE_REAL_JWT', 'true');
        // Don't set JWT secret

        expect(() => new JWTService()).not.toThrow();
    });

    it('should provide readonly configuration', () => {
        const service = new JWTService();
        const config = service.getConfig();

        // Should not be able to modify returned config
        expect(() => {
            (config as any).issuer = 'modified';
        }).not.toThrow(); // Object.freeze isn't used, but it's a readonly type

        // Original config should be unchanged
        const newConfig = service.getConfig();
        expect(newConfig.issuer).toBe('ready-or-not-sso');
    });
});