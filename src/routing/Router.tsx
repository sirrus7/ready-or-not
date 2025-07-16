// src/routing/Router.tsx - RESTORED your original routes, only removed conflicting /game route
import React, {Suspense} from 'react';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import {AuthProvider} from '@app/providers/AuthProvider';
import {GameProvider} from '@app/providers/GameProvider';
import {TeamGameProvider} from '@app/providers/TeamGameProvider';
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

const Router: React.FC = React.memo(() => {
    return (
        <BrowserRouter>
            {/* ✅ SINGLE AuthProvider for entire application */}
            <AuthProvider>
                <Routes>
                    {/* ============================================================ */}
                    {/* PUBLIC ROUTES (No Authentication Required) */}
                    {/* ============================================================ */}

                    {/* Login Route */}
                    <Route
                        path="/login"
                        element={
                            <Suspense fallback={<RouteLoadingFallback message="Loading login..."/>}>
                                <LoginPage/>
                            </Suspense>
                        }
                    />

                    {/* Team Join Routes - Public access */}
                    <Route
                        path="/team/:sessionId"
                        element={
                            <TeamGameProvider>
                                <Suspense fallback={<TeamLoadingFallback/>}>
                                    <TeamApp/>
                                </Suspense>
                            </TeamGameProvider>
                        }
                    />

                    {/* Display Routes - Public access */}
                    <Route
                        path="/display/:sessionId"
                        element={<DisplayWrapper/>}
                    />

                    {/* ============================================================ */}
                    {/* PROTECTED ROUTES (Authentication Required) */}
                    {/* ============================================================ */}

                    {/* Dashboard - Protected */}
                    <Route
                        path="/dashboard"
                        element={
                            <AuthenticatedPage>
                                <Suspense fallback={<DashboardLoadingFallback/>}>
                                    <DashboardPage/>
                                </Suspense>
                            </AuthenticatedPage>
                        }
                    />

                    {/* Create Game - Protected */}
                    <Route
                        path="/create"
                        element={
                            <AuthenticatedPage>
                                <Suspense fallback={<GameLoadingFallback/>}>
                                    <CreateGamePage/>
                                </Suspense>
                            </AuthenticatedPage>
                        }
                    />

                    {/* ✅ RESTORED: Your original Host Game route */}
                    <Route
                        path="/host/:sessionId/*"
                        element={
                            <AuthenticatedPage>
                                <GameProvider>
                                    <Suspense fallback={<GameLoadingFallback/>}>
                                        <HostApp/>
                                    </Suspense>
                                </GameProvider>
                            </AuthenticatedPage>
                        }
                    />

                    {/* ✅ RESTORED: Your original Game Results route */}
                    <Route
                        path="/results/:sessionId"
                        element={
                            <AuthenticatedPage>
                                <GameProvider>
                                    <Suspense fallback={<GameLoadingFallback/>}>
                                        <GameResultsPage/>
                                    </Suspense>
                                </GameProvider>
                            </AuthenticatedPage>
                        }
                    />

                    {/* Root redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>

                    {/* 404 catch-all */}
                    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
});

Router.displayName = 'Router';
export default Router;
