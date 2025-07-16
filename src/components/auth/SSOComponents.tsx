/**
 * SSO React Components
 * Authentication components for Ready-or-Not SSO
 *
 * File: src/components/auth/SSOComponents.tsx
 */

import React, { useState, useEffect } from 'react';
import { useSSO } from './SSOProvider';
import { formatSessionExpiry, formatTime } from './SessionStorageManager';
import { ssoService } from '../../services/sso-service';

// =====================================================
// PROTECTED ROUTE COMPONENT
// =====================================================

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'super_admin' | 'org_admin' | 'host';
    requiredGame?: string;
    fallback?: React.ReactNode;
    loadingComponent?: React.ReactNode;
}

export function ProtectedRoute({
                                   children,
                                   requiredRole = 'host',
                                   requiredGame = 'ready-or-not',
                                   fallback = <AccessDenied />,
                                   loadingComponent = <LoadingSpinner />
                               }: ProtectedRouteProps) {
    const { user, loading, isAuthenticated, hasPermission, hasGameAccess, error } = useSSO();

    if (loading) {
        return <>{loadingComponent}</>;
    }

    if (error) {
        return <ErrorDisplay error={error} />;
    }

    if (!isAuthenticated) {
        return <LoginPrompt />;
    }

    if (!hasPermission(requiredRole)) {
        return fallback;
    }

    if (requiredGame && !hasGameAccess(requiredGame)) {
        return <GameAccessDenied game={requiredGame} />;
    }

    return <>{children}</>;
}

// =====================================================
// LOGIN PROMPT COMPONENT
// =====================================================

export function LoginPrompt() {
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleLogin = () => {
        setIsRedirecting(true);

        // Redirect to Global Game Loader for authentication
        const returnUrl = encodeURIComponent(window.location.href);
        const loginUrl = `${import.meta.env.VITE_GLOBAL_GAME_LOADER_URL}/auth/sso-login?return_url=${returnUrl}&game=ready-or-not`;

        window.location.href = loginUrl;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-12 w-auto flex items-center justify-center">
                    <div className="text-2xl font-bold text-blue-600">Ready or Not</div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Sign in to your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Please log in through the Global Game Loader to access this game
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <button
                        onClick={handleLogin}
                        disabled={isRedirecting}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRedirecting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Redirecting...
                            </>
                        ) : (
                            'Login with Global Game Loader'
                        )}
                    </button>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Need help?</span>
                            </div>
                        </div>

                        <div className="mt-3 text-center text-sm text-gray-500">
                            Contact your administrator if you're having trouble accessing your account
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// SESSION INFO COMPONENT (FOR DEBUGGING)
// =====================================================

