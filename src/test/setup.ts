import { vi } from 'vitest'

// Mock localStorage
const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: mockStorage })

// Mock crypto for session ID generation
Object.defineProperty(global, 'crypto', {
    value: {
        getRandomValues: vi.fn((arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256)
            }
            return arr
        }),
    },
})

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        href: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
    },
    writable: true,
})

// Mock window.history
Object.defineProperty(window, 'history', {
    value: {
        replaceState: vi.fn(),
        pushState: vi.fn(),
        back: vi.fn(),
    },
    writable: true,
})

// Mock window.screen
Object.defineProperty(window, 'screen', {
    value: {
        width: 1920,
        height: 1080,
    },
    writable: true,
})

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
    value: 'Test Browser',
    writable: true,
})

// Mock Intl.DateTimeFormat
Object.defineProperty(Intl, 'DateTimeFormat', {
    value: vi.fn(() => ({
        resolvedOptions: vi.fn(() => ({
            timeZone: 'America/New_York',
        })),
    })),
    writable: true,
})

// Mock fetch
global.fetch = vi.fn()

// Mock base64 functions
global.atob = vi.fn((str: string) => {
    return Buffer.from(str, 'base64').toString('binary')
})

global.btoa = vi.fn((str: string) => {
    return Buffer.from(str, 'binary').toString('base64')
})

// Mock TextEncoder
global.TextEncoder = vi.fn(() => ({
    encode: vi.fn((str: string) => new Uint8Array(Buffer.from(str, 'utf8'))),
})) as any