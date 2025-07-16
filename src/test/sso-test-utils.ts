/**
 * Test Utilities and Helpers
 * Shared testing utilities for Phase 3 SSO tests
 *
 * File: src/test/sso-test-utils.ts
 */

import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SSOProvider } from '../components/auth/SSOProvider';
import { ssoService } from '../services/sso-service';
import { vi } from 'vitest';
import React from 'react';

// =====================================================
// MOCK DATA GENERATORS
// =====================================================

export const createMockUser = (overrides: Partial<any> = {}) => {
    const roles = ['host', 'org_admin', 'super_admin'] as const;
    const role = overrides.role || 'host';

    return {
        id: `user-${role}-${Date.now()}`,
        email: `test-${role}@example.com`,
        full_name: `Test ${role.replace('_', ' ')} User`,
        first_name: 'Test',
        last_name: `${role.replace('_', ' ')} User`,
        role,
        organization_id: role !== 'host' ? 'org-123' : undefined,
        organization_type: role === 'host' ? 'school' : 'district',
        games: [
            { name: 'ready-or-not', permission_level: role }
        ],
        district_info: role !== 'host' ? {
            id: 'district-123',
            name: 'Test District',
            state: 'CA'
        } : undefined,
        school_info: role === 'host' ? {
            id: 'school-123',
            name: 'Test School',
            district_id: 'district-123',
            district_name: 'Test District'
        } : undefined,
        metadata: {
            created_for: 'testing',
            mock: true
        },
        ...overrides
    };
};

export const createMockSession = (user: any, overrides: Partial<any> = {}) => ({
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
        entry_point: 'test'
    },
    ...overrides
});

export const createMockToken = (user: any) => {
    const payload = {
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        organization_id: user.organization_id,
        organization_type: user.organization_type,
        games: user.games,
        district_info: user.district_info,
        school_info: user.school_info,
        exp: Math.floor(Date.now() / 1000) + 8 * 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'global-game-loader',
        aud: 'ready-or-not'
    };

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadEncoded = btoa(JSON.stringify(payload));
    const signature = 'mock-signature-for-testing';

    return `${header}.${payloadEncoded}.${signature}`;
};

export const createExpiredToken = (user: any) => {
    const payload = {
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200
    };

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadEncoded = btoa(JSON.stringify(payload));
    const signature = 'mock-signature-expired';

    return `${header}.${payloadEncoded}.${signature}`;
};

export const createInvalidToken = () => {
    return 'invalid.token.format';
};

// =====================================================
// MOCK SETUP UTILITIES
// =====================================================

export const setupSSOServiceMocks = () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default successful mocks
    vi.mocked(ssoService.healthCheck).mockResolvedValue({
        healthy: true,
        database: true,
        functions: true,
        message: 'All systems operational',
        timestamp: new Date().toISOString()
    });

    vi.mocked(ssoService.getActiveSessions).mockResolvedValue({
        sessions: []
    });

    vi.mocked(ssoService.cleanupSession).mockResolvedValue({
        success: true
    });

    vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
        valid: true,
        session: createMockSession(createMockUser()),
        message: 'Session extended'
    });

    return {
        mockAuthentication: (response: any) => {
            vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue(response);
        },
        mockValidation: (response: any) => {
            vi.mocked(ssoService.validateLocalSession).mockResolvedValue(response);
        },
        mockHealthCheck: (response: any) => {
            vi.mocked(ssoService.healthCheck).mockResolvedValue(response);
        },
        mockActiveSessions: (sessions: any[]) => {
            vi.mocked(ssoService.getActiveSessions).mockResolvedValue({ sessions });
        },
        mockCleanup: (response: any) => {
            vi.mocked(ssoService.cleanupSession).mockResolvedValue(response);
        },
        mockExtendSession: (response: any) => {
            vi.mocked(ssoService.extendLocalSession).mockResolvedValue(response);
        }
    };
};

export const setupLocalStorageMocks = () => {
    const mockStorage = new Map<string, string>();

    const localStorageMock = {
        getItem: vi.fn((key: string) => mockStorage.get(key) || null),
        setItem: vi.fn((key: string, value: string) => {
            mockStorage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            mockStorage.delete(key);
        }),
        clear: vi.fn(() => {
            mockStorage.clear();
        })
    };

    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
    });

    return {
        mockStorage,
        getStoredSession: () => {
            const stored = mockStorage.get('ready_or_not_sso_session');
            return stored ? JSON.parse(stored) : null;
        },
        setStoredSession: (sessionId: string, user: any) => {
            const sessionData = {
                version: '1.0',
                session_id: sessionId,
                user: user,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            };
            mockStorage.set('ready_or_not_sso_session', JSON.stringify(sessionData));
        }
    };
};

