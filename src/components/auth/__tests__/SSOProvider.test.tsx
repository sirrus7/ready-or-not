/**
 * SSOProvider Tests
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

// Helper to create wrapper component
const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
        <SSOProvider>{children}</SSOProvider>
    );
};

describe('SSOProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockLocation.search = '';
        mockLocation.pathname = '/';
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('Initial State', () => {
        it('should initialize with default values', () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.isLoading).toBe(true);
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
                const response = await result.current.login('invalid-token');
                expect(response.valid).toBe(false);
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
                expect(result.current.error).toBe('Invalid token');
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should detect and process token from URL', async () => {
            mockLocation.search = '?sso_token=url-token-123';

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            };

            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
                valid: true,
                user: mockUser,
                session: {
                    session_id: 'session-123',
                    user_id: 'user-123',
                    email: 'test@example.com',
                    permission_level: 'host',
                    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                    created_at: new Date().toISOString(),
                    last_activity: new Date().toISOString(),
                    is_active: true,
                    game_context: {}
                },
                message: 'Success'
            });

            renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(ssoService.authenticateWithSSO).toHaveBeenCalledWith(
                    'url-token-123',
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
            });
        });
    });

    describe('Session Management', () => {
        it('should logout successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            };

            // Set up authenticated state
            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: 'session-123',
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.cleanupSession).mockResolvedValue({
                success: true
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Set authenticated state manually for test
            act(() => {
                result.current.user = mockUser;
            });

            await act(async () => {
                await result.current.logout();
            });

            expect(ssoService.cleanupSession).toHaveBeenCalledWith('session-123', 'User logout');
            expect(localStorage.getItem('ready_or_not_sso_session')).toBeNull();
        });

        it('should extend session successfully', async () => {
            const mockSession = {
                session_id: 'session-123',
                user_id: 'user-123',
                email: 'test@example.com',
                permission_level: 'host',
                expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(), // Extended
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                is_active: true,
                game_context: {}
            };

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: 'session-123',
                user: { id: 'user-123', email: 'test@example.com' },
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
                valid: true,
                session: mockSession,
                message: 'Session extended'
            });

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await act(async () => {
                const response = await result.current.extendSession(4);
                expect(response.success).toBe(true);
            });

            expect(ssoService.extendLocalSession).toHaveBeenCalledWith('session-123', 4);
        });

        it('should validate saved session on refresh', async () => {
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

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: 'session-123',
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

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
                expect(result.current.session).toEqual(mockSession);
            });
        });
    });

    describe('Permission Helpers', () => {
        it('should check permissions correctly', () => {
            const mockUser = {
                id: 'user-123',
                email: 'admin@example.com',
                full_name: 'Admin User',
                role: 'org_admin' as const,
                games: [{ name: 'ready-or-not', permission_level: 'org_admin' as const }]
            };

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Manually set user for testing
            act(() => {
                (result.current as unknown).user = mockUser;
            });

            // org_admin should have host permissions
            expect(result.current.hasPermission('host')).toBe(true);
            // org_admin should have org_admin permissions
            expect(result.current.hasPermission('org_admin')).toBe(true);
            // org_admin should NOT have super_admin permissions
            expect(result.current.hasPermission('super_admin')).toBe(false);
        });

        it('should check game access correctly', () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [
                    { name: 'ready-or-not', permission_level: 'host' as const },
                    { name: 'game-2', permission_level: 'host' as const }
                ]
            };

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Manually set user for testing
            act(() => {
                (result.current as unknown).user = mockUser;
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
            vi.mocked(ssoService.authenticateWithSSO).mockRejectedValue(
                new Error('Network error')
            );

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            await act(async () => {
                const response = await result.current.login('token');
                expect(response.valid).toBe(false);
                expect(response.error).toBe('authentication_error');
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Failed to authenticate');
            });
        });

        it('should clear errors', async () => {
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Set error state
            act(() => {
                (result.current as unknown).error = 'Test error';
            });

            expect(result.current.error).toBe('Test error');

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Session Storage', () => {
        it('should get session info correctly', () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            };

            const savedTime = new Date();
            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: 'session-123',
                user: mockUser,
                saved_at: savedTime.toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            }));

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            const sessionInfo = result.current.getSessionInfo();
            expect(sessionInfo.hasSession).toBe(true);
            expect(sessionInfo.userEmail).toBe('test@example.com');
            expect(sessionInfo.sessionAge).toBeGreaterThan(0);
        });

        it('should handle corrupted session data', () => {
            localStorage.setItem('ready_or_not_sso_session', 'invalid-json');

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            const sessionInfo = result.current.getSessionInfo();
            expect(sessionInfo.hasSession).toBe(false);
        });

        it('should handle expired client session', () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'host' as const,
                games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
            };

            localStorage.setItem('ready_or_not_sso_session', JSON.stringify({
                version: '1.0',
                session_id: 'session-123',
                user: mockUser,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() - 1000).toISOString() // Expired
            }));

            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            const sessionInfo = result.current.getSessionInfo();
            expect(sessionInfo.hasSession).toBe(false);
        });
    });

    describe('Automatic Session Management', () => {
        it('should set up session refresh interval', () => {
            vi.useFakeTimers();

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { result } = renderHook(() => useSSO(), {
                wrapper: createWrapper()
            });

            // Verify that interval is set up
            expect(vi.getTimerCount()).toBeGreaterThan(0);

            vi.useRealTimers();
        });
    });
});