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
// import CompletedGameReportPage from './pages/CompletedGameReportPage'; // Keep commented if not created

// Wrapper component to extract sessionId and pass it to AppProvider
const SessionAwareAppProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {sessionId} = useParams<{ sessionId: string | undefined }>();
    console.log("SessionAwareAppProvider: Rendering with sessionId from URL:", sessionId);
    return <AppProvider passedSessionId={sessionId}>{children}</AppProvider>;
};

function App() {
    console.log("App.tsx: Rendering");
    return (
        <BrowserRouter>
            <AuthProvider>
                {/* AppProvider is now used selectively or via SessionAwareAppProvider */}
                <Routes>
                    <Route path="/student-display/:sessionId" element={
                        // StudentDisplayPage may or may not need AppProvider depending on how it gets slide data
                        // For now, let's wrap it if it needs context for gameStructure for example
                        <AppProvider>
                            <StudentDisplayPage/>
                        </AppProvider>
                    }/>

                    {/* Routes that DON'T have :sessionId in their path directly use AppProvider without passedSessionId */}
                    <Route path="/login" element={<AppProvider><LoginPage/></AppProvider>}/>
                    <Route path="/dashboard"
                           element={<PrivateRoute><AppProvider><DashboardPage/></AppProvider></PrivateRoute>}/>
                    <Route path="/create-game"
                           element={<PrivateRoute><AppProvider><CreateGamePage/></AppProvider></PrivateRoute>}/>

                    {/* Route that DOES have :sessionId uses SessionAwareAppProvider */}
                    <Route
                        path="/classroom/:sessionId"
                        element={
                            <PrivateRoute>
                                <SessionAwareAppProvider> {/* This wrapper extracts sessionId and passes it */}
                                    <GameHostPage/>
                                </SessionAwareAppProvider>
                            </PrivateRoute>
                        }
                    />

                    {/* Default authenticated route */}
                    <Route path="/" element={<PrivateRoute><AppProvider><Navigate to="/dashboard"
                                                                                  replace/></AppProvider></PrivateRoute>}/>
                    {/* Fallback */}
                    <Route path="*" element={<PrivateRoute><AppProvider><Navigate to="/dashboard"
                                                                                  replace/></AppProvider></PrivateRoute>}/>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;