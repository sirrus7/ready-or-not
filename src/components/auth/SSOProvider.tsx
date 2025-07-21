/**
 * SSO Provider - HOISTING ISSUE FIXED
 * Fixed version that resolves "cannot access before initialization" errors
 *
 * File: src/components/auth/SSOProvider.tsx
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ssoService, SSOUser, ValidationResponse } from '../../services/sso-service';
import { SessionStorageManager, getClientIP, getBrowserInfo } from './SessionStorageManager';

// =====================================================
// INTERFACES
// =====================================================

interface SSOSession {
    session_id: string;
    user_id: string;
    email: string;
    permission_level: string;
    expires_at: string;
    created_at: string;
    last_activity: string;
    is_active: boolean;
    game_context: Record<string, unknown>;
}

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

    const hasPermission = useCallback((requiredRole: 'super_admin' | 'org_admin' | 'host'): boolean => {
        if (!user?.role) return false;

        const roleHierarchy = ['host', 'org_admin', 'super_admin'];
        const userRoleIndex = roleHierarchy.indexOf(user.role);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

        return userRoleIndex >= requiredRoleIndex;
    }, [user]);

    const hasGameAccess = useCallback((gameName: string): boolean => {
        if (!user?.games) return false;
        return user.games.some(game => game.name === gameName);
    }, [user]);

    // =====================================================
    // CORE AUTHENTICATION FUNCTIONS (FIXED ORDER)
    // =====================================================

    const performAuthentication = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            const ip = await getClientIP();
            const userAgent = getBrowserInfo();

            const result = await ssoService.authenticateWithSSO(token, {
                ip_address: ip,
                user_agent: userAgent,
                game_context: {
                    game: 'ready-or-not',
                    test_mode: true
                }
            });

            if (result.valid && result.user && result.session) {
                // Save session to localStorage
                SessionStorageManager.saveSession(result.session);

                // Set up session refresh timer
                setupSessionRefresh();

                return {
                    valid: true,
                    user: result.user,
                    session: result.session,
                    message: result.message || 'Authentication successful'
                };
            } else {
                return {
                    valid: false,
                    error: result.error || 'authentication_failed',
                    message: result.message || 'Authentication failed'
                };
            }
        } catch (err) {
            console.error('Authentication error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            return {
                valid: false,
                error: 'authentication_error',
                message: errorMessage
            };
        }
    }, []); // No dependencies to avoid circular references

    const setupSessionRefresh = useCallback(() => {
        if (sessionExtensionTimer.current) {
            clearInterval(sessionExtensionTimer.current);
        }

        sessionExtensionTimer.current = setInterval(async () => {
            if (session?.session_id) {
                try {
                    const result = await ssoService.extendLocalSession(session.session_id, 4);
                    if (result.valid && result.session) {
                        setSession(result.session);
                        SessionStorageManager.saveSession(result.session);
                    }
                } catch (err) {
                    console.error('Session extension failed:', err);
                }
            }
        }, 30 * 60 * 1000); // 30 minutes
    }, [session]);

    const login = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await performAuthentication(token);

            // Update state based on result
            if (result.valid && result.user && result.session) {
                setUser(result.user);
                setSession(result.session);
                setError(null);
            } else {
                setError(result.message || 'Authentication failed');
                setUser(null);
                setSession(null);
            }

            return result;
        } catch (err) {
            console.error('Login error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage);
            setUser(null);
            setSession(null);
            return {
                valid: false,
                error: 'authentication_error',
                message: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    }, [performAuthentication]);

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
    }, [session]); // Only depends on session, not on other functions

    const refreshSession = useCallback(async (): Promise<void> => {
        if (!session?.session_id) return;

        try {
            const validation = await ssoService.validateLocalSession(session.session_id);
            if (validation.valid && validation.user && validation.session) {
                setUser(validation.user);
                setSession(validation.session);
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
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('sso_token');

            if (token) {
                try {
                    const result = await login(token);
                    if (result.valid && window.history?.replaceState) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                } catch (err) {
                    console.error('URL token authentication error:', err);
                }
            }

            setIsLoading(false);
        } catch (err) {
            console.error('SSO initialization error:', err);
            setError('Failed to initialize authentication');
            setIsLoading(false);
        }
    }, [login, setupSessionRefresh]);

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
    // CONTEXT VALUE
    // =====================================================

    const isAuthenticated = Boolean(user && session);

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

export const useSSO = (): SSOContextType => {
    const context = useContext(SSOContext);
    if (context === undefined) {
        throw new Error('useSSO must be used within an SSOProvider'); // Fixed typo: Error not error
    }
    return context;
};