/**
 * Ultra Simple Working SSOProvider Tests - VITEST COMPATIBLE VERSION
 * Uses proper Vitest mocking patterns without variable references
 *
 * File: src/components/auth/__tests__/SSOProvider.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SSOProvider, useSSO } from '../SSOProvider';
import { ssoService } from '../../../services/sso-service';
import React from 'react';

// =====================================================
// MOCK SETUP - Vitest Compatible
// =====================================================

// Mock the SSO service properly for Vitest
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

// Mock SessionStorageManager
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

// =====================================================
// IMPORTS AND TEST SETUP
// =====================================================

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

// Simple initialization helper
const waitForReady = async (result: { current: ReturnType<typeof useSSO> }) => {
    await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });
};

// =====================================================
// TESTS
// =====================================================

describe('SSOProvider', () => {
    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();

        // Reset location
        mockLocation.search = '';
        mockLocation.pathname = '/';
        mockLocation.href = 'http://localhost:3000';

        // Set up default mock returns using vi.mocked()
        vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);
        vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValue({ hasSession: false });
        vi.mocked(getClientIP).mockResolvedValue('192.168.1.100');
        vi.mocked(getBrowserInfo).mockReturnValue('Test Browser');
        vi.mocked(SessionStorageManager.saveSession).mockReturnValue({ success: true });

        // Default service responses (will be overridden in individual tests)
        vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
            valid: false,
            error: 'authentication_failed',
            message: 'Authentication failed'
        });

        vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
            valid: false,
            error: 'session_invalid',
            message: 'Session not found'
        });

        vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
            success: false,
            error: 'extension_failed'
        });

        vi.mocked(ssoService.cleanupSession).mockResolvedValue({
            success: true,
            message: 'Session cleaned up'
        });
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
            // Set up successful authentication for this test only
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValueOnce({
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

            // Wait for state to update properly
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
                expect(result.current.session).toEqual(mockSession);
            }, { timeout: 2000 });
        });

        it('should handle authentication failure', async () => {
            // Set up failed authentication
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValueOnce({
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

            // Mock successful authentication
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
            // First set up authenticated state
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

            // Login first
            await act(async () => {
                await result.current.login('mock-token');
            });

            // Wait for authenticated state
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            }, { timeout: 2000 });

            // Then logout
            await act(async () => {
                await result.current.logout();
            });

            // Verify logout state
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
        });

        it('should validate saved session on refresh', async () => {
            // Set up saved session
            vi.mocked(SessionStorageManager.loadSession).mockReturnValueOnce(mockSession);
            vi.mocked(ssoService.validateLocalSession).mockResolvedValueOnce({
                valid: true,
                user: mockUser,
                session: mockSession,
                message: 'Session valid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Wait for session restoration
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
            }, { timeout: 3000 });

            // Verify validateLocalSession was called
            expect(vi.mocked(ssoService.validateLocalSession)).toHaveBeenCalledWith(mockSession.session_id);
        });
    });

    describe('Permission Helpers', () => {
        it('should check permissions correctly', async () => {
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

            // Login
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
            expect(result.current.hasPermission('super_admin')).toBe(false);
        });

        it('should return false for permissions when not authenticated', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            expect(result.current.hasPermission('host')).toBe(false);
            expect(result.current.hasPermission('org_admin')).toBe(false);
            expect(result.current.hasPermission('super_admin')).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle authentication errors gracefully', async () => {
            // Mock network error
            vi.mocked(ssoService.authenticateWithSSO).mockRejectedValueOnce(new Error('Network error'));

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

            expect(result.current.isAuthenticated).toBe(false);
        });

        it('should clear errors', async () => {
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValueOnce({
                valid: false,
                error: 'authentication_failed',
                message: 'Token is invalid'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            // Create an error
            await act(async () => {
                await result.current.login('invalid-token');
            });

            // Wait for error
            await waitFor(() => {
                expect(result.current.error).toBe('Token is invalid');
            }, { timeout: 1000 });

            // Clear the error
            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Session Storage', () => {
        it('should get session info correctly', async () => {
            vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValueOnce({
                hasSession: true,
                sessionAge: 3600,
                userEmail: 'test@example.com'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            const sessionInfo = result.current.getSessionInfo();
            expect(sessionInfo).toEqual({
                hasSession: true,
                sessionAge: 3600,
                userEmail: 'test@example.com'
            });
        });

        it('should handle corrupted session data', async () => {
            vi.mocked(SessionStorageManager.loadSession).mockReturnValueOnce({
                ...mockSession,
                session_id: 'corrupted-session'
            });

            vi.mocked(ssoService.validateLocalSession).mockResolvedValueOnce({
                valid: false,
                error: 'session_corrupted',
                message: 'Session data is corrupted'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitForReady(result);

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
        });
    });
});