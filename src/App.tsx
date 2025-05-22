// src/App.tsx
import React from 'react';
import {BrowserRouter, Routes, Route, Navigate, useParams} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import {AppProvider} from './context/AppContext';
import PrivateRoute from './components/PrivateRoute';
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
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Publicly accessible student-facing routes */}
                    <Route path="/student-game/:sessionId" element={<CompanyDisplayPage />} />
                    <Route path="/student-display/:sessionId" element={<StudentDisplayPage/>}/>

                    {/* Teacher Login - Publicly accessible */}
                    <Route path="/login" element={<AppProvider><LoginPage/></AppProvider>}/>

                    {/* Teacher-only authenticated routes */}
                    <Route
                        path="/dashboard"
                        element={<PrivateRoute><AppProvider><DashboardPage/></AppProvider></PrivateRoute>}
                    />
                    <Route
                        path="/create-game"
                        element={<PrivateRoute><AppProvider><CreateGamePage/></AppProvider></PrivateRoute>}
                    />
                    <Route
                        path="/classroom/:sessionId"
                        element={
                            <PrivateRoute>
                                <SessionAwareAppProvider>
                                    <GameHostPage/>
                                </SessionAwareAppProvider>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/classroom"
                        element={
                            <PrivateRoute>
                                <AppProvider passedSessionId="new">
                                    <GameHostPage />
                                </AppProvider>
                            </PrivateRoute>
                        }
                    />

                    {/* Default authenticated route */}
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <AppProvider>
                                    <Navigate to="/dashboard" replace/>
                                </AppProvider>
                            </PrivateRoute>
                        }
                    />
                    {/* Fallback for any other authenticated paths */}
                    <Route
                        path="*"
                        element={
                            <PrivateRoute>
                                <AppProvider>
                                    <Navigate to="/dashboard" replace/>
                                </AppProvider>
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;