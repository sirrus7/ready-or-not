// src/routing/routes.tsx - Component exports and route constants
import React, {lazy, Suspense, useEffect} from 'react';
import {Navigate, useParams} from 'react-router-dom';
import {TeamGameProvider} from '@app/providers/TeamGameProvider';
import {VideoSettingsProvider} from '@shared/providers/VideoSettingsProvider';
import AuthGuard from '@routing/guards/AuthGuard';

// ============================================================================
// CONDITIONAL IMPORTS - Direct imports in development for IntelliJ debugging
// ============================================================================

// Import directly in development for IDE debugging, lazy load in production
import HostAppDirect from '@views/host/HostApp';
import DashboardPageDirect from '@views/host/pages/DashboardPage';
import CreateGamePageDirect from '@views/host/pages/CreateGamePage';
import GameResultsPageDirect from '@views/host/pages/GameResultsPage';
import TeamAppDirect from '@views/team/TeamApp';
import PresentationAppDirect from '@views/presentation/PresentationApp';

// ============================================================================
// LAZY LOADED COMPONENTS - Code Splitting by Route
// ============================================================================

// Host-related components (largest bundle)
export const HostApp = import.meta.env.DEV ? HostAppDirect : lazy(() => import('@views/host/HostApp'));
export const DashboardPage = import.meta.env.DEV ? DashboardPageDirect : lazy(() => import('@views/host/pages/DashboardPage'));
export const CreateGamePage = import.meta.env.DEV ? CreateGamePageDirect : lazy(() => import('@views/host/pages/CreateGamePage'));
export const GameResultsPage = import.meta.env.DEV ? GameResultsPageDirect : lazy(() => import('@views/host/pages/GameResultsPage'));

// Team components (second largest)
export const TeamApp = import.meta.env.DEV ? TeamAppDirect : lazy(() => import('@views/team/TeamApp'));

// Presentation components (third largest)
export const PresentationApp = import.meta.env.DEV ? PresentationAppDirect : lazy(() => import('@views/presentation/PresentationApp'));

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

export const AuthenticatedPage: React.FC<{ children: React.ReactNode }> = React.memo(({children}) => {
    return <AuthGuard>{children}</AuthGuard>;
});

AuthenticatedPage.displayName = 'AuthenticatedPage';

export const DisplayWrapper: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();

    if (!sessionId) {
        return <Navigate to="/login" replace/>;
    }

    // ✅ Remove AuthProvider wrapper - inherit from Router
    return (
        <VideoSettingsProvider>
            <TeamGameProvider>
                <Suspense fallback={<PresentationLoadingFallback/>}>
                    <PresentationApp/>
                </Suspense>
            </TeamGameProvider>
        </VideoSettingsProvider>
    );
};
