/**
 * Quick SSO Verification Test
 * Run this to verify the exact issue with the current implementation
 *
 * File: src/components/auth/__tests__/QuickVerification.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SSOProvider, useSSO } from '../SSOProvider';
import { ssoService } from '../../../services/sso-service';
import React from 'react';

// Mock setup
vi.mock('../../../services/sso-service', () => ({
    ssoService: {
        authenticateWithSSO: vi.fn()
    }
}));

vi.mock('../SessionStorageManager', () => ({
    SessionStorageManager: {
        saveSession: vi.fn().mockReturnValue({ success: true }),
        loadSession: vi.fn().mockReturnValue(null),
        clearSession: vi.fn(),
        getSessionInfo: vi.fn().mockReturnValue({ hasSession: false })
    },
    getClientIP: vi.fn().mockResolvedValue('192.168.1.100'),
    getBrowserInfo: vi.fn().mockReturnValue('Test Browser')
}));

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'host' as const,
    games: [{ name: 'ready-or-not', permission_level: 'host' as const }]
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
    game_context: {}
};

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <SSOProvider>{children}</SSOProvider>
);

describe('Quick SSO Verification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('VERIFICATION: Does authenticateWithSSO get called at all?', async () => {
        console.log('🔍 Testing if authenticateWithSSO gets called...');

        // Set up successful mock
        vi.mocked(ssoService.authenticateWithSSO).mockResolvedValue({
            valid: true,
            user: mockUser,
            session: mockSession,
            message: 'Success'
        });

        const { result } = renderHook(() => useSSO(), {
            wrapper: createWrapper()
        });

        // Wait for initialization
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        }, { timeout: 2000 });

        console.log('📊 Initial state:', {
            isLoading: result.current.isLoading,
            isAuthenticated: result.current.isAuthenticated,
            user: !!result.current.user,
            error: result.current.error
        });

        // Try to login
        let loginResponse;
        let loginError;

        try {
            await act(async () => {
                loginResponse = await result.current.login('test-token');
            });
        } catch (error) {
            loginError = error;
            console.error('❌ Login threw an error:', error);
        }

        console.log('📊 After login attempt:');
        console.log('  - Login response:', loginResponse);
        console.log('  - Login error:', loginError);
        console.log('  - Service calls:', vi.mocked(ssoService.authenticateWithSSO).mock.calls.length);
        console.log('  - State isAuthenticated:', result.current.isAuthenticated);
        console.log('  - State user:', !!result.current.user);
        console.log('  - State error:', result.current.error);

        if (vi.mocked(ssoService.authenticateWithSSO).mock.calls.length === 0) {
            console.error('💥 CRITICAL ISSUE: authenticateWithSSO was never called!');
            console.error('This means the SSOProvider is not using the correct service method.');
            console.error('The provider might be calling a non-existent "performAuthentication" method.');
        } else {
            console.log('✅ authenticateWithSSO was called');

            if (loginResponse?.valid && !result.current.isAuthenticated) {
                console.error('💥 CRITICAL ISSUE: Service returned valid=true but state is not updated!');
                console.error('This means the SSOProvider is not updating its state after successful authentication.');
            } else if (result.current.isAuthenticated) {
                console.log('✅ Authentication and state update both work correctly!');
            }
        }

        // This test will fail if there are issues, but the console logs will show exactly what's wrong
        expect(vi.mocked(ssoService.authenticateWithSSO).mock.calls.length).toBeGreaterThan(0);
    });
});