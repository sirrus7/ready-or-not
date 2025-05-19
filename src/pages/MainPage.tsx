import React, { useEffect, useState } from 'react';
import TeacherPanel from '../components/TeacherPanel/TeacherPanel';
import StudentDisplay from '../components/StudentDisplay/StudentDisplay';
import { openStudentDisplay } from '../utils/windowUtils';

const MainPage: React.FC = () => {
  const [studentWindowOpen, setStudentWindowOpen] = useState<boolean>(false);
  
  const handleOpenStudentDisplay = () => {
    const newWindow = openStudentDisplay();
    if (newWindow) {
      setStudentWindowOpen(true);
      
      // Check if window is closed
      const checkIfClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkIfClosed);
          setStudentWindowOpen(false);
        }
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Classroom Decision Simulator</h1>
          <p className="text-gray-600">Control and display classroom decisions</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TeacherPanel onOpenStudentDisplay={handleOpenStudentDisplay} />
          </div>
          
          <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden h-[600px]">
            <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Student Display Preview</h2>
              {studentWindowOpen && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  External window open
                </span>
              )}
            </div>
            <div className="h-[570px]">
              <StudentDisplay />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;