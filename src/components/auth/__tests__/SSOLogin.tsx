/**
 * SSOLogin Component Tests
 * Tests for login components and protected routes
 *
 * File: src/components/auth/__tests__/SSOLogin.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SSOLogin, ProtectedRoute, SessionInfo } from '../SSOLogin';
import { ssoService } from '../../../services/sso-service';
import React from 'react';

// Mock the SSO service
vi.mock('../../../services/sso-service', () => ({
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

// Mock useSSO hook
const mockUseSSO = vi.fn();
vi.mock('../SSOProvider', async () => {
    const actual = await vi.importActual('../SSOProvider');
    return {
        ...actual,
        useSSO: () => mockUseSSO()
    };
});

// Mock environment variable
vi.mock('../../', () => ({
    env: {
        VITE_GLOBAL_GAME_LOADER_URL: 'http://localhost:3001'
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

describe('SSOLogin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        mockUseSSO.mockReturnValue({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: vi.fn(),
            logout: vi.fn(),
            refreshSession: vi.fn(),
            extendSession: vi.fn(),
            hasPermission: vi.fn(),
            hasGameAccess: vi.fn(),
            getSessionInfo: vi.fn(),
            clearError: vi.fn()
        });
    });

    it('should render login form when not authenticated', () => {
        render(<SSOLogin />);

        expect(screen.getByText('Ready or Not')).toBeInTheDocument();
        expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
        expect(screen.getByText('Login with Global Game Loader')).toBeInTheDocument();
        expect(screen.getByText('Please log in through the Global Game Loader to access this game')).toBeInTheDocument();
    });

    it('should show loading state when loading', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isLoading: true
        });

        render(<SSOLogin />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle Global Game Loader redirect', () => {
        const mockLogin = vi.fn();
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            login: mockLogin
        });

        render(<SSOLogin />);

        const loginButton = screen.getByText('Login with Global Game Loader');
        fireEvent.click(loginButton);

        expect(mockLocation.href).toBe('http://localhost:3001/auth/sso-login?return_url=http%3A%2F%2Flocalhost%3A3000&game=ready-or-not');
    });

    it('should show error message when error exists', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            error: 'Authentication failed'
        });

        render(<SSOLogin />);

        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    });

    it('should process token from URL on mount', async () => {
        mockLocation.search = '?sso_token=test-token-123';

        const mockLogin = vi.fn().mockResolvedValue({
            valid: true,
            user: { id: 'user-123', email: 'test@example.com' },
            session: { session_id: 'session-123' }
        });

        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            login: mockLogin
        });

        render(<SSOLogin />);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test-token-123');
        });
    });

    it('should handle token authentication failure', async () => {
        mockLocation.search = '?sso_token=invalid-token';

        const mockLogin = vi.fn().mockResolvedValue({
            valid: false,
            error: 'invalid_token',
            message: 'Token is invalid'
        });

        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            login: mockLogin
        });

        render(<SSOLogin />);

        await waitFor(() => {
            expect(screen.getByText('Token is invalid')).toBeInTheDocument();
        });
    });

    it('should disable button when redirecting', () => {
        render(<SSOLogin />);

        const loginButton = screen.getByText('Login with Global Game Loader');
        fireEvent.click(loginButton);

        // Button should be disabled and show redirecting state
        expect(loginButton).toBeDisabled();
        expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    });
});

describe('ProtectedRoute', () => {
    const TestComponent = () => <div>Protected Content</div>;

    beforeEach(() => {
        mockUseSSO.mockReturnValue({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            login: vi.fn(),
            logout: vi.fn(),
            refreshSession: vi.fn(),
            extendSession: vi.fn(),
            hasPermission: vi.fn(),
            hasGameAccess: vi.fn(),
            getSessionInfo: vi.fn(),
            clearError: vi.fn()
        });
    });

    it('should show loading when loading', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isLoading: true
        });

        render(
            <ProtectedRoute>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error when error exists', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            error: 'Network error'
        });

        render(
            <ProtectedRoute>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should show login when not authenticated', () => {
        render(
            <ProtectedRoute>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('should show content when authenticated with correct permissions', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            hasPermission: vi.fn().mockReturnValue(true),
            hasGameAccess: vi.fn().mockReturnValue(true)
        });

        render(
            <ProtectedRoute>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show access denied when lacking permissions', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            hasPermission: vi.fn().mockReturnValue(false),
            hasGameAccess: vi.fn().mockReturnValue(true)
        });

        render(
            <ProtectedRoute requiredRole="org_admin">
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('should show game access denied when lacking game access', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            hasPermission: vi.fn().mockReturnValue(true),
            hasGameAccess: vi.fn().mockReturnValue(false)
        });

        render(
            <ProtectedRoute requiredGame="other-game">
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Game Access Required')).toBeInTheDocument();
        expect(screen.getByText('You need permission to access the other-game game.')).toBeInTheDocument();
    });

    it('should use custom fallback component', () => {
        const CustomFallback = () => <div>Custom Access Denied</div>;

        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            hasPermission: vi.fn().mockReturnValue(false),
            hasGameAccess: vi.fn().mockReturnValue(true)
        });

        render(
            <ProtectedRoute fallback={<CustomFallback />}>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
    });

    it('should use custom loading component', () => {
        const CustomLoading = () => <div>Custom Loading</div>;

        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isLoading: true
        });

        render(
            <ProtectedRoute loadingComponent={<CustomLoading />}>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    });
});

describe('SessionInfo', () => {
    beforeEach(() => {
        vi.mocked(ssoService.getActiveSessions).mockResolvedValue({
            sessions: [
                {
                    session_id: 'session-1',
                    user_id: 'user-1',
                    email: 'user1@example.com',
                    permission_level: 'host',
                    expires_at: new Date(Date.now() + 3600000).toISOString(),
                    last_activity: new Date().toISOString(),
                    is_active: true,
                    game_context: {}
                }
            ]
        });

        vi.mocked(ssoService.healthCheck).mockResolvedValue({
            healthy: true,
            database: true,
            functions: true,
            message: 'All systems operational',
            timestamp: new Date().toISOString()
        });
    });

    it('should show not authenticated message when not authenticated', () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: false
        });

        render(<SessionInfo />);

        expect(screen.getByText('Not authenticated')).toBeInTheDocument();
        expect(screen.getByText('Please log in to view session information')).toBeInTheDocument();
    });

    it('should display user session information when authenticated', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'org_admin',
            organization_type: 'district',
            games: [
                { name: 'ready-or-not', permission_level: 'org_admin' }
            ],
            district_info: {
                id: 'district-123',
                name: 'Test District',
                state: 'CA'
            }
        };

        const mockSession = {
            session_id: 'session-123',
            user_id: 'user-123',
            email: 'test@example.com',
            permission_level: 'org_admin',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            is_active: true,
            game_context: {}
        };

        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: mockUser,
            session: mockSession,
            getSessionInfo: vi.fn().mockReturnValue({
                hasSession: true,
                sessionAge: 30,
                userEmail: 'test@example.com'
            })
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Current User Session')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
            expect(screen.getByText('Test User')).toBeInTheDocument();
            expect(screen.getByText('org_admin')).toBeInTheDocument();
            expect(screen.getByText('district')).toBeInTheDocument();
        });
    });

    it('should display session details', async () => {
        const mockSession = {
            session_id: 'session-123',
            user_id: 'user-123',
            email: 'test@example.com',
            permission_level: 'host',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            is_active: true,
            game_context: {}
        };

        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            session: mockSession,
            getSessionInfo: vi.fn().mockReturnValue({ hasSession: true })
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Session Details')).toBeInTheDocument();
            expect(screen.getByText('session-123')).toBeInTheDocument();
            expect(screen.getByText('Active')).toBeInTheDocument();
        });
    });

    it('should display service health information', async () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            getSessionInfo: vi.fn().mockReturnValue({ hasSession: true })
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Service Health')).toBeInTheDocument();
            expect(screen.getByText('All systems operational')).toBeInTheDocument();
            expect(screen.getByText('Connected')).toBeInTheDocument();
            expect(screen.getByText('Working')).toBeInTheDocument();
        });
    });

    it('should display active sessions', async () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            getSessionInfo: vi.fn().mockReturnValue({ hasSession: true })
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Active Sessions (1)')).toBeInTheDocument();
            expect(screen.getByText('user1@example.com')).toBeInTheDocument();
            expect(screen.getByText('host')).toBeInTheDocument();
        });
    });

    it('should refresh debug info when refresh button is clicked', async () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            getSessionInfo: vi.fn().mockReturnValue({ hasSession: true })
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Refresh')).toBeInTheDocument();
        });

        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);

        expect(ssoService.getActiveSessions).toHaveBeenCalledTimes(2);
        expect(ssoService.healthCheck).toHaveBeenCalledTimes(2);
    });

    it('should handle storage information display', async () => {
        mockUseSSO.mockReturnValue({
            ...mockUseSSO(),
            isAuthenticated: true,
            user: { id: 'user-123', email: 'test@example.com', role: 'host' },
            getSessionInfo: vi.fn().mockReturnValue({
                hasSession: true,
                sessionAge: 45,
                userEmail: 'test@example.com'
            })
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Storage Information')).toBeInTheDocument();
            expect(screen.getByText('Yes')).toBeInTheDocument();
            expect(screen.getByText('45 minutes')).toBeInTheDocument();
        });
    });
});