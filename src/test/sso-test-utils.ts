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
        const originalUserAgent = navigator.userAgent;

        afterEach(() => {
            Object.defineProperty(navigator, 'userAgent', {
                value: originalUserAgent,
                writable: true
            });
        });

        it('should detect Chrome browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Chrome');
        });

        it('should detect Firefox browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Firefox');
        });

        it('should detect Safari browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Safari');
        });

        it('should detect Edge browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Edge');
        });

        it('should return Unknown for unrecognized browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'SomeUnknownBrowser/1.0',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Unknown');
        });
    });

    describe('formatSessionExpiry', () => {
        it('should format hours and minutes correctly', () => {
            const now = Date.now();
            const futureTime = new Date(now + 2.5 * 3600 * 1000).toISOString();
            const result = formatSessionExpiry(futureTime);
            expect(result).toBe('2h 30m');
        });

        it('should format minutes only when less than 1 hour', () => {
            const now = Date.now();
            const futureTime = new Date(now + 45 * 60 * 1000).toISOString();
            const result = formatSessionExpiry(futureTime);
            expect(result).toBe('45m');
        });

        it('should return "Expired" for past times', () => {
            const pastTime = new Date(Date.now() - 1000).toISOString();
            const result = formatSessionExpiry(pastTime);
            expect(result).toBe('Expired');
        });

        it('should handle exactly 1 hour', () => {
            const now = Date.now();
            const futureTime = new Date(now + 3600 * 1000).toISOString();
            const result = formatSessionExpiry(futureTime);
            expect(result).toBe('1h 0m');
        });

        it('should handle exactly 0 minutes remaining', () => {
            const now = Date.now();
            const futureTime = new Date(now + 1000).toISOString();
            const result = formatSessionExpiry(futureTime);
            expect(result).toBe('0m');
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
            const timestamp = '2023-01-01T00:00:00Z';
            const result = formatTime(timestamp);
            expect(result).toContain('2023');
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

            it('should handle localStorage errors', () => {
                mockLocalStorage.setItem.mockImplementationOnce(() => {
                    throw new Error('Storage quota exceeded');
                });

                const result = SessionStorageManager.saveSession('session-123', mockUser);
                expect(result.success).toBe(false);
                expect(result.error).toBe('Failed to save session to storage');
            });
        });

        describe('loadSession', () => {
            it('should load valid session', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    saved_at: new Date().toISOString(),
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                };

                mockLocalStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.loadSession();

                expect(result).toEqual({
                    session_id: 'session-123',
                    user: mockUser
                });
            });

            it('should return null when no session exists', () => {
                const result = SessionStorageManager.loadSession();
                expect(result).toBeNull();
            });

            it('should handle corrupted session data', () => {
                mockLocalStorage.setItem('ready_or_not_sso_session', 'invalid json');

                const result = SessionStorageManager.loadSession();

                expect(result).toBeNull();
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ready_or_not_sso_session');
            });

            it('should handle version mismatch', () => {
                const sessionData = {
                    version: '0.9',
                    session_id: 'session-123',
                    user: mockUser,
                    saved_at: new Date().toISOString(),
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                };

                mockLocalStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.loadSession();

                expect(result).toBeNull();
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ready_or_not_sso_session');
            });

            it('should handle expired client session', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    saved_at: new Date().toISOString(),
                    expires_client_check: new Date(Date.now() - 1000).toISOString()
                };

                mockLocalStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.loadSession();

                expect(result).toBeNull();
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ready_or_not_sso_session');
            });
        });

        describe('clearSession', () => {
            it('should clear session successfully', () => {
                SessionStorageManager.clearSession();
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ready_or_not_sso_session');
            });

            it('should handle localStorage errors gracefully', () => {
                mockLocalStorage.removeItem.mockImplementationOnce(() => {
                    throw new Error('Storage error');
                });

                expect(() => SessionStorageManager.clearSession()).not.toThrow();
            });
        });

        describe('getSessionInfo', () => {
            it('should return session info when session exists', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    saved_at: new Date(Date.now() - 60000).toISOString(),
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                };

                mockLocalStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(true);
                expect(result.userEmail).toBe('test@example.com');
                expect(result.sessionAge).toBeGreaterThan(0);
            });

            it('should return no session when session does not exist', () => {
                const result = SessionStorageManager.getSessionInfo();
                expect(result.hasSession).toBe(false);
                expect(result.userEmail).toBeUndefined();
                expect(result.sessionAge).toBeUndefined();
            });

            it('should handle corrupted session data gracefully', () => {
                mockLocalStorage.setItem('ready_or_not_sso_session', 'invalid json');

                const result = SessionStorageManager.getSessionInfo();
                expect(result.hasSession).toBe(false);
            });

            it('should handle missing saved_at field', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                };

                mockLocalStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(true);
                expect(result.sessionAge).toBeUndefined();
            });
        });
    });

    describe('Permission Helper Functions', () => {
        describe('Role Hierarchy', () => {
            it('should validate role hierarchy correctly', () => {
                expect(hasPermission('host', 'host')).toBe(true);
                expect(hasPermission('org_admin', 'host')).toBe(true);
                expect(hasPermission('super_admin', 'host')).toBe(true);
                expect(hasPermission('host', 'org_admin')).toBe(false);
                expect(hasPermission('org_admin', 'org_admin')).toBe(true);
                expect(hasPermission('super_admin', 'org_admin')).toBe(true);
                expect(hasPermission('host', 'super_admin')).toBe(false);
                expect(hasPermission('org_admin', 'super_admin')).toBe(false);
                expect(hasPermission('super_admin', 'super_admin')).toBe(true);
            });

            it('should handle invalid roles', () => {
                expect(hasPermission('invalid', 'host')).toBe(false);
                expect(hasPermission('host', 'invalid')).toBe(false);
                expect(hasPermission('invalid', 'invalid')).toBe(false);
            });
        });

        describe('Game Access', () => {
            it('should check game access correctly', () => {
                expect(hasGameAccess(mockUser, 'ready-or-not')).toBe(true);
                expect(hasGameAccess(mockUser, 'other-game')).toBe(false);
            });

            it('should handle empty games array', () => {
                const userWithNoGames = { ...mockUser, games: [] };
                expect(hasGameAccess(userWithNoGames, 'ready-or-not')).toBe(false);
            });

            it('should handle null user', () => {
                expect(hasGameAccess(null, 'ready-or-not')).toBe(false);
            });
        });
    });
});