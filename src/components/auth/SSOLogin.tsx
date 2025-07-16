/**
 * SSO Login Components - Fixed Version
 * Login components and protected routes for SSO authentication
 *
 * File: src/components/auth/SSOLogin.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSSO } from './SSOProvider';
import { ssoService } from '../../services/sso-service';
import { SessionStorageManager, getClientIP, getBrowserInfo, formatSessionExpiry, formatTime } from './SessionStorageManager';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const getSessionInfo = () => {
    return SessionStorageManager.getSessionInfo();
};

// =====================================================
// MAIN SSO LOGIN COMPONENT
// =====================================================

export const SSOLogin: React.FC = () => {
    const { user, session, isAuthenticated, isLoading, error, login } = useSSO();
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Handle token from URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('sso_token');

        if (token && !isAuthenticated && !isLoading) {
            login(token);
        }
    }, [login, isAuthenticated, isLoading]);

    const handleGlobalGameLoaderRedirect = useCallback(() => {
        setIsRedirecting(true);

        const globalGameLoaderUrl = import.meta.env.VITE_GLOBAL_GAME_LOADER_URL || 'http://localhost:3001';
        const returnUrl = encodeURIComponent(window.location.origin);
        const redirectUrl = `${globalGameLoaderUrl}/auth/sso-login?return_url=${returnUrl}&game=ready-or-not`;

        window.location.href = redirectUrl;
    }, []);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                    </svg>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Show authenticated state
    if (isAuthenticated && user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome!</h1>
                        <p className="text-gray-600 mb-4">You are logged in as {user.email}</p>
                        <p className="text-sm text-gray-500">You can now access Ready or Not.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show login form
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Ready or Not</h1>
                    <h2 className="text-xl text-gray-600 mb-8">Sign in to your account</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                            <h3 className="text-sm font-medium text-red-800 mb-1">Authentication Error</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleGlobalGameLoaderRedirect}
                        disabled={isRedirecting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {isRedirecting ? 'Redirecting...' : 'Login with Global Game Loader'}
                    </button>

                    <p className="text-sm text-gray-500 mt-4">
                        Please log in through the Global Game Loader to access this game
                    </p>
                </div>
            </div>
        </div>
    );
};

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

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                                  children,
                                                                  requiredRole,
                                                                  requiredGame,
                                                                  fallback,
                                                                  loadingComponent
                                                              }) => {
    const { user, isAuthenticated, isLoading, error, hasPermission, hasGameAccess } = useSSO();

    // Custom loading component
    const LoadingComponent = loadingComponent || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                </svg>
                <p className="text-gray-600">Loading...</p>
            </div>
        </div>
    );

    // Show loading state
    if (isLoading) {
        return <>{LoadingComponent}</>;
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-red-600 mb-2">Authentication Error</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show login if not authenticated
    if (!isAuthenticated) {
        return fallback || <SSOLogin />;
    }

    // Check role permissions
    if (requiredRole && !hasPermission(requiredRole)) {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-red-600 text-center mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-700 mb-2 text-center">Access Denied</h2>
                    <p className="text-gray-600 mb-4 text-center">
                        You need <strong>{requiredRole}</strong> permissions to access this resource.
                    </p>
                    <p className="text-gray-500 text-sm text-center">
                        Contact your administrator to request access.
                    </p>
                </div>
            </div>
        );
    }

    // Check game access
    if (requiredGame && !hasGameAccess(requiredGame)) {
        return (
            <div className="min-h-screen bg-blue-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-blue-600 text-center mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-blue-700 mb-2 text-center">Game Access Required</h2>
                    <p className="text-gray-600 mb-4 text-center">
                        You need permission to access the <strong>{requiredGame}</strong> game.
                    </p>
                    <p className="text-gray-500 text-sm text-center">
                        Contact your administrator to request access.
                    </p>
                </div>
            </div>
        );
    }

    // All checks passed, render children
    return <>{children}</>;
};

// =====================================================
// SESSION INFO COMPONENT (FOR DEBUGGING)
// =====================================================

export const SessionInfo: React.FC = () => {
    const { user, session, isAuthenticated, error } = useSSO();
    const [healthStatus, setHealthStatus] = useState<string>('checking...');
    const [activeSessions, setActiveSessions] = useState<unknown[]>([]);
    const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

    const refreshDebugInfo = useCallback(async () => {
        try {
            // Get health status
            const health = await ssoService.healthCheck();
            setHealthStatus(health.status || 'unknown');

            // Get active sessions
            const sessions = await ssoService.getActiveSessions();
            setActiveSessions(sessions || []);

            // Get session storage info
            const sessionStorageInfo = getSessionInfo();

            // Get client info
            const clientIP = await getClientIP();
            const browserInfo = getBrowserInfo();

            setDebugInfo({
                health,
                sessionStorageInfo,
                clientIP,
                browserInfo,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to refresh debug info:', err);
        }
    }, []);

    useEffect(() => {
        refreshDebugInfo();
    }, [refreshDebugInfo]);

    if (!isAuthenticated) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Session Info</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-800">Not authenticated</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Session Info</h2>
                <button
                    onClick={refreshDebugInfo}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current User Session */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Current User Session</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                        <div><strong>Email:</strong> {user?.email}</div>
                        <div><strong>Role:</strong> {user?.role}</div>
                        <div><strong>Games:</strong> {user?.games?.map(g => g.name).join(', ')}</div>
                    </div>
                </div>

                {/* Session Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Session Details</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                        <div><strong>Session ID:</strong> {session?.session_id}</div>
                        <div><strong>Expires:</strong> {session?.expires_at && formatSessionExpiry(session.expires_at)}</div>
                        <div><strong>Created:</strong> {session?.created_at && formatTime(session.created_at)}</div>
                    </div>
                </div>

                {/* Service Health */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Service Health</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                        <div><strong>Status:</strong> {healthStatus}</div>
                        <div><strong>Client IP:</strong> {debugInfo.clientIP || 'Unknown'}</div>
                        <div><strong>Browser:</strong> {debugInfo.browserInfo}</div>
                    </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Active Sessions ({activeSessions.length})</h3>
                    <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                        {activeSessions.length > 0 ? (
                            activeSessions.map((session: any, index) => (
                                <div key={index} className="mb-2">
                                    {session.email} - {formatTime(session.created_at)}
                                </div>
                            ))
                        ) : (
                            <div>No active sessions</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Storage Information */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Storage Information</h3>
                <div className="text-sm text-gray-600">
                    <pre className="bg-white p-3 rounded border overflow-x-auto">
                        {JSON.stringify(debugInfo.sessionStorageInfo, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};