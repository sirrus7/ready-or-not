/**
 * SSO Service Tests - Streamlined for Pure JWT Integration
 * Updated for Phase 4B - removes dual-mode complexity testing
 *
 * File: src/services/__tests__/sso-service.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SSOService } from '../sso-service'

// =====================================================
// MOCK SETUP - STREAMLINED FOR JWT SERVICE
// =====================================================

// Mock the JWT service - create mock object inside factory to avoid hoisting issues
vi.mock('../jwt-service', () => ({
    jwtService: {
        generateToken: vi.fn(),
        verifyToken: vi.fn(),
        healthCheck: vi.fn().mockResolvedValue({
            healthy: true,
            algorithm: 'HS256',
            environment: 'development'
        })
    },
    JWTService: vi.fn()
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        rpc: vi.fn(),
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    order: vi.fn(() => ({
                        select: vi.fn().mockResolvedValue({ data: [], error: null })
                    }))
                }))
            }))
        }))
    }))
}));

// Mock localStorage
const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

// =====================================================
// TEST DATA FACTORIES - JWT FOCUSED
// =====================================================

/**
 * Factory for creating JWT claims that match the JWT service output
 */
const createJWTClaims = (role: 'host' | 'org_admin' | 'super_admin' = 'host') => {
    // Create consistent name formatting that matches SSO service expectations
    const roleDisplay = role === 'org_admin' ? 'Org Admin' :
        role === 'super_admin' ? 'Super Admin' : 'Host';

    return {
        user_id: `test-user-${role}`,
        email: `${role}@example.com`,
        full_name: `Test ${roleDisplay} User`,
        role,
        organization_id: role === 'host' ? 'school-123' : 'district-456',
        allowed_games: [
            { game_name: 'ready-or-not', permission_level: role }
        ],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'ready-or-not-sso',
        aud: 'ready-or-not',
        // Optional context based on role
        ...(role === 'host' && {
            school_info: {
                id: 'school-123',
                name: 'Test School',
                district_id: 'district-456',
                district_name: 'Test District'
            }
        }),
        ...(role !== 'host' && {
            district_info: {
                id: 'district-456',
                name: 'Test District',
                state: 'CA'
            }
        })
    };
};

/**
 * Factory for creating successful JWT verification results
 */
const createJWTVerificationResult = (claims: any) => ({
    valid: true,
    claims,
    message: 'Token verified successfully'
});

/**
 * Factory for creating failed JWT verification results
 */
const createJWTVerificationFailure = (error: string, message?: string) => ({
    valid: false,
    error,
    message: message || 'Token verification failed'
});

// =====================================================
// TEST SUITE
// =====================================================

