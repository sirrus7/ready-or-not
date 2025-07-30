// src/routing/Router.tsx - UPDATED WITH MAGIC LINK HANDLING
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
import MagicLinkHandler from '@routing/components/MagicLinkHandler';

const Router: React.FC = React.memo(() => {
    return (
        <BrowserRouter>
            {/* ✅ SINGLE AuthProvider for entire application */}
            <AuthProvider>
                <Routes>
                    {/* ============================================================ */}
                    {/* ROOT ROUTE - HANDLES MAGIC LINKS AND NORMAL ROUTING */}
                    {/* ============================================================ */}

                    {/* 🔗 Magic Link Handler - Processes authentication before routing */}
                    <Route
                        path="/"
                        element={<MagicLinkHandler />}
                    />

                    {/* ============================================================ */}
                    {/* PUBLIC ROUTES (No Authentication Required) */}
                    {/* ============================================================ */}

                    {/* Login Route - No magic link redirect logic needed anymore */}
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

                    {/* Display Routes - Public access for presentation mode */}
                    <Route
                        path="/display/:sessionId"
                        element={<DisplayWrapper/>}
                    />

                    {/* ============================================================ */}
                    {/* PROTECTED ROUTES (Authentication Required) */}
                    {/* ============================================================ */}

                    {/* Dashboard Route - Main authenticated entry point */}
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

                    {/* Create Game Route */}
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

                    {/* Host Game Routes */}
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

                    {/* Game Results Route */}
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

                    {/* ============================================================ */}
                    {/* FALLBACK ROUTES */}
                    {/* ============================================================ */}

                    {/* 404 catch-all - Redirect to dashboard for authenticated users */}
                    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
});

Router.displayName = 'Router';
export default Router;