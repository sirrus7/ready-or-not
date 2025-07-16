/**
 * Session Storage Manager and Utilities
 * Ready-or-Not SSO Session Management
 *
 * File: src/components/auth/SessionStorageManager.ts
 */

import { SSOUser } from '../../services/sso-service';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface StoredSession {
    version: string;
    session_id: string;
    user: SSOUser;
    saved_at: string;
    expires_client_check: string;
}

interface SessionInfo {
    hasSession: boolean;
    sessionAge?: number;
    userEmail?: string;
}

// =====================================================
// SESSION STORAGE MANAGER
// =====================================================

export class SessionStorageManager {
    private static readonly SESSION_KEY = 'ready_or_not_sso_session';
    private static readonly STORAGE_VERSION = '1.0';

    /**
     * Save session to localStorage
     */
    static saveSession(sessionId: string, user: SSOUser): { success: boolean; error?: string } {
        try {
            const sessionData: StoredSession = {
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
            return { success: false, error: 'Failed to save session to localStorage' };
        }
    }

    /**
     * Load session from localStorage
     */
    static loadSession(): StoredSession | null {
        try {
            const stored = localStorage.getItem(this.SESSION_KEY);
            if (!stored) return null;

            const sessionData: StoredSession = JSON.parse(stored);

            // Validate session structure
            if (!sessionData.session_id || !sessionData.user || !sessionData.saved_at) {
                console.warn('Invalid session data structure');
                this.clearSession();
                return null;
            }

            // Check if session is expired on client side
            const expires = new Date(sessionData.expires_client_check);
            if (expires.getTime() < Date.now()) {
                console.warn('Session expired on client side');
                this.clearSession();
                return null;
            }

            return sessionData;
        } catch (error) {
            console.error('Failed to load session:', error);
            this.clearSession();
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
     * Get session information for display
     */
    static getSessionInfo(): SessionInfo {
        try {
            const saved = localStorage.getItem(this.SESSION_KEY);
            if (!saved) return { hasSession: false };

            const sessionData: StoredSession = JSON.parse(saved);

            let sessionAge: number | undefined;
            if (sessionData.saved_at) {
                const savedAt = new Date(sessionData.saved_at);
                const calculatedAge = Date.now() - savedAt.getTime();
                // Convert to seconds and ensure it's a positive number
                sessionAge = Math.max(0, Math.floor(calculatedAge / 1000));
            }

            return {
                hasSession: true,
                sessionAge,
                userEmail: sessionData.user?.email
            };
        } catch (error) {
            console.error('Failed to get session info:', error);
            return { hasSession: false };
        }
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get client IP address (best effort)
 */
export async function getClientIP(): Promise<string | null> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || null;
    } catch (error) {
        console.error('Failed to get client IP:', error);
        return null;
    }
}

/**
 * Get browser information from user agent
 */
export function getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

/**
 * Format session expiry time for display
 */
export function formatSessionExpiry(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
        return 'Expired';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Format timestamp for display
 */
export function formatTime(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        // Ensure we're working with a valid date
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleString();
    } catch (error) {
        console.error('Failed to format time:', error);
        return 'Invalid Date';
    }
}

/**
 * Check if user has required permission level
 */
export function hasPermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = ['host', 'org_admin', 'super_admin'];

    // Handle invalid roles - return false for any invalid role
    if (!roleHierarchy.includes(userRole) || !roleHierarchy.includes(requiredRole)) {
        return false;
    }

    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    return userRoleIndex >= requiredRoleIndex;
}

/**
 * Check if user has access to specific game
 */
export function hasGameAccess(user: SSOUser | null, gameName: string): boolean {
    if (!user || !user.games) return false;
    return user.games.some(game => game.name === gameName);
}