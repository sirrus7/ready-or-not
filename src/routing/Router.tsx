// src/routing/Router.tsx - FIXED: Memoized AuthProvider element to prevent unmount/remount cycles
import React, {Suspense, useMemo, useEffect} from 'react';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import {AuthProvider} from '@app/providers/AuthProvider';
import {GameProvider} from '@app/providers/GameProvider';
import {TeamGameProvider} from '@app/providers/TeamGameProvider';
import {VideoSettingsProvider} from '@shared/providers/VideoSettingsProvider';
import AuthGuard from '@routing/guards/AuthGuard';
import {
    HostApp,
    DashboardPage,
    CreateGamePage,
    GameResultsPage,
    TeamApp,
    LoginPage,
    RouteLoadingFallback,
    DashboardLoadingFallback,
    GameLoadingFallback,
    TeamLoadingFallback,
    AuthenticatedPage,
    DisplayWrapper
} from '@routing/routes';

// Debug wrapper to track mount/unmount cycles
const DebugWrapper: React.FC<{ children: React.ReactNode, name: string }> = ({children, name}) => {
    console.log(`🔍 [${name}] Component re-rendering`);

    useEffect(() => {
        console.log(`🏗️ [${name}] COMPONENT MOUNTED`);
        return () => {
            console.log(`💀 [${name}] COMPONENT UNMOUNTED`);
        };
    }, [name]);

    return <>{children}</>;
};

const Router: React.FC = () => {

    console.log('🔍 [ROUTER] Component re-rendering');

    useEffect(() => {
        console.log('🏗️ [ROUTER] COMPONENT MOUNTED');
        return () => {
            console.log('💀 [ROUTER] COMPONENT UNMOUNTED');
        };
    }, []);

    // CRITICAL FIX: Memoize all fallback components to prevent recreation
    const teamLoadingFallback = useMemo(() => <TeamLoadingFallback/>, []);
    const dashboardLoadingFallback = useMemo(() => <DashboardLoadingFallback/>, []);
    const gameLoadingFallback = useMemo(() => <GameLoadingFallback/>, []);
    const routeLoadingFallback = useMemo(() => <RouteLoadingFallback message="Loading Game Creator..."/>, []);
    const resultsLoadingFallback = useMemo(() => <RouteLoadingFallback message="Loading Results..."/>, []);

    // CRITICAL FIX: Memoize the entire authenticated routes tree
    const authenticatedRoutes = useMemo(() => (
        <DebugWrapper name="ROUTES">
            <Routes>
                {/* Dashboard - Lazy loaded */}
                <Route path="/dashboard" element={
                    <AuthenticatedPage>
                        <Suspense fallback={dashboardLoadingFallback}>
                            <DashboardPage/>
                        </Suspense>
                    </AuthenticatedPage>
                }/>

                {/* Create Game Wizard - Lazy loaded */}
                <Route path="/create" element={
                    <AuthenticatedPage>
                        <Suspense fallback={routeLoadingFallback}>
                            <CreateGamePage/>
                        </Suspense>
                    </AuthenticatedPage>
                }/>

                {/* Game Results Route */}
                <Route path="/game-results/:sessionId" element={
                    <AuthenticatedPage>
                        <VideoSettingsProvider>
                            <GameProvider>
                                <Suspense fallback={resultsLoadingFallback}>
                                    <GameResultsPage/>
                                </Suspense>
                            </GameProvider>
                        </VideoSettingsProvider>
                    </AuthenticatedPage>
                }/>

                {/* Game Management Route (existing game session) */}
                <Route path="/game/:sessionId" element={
                    <AuthenticatedPage>
                        <VideoSettingsProvider>
                            <GameProvider>
                                <Suspense fallback={gameLoadingFallback}>
                                    <HostApp/>
                                </Suspense>
                            </GameProvider>
                        </VideoSettingsProvider>
                    </AuthenticatedPage>
                }/>

                {/* New Game Route (creates draft session) */}
                <Route path="/game" element={
                    <AuthenticatedPage>
                        <VideoSettingsProvider>
                            <GameProvider>
                                <Suspense fallback={gameLoadingFallback}>
                                    <HostApp/>
                                </Suspense>
                            </GameProvider>
                        </VideoSettingsProvider>
                    </AuthenticatedPage>
                }/>

                {/* Default authenticated route */}
                <Route path="/" element={
                    <AuthGuard>
                        <Navigate to="/dashboard" replace/>
                    </AuthGuard>
                }/>

                {/* Fallback for any other authenticated paths */}
                <Route path="*" element={
                    <AuthGuard>
                        <Navigate to="/dashboard" replace/>
                    </AuthGuard>
                }/>
            </Routes>
        </DebugWrapper>
    ), [dashboardLoadingFallback, routeLoadingFallback, resultsLoadingFallback, gameLoadingFallback]);

    // NEW CRITICAL FIX: Memoize the entire AuthProvider element
    const authProviderElement = useMemo(() => (
        <AuthProvider>
            {authenticatedRoutes}
        </AuthProvider>
    ), [authenticatedRoutes]);

    return (
        <BrowserRouter>
            <Routes>
                {/* ============================================================ */}
                {/* PUBLIC ROUTES (No Authentication Required) */}
                {/* ============================================================ */}

                {/* Team Join Routes - Public access with graceful auth handling */}
                <Route path="/team/:sessionId" element={
                    <AuthProvider>
                        <VideoSettingsProvider>
                            <TeamGameProvider>
                                <Suspense fallback={teamLoadingFallback}>
                                    <TeamApp/>
                                </Suspense>
                            </TeamGameProvider>
                        </VideoSettingsProvider>
                    </AuthProvider>
                }/>

                {/* Display/Presentation Routes - Graceful auth handling */}
                <Route path="/display/:sessionId" element={<DisplayWrapper/>}/>

                {/* ============================================================ */}
                {/* AUTHENTICATED ROUTES (Require Login) */}
                {/* ============================================================ */}

                {/* Login Page - Static import since it's small and needed quickly */}
                <Route path="/login" element={
                    <AuthProvider>
                        <LoginPage/>
                    </AuthProvider>
                }/>

                {/* Protected Routes with Full Authentication - FIXED: Use memoized AuthProvider element */}
                <Route path="/*" element={authProviderElement}/>
            </Routes>
        </BrowserRouter>
    );
};

export default Router;
