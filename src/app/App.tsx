// src/app/App.tsx - Updated to include RONBotWidget only on authenticated host pages
import React from 'react';
import {BrowserRouter, Routes, Route, Navigate, useParams} from 'react-router-dom';
import {AuthProvider} from '@app/providers/AuthProvider';
import {GameProvider} from '@app/providers/GameProvider';
import {VideoSettingsProvider} from '@shared/providers/VideoSettingsProvider';
import AuthGuard from '@routing/guards/AuthGuard';
import ErrorBoundary from '@shared/components/UI/ErrorBoundary';
import LoginPage from '@views/host/pages/LoginPage';
import HostApp from '@views/host/HostApp';
import PresentationApp from '@views/presentation/PresentationApp';
import DashboardPage from '@views/host/pages/DashboardPage';
import CreateGamePage from '@views/host/pages/CreateGamePage';
import TeamApp from '@views/team/TeamApp';
import {PDFGenerationProvider} from "@shared/hooks/pdf/useTeamCardsPDF.tsx";

// Wrapper component to extract sessionId and pass it to providers
const SessionAwareProviders: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();
    return (
        <VideoSettingsProvider sessionId={sessionId}>
            <GameProvider passedSessionId={sessionId}>
                {children}
            </GameProvider>
        </VideoSettingsProvider>
    );
};

// Special wrapper for PresentationApp that handles auth gracefully (NO RONBotWidget)
const DisplayWrapper: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();

    return (
        <AuthProvider>
            <ErrorBoundary>
                <VideoSettingsProvider sessionId={sessionId}>
                    <GameProvider passedSessionId={sessionId}>
                        <PresentationApp/>
                    </GameProvider>
                </VideoSettingsProvider>
            </ErrorBoundary>
        </AuthProvider>
    );
};

const AuthenticatedPage: React.FC<{ children: React.ReactNode }> = ({children}) => {
    return (
        <AuthGuard>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </AuthGuard>
    );
};

function App() {
    return (
        <ErrorBoundary>
            <PDFGenerationProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Publicly accessible team-facing routes - NO AUTH REQUIRED*/}
                        <Route path="/team/:sessionId" element={
                            <ErrorBoundary>
                                <TeamApp/>
                            </ErrorBoundary>
                        }/>

                        {/* Student Display - Special handling for same-browser different tab */}
                        <Route path="/student-display/:sessionId" element={<DisplayWrapper/>}/>

                        {/* All other routes wrapped in AuthProvider */}
                        <Route path="/*" element={
                            <AuthProvider>
                                <Routes>
                                    {/* Host Login - Publicly accessible */}
                                    <Route path="/login" element={
                                        <ErrorBoundary>
                                            <LoginPage/>
                                        </ErrorBoundary>
                                    }/>

                                    {/* Host-only authenticated routes */}
                                    <Route path="/dashboard" element={
                                        <AuthenticatedPage>
                                            <VideoSettingsProvider>
                                                <GameProvider>
                                                    <DashboardPage/>
                                                </GameProvider>
                                            </VideoSettingsProvider>
                                        </AuthenticatedPage>
                                    }/>

                                    <Route path="/create-game" element={
                                        <AuthenticatedPage>
                                            <VideoSettingsProvider>
                                                <SessionAwareProviders>
                                                    <CreateGamePage/>
                                                </SessionAwareProviders>
                                            </VideoSettingsProvider>
                                        </AuthenticatedPage>
                                    }/>

                                    <Route path="/game/:sessionId" element={
                                        <AuthenticatedPage>
                                            <SessionAwareProviders>
                                                <HostApp/>
                                            </SessionAwareProviders>
                                        </AuthenticatedPage>
                                    }/>

                                    <Route path="/game" element={
                                        <AuthenticatedPage>
                                            <VideoSettingsProvider>
                                                <GameProvider passedSessionId="new">
                                                    <HostApp/>
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
