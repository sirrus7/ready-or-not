/**
 * SSO Utility Functions Tests - COMPLETE WITH ALL FIXES
 * Tests for SessionStorageManager and utility functions
 *
 * File: src/components/auth/__tests__/utils.test.ts
 *
 * ✅ FIXES APPLIED:
 * - Proper navigator mocking for getBrowserInfo tests
 * - Correct test expectations for new storage key ('sso_session')
 * - Fixed formatTime timezone handling expectations
 * - Fixed integration test navigator mock issue
 * - Fixed formatSessionExpiry with proper system time mocking (vi.setSystemTime)
 * - Complete mock isolation and cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =====================================================
// MOCK SETUP
// =====================================================

// Mock fetch for IP address detection
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ✅ FIX: Proper navigator mock setup FIRST (before anything else)
const mockNavigator = {
    userAgent: 'Test Browser Agent'
};

// Set up navigator globally (for both global and window.navigator)
Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true
});

Object.defineProperty(window, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true
});

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
    game_context: {}
};

// =====================================================
// SETUP AND CLEANUP
// =====================================================

beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // Reset fetch mock
    mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ip: '192.168.1.100' }),
        ok: true
    } as Response);
});

afterEach(() => {
    vi.clearAllMocks();
    // ✅ FIX: Restore real timers (replaces Date.now restoration)
    vi.useRealTimers();
});

// =====================================================
// SESSION STORAGE MANAGER TESTS
// =====================================================

describe('SessionStorageManager', () => {
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
            mockLocalStorage.setItem.mockImplementationOnce(() => {
                throw new Error('Storage quota exceeded');
            });

            const result = SessionStorageManager.saveSession(mockSession);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage quota exceeded');
        });
    });

    describe('loadSession', () => {
        it('should load session from localStorage', () => {
            // Setup stored session
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockSession));

            const result = SessionStorageManager.loadSession();

            expect(result).toEqual(mockSession);
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sso_session');
        });

        it('should return null for non-existent session', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const result = SessionStorageManager.loadSession();

            expect(result).toBeNull();
        });

        it('should handle corrupted JSON gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid-json{');

            const result = SessionStorageManager.loadSession();

            expect(result).toBeNull();
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sso_session');
        });

        it('should handle localStorage errors gracefully', () => {
            mockLocalStorage.getItem.mockImplementationOnce(() => {
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
            mockLocalStorage.removeItem.mockImplementationOnce(() => {
                throw new Error('localStorage not available');
            });

            expect(() => {
                SessionStorageManager.clearSession();
            }).not.toThrow();
        });
    });

    describe('getSessionInfo', () => {
        it('should return session info when session exists', () => {
            const now = new Date();
            const createdAt = new Date(now.getTime() - 3600000); // 1 hour ago
            const sessionWithAge = {
                ...mockSession,
                created_at: createdAt.toISOString(),
                email: 'test@example.com'
            };

            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(sessionWithAge));

            const result = SessionStorageManager.getSessionInfo();

            expect(result.hasSession).toBe(true);
            expect(result.userEmail).toBe('test@example.com');
            expect(typeof result.sessionAge).toBe('number');
            expect(result.sessionAge).toBeGreaterThan(3500); // Should be close to 3600 seconds
        });

        it('should return no session info when no session exists', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const result = SessionStorageManager.getSessionInfo();

            expect(result).toEqual({ hasSession: false });
        });

        it('should handle corrupted session data', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid-json');

            const result = SessionStorageManager.getSessionInfo();

            expect(result).toEqual({ hasSession: false });
        });
    });
});

// =====================================================
// UTILITY FUNCTION TESTS
// =====================================================

describe('getClientIP', () => {
    it('should fetch client IP successfully', async () => {
        const result = await getClientIP();

        expect(result).toBe('192.168.1.100');
        expect(fetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
    });

    it('should return fallback IP on fetch failure', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await getClientIP();

        expect(result).toBe('127.0.0.1');
    });

    it('should return fallback IP on invalid response', async () => {
        mockFetch.mockResolvedValue({
            json: () => Promise.resolve({}),
            ok: true
        } as Response);

        const result = await getClientIP();

        expect(result).toBe('127.0.0.1');
    });

    it('should return fallback IP on malformed JSON', async () => {
        mockFetch.mockResolvedValue({
            json: () => Promise.reject(new Error('Invalid JSON')),
            ok: true
        } as Response);

        const result = await getClientIP();

        expect(result).toBe('127.0.0.1');
    });
});

describe('getBrowserInfo', () => {
    it('should return browser info from user agent', () => {
        const result = getBrowserInfo();

        // ✅ ALIGNED: Test expects the full test user agent string
        expect(result).toBe('Test Browser Agent');
    });

    it('should handle missing navigator', () => {
        // Temporarily remove navigator
        Object.defineProperty(window, 'navigator', {
            value: undefined,
            writable: true
        });
        Object.defineProperty(global, 'navigator', {
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
        Object.defineProperty(global, 'navigator', {
            value: {},
            writable: true
        });

        const result = getBrowserInfo();

        expect(result).toBe('Unknown Browser');
    });
});

describe('formatSessionExpiry', () => {
    it('should format session expiry correctly', () => {
        // ✅ FIX: Use vi.setSystemTime() to mock the entire Date system
        const baseTime = new Date('2023-01-01T12:00:00.000Z');
        const futureTime = new Date(baseTime.getTime() + 5.5 * 3600 * 1000); // Exactly 5.5 hours later

        // Mock system time to our base time
        vi.setSystemTime(baseTime);

        const result = formatSessionExpiry(futureTime.toISOString());

        expect(result).toContain('5h');
        expect(result).toContain('30m');

        // Restore real time
        vi.useRealTimers();
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

        // ✅ FIXED: Test for proper UTC time formatting
        expect(result).toMatch(/1\/1\/2023/);
        expect(result).toMatch(/12:00/); // Should now show 12:00 in UTC 24-hour format
    });

    it('should handle invalid date strings', () => {
        const result = formatTime('invalid-date');

        expect(result).toBe('Invalid date');
    });

    it('should handle different time zones consistently', () => {
        const testDate = new Date('2023-12-25T15:30:45Z');

        const result = formatTime(testDate.toISOString());

        // ✅ FIXED: Test for proper UTC time formatting
        expect(result).toContain('12/25/2023');
        expect(result).toContain('15:30'); // Should now show 15:30 in UTC 24-hour format
    });
});

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('Utility Integration', () => {
    it('should work together for complete session management', async () => {
        // ✅ FIX: Ensure navigator mock is properly set for this test
        Object.defineProperty(window, 'navigator', {
            value: { userAgent: 'Test Browser Agent' },
            writable: true,
            configurable: true
        });
        Object.defineProperty(global, 'navigator', {
            value: { userAgent: 'Test Browser Agent' },
            writable: true,
            configurable: true
        });

        // 1. Save a session
        const saveResult = SessionStorageManager.saveSession(mockSession);
        expect(saveResult.success).toBe(true);

        // 2. Load the session
        const loadedSession = SessionStorageManager.loadSession();
        expect(loadedSession).toEqual(mockSession);

        // 3. Get session info
        const sessionInfo = SessionStorageManager.getSessionInfo();
        expect(sessionInfo.hasSession).toBe(true);
        expect(sessionInfo.userEmail).toBe(mockSession.email);

        // 4. Get client info
        const clientIP = await getClientIP();
        const browserInfo = getBrowserInfo();

        expect(clientIP).toBe('192.168.1.100');
        expect(browserInfo).toBe('Test Browser Agent');

        // 5. Format time
        const formattedExpiry = formatSessionExpiry(mockSession.expires_at);
        expect(formattedExpiry).toContain('h');
    });

    it('should handle browser environment detection', () => {
        const browserInfo = getBrowserInfo();
        expect(['Test Browser Agent', 'Chrome', 'Firefox', 'Safari', 'Edge', 'Unknown Browser'].includes(browserInfo)).toBe(true);
    });

    it('should handle offline/error scenarios gracefully', async () => {
        // Mock network failure
        mockFetch.mockRejectedValue(new Error('Network error'));

        // Mock localStorage failure
        mockLocalStorage.setItem.mockImplementationOnce(() => {
            throw new Error('Storage not available');
        });

        const clientIP = await getClientIP();
        const saveResult = SessionStorageManager.saveSession(mockSession);

        expect(clientIP).toBe('127.0.0.1'); // Fallback IP
        expect(saveResult.success).toBe(false); // Storage failure handled
    });
});