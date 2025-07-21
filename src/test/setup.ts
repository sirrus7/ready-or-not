/**
 * Vitest Test Setup
 *
 * This file configures the global test environment for all tests.
 * Referenced in vitest.config.ts as setupFiles: ['./src/test/setup.ts']
 *
 * File location: src/test/setup.ts
 */

import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// =====================================================
// GLOBAL TEST ENVIRONMENT SETUP
// =====================================================

// Configure global test environment
globalThis.console = {
    ...globalThis.console,
    // Suppress console warnings in tests (optional)
    warn: vi.fn(),
    error: vi.fn(),
};

// =====================================================
// GLOBAL MOCK CLEANUP
// Additional safety net beyond vitest config settings
// =====================================================

afterEach(() => {
    // React Testing Library cleanup
    cleanup();

    // Explicit mock cleanup (redundant with config but ensures reliability)
    vi.clearAllMocks();

    // Clear any lingering timers
    vi.clearAllTimers();
});

// =====================================================
// BROWSER API MOCKS
// Mock browser APIs that aren't available in test environment
// =====================================================

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Mock sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
};

Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
});

// Mock window.location
const mockLocation = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

// Mock window.history
const mockHistory = {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    length: 1,
    state: null
};

Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true
});

// Mock fetch if needed
globalThis.fetch = vi.fn();

// =====================================================
// VITEST CONFIGURATION VERIFICATION
// Log settings to verify configuration is working
// =====================================================

if (process.env.NODE_ENV === 'test') {
    console.log('✅ Vitest test setup loaded successfully');
    console.log('✅ Mock cleanup configuration active');
    console.log('✅ Browser API mocks initialized');
}