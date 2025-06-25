// src/app/App.tsx - Optimized with Route-Based Code Splitting
import React, {lazy, Suspense} from 'react';
import {BrowserRouter, Routes, Route, Navigate, useParams} from 'react-router-dom';
import {AuthProvider} from '@app/providers/AuthProvider';
import {GameProvider} from '@app/providers/GameProvider';
import {TeamGameProvider} from '@app/providers/TeamGameProvider';
import {VideoSettingsProvider} from '@shared/providers/VideoSettingsProvider';
import AuthGuard from '@routing/guards/AuthGuard';
import ErrorBoundary from '@shared/components/UI/ErrorBoundary';
import {PDFGenerationProvider} from "@shared/hooks/pdf/useTeamCardsPDF.tsx";

// ============================================================================
// LAZY LOADED COMPONENTS - Code Splitting by Route
// ============================================================================

// Host-related components (largest bundle)
const HostApp = lazy(() => import('@views/host/HostApp'));
const DashboardPage = lazy(() => import('@views/host/pages/DashboardPage'));
const CreateGamePage = lazy(() => import('@views/host/pages/CreateGamePage'));
const GameResultsPage = lazy(() => import('@views/host/pages/GameResultsPage'));

// Team components (second largest)
const TeamApp = lazy(() => import('@views/team/TeamApp'));

// Presentation components (third largest)
const PresentationApp = lazy(() => import('@views/presentation/PresentationApp'));

// Login page - keep static since it's small and needed immediately
import LoginPage from '@views/host/pages/LoginPage';

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

const RouteLoadingFallback: React.FC<{ message?: string }> = ({
                                                                  message = "Loading application..."
                                                              }) => (
    <div
        className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">{message}</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we prepare your experience</p>
        </div>
    </div>
);

const GameLoadingFallback: React.FC = () => (
    <RouteLoadingFallback message="Loading game interface..."/>
);

const DashboardLoadingFallback: React.FC = () => (
    <RouteLoadingFallback message="Loading dashboard..."/>
);

const TeamLoadingFallback: React.FC = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg font-medium">Loading team interface...</p>
            <p className="text-gray-400 text-sm mt-2">Connecting to your game session</p>
        </div>
    </div>
);

// ============================================================================
// WRAPPER COMPONENTS
// ============================================================================

// Wrapper component to extract sessionId and pass it to providers
const SessionAwareProviders: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();
    return (
        <VideoSettingsProvider sessionId={sessionId}>
            <GameProvider>
                {children}
            </GameProvider>
        </VideoSettingsProvider>
    );
};

// Special wrapper for PresentationApp that handles auth gracefully
const DisplayWrapper: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();

    return (
        <AuthProvider>
            <ErrorBoundary>
                <VideoSettingsProvider sessionId={sessionId}>
                    <Suspense fallback={<RouteLoadingFallback message="Loading presentation..."/>}>
                        <PresentationApp/>
                    </Suspense>
                </VideoSettingsProvider>
            </ErrorBoundary>
        </AuthProvider>
    );
};

// Authenticated page wrapper with enhanced loading
const AuthenticatedPage: React.FC<{ children: React.ReactNode }> = ({children}) => (
    <AuthGuard>
        {children}
    </AuthGuard>
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
    return (
        <ErrorBoundary>
            <PDFGenerationProvider>
                <BrowserRouter>
                    <Routes>
                        {/* ============================================================ */}
                        {/* PUBLIC ROUTES (No Authentication Required) */}
                        {/* ============================================================ */}

                        {/* Team Routes - Lightweight provider, no auth */}
                        <Route path="/team/:sessionId" element={
                            <TeamGameProvider>
                                <Suspense fallback={<TeamLoadingFallback/>}>
                                    <TeamApp/>
                                </Suspense>
                            </TeamGameProvider>
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
                                            <Suspense fallback={<RouteLoadingFallback
                                                message="Loading game creation wizard..."/>}>
                                                <CreateGamePage/>
                                            </Suspense>
                                        </AuthenticatedPage>
                                    }/>

                                    {/* Host Game Interface - Lazy loaded with full provider stack */}
                                    <Route path="/game/:sessionId" element={
                                        <AuthenticatedPage>
                                            <SessionAwareProviders>
                                                <Suspense fallback={<GameLoadingFallback/>}>
                                                    <HostApp/>
                                                </Suspense>
                                            </SessionAwareProviders>
                                        </AuthenticatedPage>
                                    }/>

                                    {/* Game Results - Show analytics for completed games */}
                                    <Route path="/game-results/:sessionId" element={
                                        <AuthenticatedPage>
                                            <Suspense fallback={<RouteLoadingFallback message="Loading game results..." />}>
                                                <GameResultsPage />
                                            </Suspense>
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
            </PDFGenerationProvider>
        </ErrorBoundary>
    );
}

export default App;
