/**
 * SSOProvider Tests - COMPLETE MOCK ISOLATION FIX
 *
 * This file replaces src/components/auth/__tests__/SSOProvider.test.tsx
 *
 * FIXES APPLIED:
 * ✅ Mock Factory Pattern for complete isolation
 * ✅ mockResolvedValueOnce instead of mockResolvedValue
 * ✅ Explicit mock cleanup in beforeEach/afterEach
 * ✅ Fresh mock instances for each test
 * ✅ Proper async state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { SSOProvider, useSSO } from '../SSOProvider';
import { ssoService } from '../../../services/sso-service';
import React from 'react';

// =====================================================
// VITEST MOCK SETUP
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

// =====================================================
// MOCK FACTORY PATTERN FOR COMPLETE ISOLATION
// =====================================================

const createFreshMocks = () => ({
    ssoService: {
        authenticateWithSSO: vi.fn(),
        validateLocalSession: vi.fn(),
        extendLocalSession: vi.fn(),
        cleanupSession: vi.fn(),
        generateMockUsers: vi.fn(),
        generateMockToken: vi.fn(),
        healthCheck: vi.fn(),
        getActiveSessions: vi.fn()
    },
    sessionStorage: {
        saveSession: vi.fn(),
        loadSession: vi.fn(),
        clearSession: vi.fn(),
        getSessionInfo: vi.fn()
    },
    utils: {
        getClientIP: vi.fn(),
        getBrowserInfo: vi.fn()
    }
});

// =====================================================
// TEST DATA CONSTANTS
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
        district_id: 'district-123'
    },
    district_info: null,
    organization_name: 'Test School',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
};

const mockSession = {
    session_id: 'session-123',
    user_id: 'user-123',
    email: 'test@example.com',
    permission_level: 'host' as const,
    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    is_active: true,
    game_context: {}
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <SSOProvider>{children}</SSOProvider>
);

const setupDefaultMocks = (mocks: ReturnType<typeof createFreshMocks>) => {
    // Apply fresh mocks to actual mock functions
    Object.assign(vi.mocked(ssoService), mocks.ssoService);
    Object.assign(vi.mocked(SessionStorageManager), mocks.sessionStorage);
    vi.mocked(getClientIP).mockImplementation(mocks.utils.getClientIP);
    vi.mocked(getBrowserInfo).mockImplementation(mocks.utils.getBrowserInfo);

    // Set up safe defaults
    mocks.sessionStorage.loadSession.mockReturnValue(null);
    mocks.sessionStorage.getSessionInfo.mockReturnValue({
        hasSession: false,
        sessionAge: 0,
        userEmail: undefined
    });
    mocks.sessionStorage.saveSession.mockReturnValue({ success: true });
    mocks.sessionStorage.clearSession.mockReturnValue({ success: true });
    mocks.utils.getClientIP.mockResolvedValue('192.168.1.100');
    mocks.utils.getBrowserInfo.mockReturnValue('Test Browser');
};

const waitForReady = async (result: any) => {
    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });
};

// =====================================================
// TESTS WITH COMPLETE MOCK ISOLATION
// =====================================================

describe('SSOProvider', () => {
    let mocks: ReturnType<typeof createFreshMocks>;

    beforeEach(() => {
        // Create completely fresh mocks for each test
        mocks = createFreshMocks();
        setupDefaultMocks(mocks);

        // ✅ CRITICAL FIX: Reset window.location properly
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                pathname: '/',
                href: 'http://localhost:3000'
            },
            writable: true,
            configurable: true
        });
    });

    afterEach(() => {
        // Explicit cleanup
        vi.clearAllMocks();
        vi.clearAllTimers();
        cleanup(); // React Testing Library cleanup

        // ✅ CRITICAL FIX: Reset window.location to prevent URL pollution
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                pathname: '/',
                href: 'http://localhost:3000'
            },
            writable: true,
            configurable: true
        });
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
            // ✅ CRITICAL: Use mockResolvedValueOnce for test isolation
            mocks.ssoService.authenticateWithSSO.mockResolvedValueOnce({
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

            // Verify response
            expect(response?.valid).toBe(true);
            expect(response?.user).toEqual(mockUser);

            // Wait for state update
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
            }, { timeout: 2000 });
        });

        it('should handle authentication failure', async () => {
            // ✅ Fresh mock for failure case
            mocks.ssoService.authenticateWithSSO.mockResolvedValueOnce({
                valid: false,
                message: 'Token is invalid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Perform authentication
            let response;
            await act(async () => {
                response = await result.current.login('invalid-token');
            });

            // Verify failure response
            expect(response?.valid).toBe(false);
            expect(response?.message).toBe('Token is invalid');

            // Wait for error state
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
                expect(result.current.error).toBe('Token is invalid');
            }, { timeout: 2000 });
        });

        it('should detect and process token from URL', async () => {
            // ✅ CRITICAL FIX: Use 'sso_token' parameter (not 'token')
            window.location.search = '?sso_token=url-token-123';

            // ✅ Fresh mock for URL token processing
            mocks.ssoService.authenticateWithSSO.mockResolvedValueOnce({
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

            // Verify service was called with URL token
            expect(mocks.ssoService.authenticateWithSSO).toHaveBeenCalledWith(
                'url-token-123',
                expect.any(Object)
            );
        });
    });

    describe('Session Management', () => {
        it('should logout successfully', async () => {
            // ✅ Set up authenticated state first
            mocks.ssoService.authenticateWithSSO.mockResolvedValueOnce({
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

            // ✅ Fresh mock for logout
            mocks.ssoService.cleanupSession.mockResolvedValueOnce({
                success: true,
                message: 'Session cleaned up'
            });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout completion
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
                expect(result.current.user).toBeNull();
            }, { timeout: 2000 });
        });

        it('should validate saved session on refresh', async () => {
            // ✅ Set up saved session
            mocks.sessionStorage.loadSession.mockReturnValue(mockSession);
            mocks.sessionStorage.getSessionInfo.mockReturnValue({
                hasSession: true,
                sessionAge: 1800000, // 30 minutes
                userEmail: 'test@example.com'
            });

            // ✅ Fresh mock for session validation
            mocks.ssoService.validateLocalSession.mockResolvedValueOnce({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session is valid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Wait for session restoration
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            }, { timeout: 2000 });

            // Verify validateLocalSession was called
            expect(mocks.ssoService.validateLocalSession).toHaveBeenCalledWith('session-123');
        });
    });

    describe('Permission Helpers', () => {
        it('should check permissions correctly', async () => {
            // ✅ Fresh authentication mock
            mocks.ssoService.authenticateWithSSO.mockResolvedValueOnce({
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

            // Test permissions - ✅ CRITICAL FIX: Use correct function signature
            expect(result.current.hasPermission('host')).toBe(true);
            expect(result.current.hasPermission('org_admin')).toBe(false);
            expect(result.current.hasPermission('super_admin')).toBe(false);

            // Test game access
            expect(result.current.hasGameAccess('ready-or-not')).toBe(true);
            expect(result.current.hasGameAccess('other-game')).toBe(false);
        });

        it('should return false for permissions when not authenticated', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // ✅ CRITICAL FIX: Use correct function signature
            expect(result.current.hasPermission('host')).toBe(false);
            expect(result.current.hasPermission('org_admin')).toBe(false);
            expect(result.current.hasPermission('super_admin')).toBe(false);

            // Test game access
            expect(result.current.hasGameAccess('ready-or-not')).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle authentication errors gracefully', async () => {
            // ✅ Fresh mock for network error
            mocks.ssoService.authenticateWithSSO.mockResolvedValueOnce({
                valid: false,
                message: 'Network error'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Attempt authentication
            let response;
            await act(async () => {
                response = await result.current.login('mock-token');
            });

            expect(response?.valid).toBe(false);
            expect(response?.message).toBe('Network error');

            await waitFor(() => {
                expect(result.current.error).toBe('Network error');
                expect(result.current.isAuthenticated).toBe(false);
            }, { timeout: 2000 });
        });

        it('should clear errors', async () => {
            // ✅ Set up error state first
            mocks.ssoService.authenticateWithSSO.mockResolvedValueOnce({
                valid: false,
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
            }, { timeout: 2000 });

            // Clear error
            await act(async () => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Session Storage', () => {
        it('should get session info correctly', async () => {
            // ✅ Fresh mock for session info
            mocks.sessionStorage.getSessionInfo.mockReturnValue({
                hasSession: true,
                sessionAge: 1800000,
                userEmail: 'test@example.com'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            const sessionInfo = result.current.getSessionInfo();

            expect(sessionInfo.hasSession).toBe(true);
            expect(sessionInfo.sessionAge).toBe(1800000);
            expect(sessionInfo.userEmail).toBe('test@example.com');
        });

        it('should handle corrupted session data', async () => {
            // ✅ Fresh mock for corrupted session
            mocks.sessionStorage.loadSession.mockImplementation(() => {
                throw new Error('Corrupted session data');
            });

            // ✅ Mock validation failure
            mocks.ssoService.validateLocalSession.mockResolvedValueOnce({
                valid: false,
                message: 'Session validation failed'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Should remain unauthenticated with corrupted session
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
        });
    });
});