// src/App.tsx
import React from 'react';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import {AppProvider} from './context/AppContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import GameHostPage from './pages/GameHostPage'; // Your main game hosting page
import StudentDisplayPage from './pages/StudentDisplayPage';
import DashboardPage from './pages/DashboardPage';
import CreateGamePage from './pages/CreateGamePage';

// import CompletedGameReportPage from './pages/CompletedGameReportPage'; // Keep commented if not created

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppProvider>
                    <Routes>
                        {/* Student Display Route - Publicly accessible via its specific URL */}
                        <Route path="/student-display/:sessionId" element={<StudentDisplayPage/>}/>

                        {/* Authentication Route */}
                        <Route path="/login" element={<LoginPage/>}/>

                        {/* Teacher Authenticated Routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <PrivateRoute>
                                    <DashboardPage/>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/create-game"
                            element={
                                <PrivateRoute>
                                    <CreateGamePage/>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/classroom/:sessionId" // For active game or new game setup post-creation
                            element={
                                <PrivateRoute>
                                    <GameHostPage/>
                                </PrivateRoute>
                            }
                        />
                        {/*
              Route for completed game reports - Add when CompletedGameReportPage.tsx is created
              <Route
                path="/report/:sessionId"
                element={
                  <PrivateRoute>
                    <CompletedGameReportPage />
                  </PrivateRoute>
                }
              />
            */}

                        {/* Default authenticated route */}
                        <Route
                            path="/"
                            element={
                                <PrivateRoute>
                                    <Navigate to="/dashboard" replace/>
                                </PrivateRoute>
                            }
                        />
                        {/* Fallback for any other unhandled authenticated routes */}
                        <Route
                            path="*"
                            element={
                                <PrivateRoute>
                                    <Navigate to="/dashboard" replace/>
                                </PrivateRoute>
                            }
                        />
                    </Routes>
                </AppProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;