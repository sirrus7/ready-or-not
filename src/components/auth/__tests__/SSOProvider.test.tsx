/**
 * Complete Fixed SSOProvider Tests - All Mock Isolation Issues Resolved
 * Replace your entire src/components/auth/__tests__/SSOProvider.test.tsx with this file
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SSOProvider, useSSO } from '../SSOProvider';
import { ssoService } from '../../../services/sso-service';
import React from 'react';

// =====================================================
// MOCK SETUP - VITEST COMPATIBLE
// =====================================================

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

vi.mock('../SessionStorageManager', () => ({
    SessionStorageManager: {
        saveSession: vi.fn(),
        loadSession: vi.fn(),
        clearSession: vi.fn(),
        getSessionInfo: vi.fn()
    },
    getClientIP: vi.fn(),
    getBrowserInfo: vi.fn(),
    formatSessionExpiry: vi.fn().mockReturnValue('2h 30m'),
    formatTime: vi.fn().mockReturnValue('1/1/2023, 12:00:00 PM')
}));

import { SessionStorageManager, getClientIP, getBrowserInfo } from '../SessionStorageManager';

// Mock window.location
const mockLocation = {
    search: '',
    pathname: '/',
    href: 'http://localhost:3000'
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

// =====================================================
// TEST DATA
// =====================================================

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
    role: 'host' as const,
    organization_id: 'org-123',
    organization_type: 'school' as const,
    games: [
        { name: 'ready-or-not', permission_level: 'host' as const }
    ],
    school_info: {
        id: 'school-123',
        name: 'Test School',
        district_id: 'district-123',
        district_name: 'Test District'
    },
    metadata: {}
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
    game_context: {
        game: 'ready-or-not',
        role: 'host'
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <SSOProvider>{children}</SSOProvider>
);

const waitForReady = async (result: { current: ReturnType<typeof useSSO> }) => {
    await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });
};

// =====================================================
// AGGRESSIVE MOCK RESET HELPER
// =====================================================

const setupCleanMocks = () => {
    // AGGRESSIVE: Clear, reset, and restore all mocks
    vi.clearAllMocks();
    vi.resetAllMocks();

    // Reset location
    mockLocation.search = '';
    mockLocation.pathname = '/';
    mockLocation.href = 'http://localhost:3000';

    // COMPLETELY reset each mock individually
    vi.mocked(SessionStorageManager.loadSession).mockReset();
    vi.mocked(SessionStorageManager.getSessionInfo).mockReset();
    vi.mocked(getClientIP).mockReset();
    vi.mocked(getBrowserInfo).mockReset();
    vi.mocked(SessionStorageManager.saveSession).mockReset();

    vi.mocked(ssoService.authenticateWithSSO).mockReset();
    vi.mocked(ssoService.validateLocalSession).mockReset();
    vi.mocked(ssoService.extendLocalSession).mockReset();
    vi.mocked(ssoService.cleanupSession).mockReset();

    // Set up fresh default mocks
    vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);
    vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValue({ hasSession: false });
    vi.mocked(getClientIP).mockResolvedValue('192.168.1.100');
    vi.mocked(getBrowserInfo).mockReturnValue('Test Browser');
    vi.mocked(SessionStorageManager.saveSession).mockReturnValue({ success: true });

    // NO DEFAULT SERVICE MOCKS - Let each test set its own
};

// =====================================================
// TESTS
// =====================================================

describe('SSOProvider', () => {
    beforeEach(() => {
        setupCleanMocks();
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('Initial State', () => {
        it('should initialize with default values', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should throw error when used outside provider', () => {
            expect(() => {
                renderHook(() => useSSO());
            }).toThrow('useSSO must be used within an SSOProvider');
        });
    });

    describe('Authentication Flow', () => {
        it('should authenticate successfully with valid token', async () => {
            // AGGRESSIVE: Reset and set fresh mock
            vi.mocked(ssoService.authenticateWithSSO).mockReset();
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Perform authentication
            let response;
            await act(async () => {
                response = await result.current.login('mock-token');
            });

            // Check response
            expect(response.valid).toBe(true);
            expect(response.user).toEqual(mockUser);

            // Wait for state to update
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
                expect(result.current.session).toEqual(mockSession);
            }, { timeout: 3000 });
        });

        it('should handle authentication failure', async () => {
            // AGGRESSIVE: Reset and set fresh mock
            vi.mocked(ssoService.authenticateWithSSO).mockReset();
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'authentication_failed',
                message: 'Token is invalid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            let response;
            await act(async () => {
                response = await result.current.login('invalid-token');
            });

            expect(response.valid).toBe(false);
            expect(response.message).toBe('Token is invalid');

            // Wait for error state
            await waitFor(() => {
                expect(result.current.error).toBe('Token is invalid');
            }, { timeout: 1000 });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
        });

        it('should detect and process token from URL', async () => {
            // Set URL token before creating provider
            mockLocation.search = '?sso_token=mock-token';
            mockLocation.href = 'http://localhost:3000?sso_token=mock-token';

            // AGGRESSIVE: Reset and set fresh mock
            vi.mocked(ssoService.authenticateWithSSO).mockReset();
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Wait for URL token processing
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
            }, { timeout: 5000 });

            // Verify service was called
            expect(vi.mocked(ssoService.authenticateWithSSO)).toHaveBeenCalledWith(
                'mock-token',
                expect.objectContaining({
                    ip_address: '192.168.1.100',
                    user_agent: 'Test Browser'
                })
            );
        });
    });

    describe('Session Management', () => {
        it('should logout successfully', async () => {
            // AGGRESSIVE: Reset and set fresh mocks for authentication
            vi.mocked(ssoService.authenticateWithSSO).mockReset();
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Authenticate first
            await act(async () => {
                await result.current.login('mock-token');
            });

            // Wait for authenticated state
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            }, { timeout: 2000 });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Verify logout state
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();

            // Verify service was called
            expect(vi.mocked(ssoService.cleanupSession)).toHaveBeenCalledWith('session-123', 'User logout');
        });

        it('should validate saved session on refresh', async () => {
            // AGGRESSIVE: Reset and set fresh mocks
            vi.mocked(SessionStorageManager.loadSession).mockReset();
            vi.mocked(SessionStorageManager.loadSession).mockReturnValue({
                session_id: 'session-123'
            });

            vi.mocked(ssoService.validateLocalSession).mockReset();
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session is valid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.isAuthenticated).toBe(true);
            }, { timeout: 3000 });

            // Verify validateLocalSession was called
            expect(vi.mocked(ssoService.validateLocalSession)).toHaveBeenCalledWith('session-123');
        });
    });

    describe('Permission Helpers', () => {
        it('should check permissions correctly', async () => {
            // AGGRESSIVE: Reset and set fresh mocks
            vi.mocked(ssoService.authenticateWithSSO).mockReset();
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Authentication successful'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Authenticate
            await act(async () => {
                await result.current.login('mock-token');
            });

            // Wait for authentication
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            }, { timeout: 2000 });

            // Test permissions
            expect(result.current.hasPermission('host')).toBe(true);
            expect(result.current.hasPermission('org_admin')).toBe(false);
            expect(result.current.hasGameAccess('ready-or-not')).toBe(true);
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
            // AGGRESSIVE: Reset and set fresh mock
            vi.mocked(ssoService.authenticateWithSSO).mockReset();
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'network_error',
                message: 'Network error'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            let response;
            await act(async () => {
                response = await result.current.login('mock-token');
            });

            expect(response.valid).toBe(false);
            expect(response.message).toBe('Network error');

            await waitFor(() => {
                expect(result.current.error).toBe('Network error');
            }, { timeout: 1000 });
        });

        it('should clear errors', async () => {
            // AGGRESSIVE: Reset and set fresh mock to create error first
            vi.mocked(ssoService.authenticateWithSSO).mockReset();
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: false,
                error: 'authentication_failed',
                message: 'Token is invalid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Create error
            await act(async () => {
                await result.current.login('invalid-token');
            });

            // Wait for error
            await waitFor(() => {
                expect(result.current.error).toBe('Token is invalid');
            }, { timeout: 1000 });

            // Clear error
            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Session Storage', () => {
        it('should get session info correctly', () => {
            // AGGRESSIVE: Reset and set fresh mock
            vi.mocked(SessionStorageManager.getSessionInfo).mockReset();
            vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValue({
                hasSession: true,
                sessionAge: 3600,
                userEmail: 'test@example.com'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            const sessionInfo = result.current.getSessionInfo();
            expect(sessionInfo.hasSession).toBe(true);
            expect(sessionInfo.sessionAge).toBe(3600);
            expect(sessionInfo.userEmail).toBe('test@example.com');
        });

        it('should handle corrupted session data', async () => {
            // AGGRESSIVE: Reset and set fresh mocks
            vi.mocked(SessionStorageManager.loadSession).mockReset();
            vi.mocked(SessionStorageManager.loadSession).mockReturnValue({
                session_id: 'corrupted-session'
            });

            vi.mocked(ssoService.validateLocalSession).mockReset();
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
                valid: false,
                error: 'session_corrupted',
                message: 'Session data is corrupted'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.isAuthenticated).toBe(false);
            }, { timeout: 3000 });

            // Verify that corrupted session was cleared
            expect(vi.mocked(SessionStorageManager.clearSession)).toHaveBeenCalled();
        });
    });
});