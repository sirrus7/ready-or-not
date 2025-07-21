/**
 * Step 1: Mock Isolation Debug & Fix
 * Debugging the "should authenticate successfully with valid token" test
 *
 * File: src/components/auth/__tests__/SSOProvider-debug.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SSOProvider, useSSO } from '../SSOProvider';
import { ssoService } from '../../../services/sso-service';
import React from 'react';

// MOCK SETUP - Same as current version
vi.mock('../../../services/sso-service', () => ({
    ssoService: {
        authenticateWithSSO: vi.fn(),
        validateLocalSession: vi.fn(),
        extendLocalSession: vi.fn(),
        cleanupSession: vi.fn(),
        generateMockUsers: vi.fn(),
        generateMockToken: vi.fn(),
        healthCheck: vi.fn(),
        getActiveSessions: vi.fn()
    }
}));

vi.mock('../SessionStorageManager', () => ({
    SessionStorageManager: {
        saveSession: vi.fn(),
        loadSession: vi.fn(),
        clearSession: vi.fn(),
        getSessionInfo: vi.fn()
    },
    getClientIP: vi.fn(),
    getBrowserInfo: vi.fn(),
    formatSessionExpiry: vi.fn().mockReturnValue('2h 30m'),
    formatTime: vi.fn().mockReturnValue('1/1/2023, 12:00:00 PM')
}));

import { SessionStorageManager, getClientIP, getBrowserInfo } from '../SessionStorageManager';

// Mock window.location
const mockLocation = {
    search: '',
    pathname: '/',
    href: 'http://localhost:3000'
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
});

// TEST DATA
const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
    role: 'host' as const,
    organization_id: 'org-123',
    organization_type: 'school' as const,
    games: [
        { name: 'ready-or-not', permission_level: 'host' as const }
    ],
    school_info: {
        id: 'school-123',
        name: 'Test School',
        district_id: 'district-123',
        district_name: 'Test District'
    },
    metadata: {}
};

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

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <SSOProvider>{children}</SSOProvider>
);

const waitForReady = async (result: { current: ReturnType<typeof useSSO> }) => {
    await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });
};

describe('Step 1: Mock Isolation Debugging', () => {
    beforeEach(() => {
        console.log('🔧 beforeEach: Setting up default mocks...');

        // Clear all mocks
        vi.clearAllMocks();

        // Reset location
        mockLocation.search = '';
        mockLocation.pathname = '/';
        mockLocation.href = 'http://localhost:3000';

        // Set up default mock returns
        vi.mocked(SessionStorageManager.loadSession).mockReturnValue(null);
        vi.mocked(SessionStorageManager.getSessionInfo).mockReturnValue({ hasSession: false });
        vi.mocked(getClientIP).mockResolvedValue('192.168.1.100');
        vi.mocked(getBrowserInfo).mockReturnValue('Test Browser');
        vi.mocked(SessionStorageManager.saveSession).mockReturnValue({ success: true });

        // CRITICAL: Set up default service responses that should be overridden
        const defaultAuthResponse = {
            valid: false,
            error: 'authentication_failed',
            message: 'Authentication failed'
        };

        console.log('🔧 Setting default authenticateWithSSO mock:', defaultAuthResponse);
        vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue(defaultAuthResponse);

        vi.mocked(ssoService.validateLocalSession).mockResolvedValue({
            valid: false,
            error: 'session_invalid',
            message: 'Session not found'
        });

        vi.mocked(ssoService.extendLocalSession).mockResolvedValue({
            success: false,
            error: 'extension_failed'
        });

        vi.mocked(ssoService.cleanupSession).mockResolvedValue({
            success: true,
            message: 'Session cleaned up'
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('DEBUG: should authenticate successfully with valid token', async () => {
        console.log('🔍 TEST START: Debug authentication test');

        // STEP 1: Verify mock setup
        console.log('🔍 Step 1: Checking initial mock state...');

        // Call the mocked function to see what it returns by default
        const defaultResponse = await vi.mocked(ssoService.authenticateWithSSO)('test-token', {});
        console.log('🔍 Default mock response:', defaultResponse);
        expect(defaultResponse.valid).toBe(false); // Should be false from beforeEach

        // STEP 2: Set up per-test mock override
        console.log('🔍 Step 2: Setting up per-test mock override...');

        const successResponse = {
            valid: true,
            user: mockUser,
            session: mockSession,
            message: 'Authentication successful'
        };

        console.log('🔍 Overriding with success response:', successResponse);

        // CRITICAL TEST: Use mockResolvedValueOnce to override default
        vi.mocked(ssoService.authenticateWithSSO).mockResolvedValueOnce(successResponse);

        // STEP 3: Verify override worked
        console.log('🔍 Step 3: Verifying mock override...');

        const overrideResponse = await vi.mocked(ssoService.authenticateWithSSO)('test-token', {});
        console.log('🔍 Override response:', overrideResponse);

        // This should now be true if override worked
        if (overrideResponse.valid) {
            console.log('✅ Mock override SUCCESS: Response is valid=true');
        } else {
            console.log('❌ Mock override FAILED: Response is still valid=false');
            console.log('❌ This means mockResolvedValueOnce is not overriding default mock');
        }

        expect(overrideResponse.valid).toBe(true);

        // STEP 4: Test with React component (if mock override worked)
        console.log('🔍 Step 4: Testing with React component...');

        // Set up another success response for the actual component test
        vi.mocked(ssoService.authenticateWithSSO).mockResolvedValueOnce(successResponse);

        const { result } = renderHook(() => useSSO(), {
            wrapper: createWrapper()
        });

        await waitForReady(result);
        console.log('🔍 Provider initialized, calling login...');

        // Perform authentication
        let loginResponse;
        await act(async () => {
            console.log('🔍 Calling result.current.login...');
            loginResponse = await result.current.login('mock-token');
            console.log('🔍 Login response received:', loginResponse);
        });

        // STEP 5: Debug the response
        if (loginResponse.valid) {
            console.log('✅ LOGIN SUCCESS: Response valid=true');
            console.log('✅ User:', loginResponse.user?.id);
            console.log('✅ Session:', loginResponse.session?.session_id);
        } else {
            console.log('❌ LOGIN FAILED: Response valid=false');
            console.log('❌ Error:', loginResponse.error);
            console.log('❌ Message:', loginResponse.message);
        }

        // The actual assertion that's currently failing
        expect(loginResponse.valid).toBe(true);
        expect(loginResponse.user).toEqual(mockUser);

        // STEP 6: Debug React state
        console.log('🔍 Step 6: Checking React state...');
        console.log('🔍 isAuthenticated:', result.current.isAuthenticated);
        console.log('🔍 user:', result.current.user?.id || 'null');
        console.log('🔍 session:', result.current.session?.session_id || 'null');
        console.log('🔍 error:', result.current.error);

        // Wait for React state updates (this is where the timeout likely occurs)
        try {
            await waitFor(() => {
                console.log('🔍 Waiting for React state update...');
                console.log('🔍 Current isAuthenticated:', result.current.isAuthenticated);
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.user).toEqual(mockUser);
                expect(result.current.session).toEqual(mockSession);
            }, { timeout: 2000 });

            console.log('✅ React state update SUCCESS');
        } catch (error) {
            console.log('❌ React state update FAILED:', error.message);
            console.log('❌ Final state - isAuthenticated:', result.current.isAuthenticated);
            console.log('❌ Final state - user:', result.current.user);
            console.log('❌ Final state - session:', result.current.session);
            throw error;
        }
    });

    // ADDITIONAL DEBUG TESTS

    it('DEBUG: Mock isolation test - direct mock verification', async () => {
        console.log('🔍 DIRECT MOCK TEST: Verifying mock behavior without React');

        // Test 1: Default mock
        console.log('Test 1: Default mock response');
        const defaultResp = await vi.mocked(ssoService.authenticateWithSSO)('token', {});
        console.log('Default response:', defaultResp);
        expect(defaultResp.valid).toBe(false);

        // Test 2: Override with mockResolvedValueOnce
        console.log('Test 2: Override with mockResolvedValueOnce');
        vi.mocked(ssoService.authenticateWithSSO).mockResolvedValueOnce({
            valid: true,
            user: mockUser,
            session: mockSession,
            message: 'Override success'
        });

        const overrideResp = await vi.mocked(ssoService.authenticateWithSSO)('token', {});
        console.log('Override response:', overrideResp);
        expect(overrideResp.valid).toBe(true);

        // Test 3: Next call should revert to default
        console.log('Test 3: Next call should revert to default');
        const revertResp = await vi.mocked(ssoService.authenticateWithSSO)('token', {});
        console.log('Revert response:', revertResp);
        expect(revertResp.valid).toBe(false);
    });

    it('DEBUG: Alternative mock setup patterns', async () => {
        console.log('🔍 ALTERNATIVE MOCK PATTERNS TEST');

        // Pattern 1: mockImplementationOnce
        console.log('Pattern 1: mockImplementationOnce');
        vi.mocked(ssoService.authenticateWithSSO).mockImplementationOnce(async () => ({
            valid: true,
            user: mockUser,
            session: mockSession,
            message: 'Implementation success'
        }));

        const implResp = await vi.mocked(ssoService.authenticateWithSSO)('token', {});
        console.log('Implementation response:', implResp);
        expect(implResp.valid).toBe(true);

        // Pattern 2: mockRestore and mockResolvedValue
        console.log('Pattern 2: mockRestore and mockResolvedValue');
        vi.mocked(ssoService.authenticateWithSSO).mockRestore();
        vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
            valid: true,
            user: mockUser,
            session: mockSession,
            message: 'Restore success'
        });

        const restoreResp = await vi.mocked(ssoService.authenticateWithSSO)('token', {});
        console.log('Restore response:', restoreResp);
        expect(restoreResp.valid).toBe(true);
    });
});