export function SessionInfo() {
    const { user, isAuthenticated, sessionInfo } = useSSO();
    const [activeSessions, setActiveSessions] = useState([]);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            loadDebugInfo();
        }
    }, [isAuthenticated]);

    const loadDebugInfo = async () => {
        try {
            setLoading(true);
            const [sessionsResult, healthResult] = await Promise.all([
                ssoService.getActiveSessions(),
                ssoService.healthCheck()
            ]);

            setActiveSessions(sessionsResult.sessions || []);
            setHealth(healthResult);
        } catch (error) {
            console.error('Failed to load debug info:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-800 font-medium">Not authenticated</div>
                <div className="text-yellow-600 text-sm mt-1">Please log in to view session information</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold mb-3 text-gray-800">Current User Session</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <strong>Email:</strong> {user?.email}
                    </div>
                    <div>
                        <strong>Role:</strong>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            user?.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                                user?.role === 'org_admin' ? 'bg-blue-100 text-blue-800' :
                                    'bg-green-100 text-green-800'
                        }`}>
              {user?.role}
            </span>
                    </div>
                    <div>
                        <strong>Full Name:</strong> {user?.full_name}
                    </div>
                    <div>
                        <strong>Organization:</strong> {user?.organization_type || 'N/A'}
                    </div>
                </div>

                {user?.district_info && (
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                        <strong>District:</strong> {user.district_info.name} ({user.district_info.state})
                    </div>
                )}

                {user?.school_info && (
                    <div className="mt-3 p-3 bg-green-50 rounded">
                        <strong>School:</strong> {user.school_info.name}
                    </div>
                )}
            </div>

            {sessionInfo && (
                <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-bold mb-3 text-gray-800">Session Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <strong>Session ID:</strong> <code className="text-xs">{sessionInfo.session_id}</code>
                        </div>
                        <div>
                            <strong>Expires:</strong> {formatSessionExpiry(sessionInfo.expires_at)}
                        </div>
                        <div>
                            <strong>Last Activity:</strong> {formatTime(sessionInfo.last_activity)}
                        </div>
                        <div>
                            <strong>Status:</strong>
                            <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                {sessionInfo.is_active ? 'Active' : 'Inactive'}
              </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">Service Health</h3>
                    <button
                        onClick={loadDebugInfo}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {health && (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2" style={{
                  backgroundColor: health.healthy ? '#10b981' : '#ef4444'
              }}></span>
                            <strong>Overall:</strong> {health.message}
                        </div>
                        <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2" style={{
                  backgroundColor: health.database ? '#10b981' : '#ef4444'
              }}></span>
                            <strong>Database:</strong> {health.database ? 'Connected' : 'Error'}
                        </div>
                        <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2" style={{
                  backgroundColor: health.functions ? '#10b981' : '#ef4444'
              }}></span>
                            <strong>Functions:</strong> {health.functions ? 'Working' : 'Error'}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold mb-3 text-gray-800">Active Sessions ({activeSessions.length})</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                    {activeSessions.map((session: unknown, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <div>
                                <div className="font-medium">{session.email}</div>
                                <div className="text-gray-600">{session.permission_level}</div>
                            </div>
                            <div className="text-right text-xs text-gray-500">
                                <div>Expires: {formatSessionExpiry(session.expires_at)}</div>
                                <div>Last: {formatTime(session.last_activity)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// =====================================================
// ERROR COMPONENTS
// =====================================================

function ErrorDisplay({ error }: { error: string }) {
    return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <div className="text-red-600 text-center mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-red-700 mb-2 text-center">Authentication Error</h2>
                <p className="text-gray-600 mb-4 text-center">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
                >
                    Reload Page
                </button>
            </div>
        </div>
    );
}

function AccessDenied() {
    return (
        <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <div className="text-yellow-600 text-center mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-yellow-700 mb-2 text-center">Access Denied</h2>
                <p className="text-gray-600 mb-4 text-center">You don't have permission to access this resource.</p>
                <button
                    onClick={() => window.history.back()}
                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
}

function GameAccessDenied({ game }: { game: string }) {
    return (
        <div className="min-h-screen bg-blue-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <div className="text-blue-600 text-center mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-blue-700 mb-2 text-center">Game Access Required</h2>
                <p className="text-gray-600 mb-4 text-center">
                    You need permission to access the <strong>{game}</strong> game.
                </p>
                <p className="text-gray-500 text-sm text-center">
                    Contact your administrator to request access.
                </p>
            </div>
        </div>
    );
}

function LoadingSpinner() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading...</p>
            </div>
        </div>
    );
}

// =====================================================
// SESSION MAINTENANCE CLASS
// =====================================================

export class SessionMaintenance {
    private static interval: NodeJS.Timeout | null = null;
    private static isRunning = false;

    // Start periodic maintenance
    static start() {
        if (this.interval || this.isRunning) return;

        this.isRunning = true;

        // Run every 30 minutes
        this.interval = setInterval(() => {
            this.performMaintenance();
        }, 30 * 60 * 1000);

        // Also run immediately
        this.performMaintenance();
    }

    // Stop periodic maintenance
    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
    }

    // Perform maintenance tasks
    private static async performMaintenance() {
        try {
            // Cleanup expired sessions
            const cleanupResult = await ssoService.cleanupExpiredSessions();
            if (cleanupResult.count > 0) {
                console.log(`[SSO Maintenance] Cleaned up ${cleanupResult.count} expired sessions`);
            }

            // Check if current session needs extension
            const saved = SessionManager.loadSession();
            if (saved) {
                const validation = await ssoService.validateLocalSession(saved.session_id);
                if (validation.valid && validation.session) {
                    const expiryTime = new Date(validation.session.expires_at).getTime();
                    const currentTime = Date.now();
                    const timeUntilExpiry = expiryTime - currentTime;

                    // If session expires in less than 2 hours, extend it
                    if (timeUntilExpiry < 2 * 60 * 60 * 1000) {
                        const extensionResult = await ssoService.extendLocalSession(saved.session_id, 8);
                        if (extensionResult.valid) {
                            console.log('[SSO Maintenance] Extended session automatically');
                        }
                    }
                } else {
                    // Session is invalid, clear it
                    SessionManager.clearSession();
                    console.log('[SSO Maintenance] Cleared invalid session');
                }
            }
        } catch (error) {
            console.error('[SSO Maintenance] Error during maintenance:', error);
        }
    }
}

// =====================================================
// TEST FUNCTION
// =====================================================

export const testSSO = async () => {
    console.log('🚀 Testing SSO Service...');

    try {
        // Test 1: Health check
        console.log('📊 Testing health check...');
        const health = await ssoService.healthCheck();
        console.log('Health check:', health);

        // Test 2: Generate mock users
        console.log('👥 Generating mock users...');
        const mockUsers = ssoService.generateMockUsers();
        console.log('Mock users:', mockUsers);

        // Test 3: Test authentication flow for each user type
        for (const user of mockUsers) {
            console.log(`🔐 Testing authentication for ${user.role}: ${user.email}`);

            // Generate token
            const token = await ssoService.generateMockToken(user);
            console.log(`Token generated for ${user.email}:`, token.substring(0, 50) + '...');

            // Authenticate
            const auth = await ssoService.authenticateWithSSO(token, {
                ip_address: '192.168.1.100',
                user_agent: 'Test Browser',
                game_context: {
                    game: 'ready-or-not',
                    user_role: user.role,
                    organization_type: user.organization_type,
                    test_mode: true
                }
            });

            console.log(`Authentication result for ${user.email}:`, auth.valid ? '✅ Success' : '❌ Failed');

            if (auth.valid && auth.session) {
                // Test session extension
                const extension = await ssoService.extendLocalSession(auth.session.session_id, 4);
                console.log(`Session extension for ${user.email}:`, extension.valid ? '✅ Success' : '❌ Failed');

                // Test session validation
                const validation = await ssoService.validateLocalSession(auth.session.session_id);
                console.log(`Session validation for ${user.email}:`, validation.valid ? '✅ Success' : '❌ Failed');

                // Test cleanup
                const cleanup = await ssoService.cleanupSession(auth.session.session_id, 'Test cleanup');
                console.log(`Session cleanup for ${user.email}:`, cleanup.success ? '✅ Success' : '❌ Failed');
            }

            console.log('---');
        }

        console.log('🎉 SSO test completed!');

    } catch (error) {
        console.error('❌ SSO test failed:', error);
    }
};