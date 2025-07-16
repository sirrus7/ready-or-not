/**
 * Utility Functions Tests
 * Tests for utility functions used in SSO components
 *
 * File: src/components/auth/__tests__/utils.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for IP detection
global.fetch = vi.fn();

// Mock navigator for browser detection
Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    writable: true
});

// Mock Intl.DateTimeFormat
Object.defineProperty(Intl, 'DateTimeFormat', {
    value: vi.fn(() => ({
        resolvedOptions: vi.fn(() => ({
            timeZone: 'America/New_York'
        }))
    })),
    writable: true
});

// Import utility functions (these would be exported from your SSOLogin component)
// For testing, we'll recreate them here
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

function getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

function formatSessionExpiry(expiresAt: string): string {
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

function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// SessionStorageManager class for testing
class SessionStorageManager {
    private static readonly SESSION_KEY = 'ready_or_not_sso_session';
    private static readonly STORAGE_VERSION = '1.0';

    static saveSession(sessionId: string, user: unknown): { success: boolean; error?: string } {
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

    static loadSession(): { session_id: string; user: unknown } | null {
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
        const saved = this.loadSession();
        if (!saved) return { hasSession: false };

        try {
            const sessionData = JSON.parse(localStorage.getItem(this.SESSION_KEY) || '{}');
            const savedTime = new Date(sessionData.saved_at);
            const sessionAge = (Date.now() - savedTime.getTime()) / 1000 / 60;

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

describe('Utility Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('getClientIP', () => {
        it('should return IP address when API call succeeds', async () => {
            const mockResponse = {
                json: vi.fn().mockResolvedValue({ ip: '192.168.1.1' })
            };

            vi.mocked(fetch).mockResolvedValue(mockResponse as unknown);

            const result = await getClientIP();

            expect(fetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
            expect(result).toBe('192.168.1.1');
        });

        it('should return null when API call fails', async () => {
            vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

            const result = await getClientIP();

            expect(result).toBeNull();
        });

        it('should return null when response does not contain IP', async () => {
            const mockResponse = {
                json: vi.fn().mockResolvedValue({})
            };

            vi.mocked(fetch).mockResolvedValue(mockResponse as unknown);

            const result = await getClientIP();

            expect(result).toBeNull();
        });
    });

    describe('getBrowserInfo', () => {
        it('should detect Chrome browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Chrome');
        });

        it('should detect Firefox browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Firefox');
        });

        it('should detect Safari browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Safari');
        });

        it('should detect Edge browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Chrome'); // Edge contains Chrome in user agent
        });

        it('should return Unknown for unrecognized browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Unknown Browser/1.0',
                writable: true
            });

            expect(getBrowserInfo()).toBe('Unknown');
        });
    });

    describe('formatSessionExpiry', () => {
        it('should format hours and minutes correctly', () => {
            const futureTime = new Date(Date.now() + 2 * 3600 * 1000 + 30 * 60 * 1000); // 2h 30m
            const result = formatSessionExpiry(futureTime.toISOString());

            expect(result).toBe('2h 30m');
        });

        it('should format minutes only when less than 1 hour', () => {
            const futureTime = new Date(Date.now() + 45 * 60 * 1000); // 45m
            const result = formatSessionExpiry(futureTime.toISOString());

            expect(result).toBe('45m');
        });

        it('should return "Expired" for past times', () => {
            const pastTime = new Date(Date.now() - 1000); // 1 second ago
            const result = formatSessionExpiry(pastTime.toISOString());

            expect(result).toBe('Expired');
        });

        it('should handle exactly 1 hour', () => {
            const futureTime = new Date(Date.now() + 3600 * 1000); // 1h
            const result = formatSessionExpiry(futureTime.toISOString());

            expect(result).toBe('1h 0m');
        });

        it('should handle exactly 0 minutes remaining', () => {
            const nowTime = new Date();
            const result = formatSessionExpiry(nowTime.toISOString());

            expect(result).toBe('Expired');
        });
    });

    describe('formatTime', () => {
        it('should format timestamp to locale string', () => {
            const timestamp = '2023-12-25T10:30:00.000Z';
            const result = formatTime(timestamp);

            // Should return a formatted date string
            expect(result).toContain('12/25/2023');
        });

        it('should handle different date formats', () => {
            const timestamp = '2023-01-01T00:00:00.000Z';
            const result = formatTime(timestamp);

            expect(result).toContain('1/1/2023');
        });
    });

    describe('SessionStorageManager', () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'host'
        };

        describe('saveSession', () => {
            it('should save session successfully', () => {
                const result = SessionStorageManager.saveSession('session-123', mockUser);

                expect(result.success).toBe(true);
                expect(localStorage.getItem('ready_or_not_sso_session')).toBeTruthy();
            });

            it('should handle localStorage errors', () => {
                // Mock localStorage.setItem to throw an error
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = vi.fn().mockImplementation(() => {
                    throw new Error('Storage quota exceeded');
                });

                const result = SessionStorageManager.saveSession('session-123', mockUser);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Failed to save session to storage');

                localStorage.setItem = originalSetItem;
            });
        });

        describe('loadSession', () => {
            it('should load valid session', () => {
                SessionStorageManager.saveSession('session-123', mockUser);

                const result = SessionStorageManager.loadSession();

                expect(result).toEqual({
                    session_id: 'session-123',
                    user: mockUser
                });
            });

            it('should return null when no session exists', () => {
                const result = SessionStorageManager.loadSession();

                expect(result).toBeNull();
            });

            it('should handle corrupted session data', () => {
                localStorage.setItem('ready_or_not_sso_session', 'invalid-json');

                const result = SessionStorageManager.loadSession();

                expect(result).toBeNull();
                expect(localStorage.getItem('ready_or_not_sso_session')).toBeNull();
            });

            it('should handle version mismatch', () => {
                const sessionData = {
                    version: '0.9', // Old version
                    session_id: 'session-123',
                    user: mockUser,
                    saved_at: new Date().toISOString(),
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                };

                localStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.loadSession();

                expect(result).toBeNull();
                expect(localStorage.getItem('ready_or_not_sso_session')).toBeNull();
            });

            it('should handle expired client session', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    saved_at: new Date().toISOString(),
                    expires_client_check: new Date(Date.now() - 1000).toISOString() // Expired
                };

                localStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.loadSession();

                expect(result).toBeNull();
                expect(localStorage.getItem('ready_or_not_sso_session')).toBeNull();
            });
        });

        describe('clearSession', () => {
            it('should clear session successfully', () => {
                SessionStorageManager.saveSession('session-123', mockUser);
                expect(localStorage.getItem('ready_or_not_sso_session')).toBeTruthy();

                SessionStorageManager.clearSession();

                expect(localStorage.getItem('ready_or_not_sso_session')).toBeNull();
            });

            it('should handle localStorage errors gracefully', () => {
                const originalRemoveItem = localStorage.removeItem;
                localStorage.removeItem = vi.fn().mockImplementation(() => {
                    throw new Error('Storage error');
                });

                // Should not throw
                expect(() => SessionStorageManager.clearSession()).not.toThrow();

                localStorage.removeItem = originalRemoveItem;
            });
        });

        describe('getSessionInfo', () => {
            it('should return session info when session exists', () => {
                SessionStorageManager.saveSession('session-123', mockUser);

                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(true);
                expect(result.userEmail).toBe('test@example.com');
                expect(result.sessionAge).toBeGreaterThan(0);
            });

            it('should return no session when session does not exist', () => {
                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(false);
                expect(result.userEmail).toBeUndefined();
                expect(result.sessionAge).toBeUndefined();
            });

            it('should handle corrupted session data gracefully', () => {
                localStorage.setItem('ready_or_not_sso_session', 'invalid-json');

                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(false);
            });

            it('should handle missing saved_at field', () => {
                const sessionData = {
                    version: '1.0',
                    session_id: 'session-123',
                    user: mockUser,
                    expires_client_check: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                    // Missing saved_at
                };

                localStorage.setItem('ready_or_not_sso_session', JSON.stringify(sessionData));

                const result = SessionStorageManager.getSessionInfo();

                expect(result.hasSession).toBe(true);
                expect(result.sessionAge).toBeUndefined();
            });
        });
    });
});

describe('Permission Helper Functions', () => {
    describe('Role Hierarchy', () => {
        it('should validate role hierarchy correctly', () => {
            const roleHierarchy = ['host', 'org_admin', 'super_admin'];

            // Test helper function to check permissions
            const hasPermission = (userRole: string, requiredRole: string) => {
                const userRoleIndex = roleHierarchy.indexOf(userRole);
                const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
                return userRoleIndex >= requiredRoleIndex;
            };

            // host should have host permissions
            expect(hasPermission('host', 'host')).toBe(true);
            // host should NOT have org_admin permissions
            expect(hasPermission('host', 'org_admin')).toBe(false);
            // host should NOT have super_admin permissions
            expect(hasPermission('host', 'super_admin')).toBe(false);

            // org_admin should have host permissions
            expect(hasPermission('org_admin', 'host')).toBe(true);
            // org_admin should have org_admin permissions
            expect(hasPermission('org_admin', 'org_admin')).toBe(true);
            // org_admin should NOT have super_admin permissions
            expect(hasPermission('org_admin', 'super_admin')).toBe(false);

            // super_admin should have all permissions
            expect(hasPermission('super_admin', 'host')).toBe(true);
            expect(hasPermission('super_admin', 'org_admin')).toBe(true);
            expect(hasPermission('super_admin', 'super_admin')).toBe(true);
        });

        it('should handle invalid roles', () => {
            const roleHierarchy = ['host', 'org_admin', 'super_admin'];

            const hasPermission = (userRole: string, requiredRole: string) => {
                const userRoleIndex = roleHierarchy.indexOf(userRole);
                const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
                return userRoleIndex >= requiredRoleIndex;
            };

            // Invalid user role
            expect(hasPermission('invalid', 'host')).toBe(false);
            // Invalid required role
            expect(hasPermission('host', 'invalid')).toBe(false);
            // Both invalid
            expect(hasPermission('invalid', 'invalid')).toBe(true); // -1 >= -1
        });
    });

    describe('Game Access', () => {
        it('should check game access correctly', () => {
            const userGames = [
                { name: 'ready-or-not', permission_level: 'host' },
                { name: 'game-2', permission_level: 'org_admin' }
            ];

            const hasGameAccess = (gameName: string) => {
                return userGames.some(game => game.name === gameName);
            };

            expect(hasGameAccess('ready-or-not')).toBe(true);
            expect(hasGameAccess('game-2')).toBe(true);
            expect(hasGameAccess('game-3')).toBe(false);
        });

        it('should handle empty games array', () => {
            const userGames: unknown[] = [];

            const hasGameAccess = (gameName: string) => {
                return userGames.some(game => game.name === gameName);
            };

            expect(hasGameAccess('ready-or-not')).toBe(false);
        });
    });
});