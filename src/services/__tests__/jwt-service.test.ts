/**
 * JWT Service Tests - Comprehensive Test Coverage
 * Ready-or-Not JWT Service Testing with Fallback for Test Environment
 *
 * File: src/services/__tests__/jwt-service.test.ts
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
    // ✅ FIXED: Provide proper 32+ character secret for HS256
    devSecret: 'test-secret-for-jwt-testing-at-least-32-characters-long'
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
        vi.stubEnv('VITE_JWT_SECRET_DEV', 'test-secret-for-jwt-testing-at-least-32-characters-long');
    });

    afterEach(() => {
        // ✅ CRITICAL: Clean up environment variables
        vi.unstubAllEnvs();
        vi.clearAllMocks();
    });

    // =====================================================
    // SERVICE INITIALIZATION TESTS
    // =====================================================

    describe('Service Initialization', () => {
        it('should initialize with default configuration', () => {
            const service = new JWTService();

            expect(service).toBeDefined();
            expect(service.getConfiguration()).toBeDefined();
            expect(service.getConfiguration().issuer).toBe('ready-or-not-sso');
            expect(service.getConfiguration().audience).toBe('ready-or-not');
        });

        it('should initialize with custom configuration', () => {
            const customConfig = {
                issuer: 'custom-issuer',
                audience: 'custom-audience',
                defaultExpirationHours: 4
            };

            const service = new JWTService(customConfig);
            const config = service.getConfiguration();

            expect(config.issuer).toBe('custom-issuer');
            expect(config.audience).toBe('custom-audience');
            expect(config.defaultExpirationHours).toBe(4);
        });

        it('should perform health check successfully', async () => {
            const health = await testService.healthCheck();

            expect(health.healthy).toBe(true);
            expect(health.algorithm).toMatch(/HS256/);
            expect(health.environment).toBe('development');
        });

        it('should use fallback implementation in test environment', () => {
            const health = testService.healthCheck();

            // In test environment, should use fallback instead of jose
            expect(health).resolves.toMatchObject({
                healthy: true,
                useJose: false // Should be false in test environment
            });
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
            expect(token.split('.')).toHaveLength(3);

            // Verify the token can be decoded
            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);
            expect(verification.claims?.user_id).toBe(user.id);
            expect(verification.claims?.role).toBe('host');
        });

        it('should generate valid JWT token for org_admin user', async () => {
            const user = createTestUser('org_admin');

            const token = await testService.generateToken(user);

            expect(token).toBeDefined();
            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);
            expect(verification.claims?.role).toBe('org_admin');
            expect(verification.claims?.permissions?.is_admin).toBe(true);
        });

        it('should generate valid JWT token for super_admin user', async () => {
            const user = createTestUser('super_admin');

            const token = await testService.generateToken(user);

            expect(token).toBeDefined();
            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);
            expect(verification.claims?.role).toBe('super_admin');
            expect(verification.claims?.permissions?.is_admin).toBe(true);
        });

        it('should generate token with custom expiration', async () => {
            const user = createTestUser('host');
            const options: TokenGenerationOptions = {
                expirationHours: 4
            };

            const token = await testService.generateToken(user, options);

            expect(token).toBeDefined();
            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);

            // Check that expiration is roughly 4 hours from now
            const now = Math.floor(Date.now() / 1000);
            const expectedExp = now + (4 * 3600);
            const actualExp = verification.claims?.exp || 0;

            // Allow 60 second tolerance for test execution time
            expect(Math.abs(actualExp - expectedExp)).toBeLessThan(60);
        });

        it('should generate token with custom claims', async () => {
            const user = createTestUser('org_admin');
            const options: TokenGenerationOptions = {
                environment: 'testing',
                issueContext: {
                    ip_address: '127.0.0.1',
                    user_agent: 'test-agent',
                    purpose: 'integration-test'
                }
            };

            const token = await testService.generateToken(user, options);

            expect(token).toBeDefined();
            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);
            expect(verification.claims?.environment).toBe('testing');
            expect(verification.claims?.issue_context).toBeDefined();
            expect(verification.claims?.issue_context?.purpose).toBe('integration-test');
        });

        it('should include issue context when requested', async () => {
            const user = createTestUser('host');
            const issueContext = {
                ip_address: '192.168.1.100',
                user_agent: 'Mozilla/5.0 Test Browser',
                requested_by: 'admin-user-123',
                purpose: 'session-token'
            };

            const token = await testService.generateToken(user, { issueContext });

            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);
            expect(verification.claims?.issue_context).toEqual(issueContext);
        });
    });

    // =====================================================
    // TOKEN VERIFICATION TESTS
    // =====================================================

    describe('Token Verification', () => {
        it('should verify valid token successfully', async () => {
            const user = createTestUser('host');
            const token = await testService.generateToken(user);

            const result = await testService.verifyToken(token);

            expect(result.valid).toBe(true);
            expect(result.claims).toBeDefined();
            expect(result.claims?.user_id).toBe(user.id);
            expect(result.claims?.email).toBe(user.email);
            expect(result.algorithm).toBe('HS256');
        });

        it('should reject empty token', async () => {
            const result = await testService.verifyToken('');

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('empty');
        });

        it('should reject malformed token', async () => {
            const result = await testService.verifyToken('not.a.valid.jwt.token');

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle Bearer prefix in token', async () => {
            const user = createTestUser('host');
            const token = await testService.generateToken(user);
            const bearerToken = `Bearer ${token}`;

            const result = await testService.verifyToken(bearerToken);

            expect(result.valid).toBe(true);
            expect(result.claims?.user_id).toBe(user.id);
        });

        it('should reject expired token', async () => {
            // ✅ FIXED: Use system time mocking for deterministic testing
            const now = new Date('2025-07-22T12:00:00Z');
            vi.setSystemTime(now);

            const user = createTestUser('host');
            const expiredOptions: TokenGenerationOptions = {
                expirationHours: -1 // Expired 1 hour ago
            };

            const token = await testService.generateToken(user, expiredOptions);

            // Move time forward to make token expired
            const futureTime = new Date('2025-07-22T14:00:00Z');
            vi.setSystemTime(futureTime);

            const result = await testService.verifyToken(token);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('expired');

            vi.useRealTimers();
        });

        it('should verify token with all claim types', async () => {
            const user = createTestUser('super_admin');
            const options: TokenGenerationOptions = {
                expirationHours: 2,
                environment: 'production',
                issueContext: {
                    ip_address: '10.0.0.1',
                    user_agent: 'Admin Dashboard',
                    purpose: 'full-access-token'
                }
            };

            const token = await testService.generateToken(user, options);
            const result = await testService.verifyToken(token);

            expect(result.valid).toBe(true);
            expect(result.claims?.user_id).toBe(user.id);
            expect(result.claims?.role).toBe('super_admin');
            expect(result.claims?.permissions?.is_admin).toBe(true);
            expect(result.claims?.allowed_games).toBeDefined();
            expect(result.claims?.environment).toBe('production');
            expect(result.claims?.issue_context?.purpose).toBe('full-access-token');
        });

        it('should reject tokens with invalid signatures', async () => {
            const user = createTestUser('host');
            const token = await testService.generateToken(user);

            // Tamper with the token by changing the last character
            const tamperedToken = token.slice(0, -1) + 'X';

            const result = await testService.verifyToken(tamperedToken);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    // =====================================================
    // HIGH-LEVEL METHODS TESTS
    // =====================================================

    describe('High-Level Methods', () => {
        it('should generate token for request successfully', async () => {
            const user = createTestUser('org_admin');
            const request: TokenGenerationRequest = {
                user,
                expirationHours: 3,
                environment: 'staging',
                issueContext: {
                    requested_by: 'admin-portal',
                    purpose: 'api-access'
                }
            };

            const response = await testService.generateTokenForRequest(request);

            expect(response.success).toBe(true);
            expect(response.token).toBeDefined();
            expect(response.claims?.user_id).toBe(user.id);
            expect(response.metadata?.algorithm_used).toBe('HS256');
        });

        it('should handle token generation request failure', async () => {
            // ✅ FIXED: Create a truly invalid user that will cause generation to fail
            const invalidUser = null as unknown as SSOUser;

            const request: TokenGenerationRequest = {
                user: invalidUser
            };

            const response = await testService.generateTokenForRequest(request);

            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            expect(response.error).toContain('failed');
        });

        it('should generate token for specific role', async () => {
            const adminUser = createTestUser('super_admin');

            const response = await testService.generateTokenForRole(adminUser, 'host');

            expect(response.success).toBe(true);
            expect(response.token).toBeDefined();

            // Verify the generated token has the target role
            if (response.token) {
                const verification = await testService.verifyToken(response.token);
                expect(verification.claims?.role).toBe('host');
                expect(verification.claims?.issue_context?.original_role).toBe('super_admin');
                expect(verification.claims?.issue_context?.target_role).toBe('host');
            }
        });

        it('should reject role generation for insufficient permissions', async () => {
            const hostUser = createTestUser('host');

            // Host trying to generate super_admin token should fail
            const response = await testService.generateTokenForRole(hostUser, 'super_admin');

            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            expect(response.error).toContain('Insufficient permissions');
        });
    });

    // =====================================================
    // ERROR HANDLING TESTS
    // =====================================================

    describe('Error Handling', () => {
        it('should handle undefined user gracefully', async () => {
            const invalidUser = undefined as unknown as SSOUser;

            try {
                await testService.generateToken(invalidUser);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error instanceof Error).toBe(true);
            }
        });

        it('should handle invalid user data gracefully', async () => {
            const invalidUser = {
                id: '',
                email: 'invalid',
                role: 'invalid-role'
            } as unknown as SSOUser;

            try {
                await testService.generateToken(invalidUser);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error instanceof Error).toBe(true);
            }
        });

        it('should provide detailed error information', async () => {
            const invalidUser = {
                id: null,
                email: null,
                role: null
            } as unknown as SSOUser;

            try {
                await testService.generateToken(invalidUser);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error instanceof Error).toBe(true);
                expect((error as Error).message).toBeDefined();
                expect((error as Error).message.length).toBeGreaterThan(0);
            }
        });
    });

    // =====================================================
    // INTEGRATION TESTS
    // =====================================================

    describe('Integration Tests', () => {
        it('should complete full token lifecycle', async () => {
            const user = createTestUser('org_admin');

            // Generate token
            const token = await testService.generateToken(user, {
                expirationHours: 1,
                environment: 'integration-test'
            });

            expect(token).toBeDefined();

            // Verify token
            const verification = await testService.verifyToken(token);
            expect(verification.valid).toBe(true);
            expect(verification.claims?.user_id).toBe(user.id);

            // Generate token via request method
            const request: TokenGenerationRequest = {
                user,
                expirationHours: 2
            };

            const response = await testService.generateTokenForRequest(request);
            expect(response.success).toBe(true);
            expect(response.token).toBeDefined();

            // Verify second token
            if (response.token) {
                const secondVerification = await testService.verifyToken(response.token);
                expect(secondVerification.valid).toBe(true);
                expect(secondVerification.claims?.user_id).toBe(user.id);
            }
        });

        it('should work with default jwt service instance', async () => {
            const user = createTestUser('host');

            const token = await jwtService.generateToken(user);
            expect(token).toBeDefined();

            const verification = await jwtService.verifyToken(token);
            expect(verification.valid).toBe(true);
        });

        it('should handle concurrent token operations', async () => {
            const users = [
                createTestUser('host'),
                createTestUser('org_admin'),
                createTestUser('super_admin')
            ];

            // Generate tokens concurrently
            const tokenPromises = users.map(user => testService.generateToken(user));
            const tokens = await Promise.all(tokenPromises);

            expect(tokens).toHaveLength(3);
            tokens.forEach(token => {
                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
            });

            // Verify tokens concurrently
            const verificationPromises = tokens.map(token => testService.verifyToken(token));
            const verifications = await Promise.all(verificationPromises);

            verifications.forEach((verification, index) => {
                expect(verification.valid).toBe(true);
                expect(verification.claims?.user_id).toBe(users[index].id);
                expect(verification.claims?.role).toBe(users[index].role);
            });
        });
    });
});

// =====================================================
// CONFIGURATION TESTS
// =====================================================

describe('JWTService Configuration', () => {
    it('should use development algorithm in development environment', () => {
        vi.stubEnv('VITE_NODE_ENV', 'development');

        const service = new JWTService();
        const config = service.getConfiguration();

        expect(config.algorithm).toBe('HS256');
        expect(config.environment).toBe('development');

        vi.unstubAllEnvs();
    });

    it('should handle missing environment variables gracefully', () => {
        vi.stubEnv('VITE_NODE_ENV', '');
        vi.stubEnv('VITE_JWT_SECRET_DEV', '');

        const service = new JWTService();
        const config = service.getConfiguration();

        expect(config.environment).toBe('development'); // Default fallback
        expect(config.algorithm).toBe('HS256'); // Default fallback

        vi.unstubAllEnvs();
    });

    it('should provide readonly configuration', () => {
        const service = new JWTService();
        const config = service.getConfiguration();

        // ✅ FIXED: Test should expect the freeze to work
        expect(Object.isFrozen(config)).toBe(true);

        // This should throw because the object is frozen
        expect(() => {
            (config as any).issuer = 'hacked-issuer';
        }).toThrow();

        // Get fresh config to verify it wasn't modified
        const freshConfig = service.getConfiguration();
        expect(freshConfig.issuer).toBe('ready-or-not-sso');
    });
});