// src/routing/Router.tsx - FIXED: Single AuthProvider to prevent unmount/remount cycles
import React, {Suspense, useEffect} from 'react';
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
    console.log('🔍 [ROUTER] Component re-rendering');

    useEffect(() => {
        console.log('🏗️ [ROUTER] COMPONENT MOUNTED');
        return () => {
            console.log('💀 [ROUTER] COMPONENT UNMOUNTED');
        };
    }, []);

    return (
        <BrowserRouter>
            {/* ✅ SINGLE AuthProvider for entire application */}
            <AuthProvider>
                <Routes>
                    {/* ============================================================ */}
                    {/* PUBLIC ROUTES (No Authentication Required) */}
                    {/* ============================================================ */}

                    {/* Team Join Routes - Public access, inherit AuthProvider but user will be null */}
                    <Route path="/team/:sessionId" element={
                        <VideoSettingsProvider>
                            <TeamGameProvider>
                                <Suspense fallback={<TeamLoadingFallback/>}>
                                    <TeamApp/>
                                </Suspense>
                            </TeamGameProvider>
                        </VideoSettingsProvider>
                    }/>

                    {/* Display/Presentation Routes - Public access, inherit AuthProvider but user will be null */}
                    <Route path="/display/:sessionId" element={<DisplayWrapper/>}/>

                    {/* ============================================================ */}
                    {/* AUTHENTICATED ROUTES (Require Login) */}
                    {/* ============================================================ */}

                    {/* Login Page - Inherit AuthProvider */}
                    <Route path="/login" element={<LoginPage/>}/>

                    {/* Dashboard - Lazy loaded with authentication */}
                    <Route path="/dashboard" element={
                        <AuthenticatedPage>
                            <Suspense fallback={<DashboardLoadingFallback/>}>
                                <DashboardPage/>
                            </Suspense>
                        </AuthenticatedPage>
                    }/>

                    {/* Create Game Wizard - Lazy loaded with authentication */}
                    <Route path="/create" element={
                        <AuthenticatedPage>
                            <Suspense fallback={<RouteLoadingFallback message="Loading Game Creator..."/>}>
                                <CreateGamePage/>
                            </Suspense>
                        </AuthenticatedPage>
                    }/>

                    {/* Game Results Route - Authenticated with GameProvider */}
                    <Route path="/game-results/:sessionId" element={
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

                    {/* Game Management Route (existing game session) - Authenticated with GameProvider */}
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

                    {/* New Game Route (creates draft session) - Authenticated with GameProvider */}
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

                    {/* Default authenticated route - Dashboard redirect */}
                    <Route path="/" element={
                        <AuthGuard>
                            <Navigate to="/dashboard" replace/>
                        </AuthGuard>
                    }/>

                    {/* Fallback for any other authenticated paths - Dashboard redirect */}
                    <Route path="*" element={
                        <AuthGuard>
                            <Navigate to="/dashboard" replace/>
                        </AuthGuard>
                    }/>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default Router;
