import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ssoService, SSOUser, ValidationResponse } from '../../services/sso-service';
import { SessionStorageManager } from './SessionStorageManager';

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

    // =====================================================
    // AUTH ACTIONS
    // =====================================================

    const login = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            // Get client IP and browser info
            const clientIP = await getClientIP();
            const browserInfo = getBrowserInfo();

            // Authenticate with SSO service
            const result = await ssoService.authenticateWithSSO(token, {
                ip_address: clientIP,
                user_agent: browserInfo,
                duration_hours: 8,
                game_context: {
                    game: 'ready-or-not',
                    version: '2.0',
                    entry_point: 'sso_login'
                }
            });

            if (result.valid && result.user && result.session) {
                setUser(result.user);
                setSession(result.session);

                // Save session to localStorage
                SessionStorageManager.saveSession(result.session.session_id, result.user);

                // Clear URL token
                if (window.history && window.location.search.includes('sso_token')) {
                    window.history.replaceState({}, '', window.location.pathname);
                }
            } else {
                setError(result.message || 'Authentication failed');
            }

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage);
            return {
                valid: false,
                error: 'authentication_error',
                message: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        try {
            if (session) {
                await ssoService.cleanupSession(session.session_id, 'User logout');
            }

            SessionStorageManager.clearSession();
            setUser(null);
            setSession(null);
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            setError('Failed to logout');
        }
    }, [session]);

    const refreshSession = useCallback(async (): Promise<void> => {
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
                    return;
                }
            }

            // If no saved session, try to authenticate from URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('sso_token');

            if (token) {
                await login(token);
                return;
            }

            // No valid authentication found
            setUser(null);
            setSession(null);
        } catch (err) {
            console.error('Session refresh error:', err);
            setError('Failed to refresh session');
        } finally {
            setIsLoading(false);
        }
    }, [login]);

    const extendSession = useCallback(async (hours: number = 8): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!session) return { success: false, error: 'No session to extend' };

            const result = await ssoService.extendLocalSession(session.session_id, hours);
            if (result.valid && result.session) {
                setSession(result.session);
                return { success: true };
            }
            return { success: false, error: 'Failed to extend session' };
        } catch (err) {
            console.error('Session extension error:', err);
            return { success: false, error: 'Session extension failed' };
        }
    }, [session]);

    // =====================================================
    // PERMISSION HELPERS
    // =====================================================

    const hasPermission = useCallback((requiredRole: 'super_admin' | 'org_admin' | 'host') => {
        if (!user) return false;

        const roleHierarchy = ['host', 'org_admin', 'super_admin'];
        const userRoleIndex = roleHierarchy.indexOf(user.role);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

        return userRoleIndex >= requiredRoleIndex;
    }, [user]);

    const hasGameAccess = useCallback((gameName: string) => {
        if (!user) return false;
        return user.games.some(game => game.name === gameName);
    }, [user]);

    const getSessionInfo = useCallback(() => {
        return SessionStorageManager.getSessionInfo();
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // =====================================================
    // INITIALIZATION
    // =====================================================

    useEffect(() => {
        // Only run refresh on mount, not on every render
        refreshSession();
    }, []); // Empty dependency array

    // =====================================================
    // AUTOMATIC SESSION EXTENSION
    // =====================================================

    useEffect(() => {
        if (!session || !user) return;

        const intervalId = setInterval(async () => {
            const expiryTime = new Date(session.expires_at).getTime();
            const currentTime = Date.now();
            const timeUntilExpiry = expiryTime - currentTime;

            // If session expires in less than 2 hours, extend it
            if (timeUntilExpiry < 2 * 60 * 60 * 1000) {
                await extendSession(8);
            }
        }, 30 * 60 * 1000); // Check every 30 minutes

        return () => clearInterval(intervalId);
    }, [session, user, extendSession]);

    // =====================================================
    // CONTEXT VALUE
    // =====================================================

    const contextValue: SSOContextType = {
        // Auth State
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        error,

        // Auth Actions
        login,
        logout,
        refreshSession,
        extendSession,

        // Permission Helpers
        hasPermission,
        hasGameAccess,

        // Session Management
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
// CUSTOM HOOK
// =====================================================

export const useSSO = (): SSOContextType => {
    const context = useContext(SSOContext);
    if (context === undefined) {
        throw new Error('useSSO must be used within an SSOProvider');
    }
    return context;
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Get client IP address (best effort)
async function getClientIP(): Promise<string | null> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || null;
    } catch (error) {
        console.error('Failed to get client IP:', error);
        return null;
    }
}

// Get browser information
function getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

export default SSOProvider;