/**
 * SSO Provider - Complete Implementation with SessionStorageManager Alignment
 * Ready-or-Not SSO Authentication Provider
 *
 * File: src/components/auth/SSOProvider.tsx
 *
 * ✅ ALIGNED: Updated to work with new SessionStorageManager interface
 * ✅ Method signatures match aligned utility layer
 * ✅ Proper LocalSession handling throughout
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ssoService, SSOUser, ValidationResponse } from '../../services/sso-service';
import { SessionStorageManager, getClientIP, getBrowserInfo, LocalSession } from './SessionStorageManager';

// =====================================================
// INTERFACES
// =====================================================

// ✅ ALIGNED: Use LocalSession type from SessionStorageManager
type SSOSession = LocalSession;

interface SSOContextType {
    user: SSOUser | null;
    session: SSOSession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (token: string) => Promise<ValidationResponse>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
    extendSession: (hours?: number) => Promise<{ success: boolean; error?: string }>;
    hasPermission: (requiredRole: 'super_admin' | 'org_admin' | 'host') => boolean;
    hasGameAccess: (gameName: string) => boolean;
    getSessionInfo: () => { hasSession: boolean; sessionAge?: number; userEmail?: string };
    clearError: () => void;
}

const SSOContext = createContext<SSOContextType | undefined>(undefined);

// =====================================================
// PROVIDER COMPONENT
// =====================================================

export const SSOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State
    const [user, setUser] = useState<SSOUser | null>(null);
    const [session, setSession] = useState<SSOSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const initializationStarted = useRef(false);
    const sessionExtensionTimer = useRef<NodeJS.Timeout | null>(null);

    // =====================================================
    // UTILITY FUNCTIONS (NO DEPENDENCIES)
    // =====================================================

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const getSessionInfo = useCallback(() => {
        return SessionStorageManager.getSessionInfo();
    }, []);

    // =====================================================
    // PERMISSION CHECKING
    // =====================================================

    const hasPermission = useCallback((requiredRole: 'super_admin' | 'org_admin' | 'host'): boolean => {
        if (!user || !user.role) return false;

        const roleHierarchy = ['host', 'org_admin', 'super_admin'];
        const userRoleIndex = roleHierarchy.indexOf(user.role);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

        return userRoleIndex >= requiredRoleIndex;
    }, [user]);

    const hasGameAccess = useCallback((gameName: string): boolean => {
        if (!user || !user.games) return false;
        return user.games.some(game => game.name === gameName);
    }, [user]);

    // =====================================================
    // SESSION MANAGEMENT UTILITIES
    // =====================================================

    const setupSessionRefresh = useCallback(() => {
        if (sessionExtensionTimer.current) {
            clearInterval(sessionExtensionTimer.current);
        }

        // Set up automatic session refresh every 30 minutes
        sessionExtensionTimer.current = setInterval(async () => {
            if (session?.session_id) {
                try {
                    const validation = await ssoService.validateLocalSession(session.session_id);
                    if (validation.valid && validation.user && validation.session) {
                        setUser(validation.user);
                        setSession(validation.session);
                        // ✅ ALIGNED: Use new method signature
                        SessionStorageManager.saveSession(validation.session);
                    } else {
                        // Session is no longer valid, logout
                        await logout();
                    }
                } catch (err) {
                    console.error('Automatic session refresh failed:', err);
                }
            }
        }, 30 * 60 * 1000); // 30 minutes
    }, [session?.session_id]);

    // =====================================================
    // URL TOKEN PROCESSING
    // =====================================================

    const processURLToken = useCallback(async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('sso_token');

            if (token && token.trim() !== '') {
                console.log('Processing URL token...');

                // Clear the token from URL immediately
                urlParams.delete('sso_token');
                const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
                window.history.replaceState({}, '', newUrl);

                // Authenticate with the token
                const result = await login(token);
                return result;
            }

            return null;
        } catch (error) {
            console.error('URL token processing error:', error);
            return null;
        }
    }, []);

    // =====================================================
    // AUTHENTICATION METHODS
    // =====================================================

    const login = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await ssoService.authenticateWithSSO(token, {
                ip_address: await getClientIP(),
                user_agent: getBrowserInfo(),
                game_context: {
                    game: 'ready-or-not',
                    source: 'browser',
                    timestamp: new Date().toISOString()
                }
            });

            if (response.valid && response.user && response.session) {
                setUser(response.user);
                setSession(response.session);

                // ✅ ALIGNED: Use new method signature - pass session object directly
                SessionStorageManager.saveSession(response.session);

                setupSessionRefresh();
                return response;
            } else {
                setError(response.message || 'Authentication failed');
                return response;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            setError(errorMessage);
            return {
                valid: false,
                error: 'authentication_error',
                message: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    }, [setupSessionRefresh]);

    const logout = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);

            // Clear session refresh timer
            if (sessionExtensionTimer.current) {
                clearInterval(sessionExtensionTimer.current);
                sessionExtensionTimer.current = null;
            }

            // Cleanup server session
            if (session?.session_id) {
                try {
                    await ssoService.cleanupSession(session.session_id, 'User logout');
                } catch (err) {
                    console.error('Server session cleanup failed:', err);
                }
            }

            // Clear local storage and state
            SessionStorageManager.clearSession();
            setUser(null);
            setSession(null);
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            // Always clear local state even if server cleanup fails
            SessionStorageManager.clearSession();
            setUser(null);
            setSession(null);
            setError(null);
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    const refreshSession = useCallback(async (): Promise<void> => {
        if (!session?.session_id) return;

        try {
            const validation = await ssoService.validateLocalSession(session.session_id);
            if (validation.valid && validation.user && validation.session) {
                setUser(validation.user);
                setSession(validation.session);
                // ✅ ALIGNED: Use new method signature
                SessionStorageManager.saveSession(validation.session);
                setError(null);
            } else {
                await logout();
            }
        } catch (err) {
            console.error('Session refresh error:', err);
            await logout();
        }
    }, [session, logout]);

    const extendSession = useCallback(async (hours: number = 8): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!session?.session_id) {
                return { success: false, error: 'No active session' };
            }

            const result = await ssoService.extendLocalSession(session.session_id, hours);

            if (result.valid && result.session) {
                setSession(result.session);

                // ✅ ALIGNED: Use new method signature - pass session object directly
                SessionStorageManager.saveSession(result.session);

                return { success: true };
            }

            return { success: false, error: result.message || 'Failed to extend session' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to extend session';
            return { success: false, error: errorMessage };
        }
    }, [session]);

    // =====================================================
    // INITIALIZATION
    // =====================================================

    const initializeSSO = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Check for saved session first
            const saved = SessionStorageManager.loadSession();
            if (saved?.session_id) {
                try {
                    const validation = await ssoService.validateLocalSession(saved.session_id);
                    if (validation.valid && validation.user && validation.session) {
                        setUser(validation.user);
                        setSession(validation.session);
                        setupSessionRefresh();
                        setIsLoading(false);
                        return;
                    } else {
                        SessionStorageManager.clearSession();
                    }
                } catch (err) {
                    console.error('Session validation error:', err);
                    SessionStorageManager.clearSession();
                }
            }

            // Check for URL token
            const urlTokenResult = await processURLToken();
            if (urlTokenResult?.valid) {
                setIsLoading(false);
                return;
            }

            // If we get here, no saved session and no URL token
            setIsLoading(false);
        } catch (error) {
            console.error('SSO initialization error:', error);
            setError('Failed to initialize SSO');
            setIsLoading(false);
        }
    }, [setupSessionRefresh, processURLToken]);

    // =====================================================
    // EFFECTS
    // =====================================================

    useEffect(() => {
        if (!initializationStarted.current) {
            initializationStarted.current = true;
            initializeSSO();
        }

        // Cleanup on unmount
        return () => {
            if (sessionExtensionTimer.current) {
                clearInterval(sessionExtensionTimer.current);
                sessionExtensionTimer.current = null;
            }
        };
    }, [initializeSSO]);

    // =====================================================
    // COMPUTED VALUES
    // =====================================================

    const isAuthenticated = Boolean(user && session);

    // =====================================================
    // CONTEXT VALUE
    // =====================================================

    const contextValue: SSOContextType = {
        user,
        session,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        refreshSession,
        extendSession,
        hasPermission,
        hasGameAccess,
        getSessionInfo,
        clearError
    };

    return (
        <SSOContext.Provider value={contextValue}>
            {children}
        </SSOContext.Provider>
    );
};

// =====================================================
// HOOK
// =====================================================

export function useSSO(): SSOContextType {
    const context = useContext(SSOContext);
    if (context === undefined) {
        throw new Error('useSSO must be used within an SSOProvider');
    }
    return context;
}