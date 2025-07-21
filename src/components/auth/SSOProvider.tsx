/**
 * SSOProvider State Update Fix
 * Replace the login function in your SSOProvider.tsx with this fixed version
 */

// =====================================================
// FIXED AUTHENTICATION FUNCTIONS
// =====================================================

const login = useCallback(async (token: string): Promise<ValidationResponse> => {
    try {
        setIsLoading(true);
        setError(null);

        const result = await performAuthentication(token);

        // CRITICAL FIX: Explicitly update state here as well as in performAuthentication
        if (result.valid && result.user && result.session) {
            // Ensure state is set at this level too
            setUser(result.user);
            setSession(result.session);
            setError(null);
        } else {
            // Ensure error state is set
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

// =====================================================
// ALTERNATIVE FIX: Simplified performAuthentication
// (if the above doesn't work, try this approach)
// =====================================================

const performAuthentication = useCallback(async (token: string): Promise<ValidationResponse> => {
    try {
        const ip = await getClientIP();
        const userAgent = getBrowserInfo();

        const result = await ssoService.authenticateWithSSO(token, {
            ip_address: ip,
            user_agent: userAgent
        });

        // SIMPLIFIED: Just return the result, let login() handle state updates
        if (result.valid && result.user && result.session) {
            // Save session to localStorage
            SessionStorageManager.saveSession(result.session);

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
}, []); // Remove setupSessionRefresh dependency temporarily

// =====================================================
// COMPLETE WORKING VERSION (FINAL FIX)
// Replace your entire SSOProvider.tsx with this
// =====================================================

/**
 * SSO Provider - STATE UPDATE FIXED VERSION
 * File: src/components/auth/SSOProvider.tsx
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ssoService, SSOUser, ValidationResponse } from '../../services/sso-service';
import { SessionStorageManager, getClientIP, getBrowserInfo } from './SessionStorageManager';

// Interfaces remain the same...
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

        sessionExtensionTimer.current = setInterval(async () => {
            if (session) {
                try {
                    const result = await ssoService.extendLocalSession(session.session_id);
                    if (result.success && result.session) {
                        setSession(result.session);
                        SessionStorageManager.saveSession(result.session);
                    }
                } catch (err) {
                    console.error('Session extension failed:', err);
                }
            }
        }, 30 * 60 * 1000);
    }, [session]);

    // =====================================================
    // CORE AUTHENTICATION - SIMPLIFIED AND FIXED
    // =====================================================

    const performAuthentication = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            const ip = await getClientIP();
            const userAgent = getBrowserInfo();

            const result = await ssoService.authenticateWithSSO(token, {
                ip_address: ip,
                user_agent: userAgent
            });

            // Just return the result - let the caller handle state updates
            return result;
        } catch (err) {
            console.error('Authentication error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            return {
                valid: false,
                error: 'authentication_error',
                message: errorMessage
            };
        }
    }, []);

    // =====================================================
    // AUTHENTICATION FUNCTIONS - COMPLETELY FIXED
    // =====================================================

    const login = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await performAuthentication(token);

            // CRITICAL FIX: Handle state updates here explicitly
            if (result.valid && result.user && result.session) {
                console.log('🔧 Setting user and session state...');

                // Set all state synchronously
                setUser(result.user);
                setSession(result.session);
                setError(null);

                // Save to localStorage
                SessionStorageManager.saveSession(result.session);

                // Setup session refresh
                setupSessionRefresh();

                console.log('🔧 State should be updated now');
            } else {
                console.log('🔧 Authentication failed, clearing state...');
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
    }, [performAuthentication, setupSessionRefresh]);

    // =====================================================
    // INITIALIZATION - SIMPLIFIED
    // =====================================================

    const initializeSSO = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Check for saved session
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
                    const result = await login(token); // Use login() instead of performAuthentication()
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

    // Initialization effect
    useEffect(() => {
        if (!initializationStarted.current) {
            initializationStarted.current = true;
            initializeSSO();
        }

        return () => {
            if (sessionExtensionTimer.current) {
                clearInterval(sessionExtensionTimer.current);
                sessionExtensionTimer.current = null;
            }
        };
    }, [initializeSSO]);

    // =====================================================
    // OTHER FUNCTIONS (unchanged)
    // =====================================================

    const logout = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);

            if (sessionExtensionTimer.current) {
                clearInterval(sessionExtensionTimer.current);
                sessionExtensionTimer.current = null;
            }

            if (session?.session_id) {
                try {
                    await ssoService.cleanupSession(session.session_id);
                } catch (err) {
                    console.error('Server session cleanup failed:', err);
                }
            }

            SessionStorageManager.clearSession();
            setUser(null);
            setSession(null);
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            setUser(null);
            setSession(null);
            setError(null);
            SessionStorageManager.clearSession();
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

            if (result.success && result.session) {
                setSession(result.session);
                SessionStorageManager.saveSession(result.session);
                return { success: true };
            }

            return { success: false, error: result.error || 'Failed to extend session' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to extend session';
            return { success: false, error: errorMessage };
        }
    }, [session]);

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

    const getSessionInfo = useCallback(() => {
        return SessionStorageManager.getSessionInfo();
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

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

export const useSSO = (): SSOContextType => {
    const context = useContext(SSOContext);
    if (context === undefined) {
        throw new error('useSSO must be used within an SSOProvider');
    }
    return context;
};