/**
 * SSO Login Components - Fixed Version
 * Login components and protected routes for SSO authentication
 *
 * File: src/components/auth/SSOLogin.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSSO } from './SSOProvider';
import { ssoService } from '../../services/sso-service';
import { SessionStorageManager, formatSessionExpiry, formatTime } from './SessionStorageManager';

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
    const { user, isAuthenticated, isLoading, error, login } = useSSO();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [hasProcessedToken, setHasProcessedToken] = useState(false);

    // Handle token from URL on mount - Fixed to prevent circular dependency
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('sso_token');

        // Only process token if:
        // 1. Token exists
        // 2. Not already authenticated
        // 3. Not currently loading
        // 4. Haven't already processed this token
        if (token && !isAuthenticated && !isLoading && !hasProcessedToken) {
            setHasProcessedToken(true);
            login(token);
        }
    }, [login, isAuthenticated, isLoading, hasProcessedToken]);

    const handleGlobalGameLoaderRedirect = useCallback(() => {
        setIsRedirecting(true);

        const globalGameLoaderUrl = import.meta.env.VITE_GLOBAL_GAME_LOADER_URL || 'http://localhost:3001';
        const currentUrl = window.location.origin;
        const redirectUrl = `${globalGameLoaderUrl}/auth/sso-login?return_url=${encodeURIComponent(currentUrl)}&game=ready-or-not`;

        window.location.href = redirectUrl;
    }, []);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading...</p>
                    </div>
                </div>
            </div>
        );
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
                            onClick={handleGlobalGameLoaderRedirect}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            Retry
                        </button>
                    </div>
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
                        <div className="text-green-600 mb-4">
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-green-700 mb-2">Welcome, {user.full_name}!</h2>
                        <p className="text-gray-600 mb-4">You are successfully authenticated.</p>
                        <p className="text-gray-500 text-sm">Role: {user.role}</p>
                        <p className="text-gray-500 text-sm">Email: {user.email}</p>
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Ready or Not</h1>
                    <h2 className="text-lg text-gray-600 mb-6">Sign in to your account</h2>

                    <div className="space-y-4">
                        <p className="text-gray-500 text-sm">
                            Please log in through the Global Game Loader to access this game
                        </p>

                        <button
                            onClick={handleGlobalGameLoaderRedirect}
                            disabled={isRedirecting}
                            className={`w-full ${
                                isRedirecting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            } text-white font-medium py-2 px-4 rounded-md transition-colors`}
                        >
                            {isRedirecting ? 'Redirecting...' : 'Login with Global Game Loader'}
                        </button>
                    </div>
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
    const { isAuthenticated, isLoading, hasPermission, hasGameAccess } = useSSO();

    // Show loading state
    if (isLoading) {
        return loadingComponent || (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading...</p>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
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
// SESSION INFO COMPONENT (For Debugging)
// =====================================================

export const SessionInfo: React.FC = () => {
    const { user, session, isAuthenticated, isLoading, error } = useSSO();
    const [activeSessions, setActiveSessions] = useState<unknown[]>([]);
    const [serviceHealth, setServiceHealth] = useState<unknown>(null);
    const [debugInfo, setDebugInfo] = useState<string>('');

    const refreshDebugInfo = useCallback(async () => {
        try {
            // Get service health
            const health = await ssoService.healthCheck();
            setServiceHealth(health);

            // Get active sessions
            const sessions = await ssoService.getActiveSessions();
            setActiveSessions(sessions);

            // Get storage info
            const storageInfo = getSessionInfo();

            const info = {
                timestamp: new Date().toISOString(),
                authentication: {
                    isAuthenticated,
                    isLoading,
                    hasError: !!error,
                    errorMessage: error
                },
                user: user ? {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    gameCount: user.games?.length || 0
                } : null,
                session: session ? {
                    id: session.session_id,
                    expiresAt: session.expires_at,
                    isActive: session.is_active
                } : null,
                storage: storageInfo,
                service: {
                    health,
                    activeSessionCount: sessions.length
                }
            };

            setDebugInfo(JSON.stringify(info, null, 2));
        } catch (err) {
            setDebugInfo(`Error loading debug info: ${err}`);
        }
    }, [user, session, isAuthenticated, isLoading, error]);

    useEffect(() => {
        refreshDebugInfo();
    }, [refreshDebugInfo]);

    if (!isAuthenticated) {
        return (
            <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-bold text-gray-700 mb-2">Session Info</h3>
                <p className="text-gray-600">Not authenticated</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">Session Info</h3>
                <button
                    onClick={refreshDebugInfo}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                >
                    Refresh
                </button>
            </div>

            <div className="space-y-2 text-sm">
                <div>
                    <span className="font-medium">User:</span> {user?.full_name} ({user?.email})
                </div>
                <div>
                    <span className="font-medium">Role:</span> {user?.role}
                </div>
                <div>
                    <span className="font-medium">Session:</span> {session?.session_id}
                </div>
                <div>
                    <span className="font-medium">Expires:</span> {session?.expires_at ? formatSessionExpiry(session.expires_at) : 'N/A'}
                </div>
                <div>
                    <span className="font-medium">Last Activity:</span> {session?.last_activity ? formatTime(session.last_activity) : 'N/A'}
                </div>
                <div>
                    <span className="font-medium">Active Sessions:</span> {activeSessions.length > 0 ? `Active Sessions (${activeSessions.length})` : 'No active sessions'}
                </div>
                {activeSessions.length > 0 && (
                    <div className="ml-4 text-xs text-gray-500">
                        {activeSessions.slice(0, 3).map((sess: unknown, index) => (
                            <div key={index}>{sess.email}</div>
                        ))}
                    </div>
                )}
                <div>
                    <span className="font-medium">Service Health:</span> {serviceHealth ? 'OK' : 'Unknown'}
                </div>
            </div>

            {debugInfo && (
                <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Debug Information
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                        {debugInfo}
                    </pre>
                </details>
            )}
        </div>
    );
};