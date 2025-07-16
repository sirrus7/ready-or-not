import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Type definitions for better TypeScript support
interface MockStorage {
    [key: string]: string;
}

interface GlobalWithMocks {
    __mockLocalStorage?: MockStorage;
    __testUtils?: {
        mockLocalStorage: Storage;
        mockLocation: Location;
        originalConsole: Console;
        resetMocks: () => void;
    };
}

// Mock localStorage with proper implementation
const mockLocalStorage: Storage = {
    getItem: vi.fn((key: string) => {
        const storage: MockStorage = (globalThis as GlobalWithMocks).__mockLocalStorage || {};
        return storage[key] || null;
    }),
    setItem: vi.fn((key: string, value: string) => {
        const storage: MockStorage = (globalThis as GlobalWithMocks).__mockLocalStorage || {};
        storage[key] = value;
        (globalThis as GlobalWithMocks).__mockLocalStorage = storage;
    }),
    removeItem: vi.fn((key: string) => {
        const storage: MockStorage = (globalThis as GlobalWithMocks).__mockLocalStorage || {};
        delete storage[key];
        (globalThis as GlobalWithMocks).__mockLocalStorage = storage;
    }),
    clear: vi.fn(() => {
        (globalThis as GlobalWithMocks).__mockLocalStorage = {};
    }),
    key: vi.fn((index: number) => {
        const storage: MockStorage = (globalThis as GlobalWithMocks).__mockLocalStorage || {};
        const keys = Object.keys(storage);
        return keys[index] || null;
    }),
    length: 0
};

// Define length as a getter
Object.defineProperty(mockLocalStorage, 'length', {
    get: () => {
        const storage: MockStorage = (globalThis as GlobalWithMocks).__mockLocalStorage || {};
        return Object.keys(storage).length;
    }
});

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

// Mock sessionStorage similarly
Object.defineProperty(window, 'sessionStorage', {
    value: mockLocalStorage,
    writable: true
});

// Mock crypto for session ID generation
Object.defineProperty(global, 'crypto', {
    value: {
        getRandomValues: vi.fn((arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
        }),
        randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9))
    } as Crypto,
    writable: true
});

// Mock window.location
const mockLocation: Location = {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    toString: vi.fn(() => 'http://localhost:3000')
} as Location;

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

// Mock window.history
Object.defineProperty(window, 'history', {
    value: {
        replaceState: vi.fn(),
        pushState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        go: vi.fn(),
        length: 1,
        state: null,
        scrollRestoration: 'auto'
    } as History,
    writable: true
});

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
    value: 'Test Browser',
    writable: true
});

// Mock fetch
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    } as Response)
);

// Mock base64 functions
global.atob = vi.fn((str: string) => {
    return Buffer.from(str, 'base64').toString('binary');
});

global.btoa = vi.fn((str: string) => {
    return Buffer.from(str, 'binary').toString('base64');
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = vi.fn(() => ({
    encode: vi.fn((str: string) => new Uint8Array(Buffer.from(str, 'utf8'))),
})) as unknown as typeof TextEncoder;

global.TextDecoder = vi.fn(() => ({
    decode: vi.fn((buffer: Uint8Array) => Buffer.from(buffer).toString('utf8'))
})) as unknown as typeof TextDecoder;

// Store original console for reference
const originalConsole = { ...console };

// Mock console for cleaner output
console.warn = vi.fn();
console.error = vi.fn();

// Global test utilities - ALL VARIABLES PROPERLY TYPED
(globalThis as GlobalWithMocks).__testUtils = {
    mockLocalStorage,
    mockLocation,
    originalConsole,
    resetMocks: () => {
        vi.clearAllMocks();
        (globalThis as GlobalWithMocks).__mockLocalStorage = {};
        mockLocation.href = 'http://localhost:3000';
        mockLocation.pathname = '/';
        mockLocation.search = '';
        mockLocation.hash = '';
    }
};

// Initialize storage
(globalThis as GlobalWithMocks).__mockLocalStorage = {};