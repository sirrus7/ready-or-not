/**
 * SSO Test Utilities
 * Helper functions and mocks for SSO testing
 *
 * File: src/test/sso-test-utils.ts
 */

import { vi } from 'vitest';
import { SSOUser } from '../services/sso-service';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface MockSSOService {
    authenticateWithSSO: ReturnType<typeof vi.fn>;
    validateLocalSession: ReturnType<typeof vi.fn>;
    extendLocalSession: ReturnType<typeof vi.fn>;
    cleanupSession: ReturnType<typeof vi.fn>;
    generateMockUsers: ReturnType<typeof vi.fn>;
    generateMockToken: ReturnType<typeof vi.fn>;
    healthCheck: ReturnType<typeof vi.fn>;
    getActiveSessions: ReturnType<typeof vi.fn>;
}

interface MockSessionStorage {
    saveSession: ReturnType<typeof vi.fn>;
    loadSession: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
    getSessionInfo: ReturnType<typeof vi.fn>;
}

interface TestResult {
    current: {
        isAuthenticated: boolean;
        isLoading: boolean;
        user: SSOUser | null;
        session: unknown | null;
        error: string | null;
    };
}

export const createMockUser = (role: 'host' | 'org_admin' | 'super_admin' = 'host'): SSOUser => ({
    id: `user-${role}-${Date.now()}`,
    email: `${role}@example.com`,
    full_name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
    role,
    games: [
        { name: 'ready-or-not', permission_level: role },
        { name: 'test-game', permission_level: role }
    ],
    organization_type: role === 'host' ? 'school' : 'district',
    district_info: role !== 'host' ? {
        id: 'district-123',
        name: 'Test District',
        state: 'CA'
    } : undefined,
    school_info: role === 'host' ? {
        id: 'school-456',
        name: 'Test School',
        district_id: 'district-123'
    } : undefined
});

export const createMockSession = (user: SSOUser) => ({
    session_id: `session-${user.id}-${Date.now()}`,
    user_id: user.id,
    email: user.email,
    permission_level: user.role,
    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    is_active: true,
    game_context: {
        game: 'ready-or-not',
        version: '2.0',
        user_role: user.role,
        organization_type: user.organization_type
    }
});

export const createMockToken = (user: SSOUser): string => {
    const payload = {
        user_id: user.id,
        email: user.email,
        role: user.role,
        games: user.games,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        iat: Math.floor(Date.now() / 1000)
    };

    // Simple mock JWT structure
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';

    return `${header}.${encodedPayload}.${signature}`;
};

// =====================================================
// MOCK FACTORIES
// =====================================================

export const createMockSSOService = (): MockSSOService => ({
    authenticateWithSSO: vi.fn(),
    validateLocalSession: vi.fn(),
    extendLocalSession: vi.fn(),
    cleanupSession: vi.fn(),
    generateMockUsers: vi.fn().mockReturnValue([
        createMockUser('host'),
        createMockUser('org_admin'),
        createMockUser('super_admin')
    ]),
    generateMockToken: vi.fn().mockImplementation(createMockToken),
    healthCheck: vi.fn().mockResolvedValue({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
    }),
    getActiveSessions: vi.fn().mockResolvedValue([])
});

export const createMockSessionStorage = (): MockSessionStorage => ({
    saveSession: vi.fn().mockReturnValue({ success: true }),
    loadSession: vi.fn().mockReturnValue(null),
    clearSession: vi.fn(),
    getSessionInfo: vi.fn().mockReturnValue({
        hasSession: false,
        sessionAge: 0,
        userEmail: undefined
    })
});

// =====================================================
// TEST HELPERS
// =====================================================

export const waitForAuthenticationState = async (
    result: TestResult,
    expected: { isAuthenticated: boolean; isLoading: boolean },
    timeout = 5000
): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (
            result.current.isAuthenticated === expected.isAuthenticated &&
            result.current.isLoading === expected.isLoading
        ) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    throw new Error(
        `Timeout waiting for authentication state. Expected: ${JSON.stringify(expected)}, ` +
        `Got: { isAuthenticated: ${result.current.isAuthenticated}, isLoading: ${result.current.isLoading} }`
    );
};

export const setupMockAuthentication = (
    ssoService: MockSSOService,
    user: SSOUser = createMockUser(),
    shouldSucceed = true
) => {
    const mockSession = createMockSession(user);

    if (shouldSucceed) {
        ssoService.authenticateWithSSO.mockResolvedValue({
            valid: true,
            user,
            session: mockSession,
            message: 'Authentication successful'
        });

        ssoService.validateLocalSession.mockResolvedValue({
            valid: true,
            user,
            session: mockSession,
            message: 'Session valid'
        });

        ssoService.extendLocalSession.mockResolvedValue({
            success: true,
            session: {
                ...mockSession,
                expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString()
            }
        });

        ssoService.cleanupSession.mockResolvedValue({
            success: true,
            message: 'Session cleaned up'
        });
    } else {
        ssoService.authenticateWithSSO.mockResolvedValue({
            valid: false,
            error: 'authentication_failed',
            message: 'Invalid credentials'
        });

        ssoService.validateLocalSession.mockResolvedValue({
            valid: false,
            error: 'session_invalid',
            message: 'Session not found'
        });

        ssoService.extendLocalSession.mockResolvedValue({
            success: false,
            error: 'extension_failed'
        });

        ssoService.cleanupSession.mockResolvedValue({
            success: false,
            error: 'cleanup_failed'
        });
    }

    return { user, session: mockSession };
};

export const mockUrlWithToken = (token: string): void => {
    const mockLocation = window.location as Location & {
        search: string;
        href: string;
    };
    mockLocation.search = `?sso_token=${token}`;
    mockLocation.href = `http://localhost:3000/?sso_token=${token}`;
};

export const clearUrlToken = (): void => {
    const mockLocation = window.location as Location & {
        search: string;
        href: string;
    };
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';
};

// =====================================================
// ASSERTION HELPERS
// =====================================================

export const expectAuthenticatedState = (result: TestResult, user: SSOUser): void => {
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(user);
    expect(result.current.session).toBeDefined();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
};

export const expectUnauthenticatedState = (result: TestResult): void => {
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(false);
};

export const expectLoadingState = (result: TestResult): void => {
    expect(result.current.isLoading).toBe(true);
};

// =====================================================
// CLEANUP HELPERS
// =====================================================

export const cleanupAsyncOperations = (): void => {
    // Clear any pending timers
    vi.clearAllTimers();

    // Clear any pending intervals
    for (let i = 1; i < 1000; i++) {
        clearInterval(i);
        clearTimeout(i);
    }

    // Reset fake timers
    vi.useRealTimers();
};

export const setupTimerMocks = () => {
    vi.useFakeTimers();
    return {
        advanceTime: (ms: number): void => vi.advanceTimersByTime(ms),
        cleanup: (): void => {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    };
};

// =====================================================
// MOCK ENVIRONMENT SETUP
// =====================================================

export const setupTestEnvironment = () => {
    // Mock window properties needed for SSO
    Object.defineProperty(window, 'screen', {
        value: { width: 1920, height: 1080 },
        writable: true
    });

    // Mock Intl for timezone detection
    const mockDateTimeFormat = vi.fn().mockImplementation(() => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' })
    }));

    global.Intl = {
        DateTimeFormat: mockDateTimeFormat,
        NumberFormat: vi.fn(),
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
        ok: true
    } as Response);

    return {
        cleanup: (): void => {
            vi.clearAllMocks();
        }
    };
};