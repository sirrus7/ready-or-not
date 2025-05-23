// src/App.tsx - Fixed version with AppProvider for StudentDisplayPage
import React from 'react';
import {BrowserRouter, Routes, Route, Navigate, useParams} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import {AppProvider} from './context/AppContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import GameHostPage from './pages/GameHostPage';
import StudentDisplayPage from './pages/StudentDisplayPage';
import DashboardPage from './pages/DashboardPage';
import CreateGamePage from './pages/CreateGamePage';
import CompanyDisplayPage from './pages/CompanyDisplayPage';

// Wrapper component to extract sessionId and pass it to AppProvider for GameHostPage
const SessionAwareAppProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();
    return <AppProvider passedSessionId={sessionId}>{children}</AppProvider>;
};

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    {/* Publicly accessible student-facing routes - NO AUTH REQUIRED */}
                    <Route path="/student-game/:sessionId" element={
                        <ErrorBoundary>
                            <CompanyDisplayPage/>
                        </ErrorBoundary>
                    }/>

                    {/* All other routes wrapped in AuthProvider */}
                    <Route path="/*" element={
                        <AuthProvider>
                            <Routes>
                                {/* Teacher Login - Publicly accessible */}
                                <Route path="/login" element={
                                    <ErrorBoundary>
                                        <SessionAwareAppProvider>
                                            <LoginPage/>
                                        </SessionAwareAppProvider>
                                    </ErrorBoundary>
                                }/>

                                {/* Teacher-only authenticated routes */}
                                <Route path="/dashboard" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <SessionAwareAppProvider>
                                                <DashboardPage/>
                                            </SessionAwareAppProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>
                                <Route path="/create-game" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <SessionAwareAppProvider>
                                                <CreateGamePage/>
                                            </SessionAwareAppProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>
                                <Route path="/classroom/:sessionId" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <SessionAwareAppProvider>
                                                <GameHostPage/>
                                            </SessionAwareAppProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>
                                <Route path="/student-display/:sessionId" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <SessionAwareAppProvider>
                                                <StudentDisplayPage/>
                                            </SessionAwareAppProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>
                                <Route path="/classroom" element={
                                    <PrivateRoute>
                                        <ErrorBoundary>
                                            <AppProvider passedSessionId="new">
                                                <GameHostPage/>
                                            </AppProvider>
                                        </ErrorBoundary>
                                    </PrivateRoute>
                                }/>

                                {/* Default authenticated route */}
                                <Route path="/" element={
                                    <PrivateRoute>
                                        <AppProvider>
                                            <Navigate to="/dashboard" replace/>
                                        </AppProvider>
                                    </PrivateRoute>
                                }/>
                                {/* Fallback for any other authenticated paths */}
                                <Route path="*" element={
                                    <PrivateRoute>
                                        <AppProvider>
                                            <Navigate to="/dashboard" replace/>
                                        </AppProvider>
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