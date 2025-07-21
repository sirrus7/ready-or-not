/**
 * SSO Utility Functions Tests
 * Tests for SessionStorageManager and utility functions
 *
 * File: src/components/auth/__tests__/utils.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =====================================================
// MOCK SETUP
// =====================================================

// Mock fetch for IP address detection
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
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

// Import the utilities after mocking
import {
    SessionStorageManager,
    getClientIP,
    getBrowserInfo,
    formatSessionExpiry,
    formatTime
} from '../SessionStorageManager';

// =====================================================
// TEST DATA
// =====================================================

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
// TESTS
// =====================================================

describe('SessionStorageManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocalStorage.clear();
    });

    describe('saveSession', () => {
        it('should save session to localStorage', () => {
            const result = SessionStorageManager.saveSession(mockSession);

            expect(result.success).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'sso_session',
                JSON.stringify(mockSession)
            );
        });

        it('should handle localStorage errors gracefully', () => {
            // Mock localStorage.setItem to throw error
            vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            const result = SessionStorageManager.saveSession(mockSession);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Storage quota exceeded');
        });
    });

    describe('loadSession', () => {
        it('should load session from localStorage', () => {
            // Pre-populate localStorage
            vi.mocked(mockLocalStorage.getItem).mockReturnValue(JSON.stringify(mockSession));

            const result = SessionStorageManager.loadSession();

            expect(result).toEqual(mockSession);
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sso_session');
        });

        it('should return null for non-existent session', () => {
            vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

            const result = SessionStorageManager.loadSession();

            expect(result).toBeNull();
        });

        it('should handle corrupted JSON gracefully', () => {
            vi.mocked(mockLocalStorage.getItem).mockReturnValue('invalid-json');

            const result = SessionStorageManager.loadSession();

            expect(result).toBeNull();
        });

        it('should handle localStorage errors gracefully', () => {
            vi.mocked(mockLocalStorage.getItem).mockImplementation(() => {
                throw new Error('localStorage not available');
            });

            const result = SessionStorageManager.loadSession();

            expect(result).toBeNull();
        });
    });

    describe('clearSession', () => {
        it('should clear session from localStorage', () => {
            SessionStorageManager.clearSession();

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sso_session');
        });

        it('should handle localStorage errors gracefully', () => {
            vi.mocked(mockLocalStorage.removeItem).mockImplementation(() => {
                throw new Error('localStorage not available');
            });

            // Should not throw error
            expect(() => SessionStorageManager.clearSession()).not.toThrow();
        });
    });

    describe('getSessionInfo', () => {
        it('should return session info when session exists', () => {
            const sessionWithAge = {
                ...mockSession,
                created_at: new Date(Date.now() - 3600 * 1000).toISOString() // 1 hour ago
            };

            vi.mocked(mockLocalStorage.getItem).mockReturnValue(JSON.stringify(sessionWithAge));

            const result = SessionStorageManager.getSessionInfo();

            expect(result.hasSession).toBe(true);
            expect(result.sessionAge).toBeGreaterThan(3500); // Approximately 1 hour
            expect(result.userEmail).toBe(sessionWithAge.email);
        });

        it('should return no session info when no session exists', () => {
            vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

            const result = SessionStorageManager.getSessionInfo();

            expect(result.hasSession).toBe(false);
            expect(result.sessionAge).toBeUndefined();
            expect(result.userEmail).toBeUndefined();
        });

        it('should handle corrupted session data', () => {
            vi.mocked(mockLocalStorage.getItem).mockReturnValue('invalid-json');

            const result = SessionStorageManager.getSessionInfo();

            expect(result.hasSession).toBe(false);
            expect(result.sessionAge).toBeUndefined();
            expect(result.userEmail).toBeUndefined();
        });
    });
});

describe('getClientIP', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('should fetch client IP successfully', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ ip: '192.168.1.100' })
        });

        const result = await getClientIP();

        expect(result).toBe('192.168.1.100');
        expect(mockFetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
    });

    it('should return fallback IP on fetch failure', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await getClientIP();

        expect(result).toBe('unknown');
    });

    it('should return fallback IP on invalid response', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500
        });

        const result = await getClientIP();

        expect(result).toBe('unknown');
    });

    it('should return fallback IP on malformed JSON', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ invalid: 'data' })
        });

        const result = await getClientIP();

        expect(result).toBe('unknown');
    });
});

describe('getBrowserInfo', () => {
    beforeEach(() => {
        // Reset navigator mock
        Object.defineProperty(window, 'navigator', {
            value: {
                userAgent: 'Test Browser Agent'
            },
            writable: true
        });
    });

    it('should return browser info from user agent', () => {
        const result = getBrowserInfo();

        expect(result).toBe('Test Browser Agent');
    });

    it('should handle missing navigator', () => {
        // Remove navigator
        Object.defineProperty(window, 'navigator', {
            value: undefined,
            writable: true
        });

        const result = getBrowserInfo();

        expect(result).toBe('Unknown Browser');
    });

    it('should handle missing userAgent', () => {
        Object.defineProperty(window, 'navigator', {
            value: {},
            writable: true
        });

        const result = getBrowserInfo();

        expect(result).toBe('Unknown Browser');
    });
});

describe('formatSessionExpiry', () => {
    it('should format session expiry correctly', () => {
        const futureTime = new Date(Date.now() + 5.5 * 3600 * 1000); // 5.5 hours from now

        const result = formatSessionExpiry(futureTime.toISOString());

        expect(result).toContain('5h');
        expect(result).toContain('30m');
    });

    it('should handle expired sessions', () => {
        const pastTime = new Date(Date.now() - 3600 * 1000); // 1 hour ago

        const result = formatSessionExpiry(pastTime.toISOString());

        expect(result).toBe('Expired');
    });

    it('should handle sessions expiring soon', () => {
        const soonTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        const result = formatSessionExpiry(soonTime.toISOString());

        expect(result).toContain('30m');
        expect(result).not.toContain('h');
    });

    it('should handle invalid date strings', () => {
        const result = formatSessionExpiry('invalid-date');

        expect(result).toBe('Invalid date');
    });
});

describe('formatTime', () => {
    it('should format time correctly', () => {
        const testDate = new Date('2023-01-01T12:00:00Z');

        const result = formatTime(testDate.toISOString());

        expect(result).toMatch(/1\/1\/2023/);
        expect(result).toMatch(/12:00/);
    });

    it('should handle invalid date strings', () => {
        const result = formatTime('invalid-date');

        expect(result).toBe('Invalid date');
    });

    it('should handle different time zones consistently', () => {
        const testDate = new Date('2023-12-25T15:30:45Z');

        const result = formatTime(testDate.toISOString());

        expect(result).toContain('12/25/2023');
        expect(result).toContain('15:30');
    });
});

describe('Utility Integration', () => {
    it('should work together for complete session management', async () => {
        // Save a session
        const saveResult = SessionStorageManager.saveSession(mockSession);
        expect(saveResult.success).toBe(true);

        // Load the session
        const loadedSession = SessionStorageManager.loadSession();
        expect(loadedSession).toEqual(mockSession);

        // Get session info
        const sessionInfo = SessionStorageManager.getSessionInfo();
        expect(sessionInfo.hasSession).toBe(true);
        expect(sessionInfo.userEmail).toBe(mockSession.email);

        // Clear the session
        SessionStorageManager.clearSession();

        // Verify session is cleared
        const clearedSession = SessionStorageManager.loadSession();
        expect(clearedSession).toBeNull();

        const clearedInfo = SessionStorageManager.getSessionInfo();
        expect(clearedInfo.hasSession).toBe(false);
    });

    it('should handle browser environment detection', async () => {
        // Mock successful IP detection
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ ip: '203.0.113.1' })
        });

        const ip = await getClientIP();
        const browser = getBrowserInfo();

        expect(ip).toBe('203.0.113.1');
        expect(browser).toBe('Test Browser Agent');
    });

    it('should handle offline/error scenarios gracefully', async () => {
        // Mock network failure
        mockFetch.mockRejectedValue(new Error('Network unavailable'));

        const ip = await getClientIP();

        expect(ip).toBe('unknown');

        // Browser info should still work
        const browser = getBrowserInfo();
        expect(browser).toBe('Test Browser Agent');
    });
});