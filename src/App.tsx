// src/App.tsx
import React from 'react';
import {BrowserRouter, Routes, Route, Navigate, useParams} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import {AppProvider} from './context/AppContext';
import {VideoSettingsProvider} from './context/VideoSettingsContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import GameHostPage from './pages/GameHostPage';
import PresentationPage from './pages/PresentationPage';
import DashboardPage from './pages/DashboardPage';
import CreateGamePage from './pages/CreateGamePage';
import TeamDisplayPage from './pages/TeamDisplayPage';

// Wrapper component to extract sessionId and pass it to providers
const SessionAwareProviders: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();
    return (
        <VideoSettingsProvider sessionId={sessionId}>
            <AppProvider passedSessionId={sessionId}>
                {children}
            </AppProvider>
        </VideoSettingsProvider>
    );
};

// Special wrapper for PresentationPage that handles auth gracefully
const DisplayWrapper: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();

    return (
        <AuthProvider>
            <ErrorBoundary>
                <VideoSettingsProvider sessionId={sessionId}>
                    <AppProvider passedSessionId={sessionId}>
                        <PresentationPage />
                    </AppProvider>
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
                            <TeamDisplayPage/>
                        </ErrorBoundary>
                    }/>

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
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <VideoSettingsProvider>
                                                <SessionAwareProviders>
                                                    <DashboardPage/>
                                                </SessionAwareProviders>
                                            </VideoSettingsProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>
                                <Route path="/create-game" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <VideoSettingsProvider>
                                                <SessionAwareProviders>
                                                    <CreateGamePage/>
                                                </SessionAwareProviders>
                                            </VideoSettingsProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>
                                <Route path="/classroom/:sessionId" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <SessionAwareProviders>
                                                <GameHostPage/>
                                            </SessionAwareProviders>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>
                                <Route path="/classroom" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <VideoSettingsProvider>
                                                <AppProvider passedSessionId="new">
                                                    <GameHostPage/>
                                                </AppProvider>
                                            </VideoSettingsProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>

                                {/* Default authenticated route */}
                                <Route path="/" element={
                                    <PrivateRoute>
                                        <VideoSettingsProvider>
                                            <AppProvider>
                                                <Navigate to="/dashboard" replace/>
                                            </AppProvider>
                                        </VideoSettingsProvider>
                                    </PrivateRoute>
                                }/>
                                {/* Fallback for any other authenticated paths */}
                                <Route path="*" element={
                                    <PrivateRoute>
                                        <VideoSettingsProvider>
                                            <AppProvider>
                                                <Navigate to="/dashboard" replace/>
                                            </AppProvider>
                                        </VideoSettingsProvider>
                                    </PrivateRoute>
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