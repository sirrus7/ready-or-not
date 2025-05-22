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
import StudentGamePage from './pages/StudentGamePage'; // IMPORT StudentGamePage

// Wrapper component to extract sessionId and pass it to AppProvider for GameHostPage
const SessionAwareAppProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();
    // console.log("SessionAwareAppProvider: Rendering with sessionId from URL for GameHost:", sessionId);
    return <AppProvider passedSessionId={sessionId}>{children}</AppProvider>;
};

function App() {
    // console.log("App.tsx: Rendering");
    return (
        <BrowserRouter>
            <AuthProvider> {/* AuthProvider wraps everything that might need auth context */}
                <Routes>
                    {/* Publicly accessible student-facing routes - NO PrivateRoute, NO AppProvider directly needed for StudentGamePage unless it uses teacher-centric context */}
                    <Route path="/student-game/:sessionId" element={<StudentGamePage />} />
                    <Route path="/student-display/:sessionId" element={
                        // StudentDisplayPage typically doesn't need AppProvider for teacher session data,
                        // it gets its info via BroadcastChannel. If it did, it would need its own session awareness.
                        // For now, keeping it simple.
                        <StudentDisplayPage/>
                    }/>

                    {/* Teacher Login - Publicly accessible, but AppProvider might be used for general app settings if any */}
                    <Route path="/login" element={<AppProvider><LoginPage/></AppProvider>}/>

                    {/* Teacher-only authenticated routes - Wrapped in PrivateRoute and SessionAwareAppProvider or AppProvider */}
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
                                <SessionAwareAppProvider> {/* This wrapper extracts sessionId for GameHost */}
                                    <GameHostPage/>
                                </SessionAwareAppProvider>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/classroom" // Route for creating a new session
                        element={
                            <PrivateRoute>
                                {/* 'new' as passedSessionId will trigger new session creation logic in useSessionManager */}
                                <AppProvider passedSessionId="new">
                                    <GameHostPage />
                                </AppProvider>
                            </PrivateRoute>
                        }
                    />


                    {/* Default authenticated route: if logged in, go to dashboard */}
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <AppProvider> {/* AppProvider for potential dashboard context if user is already there */}
                                    <Navigate to="/dashboard" replace/>
                                </AppProvider>
                            </PrivateRoute>
                        }
                    />
                    {/* Fallback for any other authenticated paths - might be too broad, consider specific 404 */}
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