export const setupWindowMocks = () => {
    const mockLocation = {
        href: 'http://localhost:3000',
        search: '',
        pathname: '/',
        hostname: 'localhost',
        port: '3000',
        protocol: 'http:',
        assign: vi.fn(),
        reload: vi.fn()
    };

    const mockHistory = {
        replaceState: vi.fn(),
        pushState: vi.fn(),
        back: vi.fn()
    };

    Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
    });

    Object.defineProperty(window, 'history', {
        value: mockHistory,
        writable: true
    });

    return {
        mockLocation,
        mockHistory,
        setUrlToken: (token: string) => {
            mockLocation.search = `?sso_token=${token}`;
        },
        clearUrl: () => {
            mockLocation.search = '';
            mockLocation.pathname = '/';
        }
    };
};

// =====================================================
// RENDER UTILITIES
// =====================================================

interface CustomRenderOptions extends RenderOptions {
    initialEntries?: string[];
    user?: any;
    session?: any;
    ssoMocks?: any;
}

export const renderWithSSO = (
    ui: React.ReactElement,
    options: CustomRenderOptions = {}
) => {
    const {
        initialEntries = ['/'],
        user,
        session,
        ssoMocks,
        ...renderOptions
    } = options;

    // Setup mocks if provided
    if (ssoMocks) {
        Object.entries(ssoMocks).forEach(([key, value]) => {
            if (typeof value === 'function') {
                vi.mocked(ssoService[key as keyof typeof ssoService]).mockImplementation(value);
            } else {
                vi.mocked(ssoService[key as keyof typeof ssoService]).mockResolvedValue(value);
            }
        });
    }

    // Setup localStorage if user/session provided
    if (user || session) {
        const { setStoredSession } = setupLocalStorageMocks();
        if (user && session) {
            setStoredSession(session.session_id, user);
        }
    }

    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <MemoryRouter initialEntries={initialEntries}>
            <SSOProvider>
                {children}
            </SSOProvider>
            </MemoryRouter>
    );

    return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export const renderWithRouter = (
    ui: React.ReactElement,
    options: { initialEntries?: string[] } = {}
) => {
    const { initialEntries = ['/'] } = options;

    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <MemoryRouter initialEntries={initialEntries}>
            {children}
            </MemoryRouter>
    );

    return render(ui, { wrapper: Wrapper });
};

// =====================================================
// ASSERTION UTILITIES
// =====================================================

export const expectAuthenticatedState = (user: any, session: any) => {
    expect(user).toBeTruthy();
    expect(user.email).toBe(session.email);
    expect(user.role).toBe(session.permission_level);
    expect(session.is_active).toBe(true);
};

export const expectUnauthenticatedState = (user: any, session: any) => {
    expect(user).toBeNull();
    expect(session).toBeNull();
};

export const expectPermissionLevel = (user: any, expectedRole: string) => {
    expect(user.role).toBe(expectedRole);
};

export const expectStoredSession = (sessionId: string, userEmail: string) => {
    const stored = localStorage.getItem('ready_or_not_sso_session');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.session_id).toBe(sessionId);
    expect(parsed.user.email).toBe(userEmail);
};

export const expectNoStoredSession = () => {
    const stored = localStorage.getItem('ready_or_not_sso_session');
    expect(stored).toBeNull();
};

// =====================================================
// WAIT UTILITIES
// =====================================================

export const waitForAuthentication = async (screen: any, timeout: number = 5000) => {
    return new Promise<void>((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            if (Date.now() - startTime > timeout) {
                reject(new Error('Authentication timeout'));
                return;
            }

            try {
                // Check if loading is gone and either authenticated or login screen is shown
                const loading = screen.queryByText('Loading...');
                if (!loading) {
                    const dashboard = screen.queryByText('Ready or Not - Dashboard');
                    const loginScreen = screen.queryByText('Sign in to your account');

                    if (dashboard || loginScreen) {
                        resolve();
                        return;
                    }
                }
            } catch (error) {
                // Continue checking
            }

            setTimeout(check, 100);
        };

        check();
    });
};

export const waitForError = async (screen: any, expectedError: string, timeout: number = 5000) => {
    return new Promise<void>((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            if (Date.now() - startTime > timeout) {
                reject(new Error('Error timeout'));
                return;
            }

            try {
                const errorElement = screen.queryByText(expectedError);
                if (errorElement) {
                    resolve();
                    return;
                }
            } catch (error) {
                // Continue checking
            }

            setTimeout(check, 100);
        };

        check();
    });
};

// =====================================================
// SCENARIO BUILDERS
// =====================================================

export class TestScenarioBuilder {
    private scenario: any = {};

    static create() {
        return new TestScenarioBuilder();
    }

