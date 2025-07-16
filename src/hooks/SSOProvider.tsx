/**
 * SSO Provider - React Context and Authentication Hooks
 * Ready-or-Not SSO Authentication Context
 *
 * File: src/components/auth/SSOProvider.tsx
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ssoService, SSOUser, ValidationResponse } from '../../services/sso-service';

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
// SESSION STORAGE MANAGER
// =====================================================

class SessionStorageManager {
    private static readonly SESSION_KEY = 'ready_or_not_sso_session';
    private static readonly STORAGE_VERSION = '1.0';

    static saveSession(sessionId: string, user: SSOUser): { success: boolean; error?: string } {
        try {
            const sessionData = {
                version: this.STORAGE_VERSION,
                session_id: sessionId,
                user: user,
                saved_at: new Date().toISOString(),
                expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
            };

            localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
            return { success: true };
        } catch (error) {
            console.error('Failed to save session:', error);
            return { success: false, error: 'Failed to save session to storage' };
        }
    }

    static loadSession(): { session_id: string; user: SSOUser } | null {
        try {
            const saved = localStorage.getItem(this.SESSION_KEY);
            if (!saved) return null;

            const sessionData = JSON.parse(saved);

            // Check version compatibility
            if (sessionData.version !== this.STORAGE_VERSION) {
                this.clearSession();
                return null;
            }

            // Check client-side expiry
            if (new Date(sessionData.expires_client_check) < new Date()) {
                this.clearSession();
                return null;
            }

            return {
                session_id: sessionData.session_id,
                user: sessionData.user
            };
        } catch (error) {
            console.error('Failed to load session:', error);
            this.clearSession();
            return null;
        }
    }

    static clearSession(): void {
        try {
            localStorage.removeItem(this.SESSION_KEY);
        } catch (error) {
            console.error('Failed to clear session:', error);
        }
    }

    static getSessionInfo(): { hasSession: boolean; sessionAge?: number; userEmail?: string } {
        const saved = this.loadSession();
        if (!saved) return { hasSession: false };

        try {
            const sessionData = JSON.parse(localStorage.getItem(this.SESSION_KEY) || '{}');
            const savedTime = new Date(sessionData.saved_at);
            const sessionAge = (Date.now() - savedTime.getTime()) / 1000 / 60; // minutes

            return {
                hasSession: true,
                sessionAge,
                userEmail: saved.user.email
            };
        } catch {
            return { hasSession: true };
        }
    }
}

// =====================================================
// SSO PROVIDER COMPONENT
// =====================================================

interface SSOProviderProps {
    children: React.ReactNode;
}

export const SSOProvider: React.FC<SSOProviderProps> = ({ children }) => {
    const [user, setUser] = useState<SSOUser | null>(null);
    const [session, setSession] = useState<SSOSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // =====================================================
    // AUTHENTICATION FUNCTIONS
    // =====================================================

    const login = useCallback(async (token: string): Promise<ValidationResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            // Get client information for session tracking
            const clientIP = await getClientIP();
            const sessionOptions = {
                duration_hours: 8,
                ip_address: clientIP,
                user_agent: navigator.userAgent,
                game_context: {
                    game: 'ready-or-not',
                    version: '2.0',
                    entry_point: 'sso_login',
                    browser: getBrowserInfo(),
                    screen_size: `${window.screen.width}x${window.screen.height}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };

            // Authenticate with SSO service
            const result = await ssoService.authenticateWithSSO(token, sessionOptions);

            if (result.valid && result.user && result.session) {
                setUser(result.user);
                setSession(result.session);

                // Save session to localStorage
                SessionStorageManager.saveSession(result.session.session_id, result.user);

                // Clear token from URL for security
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                setError(result.message || 'Authentication failed');
            }

            return result;
        } catch (err) {
            console.error('Login error:', err);
            const errorMessage = 'Failed to authenticate';
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
            const saved = SessionStorageManager.loadSession();
            if (saved) {
                await ssoService.cleanupSession(saved.session_id, 'User logout');
            }

            SessionStorageManager.clearSession();
            setUser(null);
            setSession(null);
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            setError('Failed to logout');
        }
    }, []);

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
            const saved = SessionStorageManager.loadSession();
            if (!saved) return { success: false, error: 'No session to extend' };

            const result = await ssoService.extendLocalSession(saved.session_id, hours);
            if (result.valid && result.session) {
                setSession(result.session);
                return { success: true };
            }
            return { success: false, error: 'Failed to extend session' };
        } catch (err) {
            console.error('Session extension error:', err);
            return { success: false, error: 'Session extension failed' };
        }
    }, []);

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
    // AUTOMATIC SESSION REFRESH
    // =====================================================

    useEffect(() => {
        // Initialize session on mount
        refreshSession();

        // Set up automatic session extension
        const intervalId = setInterval(async () => {
            if (session && user) {
                const expiryTime = new Date(session.expires_at).getTime();
                const currentTime = Date.now();
                const timeUntilExpiry = expiryTime - currentTime;

                // If session expires in less than 2 hours, extend it
                if (timeUntilExpiry < 2 * 60 * 60 * 1000) {
                    await extendSession(8);
                }
            }
        }, 30 * 60 * 1000); // Check every 30 minutes

        return () => clearInterval(intervalId);
    }, [session, user, refreshSession, extendSession]);

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