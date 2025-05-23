// src/App.tsx
import React from 'react';
import {BrowserRouter, Routes, Route, Navigate, useParams} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import {AppProvider} from './context/AppContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import GameHostPage from './pages/GameHostPage';
import StudentDisplayWrapper from './components/StudentDisplay/StudentDisplayWrapper';
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
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Publicly accessible student-facing routes - NO AUTH REQUIRED */}
                    <Route path="/student-game/:sessionId" element={
                        <CompanyDisplayPage/>
                    }/>
                    <Route path="/student-display/:sessionId" element={
                        <StudentDisplayWrapper/>
                    }/>

                    {/* Teacher Login - Publicly accessible */}
                    <Route path="/login" element={
                        <SessionAwareAppProvider>
                            <LoginPage/>
                        </SessionAwareAppProvider>
                    }/>

                    {/* Teacher-only authenticated routes */}
                    <Route path="/dashboard" element={
                        <PrivateRoute>
                            <SessionAwareAppProvider>
                                <DashboardPage/>
                            </SessionAwareAppProvider>
                        </PrivateRoute>
                    }/>
                    <Route path="/create-game" element={
                        <PrivateRoute>
                            <SessionAwareAppProvider>
                                <CreateGamePage/>
                            </SessionAwareAppProvider>
                        </PrivateRoute>
                    }/>
                    <Route path="/classroom/:sessionId" element={
                        <PrivateRoute>
                            <SessionAwareAppProvider>
                                <GameHostPage/>
                            </SessionAwareAppProvider>
                        </PrivateRoute>
                    }/>
                    <Route path="/classroom" element={
                        <PrivateRoute>
                            <AppProvider passedSessionId="new">
                                <GameHostPage/>
                            </AppProvider>
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
        </BrowserRouter>
    );
}

export default App;