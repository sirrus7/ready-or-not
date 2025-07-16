/**
 * Fixed SSOProvider Tests - Comprehensive Fix
 * Addresses all failing test issues
 *
 * File: src/components/auth/__tests__/SSOProvider.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SSOProvider, useSSO } from '../SSOProvider';
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

// Mock the SessionStorageManager
vi.mock('../SessionStorageManager', () => ({
    SessionStorageManager: {
        saveSession: vi.fn().mockReturnValue({ success: true }),
        loadSession: vi.fn().mockReturnValue(null),
        clearSession: vi.fn(),
        getSessionInfo: vi.fn().mockReturnValue({ hasSession: false })
    },
    getClientIP: vi.fn().mockResolvedValue('192.168.1.100'),
    getBrowserInfo: vi.fn().mockReturnValue('Test Browser'),
    formatSessionExpiry: vi.fn().mockReturnValue('2h 30m'),
    formatTime: vi.fn().mockReturnValue('1/1/2023, 12:00:00 PM'),
    hasPermission: vi.fn().mockReturnValue(true),
    hasGameAccess: vi.fn().mockReturnValue(true)
}));

import { SessionStorageManager, getClientIP, getBrowserInfo } from '../SessionStorageManager';

// =====================================================
// GLOBAL MOCKS
// =====================================================

// Mock window.location
const mockLocation = {
    href: 'http://localhost:3000',
    search: '',
    pathname: '/',
    origin: 'http://localhost:3000'
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

// Mock window.screen
Object.defineProperty(window, 'screen', {
    value: { width: 1920, height: 1080 },
    writable: true
});

// Mock Intl properly
const mockDateTimeFormat = vi.fn(() => ({
    resolvedOptions: vi.fn(() => ({ timeZone: 'America/New_York' })),
    format: vi.fn((date) => date.toLocaleString())
}));

Object.defineProperty(global, 'Intl', {
    value: {
        DateTimeFormat: mockDateTimeFormat,
        NumberFormat: vi.fn(),
        Collator: vi.fn(),
        PluralRules: vi.fn(),
        RelativeTimeFormat: vi.fn(),
        ListFormat: vi.fn(),
        Locale: vi.fn(),
        Segmenter: vi.fn(),
        getCanonicalLocales: vi.fn(),
        supportedValuesOf: vi.fn()
    },
    writable: true
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
    value: {
        userAgent: 'Test Browser Agent'
    },
    writable: true
});

// =====================================================
// TEST DATA
// =====================================================

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'org_admin' as const,
    games: [
        { name: 'ready-or-not', permission_level: 'host' as const },
        { name: 'game-2', permission_level: 'host' as const }
    ]
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

const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
        <SSOProvider>{children}</SSOProvider>
    );
};

const waitForInitialization = async (result: any, timeout = 2000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (result.current && result.current.isLoading === false) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Timeout waiting for initialization. Current state: ${JSON.stringify(result.current)}`);
};

// =====================================================
// TESTS
// =====================================================

describe('SSOProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();

        // Reset location
        mockLocation.search = '';
        mockLocation.pathname = '/';
        mockLocation.href = 'http://localhost:3000';

        // Reset mocks to default values
        vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);
        vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValue({ hasSession: false });
        vi.mocked(getClientIP).mockResolvedValue('192.168.1.100');
        vi.mocked(getBrowserInfo).mockReturnValue('Test Browser');

        // Reset service mocks
        vi.mocked(ssoService.authenticateWithSSO).mockReset();
        vi.mocked(ssoService.validateLocalSession).mockReset();
        vi.mocked(ssoService.extendLocalSession).mockReset();
        vi.mocked(ssoService.cleanupSession).mockReset();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe('Initial State', () => {
        it('should initialize with default values', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Initially should be loading
            expect(result.current).toBeDefined();
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.isLoading).toBe(true);
            expect(result.current.error).toBeNull();

            // Wait for initialization to complete
            await waitForInitialization(result);

            expect(result.current.isLoading).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
        });

        it('should throw error when used outside provider', () => {
            expect(() => {
                renderHook(() => useSSO());
            }).toThrow('useSSO must be used within an SSOProvider');
        });
    });

    describe('Authentication Flow', () => {
        it('should authenticate successfully with valid token', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                const response = await result.current.login('mock-token');
                expect(response.valid).toBe(true);
            });

            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.session).toEqual(mockSession);
        });

        it('should handle authentication failure', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'invalid_token',
                message: 'Token is invalid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                const response = await result.current.login('invalid-token');
                expect(response.valid).toBe(false);
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.error).toBe('Token is invalid');
        });

        it('should detect and process token from URL', async () => {
            mockLocation.search = '?sso_token=mock-token';
            mockLocation.href = 'http://localhost:3000?sso_token=mock-token';

            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            }, { timeout: 3000 });

            expect(ssoService.authenticateWithSSO).toHaveBeenCalledWith(
                'mock-token',
                expect.objectContaining({
                    duration_hours: 8,
                    game_context: expect.objectContaining({
                        entry_point: 'sso_login',
                        game: 'ready-or-not',
                        version: '2.0'
                    }),
                    user_agent: 'Test Browser'
                })
            );
        });
    });

    describe('Session Management', () => {
        it('should logout successfully', async () => {
            // Set up authenticated state first
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            // Login first
            await act(async () => {
                await result.current.login('mock-token');
            });

            // Now logout
            await act(async () => {
                await result.current.logout();
            });

            // Verify logout actions
            expect(ssoService.cleanupSession).toHaveBeenCalledWith('session-123', 'User logout');
            expect(SessionStorageManager.clearSession).toHaveBeenCalled();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
        });

        it('should extend session successfully', async () => {
            // Set up authenticated state
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const extendedSession = {
                ...mockSession,
                expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString()
            };

            vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
                success: true,
                session: extendedSession
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                await result.current.login('mock-token');
            });

            await act(async () => {
                const response = await result.current.extendSession(4);
                expect(response.success).toBe(true);
            });

            expect(result.current.session?.expires_at).toBe(extendedSession.expires_at);
        });

        it('should validate saved session on refresh', async () => {
            const savedSession = {
                session_id: 'session-123',
                user: mockUser
            };

            vi.mocked(SessionStorageManager.loadSession).mockReturnValue(savedSession);
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            }, { timeout: 3000 });

            expect(result.current.user).toEqual(mockUser);
            expect(result.current.session).toEqual(mockSession);
        });
    });

    describe('Permission Helpers', () => {
        it('should check permissions correctly', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                await result.current.login('mock-token');
            });

            expect(result.current.hasPermission('host')).toBe(true);
            expect(result.current.hasPermission('org_admin')).toBe(true);
            expect(result.current.hasPermission('super_admin')).toBe(false);
        });

        it('should check game access correctly', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                await result.current.login('mock-token');
            });

            expect(result.current.hasGameAccess('ready-or-not')).toBe(true);
            expect(result.current.hasGameAccess('game-2')).toBe(true);
            expect(result.current.hasGameAccess('nonexistent-game')).toBe(false);
        });

        it('should return false for permissions when not authenticated', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            expect(result.current.hasPermission('host')).toBe(false);
            expect(result.current.hasGameAccess('ready-or-not')).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle authentication errors gracefully', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockRejectedValue(
                new Error('Network error')
            );

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                const response = await result.current.login('mock-token');
                expect(response.valid).toBe(false);
                expect(response.error).toBe('authentication_error');
            });

            expect(result.current.error).toBe('Network error');
        });

        it('should clear errors', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                await result.current.login('invalid-token');
            });

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Session Storage', () => {
        it('should get session info correctly', async () => {
            vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValue({
                hasSession: true,
                sessionAge: 3600,
                userEmail: 'test@example.com'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            const sessionInfo = result.current.getSessionInfo();
            expect(sessionInfo.hasSession).toBe(true);
            expect(sessionInfo.userEmail).toBe('test@example.com');
        });

        it('should handle corrupted session data', async () => {
            vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
        });

        it('should handle expired client session', async () => {
            vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: false,
                error: 'session_expired',
                message: 'Session expired'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            expect(result.current.isAuthenticated).toBe(false);
        });
    });

    describe('Automatic Session Management', () => {
        it('should set up session refresh interval', async () => {
            vi.useFakeTimers();

            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
                success: true,
                session: mockSession
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForInitialization(result);

            await act(async () => {
                await result.current.login('mock-token');
            });

            // Fast-forward time by 30 minutes (session refresh interval)
            act(() => {
                vi.advanceTimersByTime(30 * 60 * 1000);
            });

            // Should have extended the session
            await waitFor(() => {
                expect(ssoService.extendLocalSession).toHaveBeenCalled();
            });

            vi.useRealTimers();
        });
    });
});