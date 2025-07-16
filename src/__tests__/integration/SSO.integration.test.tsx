/**
 * Integration Tests
 * End-to-end tests for the complete SSO authentication flow
 *
 * File: src/__tests__/integration/SSO.integration.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { ssoService } from '../../services/sso-service';
import React from 'react';

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
vi.mock('../../', () => ({
    env: {
        VITE_GLOBAL_GAME_LOADER_URL: 'http://localhost:3001',
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: 'mock-anon-key'
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

// Helper function to create mock users
const createMockUser = (role: 'host' | 'org_admin' | 'super_admin') => ({
    id: `user-${role}`,
    email: `${role}@example.com`,
    full_name: `${role} User`,
    role,
    games: [{ name: 'ready-or-not', permission_level: role }],
    organization_type: role === 'host' ? 'school' : 'district',
    district_info: {
        id: 'district-123',
        name: 'Test District',
        state: 'CA'
    }
});

const createMockSession = (userId: string, role: string) => ({
    session_id: `session-${userId}`,
    user_id: userId,
    email: `${role}@example.com`,
    permission_level: role,
    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    is_active: true,
    game_context: { game: 'ready-or-not' }
});

describe('SSO Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockLocation.search = '';
        mockLocation.pathname = '/';

        // Setup default mocks
        vi.mocked(ssoService.healthCheck).mockResolvedValue({
            healthy: true,
            database: true,
            functions: true,
            message: 'All systems operational',
            timestamp: new Date().toISOString()
        });

        vi.mocked(ssoService.getActiveSessions).mockResolvedValue({
            sessions: []
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('Authentication Flow', () => {
        it('should complete full authentication flow with token in URL', async () => {
            // Setup URL with token
            mockLocation.search = '?sso_token=test-token-123';

            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            render(
                <MemoryRouter initialEntries={['/?sso_token=test-token-123']}>
                    <App />
                </MemoryRouter>
            );

            // Should show loading initially
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            // Wait for authentication to complete
            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Should authenticate and show dashboard
            expect(ssoService.authenticateWithSSO).toHaveBeenCalledWith(
                'test-token-123',
                expect.objectContaining({
                    duration_hours: 8,
                    user_agent: 'Test Browser',
                    game_context: expect.objectContaining({
                        game: 'ready-or-not',
                        version: '2.0',
                        entry_point: 'sso_login'
                    })
                })
            );

            // Should show authenticated content
            expect(screen.getByText('Ready or Not - Dashboard')).toBeInTheDocument();

            // Should clear token from URL
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, expect.any(String), '/');
        });

        it('should handle authentication failure gracefully', async () => {
            mockLocation.search = '?sso_token=invalid-token';

            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'invalid_token',
                message: 'Token is invalid or expired'
            });

            render(
                <MemoryRouter initialEntries={['/?sso_token=invalid-token']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Authentication Error')).toBeInTheDocument();
                expect(screen.getByText('Token is invalid or expired')).toBeInTheDocument();
            });
        });

        it('should restore session from localStorage on app load', async () => {
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            // Setup localStorage with valid session
            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session restored'
            });

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(ssoService.validateLocalSession).toHaveBeenCalledWith(mockSession.session_id);
                expect(screen.getByText('Ready or Not - Dashboard')).toBeInTheDocument();
            });
        });
    });

    describe('Permission-Based Routing', () => {
        it('should allow host to access basic routes', async () => {
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Ready or Not - Dashboard')).toBeInTheDocument();
            });
        });

        it('should deny host access to admin routes', async () => {
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
            });
        });

        it('should allow org_admin to access admin routes', async () => {
            const mockUser = createMockUser('org_admin');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });
        });

        it('should deny org_admin access to super-admin routes', async () => {
            const mockUser = createMockUser('org_admin');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            render(
                <MemoryRouter initialEntries={['/super-admin']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Super Admin Access Required')).toBeInTheDocument();
            });
        });

        it('should allow super_admin to access all routes', async () => {
            const mockUser = createMockUser('super_admin');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            render(
                <MemoryRouter initialEntries={['/super-admin']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
            });
        });
    });

    describe('Session Management', () => {
        it('should handle session expiry', async () => {
            const mockUser = createMockUser('host');
            const expiredSession = {
                ...createMockSession(mockUser.id, mockUser.role),
                expires_at: new Date(Date.now() - 1000).toISOString() // Expired
            };

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: expiredSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: false,
                error: 'session_expired',
                message: 'Session has expired'
            });

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
            });
        });

        it('should auto-extend session when near expiry', async () => {
            vi.useFakeTimers();

            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
                valid: true,
                session: {
                    ...mockSession,
                    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                },
                message: 'Session extended'
            });

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Ready or Not - Dashboard')).toBeInTheDocument();
            });

            // Fast forward 30 minutes to trigger auto-extension check
            vi.advanceTimersByTime(30 * 60 * 1000);

            await waitFor(() => {
                expect(ssoService.extendLocalSession).toHaveBeenCalledWith(mockSession.session_id, 8);
            });

            vi.useRealTimers();
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            mockLocation.search = '?sso_token=test-token';

            vi.mocked(ssoService.authenticateWithSSO).mockRejectedValue(
                new Error('Network error')
            );

            render(
                <MemoryRouter initialEntries={['/?sso_token=test-token']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Authentication Error')).toBeInTheDocument();
                expect(screen.getByText('Failed to authenticate')).toBeInTheDocument();
            });
        });

        it('should handle service unavailable errors', async () => {
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockRejectedValue(
                new Error('Service unavailable')
            );

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Authentication Error')).toBeInTheDocument();
                expect(screen.getByText('Failed to refresh session')).toBeInTheDocument();
            });
        });
    });

    describe('Navigation', () => {
        it('should handle 404 routes correctly', async () => {
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            render(
                <MemoryRouter initialEntries={['/non-existent-route']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('404')).toBeInTheDocument();
                expect(screen.getByText('Page not found')).toBeInTheDocument();
            });
        });

        it('should redirect to login when accessing protected routes without auth', async () => {
            render(
                <MemoryRouter initialEntries={['/session/123']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
            });
        });
    });

    describe('Debug Route', () => {
        it('should show session info on debug route', async () => {
            const mockUser = createMockUser('host');
            const mockSession = createMockSession(mockUser.id, mockUser.role);

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: mockSession.session_id,
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            render(
                <MemoryRouter initialEntries={['/debug/session']}>
                    <App />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Current User Session')).toBeInTheDocument();
                expect(screen.getByText('Service Health')).toBeInTheDocument();
            });
        });
    });
});