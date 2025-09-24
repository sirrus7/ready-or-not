// src/routing/routes.tsx - Component exports and route constants
import React, {lazy, Suspense} from 'react';
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
import {ExternalLink} from "lucide-react";

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

// Replace the existing DisplayWrapper with this:
export const DisplayWrapper: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();

    if (!sessionId) {
        // In development, redirect to login; in production, show marketplace login
        if (import.meta.env.DEV) {
            return <Navigate to="/login" replace/>;
        } else {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center max-w-md mx-auto p-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-4">Login Required</h1>
                        <p className="text-gray-600 mb-6">
                            Please login through the marketplace to access your game session.
                        </p>
                        <a
                            href="https://platform.ron2game.com/login"
                            className="inline-flex items-center gap-2 bg-game-orange-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-game-orange-700 focus:outline-none focus:ring-2 focus:ring-game-orange-500 focus:ring-offset-2 transition-colors duration-150"
                        >
                            Go to Marketplace Login
                            <ExternalLink size={16}/>
                        </a>
                    </div>
                </div>
            );
        }
    }

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
