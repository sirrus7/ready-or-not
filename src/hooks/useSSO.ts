/**
 * useSSO React Hook
 * React hook for SSO authentication state management
 *
 * File: src/hooks/useSSO.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { ssoService, SSOUser, ValidationResponse } from '../services/sso-service';

// =====================================================
// SESSION MANAGER CLASS
// =====================================================

export class SessionManager {
    private static readonly SESSION_KEY = 'ready_or_not_sso_session';
    private static readonly STORAGE_VERSION = '1.0';

    /**
     * Save session to localStorage with version tracking
     */
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

    /**
     * Load session from localStorage with version checking
     */
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
            this.clearSession(); // Clear corrupted session
            return null;
        }
    }

    /**
     * Clear session from localStorage
     */
    static clearSession(): void {
        try {
            localStorage.removeItem(this.SESSION_KEY);
        } catch (error) {
            console.error('Failed to clear session:', error);
        }
    }

    /**
     * Validate saved session against database
     */
    static async validateSavedSession(): Promise<ValidationResponse> {
        const saved = this.loadSession();
        if (!saved) {
            return {
                valid: false,
                error: 'no_saved_session',
                message: 'No saved session found'
            };
        }

        // Validate with database
        const result = await ssoService.validateLocalSession(saved.session_id);

        if (!result.valid) {
            // Clear invalid session
            this.clearSession();
        }

        return result;
    }

    /**
     * Get session info for debugging
     */
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
// AUTHENTICATION HELPER FUNCTIONS
// =====================================================

/**
 * Authenticate from URL parameters
 */
export async function authenticateFromURL(): Promise<ValidationResponse> {
    try {
        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('sso_token');

        if (!token) {
            return {
                valid: false,
                error: 'no_token',
                message: 'No SSO token found in URL'
            };
        }

        // Get client information for session tracking
        const clientIP = await getClientIP();
        const sessionOptions = {
            duration_hours: 8,
            ip_address: clientIP,
            user_agent: navigator.userAgent,
            game_context: {
                game: 'ready-or-not',
                version: '2.0',
                entry_point: 'sso_redirect',
                browser: getBrowserInfo(),
                screen_size: `${window.screen.width}x${window.screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };

        // Authenticate with the token
        const result = await ssoService.authenticateWithSSO(token, sessionOptions);

        if (result.valid) {
            // Clear token from URL for security
            window.history.replaceState({}, document.title, window.location.pathname);

            // Save session for persistence
            if (result.session) {
                SessionManager.saveSession(result.session.session_id, result.user!);
            }
        }

        return result;
    } catch (error) {
        console.error('Authentication from URL error:', error);
        return {
            valid: false,
            error: 'authentication_error',
            message: 'Failed to authenticate from URL'
        };
    }
}

// =====================================================
// MAIN useSSO HOOK
// =====================================================

export function useSSO() {
    const [user, setUser] = useState<SSOUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionInfo, setSessionInfo] = useState<any>(null);

    // Initialize SSO on component mount
    useEffect(() => {
        initializeSSO();
    }, []);

    const initializeSSO = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // First, try to validate any saved session
            const savedSession = await SessionManager.validateSavedSession();
            if (savedSession.valid && savedSession.user) {
                setUser(savedSession.user);
                setSessionInfo(savedSession.session);
                setLoading(false);
                return;
            }

            // If no saved session, try to authenticate from URL
            const urlAuth = await authenticateFromURL();
            if (urlAuth.valid && urlAuth.user && urlAuth.session) {
                setUser(urlAuth.user);
                setSessionInfo(urlAuth.session);
                setLoading(false);
                return;
            }

            // No valid authentication found
            setUser(null);
            setSessionInfo(null);
            setLoading(false);
        } catch (err) {
            console.error('SSO initialization error:', err);
            setError('Failed to initialize SSO');
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const saved = SessionManager.loadSession();
            if (saved) {
                await ssoService.cleanupSession(saved.session_id, 'User logout');
            }
            SessionManager.clearSession();
            setUser(null);
            setSessionInfo(null);
            setError(null);
        } catch (err) {
            console.error('Logout error:', err);
            setError('Failed to logout');
        }
    }, []);

    const extendSession = useCallback(async (hours: number = 8) => {
        try {
            const saved = SessionManager.loadSession();
            if (!saved) return { success: false, error: 'No session to extend' };

            const result = await ssoService.extendLocalSession(saved.session_id, hours);
            if (result.valid && result.session) {
                setSessionInfo(result.session);
                return { success: true };
            }
            return { success: false, error: 'Failed to extend session' };
        } catch (err) {
            console.error('Session extension error:', err);
            return { success: false, error: 'Session extension failed' };
        }
    }, []);

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

    return {
        user,
        loading,
        error,
        sessionInfo,
        isAuthenticated: !!user,
        logout,
        extendSession,
        refresh: initializeSSO,
        hasPermission,
        hasGameAccess,
        sessionAge: SessionManager.getSessionInfo().sessionAge
    };
}

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

// Format session expiry time for display
export function formatSessionExpiry(expiresAt: string): string {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Format time for display
export function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}