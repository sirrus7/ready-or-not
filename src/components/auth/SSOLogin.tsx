/**
 * SSO Login Components - Login Component and Protected Routes
 * Ready-or-Not SSO Authentication Components
 *
 * File: src/components/auth/SSOLogin.tsx
 */

import React, { useState, useEffect } from 'react';
import { useSSO } from './SSOProvider';
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

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                                  children,
                                                                  requiredRole = 'host',
                                                                  requiredGame = 'ready-or-not',
                                                                  fallback = <AccessDenied />,
                                                                  loadingComponent = <LoadingSpinner />
                                                              }) => {
    const { user, isLoading, isAuthenticated, error, hasPermission, hasGameAccess } = useSSO();

    if (isLoading) {
        return <>{loadingComponent}</>;
    }

    if (error) {
        return <ErrorDisplay error={error} />;
    }

    if (!isAuthenticated) {
        return <SSOLogin />;
    }

    if (!hasPermission(requiredRole)) {
        return fallback;
    }

    if (requiredGame && !hasGameAccess(requiredGame)) {
        return <GameAccessDenied game={requiredGame} />;
    }

    return <>{children}</>;
};

// =====================================================
// SSO LOGIN COMPONENT
// =====================================================

export const SSOLogin: React.FC = () => {
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login, isLoading } = useSSO();

    // Check for token in URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('sso_token');

        if (token) {
            handleTokenLogin(token);
        }
    }, []);

    const handleTokenLogin = async (token: string) => {
        try {
            setIsRedirecting(true);
            setError(null);

            const result = await login(token);

            if (!result.valid) {
                setError(result.message || 'Authentication failed');
                setIsRedirecting(false);
            }
        } catch (err) {
            console.error('Token login error:', err);
            setError('Failed to authenticate with token');
            setIsRedirecting(false);
        }
    };

    const handleGlobalGameLoaderRedirect = () => {
        setIsRedirecting(true);

        // Construct redirect URL to Global Game Loader
        const returnUrl = encodeURIComponent(window.location.href);
        const globalGameLoaderUrl = import.meta.env.VITE_GLOBAL_GAME_LOADER_URL || 'http://localhost:3001';
        const loginUrl = `${globalGameLoaderUrl}/auth/sso-login?return_url=${returnUrl}&game=ready-or-not`;

        window.location.href = loginUrl;
    };

    if (isLoading || isRedirecting) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-16 w-auto flex items-center justify-center">
                    <div className="text-3xl font-bold text-blue-600">Ready or Not</div>
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
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        {error}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleGlobalGameLoaderRedirect}
                        disabled={isRedirecting}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
};

// =====================================================
// SESSION INFO COMPONENT (FOR DEBUGGING)
// =====================================================

export const SessionInfo: React.FC = () => {
    const { user, session, isAuthenticated, getSessionInfo } = useSSO();
    const [activeSessions, setActiveSessions] = useState<unknown[]>([]);
    const [healthCheck, setHealthCheck] = useState<unknown>(null);
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
            setHealthCheck(healthResult);
        } catch (error) {
            console.error('Failed to load debug info:', error);
        } finally {
            setLoading(false);
        }
    };

    const sessionStorageInfo = getSessionInfo();

    if (!isAuthenticated) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-800 font-medium">Not authenticated</div>
                <div className="text-yellow-600 text-sm mt-1">Please log in to view session information</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current User Session */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Current User Session</h3>

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
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                        <strong>District:</strong> {user.district_info.name} ({user.district_info.state})
                    </div>
                )}

                {user?.school_info && (
                    <div className="mt-4 p-3 bg-green-50 rounded">
                        <strong>School:</strong> {user.school_info.name}
                    </div>
                )}

                {user?.games && user.games.length > 0 && (
                    <div className="mt-4">
                        <strong>Game Access:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {user.games.map((game, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {game.name} ({game.permission_level})
                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Session Details */}
            {session && (
                <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">Session Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <strong>Session ID:</strong>
                            <code className="text-xs ml-2 bg-gray-100 px-1 py-0.5 rounded">
                                {session.session_id.substring(0, 16)}...
                            </code>
                        </div>
                        <div>
                            <strong>Expires:</strong> {formatSessionExpiry(session.expires_at)}
                        </div>
                        <div>
                            <strong>Last Activity:</strong> {formatTime(session.last_activity)}
                        </div>
                        <div>
                            <strong>Status:</strong>
                            <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                {session.is_active ? 'Active' : 'Inactive'}
              </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Storage Info */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Storage Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <strong>Has Local Session:</strong> {sessionStorageInfo.hasSession ? 'Yes' : 'No'}
                    </div>
                    {sessionStorageInfo.sessionAge && (
                        <div>
                            <strong>Session Age:</strong> {Math.round(sessionStorageInfo.sessionAge)} minutes
                        </div>
                    )}
                    {sessionStorageInfo.userEmail && (
                        <div>
                            <strong>Stored Email:</strong> {sessionStorageInfo.userEmail}
                        </div>
                    )}
                </div>
            </div>

            {/* Service Health */}
            <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Service Health</h3>
                    <button
                        onClick={loadDebugInfo}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {healthCheck && (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2" style={{
                  backgroundColor: healthCheck.healthy ? '#10b981' : '#ef4444'
              }}></span>
                            <strong>Overall:</strong> {healthCheck.message}
                        </div>
                        <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2" style={{
                  backgroundColor: healthCheck.database ? '#10b981' : '#ef4444'
              }}></span>
                            <strong>Database:</strong> {healthCheck.database ? 'Connected' : 'Error'}
                        </div>
                        <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2" style={{
                  backgroundColor: healthCheck.functions ? '#10b981' : '#ef4444'
              }}></span>
                            <strong>Functions:</strong> {healthCheck.functions ? 'Working' : 'Error'}
                        </div>
                    </div>
                )}
            </div>

            {/* Active Sessions */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Active Sessions ({activeSessions.length})</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                    {activeSessions.map((session: unknown, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
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
};

// =====================================================
// UTILITY COMPONENTS
// =====================================================

const LoadingSpinner: React.FC = () => (
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

const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
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

const AccessDenied: React.FC = () => (
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

const GameAccessDenied: React.FC<{ game: string }> = ({ game }) => (
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

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

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