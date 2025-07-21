/**
 * SSO Provider - React Context and Authentication Hooks
 * Ready-or-Not SSO Authentication Context
 *
 * File: src/components/auth/SSOProvider.tsx
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ssoService, SSOUser, ValidationResponse } from '../../services/sso-service';
import { SessionStorageManager, getClientIP, getBrowserInfo } from './SessionStorageManager';

// =====================================================
// INTERFACES AND TYPES
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
    // Auth State
    user: SSOUser | null;
    session: SSOSession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Auth Actions
    login: (token: string) => Promise<ValidationResponse>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
    extendSession: (hours?: number) => Promise<{ success: boolean; error?: string }>;

    // Permission Helpers
    hasPermission: (requiredRole: 'super_admin' | 'org_admin' | 'host') => boolean;
    hasGameAccess: (gameName: string) => boolean;

    // Session Management
    getSessionInfo: () => { hasSession: boolean; sessionAge?: number; userEmail?: string };
    clearError: () => void;
}

// =====================================================
// CONTEXT CREATION
// =====================================================

const SSOContext = createContext<SSOContextType | undefined>(undefined);

// =====================================================
// PROVIDER COMPONENT
// =====================================================

export const SSOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<SSOUser | null>(null);
    const [session, setSession] = useState<SSOSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const initializationStarted = useRef(false);
    const sessionExtensionTimer = useRef<NodeJS.Timeout | null>(null);

    // =====================================================
    // HELPER FUNCTIONS
    // =====================================================

    const setupSessionRefresh = useCallback(() => {
        if (sessionExtensionTimer.current) {
            clearInterval(sessionExtensionTimer.current);
        }

        // Set up automatic session extension every 30 minutes
        sessionExtensionTimer.current = setInterval(() => {
            extendSession(8);
        }, 30 * 60 * 1000);
    }, []);

    // =====================================================
    // CORE AUTHENTICATION FUNCTION (No Dependencies)
    // =====================================================

    const performAuthentication = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            const clientIP = await getClientIP();
            const userAgent = getBrowserInfo();

            const result = await ssoService.authenticateWithSSO(token, {
                ip_address: clientIP || 'unknown',
                user_agent: userAgent,
                game_context: {
                    game: 'ready-or-not',
                    user_role: 'host'
                }
            });

            if (result.valid && result.user && result.session) {
                // Save session to storage
                const saveResult = SessionStorageManager.saveSession({
                    session_id: result.session.session_id,
                    user_id: result.user.id,
                    email: result.user.email,
                    permission_level: result.user.role,
                    expires_at: result.session.expires_at,
                    created_at: result.session.created_at,
                    last_activity: result.session.last_activity,
                    is_active: result.session.is_active,
                    game_context: result.session.game_context
                });

                if (saveResult.success) {
                    setUser(result.user);
                    setSession(result.session);
                    setupSessionRefresh();
                    return result;
                }
            }

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            return {
                valid: false,
                error: 'authentication_error',
                message: errorMessage
            };
        }
    }, [setupSessionRefresh]);

    // =====================================================
    // INITIALIZATION FUNCTION (Fixed - No Circular Dependencies)
    // =====================================================

    const initializeSSO = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // First, try to validate any saved session
            const saved = SessionStorageManager.loadSession();
            if (saved) {
                const validation = await ssoService.validateLocalSession(saved.session_id);
                if (validation.valid && validation.user && validation.session) {
                    setUser(validation.user);
                    setSession(validation.session);
                    setupSessionRefresh();
                    setIsLoading(false);
                    return;
                }
            }

            // If no saved session, try to authenticate from URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('sso_token');

            if (token) {
                // Use performAuthentication directly instead of login to avoid circular dependency
                const result = await performAuthentication(token);
                if (result.valid) {
                    setIsLoading(false);
                    return;
                }
            }

            // No valid authentication found
            setUser(null);
            setSession(null);
            setIsLoading(false);
        } catch (err) {
            console.error('SSO initialization error:', err);
            setError('Failed to initialize authentication');
            setIsLoading(false);
        }
    }, [performAuthentication, setupSessionRefresh]);

    // =====================================================
    // INITIALIZATION EFFECT
    // =====================================================

    useEffect(() => {
        if (!initializationStarted.current) {
            initializationStarted.current = true;
            initializeSSO();
        }

        return () => {
            if (sessionExtensionTimer.current) {
                clearInterval(sessionExtensionTimer.current);
            }
        };
    }, [initializeSSO]);

    // =====================================================
    // AUTHENTICATION FUNCTIONS
    // =====================================================

    const login = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await performAuthentication(token);

            if (!result.valid) {
                setError(result.message || 'Authentication failed');
            }

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate';
            setError(errorMessage);
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

            // Clean up session on server
            if (session) {
                await ssoService.cleanupSession(session.session_id, 'User logout');
            }

            // Clear local storage
            SessionStorageManager.clearSession();

            // Clear state
            setUser(null);
            setSession(null);
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            setError('Failed to logout');
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    const refreshSession = useCallback(async (): Promise<void> => {
        try {
            const saved = SessionStorageManager.loadSession();
            if (saved) {
                const validation = await ssoService.validateLocalSession(saved.session_id);
                if (validation.valid && validation.user && validation.session) {
                    setUser(validation.user);
                    setSession(validation.session);
                    return;
                }
            }

            // If validation fails, logout
            await logout();
        } catch (err) {
            console.error('Session refresh error:', err);
            await logout();
        }
    }, [logout]);

    const extendSession = useCallback(async (hours: number = 8): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!session) {
                return { success: false, error: 'No active session' };
            }

            const result = await ssoService.extendLocalSession(session.session_id, hours);

            if (result.success && result.session) {
                setSession(result.session);
                return { success: true };
            }

            return { success: false, error: result.error || 'Failed to extend session' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to extend session';
            return { success: false, error: errorMessage };
        }
    }, [session]);

    // =====================================================
    // PERMISSION HELPERS
    // =====================================================

    const hasPermission = useCallback((requiredRole: 'super_admin' | 'org_admin' | 'host'): boolean => {
        if (!user) return false;

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
    // SESSION MANAGEMENT
    // =====================================================

    const getSessionInfo = useCallback(() => {
        return SessionStorageManager.getSessionInfo();
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // =====================================================
    // COMPUTED VALUES
    // =====================================================

    const isAuthenticated = user !== null && session !== null;

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

export const useSSO = (): SSOContextType => {
    const context = useContext(SSOContext);
    if (context === undefined) {
        throw new Error('useSSO must be used within an SSOProvider');
    }
    return context;
};