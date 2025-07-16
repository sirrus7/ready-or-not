import { SSOUser } from '../../services/sso-service';

export class SessionStorageManager {
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
            if (sessionData.version !== this.STORAGE_VERSION) {
                this.clearSession();
                return null;
            }

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
        try {
            const saved = localStorage.getItem(this.SESSION_KEY);
            if (!saved) return { hasSession: false };

            const sessionData = JSON.parse(saved);

            let sessionAge: number | undefined;
            if (sessionData.saved_at) {
                const savedAt = new Date(sessionData.saved_at);
                const calculatedAge = Date.now() - savedAt.getTime();
                // Only set sessionAge if it's a valid number and positive
                sessionAge = !isNaN(calculatedAge) && calculatedAge >= 0 ? calculatedAge : undefined;
            }

            return {
                hasSession: true,
                sessionAge: sessionAge,
                userEmail: sessionData.user?.email
            };
        } catch (error) {
            console.error('Failed to get session info:', error);
            return { hasSession: false };
        }
    }
}

// Utility functions
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

export function getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

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

export function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
}

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

export function hasGameAccess(user: SSOUser | null, gameName: string): boolean {
    if (!user || !user.games) return false;
    return user.games.some(game => game.name === gameName);
}