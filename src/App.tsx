import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import StudentDisplayPage from './pages/StudentDisplayPage';
import { isSecondaryWindow } from './utils/windowUtils';

function App() {
  const isStudentWindow = isSecondaryWindow();

  if (isStudentWindow) {
    return (
      <AuthProvider>
        <StudentDisplayPage />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/classroom/:sessionId" element={<MainPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;