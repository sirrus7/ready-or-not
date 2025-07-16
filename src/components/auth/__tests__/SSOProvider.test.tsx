/**
 * SSOProvider Tests - Fixed Version
 * Comprehensive tests for the SSO authentication context
 *
 * File: src/components/auth/__tests__/SSOProvider.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SSOProvider, useSSO } from '../SSOProvider';
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

// Mock the SessionStorageManager
vi.mock('../SessionStorageManager', () => ({
    SessionStorageManager: {
        saveSession: vi.fn().mockReturnValue({ success: true }),
        loadSession: vi.fn().mockReturnValue(null),
        clearSession: vi.fn(),
        getSessionInfo: vi.fn().mockReturnValue({ hasSession: false })
    },
    getClientIP: vi.fn().mockResolvedValue(null),
    getBrowserInfo: vi.fn().mockReturnValue('Test Browser'),
    formatSessionExpiry: vi.fn().mockReturnValue('2h 30m'),
    formatTime: vi.fn().mockReturnValue('1/1/2023, 12:00:00 PM'),
    hasPermission: vi.fn().mockReturnValue(true),
    hasGameAccess: vi.fn().mockReturnValue(true)
}));

import { SessionStorageManager, getClientIP, getBrowserInfo } from '../SessionStorageManager';

// Mock window.location and localStorage
const mockLocation = {
    href: 'http://localhost:3000',
    search: '',
    pathname: '/'
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

// Helper to create wrapper component
const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
        <SSOProvider>{children}</SSOProvider>
    );
};

// Test data
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

describe('SSOProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
        mockLocation.pathname = '/';

        // Reset mocks to default values
        vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);
        vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValue({ hasSession: false });
        vi.mocked(getClientIP).mockResolvedValue(null);
        vi.mocked(getBrowserInfo).mockReturnValue('Test Browser');
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
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.isLoading).toBe(true);
            expect(result.current.error).toBeNull();

            // Wait for initialization to complete
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
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

            await act(async () => {
                const response = await result.current.login('mock-token');
                expect(response.valid).toBe(true);
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
                expect(result.current.session).toEqual(mockSession);
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should handle authentication failure', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'invalid_token',
                message: 'Invalid token'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await act(async () => {
                await result.current.login('invalid-token');
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
                expect(result.current.error).toBe('Invalid token');
            });
        });

        it('should detect and process token from URL', async () => {
            mockLocation.search = '?sso_token=url-token-123';

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
                expect(ssoService.authenticateWithSSO).toHaveBeenCalledWith(
                    'url-token-123',
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
    });

    describe('Session Management', () => {
        it('should logout successfully', async () => {
            // Set up authenticated state
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await act(async () => {
                await result.current.login('mock-token');
            });

            await act(async () => {
                await result.current.logout();
            });

            expect(ssoService.cleanupSession).toHaveBeenCalledWith('session-123', 'User logout');
            expect(localStorage.removeItem).toHaveBeenCalled();
        });

        it('should extend session successfully', async () => {
            // Set up authenticated state
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Success'
            });

            const extendedSession = { ...mockSession, expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString() };
            vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
                success: true,
                session: extendedSession
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await act(async () => {
                await result.current.login('mock-token');
            });

            await act(async () => {
                const response = await result.current.extendSession(4);
                expect(response.success).toBe(true);
            });
        });

        it('should validate saved session on refresh', async () => {
            const savedSession = {
                version: '1.0',
                session_id: 'session-123',
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            };

            vi.mocked(SessionStorageManager.loadSession).mockReturnValue(savedSession);
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Valid session'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
            });
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

            await act(async () => {
                await result.current.login('mock-token');
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            });

            // org_admin should have host permissions
            expect(result.current.hasPermission('host')).toBe(true);
            // org_admin should have org_admin permissions
            expect(result.current.hasPermission('org_admin')).toBe(true);
            // org_admin should not have super_admin permissions
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

            await act(async () => {
                await result.current.login('mock-token');
            });

            expect(result.current.hasGameAccess('ready-or-not')).toBe(true);
            expect(result.current.hasGameAccess('game-2')).toBe(true);
            expect(result.current.hasGameAccess('game-3')).toBe(false);
        });

        it('should return false for permissions when not authenticated', () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            expect(result.current.hasPermission('host')).toBe(false);
            expect(result.current.hasGameAccess('ready-or-not')).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle authentication errors gracefully', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await act(async () => {
                await result.current.login('test-token');
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Network error');
            });
        });

        it('should clear errors', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Set an error
            await act(async () => {
                await result.current.login('invalid-token');
            });

            // Clear the error
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
                sessionAge: 3600, // 1 hour in seconds
                userEmail: 'test@example.com'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            const sessionInfo = result.current.getSessionInfo();
            expect(sessionInfo.hasSession).toBe(true);
            expect(sessionInfo.userEmail).toBe('test@example.com');
            expect(sessionInfo.sessionAge).toBeGreaterThan(0);
        });

        it('should handle corrupted session data', async () => {
            vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
            });
        });

        it('should handle expired client session', async () => {
            const expiredSession = {
                version: '1.0',
                session_id: 'session-123',
                user: mockUser,
                saved_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
                expires_client_check: new Date(Date.now() - 1000).toISOString()
            };

            vi.mocked(SessionStorageManager.loadSession).mockReturnValue(expiredSession);

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
            });
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

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await act(async () => {
                await result.current.login('mock-token');
            });

            // Verify that interval is set up
            expect(vi.getTimerCount()).toBeGreaterThan(0);

            vi.useRealTimers();
        });
    });
});