// src/routing/routes.tsx - Component exports and route constants
import React, {lazy, Suspense} from 'react';
import {Navigate, useParams} from 'react-router-dom';
import {AuthProvider} from '@app/providers/AuthProvider';
import {TeamGameProvider} from '@app/providers/TeamGameProvider';
import {VideoSettingsProvider} from '@shared/providers/VideoSettingsProvider';
import AuthGuard from '@routing/guards/AuthGuard';

// ============================================================================
// LAZY LOADED COMPONENTS - Code Splitting by Route
// ============================================================================

// Host-related components (largest bundle)
export const HostApp = lazy(() => import('@views/host/HostApp'));
export const DashboardPage = lazy(() => import('@views/host/pages/DashboardPage'));
export const CreateGamePage = lazy(() => import('@views/host/pages/CreateGamePage'));
export const GameResultsPage = lazy(() => import('@views/host/pages/GameResultsPage'));

// Team components (second largest)
export const TeamApp = lazy(() => import('@views/team/TeamApp'));

// Presentation components (third largest)
export const PresentationApp = lazy(() => import('@views/presentation/PresentationApp'));

// Login page - keep static since it's small and needed immediately
export {default as LoginPage} from '@views/host/pages/LoginPage';

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

export const RouteLoadingFallback: React.FC<{ message?: string }> = ({message = "Loading..."}) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-game-orange-500"></div>
        <p className="ml-3 text-gray-700">{message}</p>
    </div>
);

export const DashboardLoadingFallback = () => <RouteLoadingFallback message="Loading Dashboard..."/>;
export const GameLoadingFallback = () => <RouteLoadingFallback message="Loading Game..."/>;
export const TeamLoadingFallback = () => <RouteLoadingFallback message="Loading Team View..."/>;
export const PresentationLoadingFallback = () => <RouteLoadingFallback message="Loading Presentation..."/>;

// ============================================================================
// ROUTE WRAPPER COMPONENTS
// ============================================================================

export const AuthenticatedPage: React.FC<{ children: React.ReactNode }> = ({children}) => (
    <AuthGuard>{children}</AuthGuard>
);

export const DisplayWrapper: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();

    if (!sessionId) {
        return <Navigate to="/login" replace/>;
    }

    return (
        <AuthProvider>
            <VideoSettingsProvider>
                <TeamGameProvider>
                    <Suspense fallback={<PresentationLoadingFallback/>}>
                        <PresentationApp/>
                    </Suspense>
                </TeamGameProvider>
            </VideoSettingsProvider>
        </AuthProvider>
    );
};
