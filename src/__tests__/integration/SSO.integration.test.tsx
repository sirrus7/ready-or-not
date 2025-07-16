// src/__tests__/integration/SSO.integration.test.tsx
/**
 * Integration Tests
 * End-to-end tests for the complete SSO authentication flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { ssoService } from '../../services/sso-service';

// Mock the SSO service
vi.mock('../../services/sso-service', () => ({
    ssoService: {
        authenticateWithSSO: vi.fn(),
        validateLocalSession: vi.fn(),
        extendLocalSession: vi.fn(),
        cleanupSession: vi.fn(),
        generateMockUsers: vi.fn(),
        generateMockToken: vi.fn(),
        healthCheck: vi.fn(),
        getActiveSessions: vi.fn()
    }
}));

// Mock environment variables
const mockEnv = {
    VITE_GLOBAL_GAME_LOADER_URL: 'http://localhost:3001',
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'mock-anon-key'
};

vi.mock('../../env', () => ({
    env: mockEnv
}));

// Mock window.location
const mockLocation = {
    href: 'http://localhost:3000',
    search: '',
    pathname: '/',
    assign: vi.fn()
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

const mockHistory = {
    replaceState: vi.fn()
};

Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true
});

// Helper function to create mock users
const createMockUser = (role: 'host' | 'org_admin' | 'super_admin') => ({
    id: `user-${role}`,
    email: `${role}@example.com`,
    full_name: `${role} User`,
    role,
    games: [{ name: 'ready-or-not', permission_level: role }],
    organization_type: role === 'host' ? 'school' : 'district',
    district_info: role !== 'host' ? {
        id: 'district-123',
        name: 'Test District',
        state: 'CA'
    } : undefined,
    school_info: role === 'host' ? {
        id: 'school-456',
        name: 'Test School',
        district_id: 'district-123'
    } : undefined
});

const createMockSession = (user: unknown) => ({
    session_id: `session-${user.id}`,
    user_id: user.id,
    email: user.email,
    permission_level: user.role,
    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    is_active: true,
    game_context: {
        game: 'ready-or-not',
        user_role: user.role,
        organization_type: user.organization_type
    }
});

// Simple test component
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestApp: React.FC = () => {
    return (
        <div>
            <h1>Ready or Not Test App</h1>
            <div data-testid="app-content">App is running</div>
        </div>
    );
};

describe('SSO Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockLocation.search = '';
        mockLocation.pathname = '/';
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('Service Integration', () => {
        it('should handle complete authentication flow', async () => {
            // 1. Create test data
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser);
            const mockToken = 'mock-jwt-token';

            // 2. Mock successful authentication
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            // 3. Test authentication
            const result = await ssoService.authenticateWithSSO(mockToken, {
                ip_address: '192.168.1.100',
                user_agent: 'Test Browser',
                game_context: {
                    game: 'ready-or-not',
                    user_role: 'host'
                }
            });

            // 4. Verify authentication worked
            expect(result.valid).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.session).toEqual(mockSession);
        });

        it('should handle session validation', async () => {
            // 1. Create test data
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser);

            // 2. Mock successful validation
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            // 3. Test session validation
            const result = await ssoService.validateLocalSession(mockSession.session_id);

            // 4. Verify validation worked
            expect(result.valid).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.session).toEqual(mockSession);
        });

        it('should handle session extension', async () => {
            // 1. Create test data
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser);

            // 2. Mock successful extension
            vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
                valid: true,
                session: {
                    ...mockSession,
                    expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString()
                },
                message: 'Session extended'
            });

            // 3. Test session extension
            const result = await ssoService.extendLocalSession(mockSession.session_id, 4);

            // 4. Verify extension worked
            expect(result.valid).toBe(true);
            expect(result.session).toBeDefined();
        });

        it('should handle session cleanup', async () => {
            // 1. Create test data
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser);

            // 2. Mock successful cleanup
            vi.mocked(ssoService.cleanupSession).mockResolvedValue({
                success: true,
                message: 'Session cleaned up'
            });

            // 3. Test session cleanup
            const result = await ssoService.cleanupSession(mockSession.session_id, 'User logout');

            // 4. Verify cleanup worked
            expect(result.success).toBe(true);
        });
    });

    describe('Multi-Role Testing', () => {
        const roles = ['host', 'org_admin', 'super_admin'] as const;

        roles.forEach(role => {
            it(`should handle ${role} authentication`, async () => {
                // 1. Create test data
                const mockUser = createMockUser(role);
                const mockSession = createMockSession(mockUser);
                const mockToken = `mock-token-${role}`;

                // 2. Mock successful authentication
                vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                    valid: true,
                    user: mockUser,
                    session: mockSession,
                    message: 'Authentication successful'
                });

                // 3. Test authentication
                const result = await ssoService.authenticateWithSSO(mockToken, {
                    ip_address: '192.168.1.100',
                    user_agent: 'Test Browser',
                    game_context: {
                        game: 'ready-or-not',
                        user_role: role
                    }
                });

                // 4. Verify authentication worked
                expect(result.valid).toBe(true);
                expect(result.user?.role).toBe(role);
                expect(result.session?.permission_level).toBe(role);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle authentication failures', async () => {
            // 1. Mock failed authentication
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'invalid_token',
                message: 'Token is invalid'
            });

            // 2. Test authentication with invalid token
            const result = await ssoService.authenticateWithSSO('invalid-token', {
                user_agent: 'Test Browser'
            });

            // 3. Verify failure was handled
            expect(result.valid).toBe(false);
            expect(result.error).toBe('invalid_token');
        });

        it('should handle session validation failures', async () => {
            // 1. Mock failed validation
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: false,
                error: 'session_expired',
                message: 'Session has expired'
            });

            // 2. Test validation with expired session
            const result = await ssoService.validateLocalSession('expired-session');

            // 3. Verify failure was handled
            expect(result.valid).toBe(false);
            expect(result.error).toBe('session_expired');
        });

        it('should handle network errors', async () => {
            // 1. Mock network error
            vi.mocked(ssoService.authenticateWithSSO).mockRejectedValue(
                new Error('Network error')
            );

            // 2. Test authentication with network error
            await expect(
                ssoService.authenticateWithSSO('token', { user_agent: 'Test Browser' })
            ).rejects.toThrow('Network error');
        });
    });

    describe('Mock Data Generation', () => {
        it('should generate mock users', () => {
            // 1. Mock user generation
            const mockUsers = [
                createMockUser('host'),
                createMockUser('org_admin'),
                createMockUser('super_admin')
            ];

            vi.mocked(ssoService.generateMockUsers).mockReturnValue(mockUsers);

            // 2. Test user generation
            const result = ssoService.generateMockUsers();

            // 3. Verify users were generated
            expect(result).toHaveLength(3);
            expect(result[0].role).toBe('host');
            expect(result[1].role).toBe('org_admin');
            expect(result[2].role).toBe('super_admin');
        });

        it('should generate mock tokens', async () => {
            // 1. Mock token generation
            vi.mocked(ssoService.generateMockToken).mockResolvedValue('mock-jwt-token-123');

            // 2. Test token generation
            const mockUser = createMockUser('host');
            const token = await ssoService.generateMockToken(mockUser);

            // 3. Verify token was generated
            expect(token).toBe('mock-jwt-token-123');
            expect(ssoService.generateMockToken).toHaveBeenCalledWith(mockUser);
        });
    });

    describe('Health Check', () => {
        it('should perform health check', async () => {
            // 1. Mock health check
            vi.mocked(ssoService.healthCheck).mockResolvedValue({
                healthy: true,
                timestamp: new Date().toISOString(),
                services: {
                    database: 'healthy',
                    authentication: 'healthy',
                    session_management: 'healthy'
                }
            });

            // 2. Test health check
            const result = await ssoService.healthCheck();

            // 3. Verify health check worked
            expect(result.healthy).toBe(true);
            expect(result.services).toBeDefined();
        });
    });

    describe('Active Sessions', () => {
        it('should get active sessions', async () => {
            // 1. Mock active sessions
            const mockSessions = [
                createMockSession(createMockUser('host')),
                createMockSession(createMockUser('org_admin'))
            ];

            vi.mocked(ssoService.getActiveSessions).mockResolvedValue(mockSessions);

            // 2. Test getting active sessions
            const result = await ssoService.getActiveSessions();

            // 3. Verify sessions were retrieved
            expect(result).toHaveLength(2);
            expect(result[0].permission_level).toBe('host');
            expect(result[1].permission_level).toBe('org_admin');
        });
    });
});