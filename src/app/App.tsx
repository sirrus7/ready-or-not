// src/app/App.tsx
import React from 'react';
import {BrowserRouter, Routes, Route, Navigate, useParams} from 'react-router-dom';
import { AuthProvider } from '@app/providers/AuthProvider';
import { GameProvider } from '@app/providers/GameProvider';
import { VideoSettingsProvider } from '@shared/providers/VideoSettingsProvider';
import AuthGuard from '@routing/guards/AuthGuard';
import ErrorBoundary from '@shared/components/UI/ErrorBoundary';
import LoginPage from '@views/host/pages/LoginPage';
import HostApp from '@views/host/HostApp';
import PresentationApp from '@views/presentation/PresentationApp';
import DashboardPage from '@views/host/pages/DashboardPage';
import CreateGamePage from '@views/host/pages/CreateGamePage';
import TeamApp from '@views/team/TeamApp';
import {TeamCardsPDFProvider} from "@shared/hooks/pdf";
import PDFGeneratorDemo from "@views/host/components/PDFGeneratorDemo.tsx";

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

// Special wrapper for PresentationApp that handles auth gracefully
const DisplayWrapper: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();

    return (
        <AuthProvider>
            <ErrorBoundary>
                <VideoSettingsProvider sessionId={sessionId}>
                    <GameProvider passedSessionId={sessionId}>
                        <PresentationApp />
                    </GameProvider>
                </VideoSettingsProvider>
            </ErrorBoundary>
        </AuthProvider>
    );
};

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    {/* Publicly accessible student-facing routes - NO AUTH REQUIRED */}
                    <Route path="/student-game/:sessionId" element={
                        <ErrorBoundary>
                            <TeamApp/>
                        </ErrorBoundary>
                    }/>

                    {/* TODO - remove this once validated*/}
                    <Route path="/test-the-pdf-generation" element={
                        <ErrorBoundary>
                            <TeamCardsPDFProvider>
                                <PDFGeneratorDemo />
                            </TeamCardsPDFProvider>
                        </ErrorBoundary>
                    } />

                    {/* Student Display - Special handling for same-browser different tab */}
                    <Route path="/student-display/:sessionId" element={<DisplayWrapper />} />

                    {/* All other routes wrapped in AuthProvider */}
                    <Route path="/*" element={
                        <AuthProvider>
                            <Routes>
                                {/* Teacher Login - Publicly accessible */}
                                <Route path="/login" element={
                                    <ErrorBoundary>
                                        <VideoSettingsProvider>
                                            <SessionAwareProviders>
                                                <LoginPage/>
                                            </SessionAwareProviders>
                                        </VideoSettingsProvider>
                                    </ErrorBoundary>
                                }/>

                                {/* Teacher-only authenticated routes */}
                                <Route path="/dashboard" element={
                                    <AuthGuard>
                                        <ErrorBoundary>
                                            <VideoSettingsProvider>
                                                <SessionAwareProviders>
                                                    <DashboardPage/>
                                                </SessionAwareProviders>
                                            </VideoSettingsProvider>
                                        </ErrorBoundary>
                                    </AuthGuard>
                                }/>
                                <Route path="/create-game" element={
                                    <AuthGuard>
                                        <ErrorBoundary>
                                            <VideoSettingsProvider>
                                                <SessionAwareProviders>
                                                    <CreateGamePage/>
                                                </SessionAwareProviders>
                                            </VideoSettingsProvider>
                                        </ErrorBoundary>
                                    </AuthGuard>
                                }/>
                                <Route path="/classroom/:sessionId" element={
                                    <AuthGuard>
                                        <ErrorBoundary>
                                            <SessionAwareProviders>
                                                <HostApp/>
                                            </SessionAwareProviders>
                                        </ErrorBoundary>
                                    </AuthGuard>
                                }/>
                                <Route path="/classroom" element={
                                    <AuthGuard>
                                        <ErrorBoundary>
                                            <VideoSettingsProvider>
                                                <GameProvider passedSessionId="new">
                                                    <HostApp/>
                                                </GameProvider>
                                            </VideoSettingsProvider>
                                        </ErrorBoundary>
                                    </AuthGuard>
                                }/>

                                {/* Default authenticated route */}
                                <Route path="/" element={
                                    <AuthGuard>
                                        <VideoSettingsProvider>
                                            <GameProvider>
                                                <Navigate to="/dashboard" replace/>
                                            </GameProvider>
                                        </VideoSettingsProvider>
                                    </AuthGuard>
                                }/>
                                {/* Fallback for any other authenticated paths */}
                                <Route path="*" element={
                                    <AuthGuard>
                                        <VideoSettingsProvider>
                                            <GameProvider>
                                                <Navigate to="/dashboard" replace/>
                                            </GameProvider>
                                        </VideoSettingsProvider>
                                    </AuthGuard>
                                }/>
                            </Routes>
                        </AuthProvider>
                    }/>
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;