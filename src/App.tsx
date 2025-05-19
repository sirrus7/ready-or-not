import React from 'react';
import { AppProvider } from './context/AppContext';
import MainPage from './pages/MainPage';
import StudentDisplayPage from './pages/StudentDisplayPage';
import { isSecondaryWindow } from './utils/windowUtils';

function App() {
  // Determine if this is the student display window or the main window
  const isStudentWindow = isSecondaryWindow();

  return (
    <AppProvider>
      {isStudentWindow ? <StudentDisplayPage /> : <MainPage />}
    </AppProvider>
  );
}

export default App;