    withUser(role: 'host' | 'org_admin' | 'super_admin', overrides: any = {}) {
        this.scenario.user = createMockUser({ role, ...overrides });
        return this;
    }

    withSession(overrides: any = {}) {
        if (!this.scenario.user) {
            throw new Error('User must be set before session');
        }
        this.scenario.session = createMockSession(this.scenario.user, overrides);
        return this;
    }

    withToken(expired: boolean = false) {
        if (!this.scenario.user) {
            throw new Error('User must be set before token');
        }
        this.scenario.token = expired
            ? createExpiredToken(this.scenario.user)
            : createMockToken(this.scenario.user);
        return this;
    }

    withStoredSession() {
        if (!this.scenario.user || !this.scenario.session) {
            throw new Error('User and session must be set before stored session');
        }
        const { setStoredSession } = setupLocalStorageMocks();
        setStoredSession(this.scenario.session.session_id, this.scenario.user);
        return this;
    }

    withUrlToken() {
        if (!this.scenario.token) {
            throw new Error('Token must be set before URL token');
        }
        const { setUrlToken } = setupWindowMocks();
        setUrlToken(this.scenario.token);
        return this;
    }

    withMocks(mocks: any = {}) {
        this.scenario.mocks = mocks;
        return this;
    }

    build() {
        return this.scenario;
    }
}

// =====================================================
// COMMON TEST SCENARIOS
// =====================================================

export const createHostLoginScenario = () => {
    return TestScenarioBuilder.create()
        .withUser('host')
        .withSession()
        .withToken()
        .build();
};

export const createOrgAdminLoginScenario = () => {
    return TestScenarioBuilder.create()
        .withUser('org_admin')
        .withSession()
        .withToken()
        .build();
};

export const createSuperAdminLoginScenario = () => {
    return TestScenarioBuilder.create()
        .withUser('super_admin')
        .withSession()
        .withToken()
        .build();
};

export const createExpiredTokenScenario = () => {
    return TestScenarioBuilder.create()
        .withUser('host')
        .withSession()
        .withToken(true)
        .build();
};

export const createStoredSessionScenario = () => {
    return TestScenarioBuilder.create()
        .withUser('host')
        .withSession()
        .withStoredSession()
        .build();
};

// =====================================================
// PERFORMANCE TESTING UTILITIES
// =====================================================

export const measureRenderTime = async (renderFunction: () => void): Promise<number> => {
    const start = performance.now();
    await renderFunction();
    const end = performance.now();
    return end - start;
};

export const measureAuthenticationTime = async (
    authenticateFunction: () => Promise<void>
): Promise<number> => {
    const start = performance.now();
    await authenticateFunction();
    const end = performance.now();
    return end - start;
};

// =====================================================
// DEBUGGING UTILITIES
// =====================================================

export const debugSSOState = (screen: any) => {
    console.log('=== SSO STATE DEBUG ===');
    console.log('Current DOM:', screen.container.innerHTML);
    console.log('LocalStorage:', Object.fromEntries(
        Object.entries(localStorage).map(([key, value]) => [key, value])
    ));
    console.log('URL:', window.location.href);
    console.log('======================');
};

export const logTestProgress = (testName: string, step: string) => {
    if (process.env.NODE_ENV === 'test' && process.env.VERBOSE === 'true') {
        console.log(`[${testName}] ${step}`);
    }
};

// =====================================================
// CLEANUP UTILITIES
// =====================================================

export const cleanupAfterTest = () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();

    // Reset window mocks
    const { clearUrl } = setupWindowMocks();
    clearUrl();

    // Clear timers
    vi.clearAllTimers();
};

// =====================================================
// EXPORT ALL UTILITIES
// =====================================================

export default {
    // Mock generators
    createMockUser,
    createMockSession,
    createMockToken,
    createExpiredToken,
    createInvalidToken,

    // Mock setup
    setupSSOServiceMocks,
    setupLocalStorageMocks,
    setupWindowMocks,

    // Render utilities
    renderWithSSO,
    renderWithRouter,

    // Assertions
    expectAuthenticatedState,
    expectUnauthenticatedState,
    expectPermissionLevel,
    expectStoredSession,
    expectNoStoredSession,

    // Wait utilities
    waitForAuthentication,
    waitForError,

    // Scenario builders
    TestScenarioBuilder,
    createHostLoginScenario,
    createOrgAdminLoginScenario,
    createSuperAdminLoginScenario,
    createExpiredTokenScenario,
    createStoredSessionScenario,

    // Performance
    measureRenderTime,
    measureAuthenticationTime,

    // Debugging
    debugSSOState,
    logTestProgress,

    // Cleanup
    cleanupAfterTest
};