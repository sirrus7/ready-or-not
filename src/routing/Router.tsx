// src/routing/Router.tsx - Extracted routing logic from App.tsx
import React, {Suspense} from 'react';
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

const Router: React.FC = () => {
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
                                <Suspense fallback={<TeamLoadingFallback/>}>
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

                {/* Protected Routes with Full Authentication */}
                <Route path="/*" element={
                    <AuthProvider>
                        <Routes>
                            {/* Dashboard - Lazy loaded */}
                            <Route path="/dashboard" element={
                                <AuthenticatedPage>
                                    <Suspense fallback={<DashboardLoadingFallback/>}>
                                        <DashboardPage/>
                                    </Suspense>
                                </AuthenticatedPage>
                            }/>

                            {/* Create Game Wizard - Lazy loaded */}
                            <Route path="/create" element={
                                <AuthenticatedPage>
                                    <Suspense fallback={<RouteLoadingFallback message="Loading Game Creator..."/>}>
                                        <CreateGamePage/>
                                    </Suspense>
                                </AuthenticatedPage>
                            }/>

                            {/* Game Results Route */}
                            <Route path="/results/:sessionId" element={
                                <AuthenticatedPage>
                                    <VideoSettingsProvider>
                                        <GameProvider>
                                            <Suspense fallback={<RouteLoadingFallback message="Loading Results..."/>}>
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
                                            <Suspense fallback={<GameLoadingFallback/>}>
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
                                            <Suspense fallback={<GameLoadingFallback/>}>
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
                    </AuthProvider>
                }/>
            </Routes>
        </BrowserRouter>
    );
};

export default Router;
