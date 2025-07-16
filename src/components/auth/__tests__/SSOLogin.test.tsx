/**
 * SSOLogin Component Tests - Fixed Version v2
 * Addresses text matching and rendering issues
 *
 * File: src/components/auth/__tests__/SSOLogin.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SSOLogin, ProtectedRoute, SessionInfo } from '../SSOLogin';
import { ssoService } from '../../../services/sso-service';
import React from 'react';

// =====================================================
// MOCK SETUP
// =====================================================

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
vi.mock('../SSOProvider', () => ({
    useSSO: () => mockUseSSO()
}));

// Mock SessionStorageManager utilities
vi.mock('../SessionStorageManager', () => ({
    SessionStorageManager: {
        getSessionInfo: vi.fn().mockReturnValue({
            hasSession: false,
            sessionAge: 0,
            userEmail: undefined
        })
    },
    getClientIP: vi.fn().mockResolvedValue('192.168.1.100'),
    getBrowserInfo: vi.fn().mockReturnValue('Test Browser'),
    formatSessionExpiry: vi.fn().mockReturnValue('2h 30m'),
    formatTime: vi.fn().mockReturnValue('1/1/2023, 12:00:00 PM')
}));

// Mock environment variable
Object.defineProperty(import.meta, 'env', {
    value: {
        VITE_GLOBAL_GAME_LOADER_URL: 'http://localhost:3001'
    },
    writable: true
});

// =====================================================
// GLOBAL MOCKS
// =====================================================

// Mock window.location
const mockLocation = {
    href: 'http://localhost:3000',
    search: '',
    pathname: '/',
    origin: 'http://localhost:3000',
    assign: vi.fn()
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

// Mock window.history
const mockHistory = {
    replaceState: vi.fn()
};

Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true
});

// =====================================================
// TEST DATA
// =====================================================

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'host' as const,
    games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
};

const mockSession = {
    session_id: 'session-123',
    user_id: 'user-123',
    email: 'test@example.com',
    permission_level: 'host',
    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    is_active: true,
    game_context: {}
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const createDefaultMockReturn = () => ({
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

// =====================================================
// TESTS
// =====================================================

describe('SSOLogin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        mockLocation.href = 'http://localhost:3000';

        // Default mock return value
        mockUseSSO.mockReturnValue(createDefaultMockReturn());
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
            ...createDefaultMockReturn(),
            isLoading: true
        });

        render(<SSOLogin />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle Global Game Loader redirect', () => {
        render(<SSOLogin />);

        const loginButton = screen.getByText('Login with Global Game Loader');
        fireEvent.click(loginButton);

        expect(mockLocation.href).toBe('http://localhost:3001/auth/sso-login?return_url=http%3A%2F%2Flocalhost%3A3000&game=ready-or-not');
    });

    it('should show error message when error exists', () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            error: 'Authentication failed'
        });

        render(<SSOLogin />);

        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    });

    it('should handle token authentication failure', async () => {
        mockLocation.search = '?sso_token=invalid-token';

        const mockLogin = vi.fn().mockResolvedValue({
            valid: false,
            error: 'invalid_token',
            message: 'Token is invalid'
        });

        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            login: mockLogin,
            error: 'Token is invalid'
        });

        render(<SSOLogin />);

        await waitFor(() => {
            expect(screen.getByText('Authentication Error')).toBeInTheDocument();
            expect(screen.getByText('Token is invalid')).toBeInTheDocument();
        });
    });

    it('should disable button when redirecting', () => {
        render(<SSOLogin />);

        const loginButton = screen.getByText('Login with Global Game Loader');
        fireEvent.click(loginButton);

        expect(screen.getByText('Redirecting...')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should process token from URL on mount', async () => {
        mockLocation.search = '?sso_token=valid-token';
        const mockLogin = vi.fn();

        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            login: mockLogin,
            isAuthenticated: false,
            isLoading: false
        });

        render(<SSOLogin />);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('valid-token');
        });
    });

    it('should show authenticated state when user is logged in', () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true
        });

        render(<SSOLogin />);

        expect(screen.getByText('Welcome!')).toBeInTheDocument();
        expect(screen.getByText('You are logged in as test@example.com')).toBeInTheDocument();
    });
});

describe('ProtectedRoute', () => {
    const TestComponent = () => <div>Protected Content</div>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSSO.mockReturnValue(createDefaultMockReturn());
    });

    it('should show loading when loading', () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
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
            ...createDefaultMockReturn(),
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

        expect(screen.getByText('Ready or Not')).toBeInTheDocument();
        expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('should show content when authenticated with correct permissions', () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true,
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
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true,
            hasPermission: vi.fn().mockReturnValue(false),
            hasGameAccess: vi.fn().mockReturnValue(true)
        });

        render(
            <ProtectedRoute requiredRole="super_admin">
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText('You need')).toBeInTheDocument();
        expect(screen.getByText('super_admin')).toBeInTheDocument();
        expect(screen.getByText('permissions to access this resource.')).toBeInTheDocument();
    });

    it('should show game access denied when lacking game access', () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true,
            hasPermission: vi.fn().mockReturnValue(true),
            hasGameAccess: vi.fn().mockReturnValue(false)
        });

        render(
            <ProtectedRoute requiredGame="other-game">
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Game Access Required')).toBeInTheDocument();
        expect(screen.getByText('You need permission to access the')).toBeInTheDocument();
        expect(screen.getByText('other-game')).toBeInTheDocument();
        expect(screen.getByText('game.')).toBeInTheDocument();
    });

    it('should use custom fallback component', () => {
        const CustomFallback = () => <div>Custom Login</div>;

        render(
            <ProtectedRoute fallback={<CustomFallback />}>
                <TestComponent />
            </ProtectedRoute>
        );

        expect(screen.getByText('Custom Login')).toBeInTheDocument();
    });

    it('should use custom loading component', () => {
        const CustomLoading = () => <div>Custom Loading</div>;

        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
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
        vi.clearAllMocks();

        // Mock ssoService methods
        vi.mocked(ssoService.healthCheck).mockResolvedValue({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });

        vi.mocked(ssoService.getActiveSessions).mockResolvedValue([
            {
                email: 'user1@example.com',
                created_at: new Date().toISOString()
            }
        ]);
    });

    it('should show not authenticated message when not authenticated', () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            isAuthenticated: false
        });

        render(<SessionInfo />);

        expect(screen.getByText('Session Info')).toBeInTheDocument();
        expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });

    it('should display user session information when authenticated', async () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            session: mockSession,
            isAuthenticated: true
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Current User Session')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });
    });

    it('should display session details', async () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            session: mockSession,
            isAuthenticated: true
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Session Details')).toBeInTheDocument();
            expect(screen.getByText('session-123')).toBeInTheDocument();
        });
    });

    it('should display service health information', async () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Service Health')).toBeInTheDocument();
            expect(screen.getByText('healthy')).toBeInTheDocument();
        });
    });

    it('should refresh debug info when refresh button is clicked', async () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true
        });

        render(<SessionInfo />);

        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);

        await waitFor(() => {
            expect(ssoService.healthCheck).toHaveBeenCalled();
            expect(ssoService.getActiveSessions).toHaveBeenCalled();
        });
    });

    it('should handle storage information display', async () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Storage Information')).toBeInTheDocument();
        });
    });

    it('should display active sessions', async () => {
        mockUseSSO.mockReturnValue({
            ...createDefaultMockReturn(),
            user: mockUser,
            isAuthenticated: true
        });

        render(<SessionInfo />);

        await waitFor(() => {
            expect(screen.getByText('Active Sessions (1)')).toBeInTheDocument();
            expect(screen.getByText('user1@example.com')).toBeInTheDocument();
        });
    });
});