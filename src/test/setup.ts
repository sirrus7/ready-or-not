/**
 * Test Setup Configuration - Fixed Version
 * Global test setup with proper mocking and cleanup
 *
 * File: src/test/setup.ts
 */

import { vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'

// =====================================================
// GLOBAL MOCKS
// =====================================================

// Mock localStorage with proper implementation
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
        }),
        key: vi.fn((index: number) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        }),
        get length() {
            return Object.keys(store).length;
        }
    };
};

const mockLocalStorage = createMockLocalStorage();

Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

// Mock window.location
const mockLocation = {
    href: 'http://localhost:3000',
    search: '',
    pathname: '/',
    hostname: 'localhost',
    port: '3000',
    protocol: 'http:',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

Object.defineProperty(global, 'location', {
    value: mockLocation,
    writable: true
});

// Mock window.history
const mockHistory = {
    replaceState: vi.fn(),
    pushState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    length: 1,
    scrollRestoration: 'auto' as ScrollRestoration,
    state: null
};

Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true
});

// Mock window.screen
Object.defineProperty(window, 'screen', {
    value: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24
    },
    writable: true
});

// Mock window.navigator
Object.defineProperty(window, 'navigator', {
    value: {
        userAgent: 'Test Browser',
        language: 'en-US',
        platform: 'Test Platform',
        cookieEnabled: true,
        onLine: true
    },
    writable: true
});

// Mock Intl for timezone support
const mockDateTimeFormat = vi.fn().mockImplementation(() => ({
    resolvedOptions: () => ({ timeZone: 'America/New_York' }),
    format: vi.fn().mockReturnValue('1/1/2023, 12:00:00 PM'),
    formatToParts: vi.fn()
}));

const mockNumberFormat = vi.fn().mockImplementation(() => ({
    format: vi.fn().mockReturnValue('1,000'),
    formatToParts: vi.fn()
}));

global.Intl = {
    DateTimeFormat: mockDateTimeFormat,
    NumberFormat: mockNumberFormat,
    Collator: vi.fn(),
    PluralRules: vi.fn(),
    RelativeTimeFormat: vi.fn(),
    ListFormat: vi.fn(),
    Locale: vi.fn(),
    Segmenter: vi.fn(),
    getCanonicalLocales: vi.fn(),
    supportedValuesOf: vi.fn()
} as typeof Intl;

// Mock fetch for IP detection
global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ ip: '192.168.1.100' }),
    ok: true,
    status: 200
} as Response);

// Mock console methods to reduce test noise
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// =====================================================
// GLOBAL TEST SETUP
// =====================================================

beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset localStorage
    mockLocalStorage.clear();

    // Reset location
    mockLocation.href = 'http://localhost:3000';
    mockLocation.search = '';
    mockLocation.pathname = '/';

    // Reset history
    mockHistory.replaceState.mockClear();
    mockHistory.pushState.mockClear();

    // Mock console to reduce noise during tests
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
    console.debug = vi.fn();
});

afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;

    // Clear any pending timers
    vi.clearAllTimers();
    vi.useRealTimers();

    // Clear any pending intervals/timeouts
    if (typeof window !== 'undefined') {
        // Clear any intervals that might still be running
        for (let i = 1; i < 1000; i++) {
            clearInterval(i);
            clearTimeout(i);
        }
    }
});

// =====================================================
// ERROR HANDLING
// =====================================================

// Catch unhandled promise rejections during tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't throw in tests, just log
});

// Catch uncaught exceptions during tests
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't throw in tests, just log
});

// =====================================================
// TEST UTILITIES
// =====================================================

// Export utilities for tests
export const testUtils = {
    mockLocalStorage,
    mockLocation,
    mockHistory,
    resetMocks: () => {
        vi.clearAllMocks();
        mockLocalStorage.clear();
        mockLocation.search = '';
        mockLocation.pathname = '/';
    },
    setLocation: (search: string, pathname = '/') => {
        mockLocation.search = search;
        mockLocation.pathname = pathname;
        mockLocation.href = `http://localhost:3000${pathname}${search}`;
    }
};

// Global test data
export const testData = {
    mockUser: {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'host' as const,
        games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
    },
    mockSession: {
        session_id: 'session-123',
        user_id: 'user-123',
        email: 'test@example.com',
        permission_level: 'host',
        expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
        game_context: {}
    }
};