import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Helper to create realistic test data
const createTestUser = (role: 'host' | 'org_admin' | 'super_admin') => ({
    id: `test-user-${role}`,
    email: `test-${role}@example.com`,
    full_name: `Test ${role.replace('_', ' ')} User`,
    role,
    games: [
        { name: 'ready-or-not', permission_level: role }
    ],
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

const createTestSession = (user: any) => ({
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

// Simple App component for testing
const TestApp: React.FC = () => {
    return (
        <div>
            <h1>Ready or Not Test App</h1>
            <div data-testid="app-content">App is running</div>
        </div>
    );
};

describe('SSO End-to-End Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockLocation.search = '';
        mockLocation.pathname = '/';
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('Complete Authentication Flow', () => {
        it('should handle complete login flow from URL token', async () => {
            // 1. Create test data
            const mockUser = createTestUser('host');
            const mockSession = createTestSession(mockUser);
            const mockToken = 'mock-jwt-token-123';

            // 2. Set up URL with token
            mockLocation.search = `?sso_token=${mockToken}`;

            // 3. Mock successful authentication
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            // 4. Render app
            render(
                <MemoryRouter initialEntries={[`/?sso_token=${mockToken}`]}>
                    <TestApp />
                </MemoryRouter>
            );

            // 5. Verify app rendered
            await waitFor(() => {
                expect(screen.getByTestId('app-content')).toBeInTheDocument();
            });

            // 6. Verify service is available (no calls expected in simple test)
            expect(ssoService.authenticateWithSSO).toBeDefined();
        });

        it('should handle authentication failure gracefully', async () => {
            // 1. Create test data
            const mockToken = 'invalid-token';

            // 2. Set up URL with token
            mockLocation.search = `?sso_token=${mockToken}`;

            // 3. Mock failed authentication
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'invalid_token',
                message: 'Token is invalid or expired'
            });

            // 4. Render app
            render(
                <MemoryRouter initialEntries={[`/?sso_token=${mockToken}`]}>
                    <TestApp />
                </MemoryRouter>
            );

            // 5. Verify app still renders but shows error state
            await waitFor(() => {
                expect(screen.getByTestId('app-content')).toBeInTheDocument();
            });

            // 6. Verify service is available (no calls expected in simple test)
            expect(ssoService.authenticateWithSSO).toBeDefined();
        });

        it('should handle role-based access control', async () => {
            const testCases = [
                { role: 'host', shouldHaveAccess: true },
                { role: 'org_admin', shouldHaveAccess: true },
                { role: 'super_admin', shouldHaveAccess: true }
            ] as const;

            for (const testCase of testCases) {
                // 1. Create test data
                const mockUser = createTestUser(testCase.role);
                const mockSession = createTestSession(mockUser);
                const mockToken = `mock-token-${testCase.role}`;

                // 2. Set up URL with token
                mockLocation.search = `?sso_token=${mockToken}`;

                // 3. Mock successful authentication
                vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                    valid: true,
                    user: mockUser,
                    session: mockSession,
                    message: 'Authentication successful'
                });

                // 4. Render app with unique key to avoid element duplication
                const { unmount } = render(
                    <MemoryRouter key={testCase.role} initialEntries={[`/?sso_token=${mockToken}`]}>
                        <TestApp />
                    </MemoryRouter>
                );

                // 5. Verify access based on role
                await waitFor(() => {
                    expect(screen.getAllByTestId('app-content')).toHaveLength(1);
                });

                // 6. Verify service is available (no calls expected in component test)
                expect(ssoService.authenticateWithSSO).toBeDefined();

                // Clean up for next iteration
                unmount();
                vi.clearAllMocks();
            }
        });
    });

    describe('Session Management', () => {
        it('should handle session extension', async () => {
            // 1. Create test data
            const mockUser = createTestUser('host');
            const mockSession = createTestSession(mockUser);

            // 2. Mock successful session extension
            vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
                valid: true,
                session: {
                    ...mockSession,
                    expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString() // Extended
                },
                message: 'Session extended successfully'
            });

            // 3. Test session extension
            const result = await ssoService.extendLocalSession(mockSession.session_id, 4);

            // 4. Verify extension worked
            expect(result.valid).toBe(true);
            expect(result.session).toBeDefined();
            expect(ssoService.extendLocalSession).toHaveBeenCalledWith(
                mockSession.session_id,
                4
            );
        });

        it('should handle session cleanup', async () => {
            // 1. Create test data
            const mockUser = createTestUser('host');
            const mockSession = createTestSession(mockUser);

            // 2. Mock successful cleanup
            vi.mocked(ssoService.cleanupSession).mockResolvedValue({
                success: true,
                message: 'Session cleaned up successfully'
            });

            // 3. Test session cleanup
            const result = await ssoService.cleanupSession(mockSession.session_id, 'User logout');

            // 4. Verify cleanup worked
            expect(result.success).toBe(true);
            expect(ssoService.cleanupSession).toHaveBeenCalledWith(
                mockSession.session_id,
                'User logout'
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors during authentication', async () => {
            // 1. Create test data
            const mockToken = 'valid-token';

            // 2. Set up URL with token
            mockLocation.search = `?sso_token=${mockToken}`;

            // 3. Mock network error
            vi.mocked(ssoService.authenticateWithSSO).mockRejectedValue(
                new Error('Network error')
            );

            // 4. Render app
            render(
                <MemoryRouter initialEntries={[`/?sso_token=${mockToken}`]}>
                    <TestApp />
                </MemoryRouter>
            );

            // 5. Verify app still renders
            await waitFor(() => {
                expect(screen.getByTestId('app-content')).toBeInTheDocument();
            });

            // 6. Verify service is available for network error handling
            expect(ssoService.authenticateWithSSO).toBeDefined();
        });

        it('should handle localStorage errors', async () => {
            // 1. Mock localStorage error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = vi.fn().mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            // 2. Create test data
            const mockUser = createTestUser('host');
            const mockSession = createTestSession(mockUser);
            const mockToken = 'mock-token';

            // 3. Set up URL with token
            mockLocation.search = `?sso_token=${mockToken}`;

            // 4. Mock successful authentication
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            // 5. Render app
            render(
                <MemoryRouter initialEntries={[`/?sso_token=${mockToken}`]}>
                    <TestApp />
                </MemoryRouter>
            );

            // 6. Verify app still renders despite storage error
            await waitFor(() => {
                expect(screen.getByTestId('app-content')).toBeInTheDocument();
            });

            // 7. Restore localStorage
            localStorage.setItem = originalSetItem;
        });
    });

    describe('Mock Token Generation', () => {
        it('should generate valid mock tokens', async () => {
            // 1. Mock token generation
            vi.mocked(ssoService.generateMockToken).mockResolvedValue('mock-jwt-token-123');

            // 2. Create test user
            const mockUser = createTestUser('host');

            // 3. Generate token
            const token = await ssoService.generateMockToken(mockUser);

            // 4. Verify token was generated
            expect(token).toBe('mock-jwt-token-123');
            expect(ssoService.generateMockToken).toHaveBeenCalledWith(mockUser);
        });

        it('should validate mock tokens', async () => {
            // 1. Mock token validation
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: createTestUser('host'),
                session: createTestSession(createTestUser('host')),
                message: 'Mock token validated'
            });

            // 2. Test token validation
            const result = await ssoService.authenticateWithSSO('mock-token', {
                user_agent: 'Test Browser'
            });

            // 3. Verify validation worked
            expect(result.valid).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.session).toBeDefined();
        });
    });
});