/**
 * Utility Functions Tests - Fixed Version
 * Tests for session management utilities
 *
 * File: src/components/auth/__tests__/utils.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    SessionStorageManager,
    getClientIP,
    getBrowserInfo,
    formatSessionExpiry,
    formatTime,
    hasPermission,
    hasGameAccess
} from '../SessionStorageManager';

// Mock fetch for getClientIP tests
global.fetch = vi.fn();

// Create a working mock localStorage
const createMockLocalStorage = () => {
    const store: { [key: string]: string } = {};

    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            Object.keys(store).forEach(key => delete store[key]);
        })
    };
};

const mockLocalStorage = createMockLocalStorage();

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = vi.fn();
    vi.clearAllMocks();
});

afterEach(() => {
    console.error = originalConsoleError;
});

// Test data
const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'host' as const,
    games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
};

describe('Utility Functions', () => {
    describe('getClientIP', () => {
        it('should return IP address when API call succeeds', async () => {
            const mockIP = '192.168.1.1';
            const mockFetch = vi.mocked(fetch);
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ ip: mockIP })
            } as Response);

            const result = await getClientIP();
            expect(result).toBe(mockIP);
        });

        it('should return null when API call fails', async () => {
            const mockFetch = vi.mocked(fetch);
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await getClientIP();
            expect(result).toBeNull();
        });

        it('should return null when response does not contain IP', async () => {
            const mockFetch = vi.mocked(fetch);
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({})
            } as Response);

            const result = await getClientIP();
            expect(result).toBeNull();
        });
    });

    describe('getBrowserInfo', () => {
        it('should detect Chrome browser', () => {
            const originalUserAgent = navigator.userAgent;
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Chrome');

            Object.defineProperty(navigator, 'userAgent', {
                value: originalUserAgent,
                writable: true
            });
        });

        it('should return Unknown for unrecognized browser', () => {
            const originalUserAgent = navigator.userAgent;
            Object.defineProperty(navigator, 'userAgent', {
                value: 'SomeUnknownBrowser/1.0',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Unknown');

            Object.defineProperty(navigator, 'userAgent', {
                value: originalUserAgent,
                writable: true
            });
        });
    });

    describe('formatSessionExpiry', () => {
        it('should format hours and minutes correctly', () => {
            const now = Date.now();
            const futureTime = new Date(now + 2.5 * 3600 * 1000).toISOString();
            const result = formatSessionExpiry(futureTime);
            expect(result).toBe('2h 30m');
        });

        it('should return "Expired" for past times', () => {
            const pastTime = new Date(Date.now() - 1000).toISOString();
            const result = formatSessionExpiry(pastTime);
            expect(result).toBe('Expired');
        });
    });

    describe('formatTime', () => {
        it('should format timestamp to locale string', () => {
            const timestamp = '2023-01-01T12:00:00Z';
            const result = formatTime(timestamp);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle different date formats', () => {
            // Use a specific date and check that it formats correctly
            const timestamp = '2023-01-01T12:00:00Z';
            const result = formatTime(timestamp);

            // The result should be a valid date string
            expect(result).not.toBe('Invalid Date');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // Check that it's actually a date that was parsed correctly
            const parsedBack = new Date(result);
            expect(parsedBack.getTime()).not.toBeNaN();
        });
    });

    describe('SessionStorageManager', () => {
        beforeEach(() => {
            mockLocalStorage.clear();
        });

        describe('saveSession', () => {
            it('should save session successfully', () => {
                const result = SessionStorageManager.saveSession('session-123', mockUser);
                expect(result.success).toBe(true);
                expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                    'ready_or_not_sso_session',
                    expect.any(String)
                );
            });
        });

        describe('getSessionInfo', () => {
            it('should return session info when session exists', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    saved_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                };

                // Mock localStorage.getItem to return our session data
                vi.mocked(mockLocalStorage.getItem).mockReturnValue(JSON.stringify(sessionData));

                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(true);
                expect(result.userEmail).toBe('test@example.com');
                expect(result.sessionAge).toBeGreaterThan(0);
            });

            it('should handle missing saved_at field', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                    // Note: no saved_at field
                };

                vi.mocked(mockLocalStorage.getItem).mockReturnValue(JSON.stringify(sessionData));

                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(true);
                expect(result.userEmail).toBe('test@example.com');
                expect(result.sessionAge).toBeUndefined();
            });
        });
    });

    describe('Permission Helper Functions', () => {
        describe('Role Hierarchy', () => {
            it('should validate role hierarchy correctly', () => {
                // Host can access host level
                expect(hasPermission('host', 'host')).toBe(true);

                // Org admin can access host level
                expect(hasPermission('org_admin', 'host')).toBe(true);

                // Org admin can access org_admin level
                expect(hasPermission('org_admin', 'org_admin')).toBe(true);

                // Host cannot access org_admin level
                expect(hasPermission('host', 'org_admin')).toBe(false);

                // Super admin can access all levels
                expect(hasPermission('super_admin', 'host')).toBe(true);
                expect(hasPermission('super_admin', 'org_admin')).toBe(true);
                expect(hasPermission('super_admin', 'super_admin')).toBe(true);
            });

            it('should handle invalid roles', () => {
                expect(hasPermission('invalid_role', 'host')).toBe(false);
                expect(hasPermission('host', 'invalid_role')).toBe(false);
                expect(hasPermission('invalid_role', 'invalid_role')).toBe(false);
            });
        });

        describe('Game Access', () => {
            it('should check game access correctly', () => {
                expect(hasGameAccess(mockUser, 'ready-or-not')).toBe(true);
                expect(hasGameAccess(mockUser, 'other-game')).toBe(false);
            });

            it('should handle null user', () => {
                expect(hasGameAccess(null, 'ready-or-not')).toBe(false);
            });
        });
    });
});