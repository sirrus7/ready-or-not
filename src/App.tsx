/**
 * App.tsx - Main Application Component with SSO Integration
 * Ready-or-Not Main Application with SSO Authentication
 *
 * File: src/App.tsx
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SSOProvider } from './components/auth/SSOProvider';
import { ProtectedRoute, SessionInfo } from './components/auth/SSOLogin';

// Import your existing components
// Replace these with your actual components
import Dashboard from './pages/Dashboard';
import GameSession from './pages/GameSession';
import TeamInterface from './pages/TeamInterface';
import HostControls from './pages/HostControls';
import DisplayScreen from './pages/DisplayScreen';
import NotFound from './pages/NotFound';

// =====================================================
// MAIN APP COMPONENT
// =====================================================

const App: React.FC = () => {
    return (
        <SSOProvider>
            <Router>
                <div className="min-h-screen bg-gray-50">
                    <Routes>
                        {/* Public Routes (no authentication required) */}
                        <Route path="/debug/session" element={<SessionInfo />} />

                        {/* Protected Routes - Default host access */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/session/:sessionId"
                            element={
                                <ProtectedRoute>
                                    <GameSession />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/team/:sessionId"
                            element={
                                <ProtectedRoute>
                                    <TeamInterface />
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin Only Routes */}
                        <Route
                            path="/admin/*"
                            element={
                                <ProtectedRoute
                                    requiredRole="org_admin"
                                    fallback={<AdminAccessDenied />}
                                >
                                    <AdminRoutes />
                                </ProtectedRoute>
                            }
                        />

                        {/* Host Controls - requires host permissions */}
                        <Route
                            path="/host/:sessionId"
                            element={
                                <ProtectedRoute requiredRole="host">
                                    <HostControls />
                                </ProtectedRoute>
                            }
                        />

                        {/* Display Screen - requires host permissions */}
                        <Route
                            path="/display/:sessionId"
                            element={
                                <ProtectedRoute requiredRole="host">
                                    <DisplayScreen />
                                </ProtectedRoute>
                            }
                        />

                        {/* Super Admin Routes */}
                        <Route
                            path="/super-admin/*"
                            element={
                                <ProtectedRoute
                                    requiredRole="super_admin"
                                    fallback={<SuperAdminAccessDenied />}
                                >
                                    <SuperAdminRoutes />
                                </ProtectedRoute>
                            }
                        />

                        {/* 404 Not Found */}
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                </div>
            </Router>
        </SSOProvider>
    );
};

// =====================================================
// NESTED ROUTE COMPONENTS
// =====================================================

const AdminRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/organizations" element={<OrganizationManagement />} />
            <Route path="/games" element={<GameManagement />} />
            <Route path="/reports" element={<ReportsSection />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
    );
};

const SuperAdminRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<SuperAdminDashboard />} />
            <Route path="/system" element={<SystemManagement />} />
            <Route path="/organizations" element={<OrganizationManagement />} />
            <Route path="/global-settings" element={<GlobalSettings />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="*" element={<Navigate to="/super-admin" replace />} />
        </Routes>
    );
};

// =====================================================
// PLACEHOLDER COMPONENTS
// =====================================================
// Replace these with your actual components

const Dashboard: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Ready or Not - Dashboard</h1>
        <p className="mt-4">Welcome to the Ready or Not game platform!</p>
    </div>
);

const GameSession: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Game Session</h1>
        <p className="mt-4">Active game session interface</p>
    </div>
);

const TeamInterface: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Team Interface</h1>
        <p className="mt-4">Team decision-making interface</p>
    </div>
);

const HostControls: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Host Controls</h1>
        <p className="mt-4">Game host control panel</p>
    </div>
);

const DisplayScreen: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Display Screen</h1>
        <p className="mt-4">Projection display for game</p>
    </div>
);

const AdminDashboard: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-4">Organization admin control panel</p>
    </div>
);

const UserManagement: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="mt-4">Manage users and permissions</p>
    </div>
);

const OrganizationManagement: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Organization Management</h1>
        <p className="mt-4">Manage organizations and structure</p>
    </div>
);

const GameManagement: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Game Management</h1>
        <p className="mt-4">Manage game configurations and settings</p>
    </div>
);

const ReportsSection: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-4">View and generate reports</p>
    </div>
);

const SuperAdminDashboard: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="mt-4">System-wide administration</p>
    </div>
);

const SystemManagement: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">System Management</h1>
        <p className="mt-4">System configuration and maintenance</p>
    </div>
);

const GlobalSettings: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Global Settings</h1>
        <p className="mt-4">Global system settings</p>
    </div>
);

const AuditLogs: React.FC = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="mt-4">System audit logs and activity</p>
    </div>
);

const NotFound: React.FC = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-400">404</h1>
            <p className="text-xl text-gray-600 mt-4">Page not found</p>
            <button
                onClick={() => window.location.href = '/'}
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Go Home
            </button>
        </div>
    </div>
);

// =====================================================
// ACCESS DENIED COMPONENTS
// =====================================================

const AdminAccessDenied: React.FC = () => (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <div className="text-orange-600 text-center mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-orange-700 mb-2 text-center">Admin Access Required</h2>
            <p className="text-gray-600 mb-4 text-center">
                You need administrator privileges to access this section.
            </p>
            <p className="text-gray-500 text-sm text-center">
                Contact your system administrator if you believe you should have access.
            </p>
            <button
                onClick={() => window.history.back()}
                className="w-full mt-4 bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 transition-colors"
            >
                Go Back
            </button>
        </div>
    </div>
);

const SuperAdminAccessDenied: React.FC = () => (
    <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <div className="text-red-600 text-center mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-red-700 mb-2 text-center">Super Admin Access Required</h2>
            <p className="text-gray-600 mb-4 text-center">
                You need super administrator privileges to access this section.
            </p>
            <p className="text-gray-500 text-sm text-center">
                This area is restricted to system administrators only.
            </p>
            <button
                onClick={() => window.history.back()}
                className="w-full mt-4 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
            >
                Go Back
            </button>
        </div>
    </div>
);

export default App;