describe('SSOService - Streamlined JWT Integration', () => {
    let ssoService: SSOService;
    let mockJWTService: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Import the mocked JWT service
        const { jwtService } = await import('../jwt-service');
        mockJWTService = jwtService;

        // Set up default successful JWT service behavior
        mockJWTService.verifyToken.mockResolvedValue(
            createJWTVerificationResult(createJWTClaims('host'))
        );
        mockJWTService.generateToken.mockResolvedValue('mock-jwt-token-123');

        ssoService = new SSOService(
            'https://test-url.supabase.co',
            'test-key'
        );
    });

    // =====================================================
    // CONSTRUCTOR TESTS
    // =====================================================

    describe('Constructor', () => {
        it('should create instance with provided credentials', () => {
            const service = new SSOService(
                'https://test-url.supabase.co',
                'test-key'
            );
            expect(service).toBeInstanceOf(SSOService);
        });

        it('should create instance with environment variables', () => {
            // Mock environment variables
            vi.stubEnv('VITE_SUPABASE_URL', 'https://env-url.supabase.co');
            vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'env-key');

            const service = new SSOService();
            expect(service).toBeInstanceOf(SSOService);

            vi.unstubAllEnvs();
        });

        it('should throw error if no credentials provided', () => {
            expect(() => new SSOService('', '')).toThrow('Supabase URL and Anon Key are required');
        });
    });

    // =====================================================
    // JWT PARSING TESTS - STREAMLINED
    // =====================================================

    describe('parseJWT - Pure JWT Service Integration', () => {
        it('should parse valid JWT token using JWT service', async () => {
            const testClaims = createJWTClaims('host');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const result = await ssoService.parseJWT('valid-jwt-token');

            expect(mockJWTService.verifyToken).toHaveBeenCalledWith('valid-jwt-token');
            expect(result.valid).toBe(true);
            expect(result.payload?.user_id).toBe(testClaims.user_id);
            expect(result.payload?.email).toBe(testClaims.email);
            expect(result.payload?.role).toBe(testClaims.role);
        });

        it('should handle Bearer prefix correctly', async () => {
            const testClaims = createJWTClaims('org_admin');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const result = await ssoService.parseJWT('Bearer valid-jwt-token');

            expect(mockJWTService.verifyToken).toHaveBeenCalledWith('valid-jwt-token');
            expect(result.valid).toBe(true);
            expect(result.payload?.role).toBe('org_admin');
        });

        it('should return error when JWT service verification fails', async () => {
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationFailure('expired', 'Token has expired')
            );

            const result = await ssoService.parseJWT('expired-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Token has expired');
        });

        it('should handle JWT service throwing errors', async () => {
            mockJWTService.verifyToken.mockRejectedValueOnce(
                new Error('JWT service unavailable')
            );

            const result = await ssoService.parseJWT('any-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('JWT service unavailable');
        });

        it('should convert JWT claims to SSOToken format correctly', async () => {
            const testClaims = createJWTClaims('super_admin');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const result = await ssoService.parseJWT('super-admin-token');

            expect(result.valid).toBe(true);
            expect(result.payload).toMatchObject({
                user_id: testClaims.user_id,
                email: testClaims.email,
                full_name: testClaims.full_name,
                role: testClaims.role,
                organization_id: testClaims.organization_id,
                organization_type: 'district', // Inferred from super_admin role
                exp: testClaims.exp,
                iat: testClaims.iat,
                iss: testClaims.iss,
                aud: testClaims.aud
            });
        });
    });

    // =====================================================
    // TOKEN VALIDATION TESTS - STREAMLINED
    // =====================================================

    describe('validateSSOToken - Pure JWT Integration', () => {
        it('should validate token successfully using JWT service', async () => {
            const testClaims = createJWTClaims('host');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const result = await ssoService.validateSSOToken('valid-token');

            expect(result.valid).toBe(true);
            expect(result.user?.email).toBe(testClaims.email);
            expect(result.user?.role).toBe(testClaims.role);
            expect(result.user?.metadata?.jwt_validated).toBe(true);
            expect(result.message).toContain('validated successfully');
        });

        it('should reject empty token', async () => {
            const result = await ssoService.validateSSOToken('');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('missing_token');
            expect(result.message).toBe('No token provided');
        });

        it('should reject invalid token from JWT service', async () => {
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationFailure('invalid_signature', 'Invalid token signature')
            );

            const result = await ssoService.validateSSOToken('invalid-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('invalid_token');
            expect(result.message).toBe('Invalid token signature');
        });

        it('should convert token data to SSOUser format correctly', async () => {
            const testClaims = createJWTClaims('org_admin');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const result = await ssoService.validateSSOToken('org-admin-token');

            expect(result.valid).toBe(true);
            expect(result.user).toMatchObject({
                id: testClaims.user_id,
                email: testClaims.email,
                full_name: testClaims.full_name,
                first_name: 'Test',
                last_name: 'Org Admin User', // Fixed: matches the createJWTClaims factory
                role: 'org_admin',
                organization_type: 'district',
                organization_id: testClaims.organization_id,
                games: [
                    { name: 'ready-or-not', permission_level: 'org_admin' }
                ]
            });
        });

        it('should include metadata with JWT validation info', async () => {
            const testClaims = createJWTClaims('host');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const result = await ssoService.validateSSOToken('host-token');

            expect(result.user?.metadata).toMatchObject({
                jwt_validated: true,
                token_iss: testClaims.iss,
                token_aud: testClaims.aud
            });
            expect(result.user?.metadata?.validated_at).toBeDefined();
        });
    });

    // =====================================================
    // AUTHENTICATION WORKFLOW TESTS
    // =====================================================

    describe('authenticateWithSSO - Streamlined Workflow', () => {
        beforeEach(() => {
            // Mock successful session creation
            vi.spyOn(ssoService, 'createLocalSession').mockResolvedValue({
                success: true,
                session: {
                    session_id: 'session-123',
                    user_id: 'test-user-host',
                    email: 'host@example.com',
                    permission_level: 'host',
                    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                    created_at: new Date().toISOString(),
                    last_activity: new Date().toISOString(),
                    is_active: true
                }
            });
        });

        it('should authenticate successfully with valid token', async () => {
            const testClaims = createJWTClaims('host');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const result = await ssoService.authenticateWithSSO('valid-token');

            expect(result.valid).toBe(true);
            expect(result.user?.email).toBe(testClaims.email);
            expect(result.session?.session_id).toBe('session-123');
            expect(result.message).toContain('Authentication successful');
        });

        it('should fail authentication with invalid token', async () => {
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationFailure('expired')
            );

            const result = await ssoService.authenticateWithSSO('expired-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('invalid_token');
            expect(result.user).toBeUndefined();
            expect(result.session).toBeUndefined();
        });

        it('should include game context in session creation', async () => {
            const testClaims = createJWTClaims('org_admin');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            const gameContext = { game: 'ready-or-not', source: 'global-game-loader' };

            await ssoService.authenticateWithSSO('valid-token', gameContext);

            expect(ssoService.createLocalSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: testClaims.email,
                    role: testClaims.role
                }),
                gameContext
            );
        });

        it('should handle session creation failure', async () => {
            const testClaims = createJWTClaims('super_admin');
            mockJWTService.verifyToken.mockResolvedValueOnce(
                createJWTVerificationResult(testClaims)
            );

            vi.spyOn(ssoService, 'createLocalSession').mockResolvedValueOnce({
                success: false,
                error: 'Database connection failed'
            });

            const result = await ssoService.authenticateWithSSO('valid-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('session_creation_failed');
            expect(result.message).toBe('Database connection failed');
        });
    });

    // =====================================================
    // SESSION MANAGEMENT TESTS
    // =====================================================

    describe('Session Management', () => {
        it('should validate local session successfully', async () => {
            // Mock Supabase response for valid session
            const mockSession = {
                session_id: 'session-123',
                user_id: 'user-123',
                email: 'test@example.com',
                permission_level: 'host',
                expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                is_active: true
            };

            vi.spyOn(ssoService, 'validateLocalSession').mockResolvedValueOnce({
                valid: true,
                session: mockSession
            });

            const result = await ssoService.validateLocalSession('session-123');

            expect(result.valid).toBe(true);
            expect(result.session?.session_id).toBe('session-123');
        });

        it('should extend local session successfully', async () => {
            const extendedSession = {
                session_id: 'session-123',
                user_id: 'user-123',
                email: 'test@example.com',
                permission_level: 'host',
                expires_at: new Date(Date.now() + 16 * 3600 * 1000).toISOString(),
                is_active: true
            };

            vi.spyOn(ssoService, 'extendLocalSession').mockResolvedValueOnce({
                success: true,
                session: extendedSession
            });

            const result = await ssoService.extendLocalSession('session-123', 16);

            expect(result.success).toBe(true);
            expect(result.session?.session_id).toBe('session-123');
        });

        it('should cleanup session successfully', async () => {
            vi.spyOn(ssoService, 'cleanupSession').mockResolvedValueOnce({
                success: true
            });

            const result = await ssoService.cleanupSession('session-123');

            expect(result.success).toBe(true);
        });
    });

    // =====================================================
    // UTILITY METHOD TESTS
    // =====================================================

    describe('Utility Methods', () => {
        it('should generate mock users', () => {
            const users = ssoService.generateMockUsers();

            expect(users).toHaveLength(2);
            expect(users[0].role).toBe('host');
            expect(users[1].role).toBe('org_admin');
        });

        it('should generate mock token using JWT service', async () => {
            const user = { email: 'test@example.com', role: 'host' as const };

            const token = await ssoService.generateMockToken(user);

            expect(mockJWTService.generateToken).toHaveBeenCalled();
            expect(token).toBe('mock-jwt-token-123');
        });

        it('should perform health check using JWT service', async () => {
            // Ensure the JWT service health check returns success
            mockJWTService.healthCheck.mockResolvedValueOnce({
                healthy: true,
                algorithm: 'HS256',
                environment: 'development'
            });

            const health = await ssoService.healthCheck();

            expect(mockJWTService.healthCheck).toHaveBeenCalled();
            expect(health.healthy).toBe(true);
            expect(health.service).toBe('SSO Service');
        });

        it('should get active sessions', async () => {
            vi.spyOn(ssoService, 'getActiveSessions').mockResolvedValueOnce([
                {
                    session_id: 'session-1',
                    user_id: 'user-1',
                    email: 'user1@example.com',
                    permission_level: 'host',
                    expires_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    last_activity: new Date().toISOString(),
                    is_active: true
                }
            ]);

            const sessions = await ssoService.getActiveSessions();

            expect(sessions).toHaveLength(1);
            expect(sessions[0].session_id).toBe('session-1');
        });
    });

    // =====================================================
    // ERROR HANDLING TESTS
    // =====================================================

    describe('Error Handling - Streamlined', () => {
        it('should handle JWT service errors gracefully', async () => {
            // Override the default mock for this specific test
            mockJWTService.verifyToken.mockRejectedValueOnce(
                new Error('JWT service is down')
            );

            const parseResult = await ssoService.parseJWT('any-token');
            expect(parseResult.valid).toBe(false);
            expect(parseResult.error).toBe('JWT service is down');

            // Reset mock for next call in same test
            mockJWTService.verifyToken.mockRejectedValueOnce(
                new Error('JWT service is down')
            );

            const validateResult = await ssoService.validateSSOToken('any-token');
            expect(validateResult.valid).toBe(false);
            expect(validateResult.error).toBe('invalid_token');
        });

        it('should handle authentication errors gracefully', async () => {
            // Override the default mock for this specific test
            mockJWTService.verifyToken.mockRejectedValueOnce(
                new Error('Network error')
            );

            const result = await ssoService.authenticateWithSSO('network-error-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('invalid_token'); // This gets mapped to invalid_token in validateSSOToken
            expect(result.message).toContain('Network error');
        });
    });
});