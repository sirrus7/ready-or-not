import React, { useEffect } from 'react';
import StudentDisplay from '../components/StudentDisplay/StudentDisplay';

const StudentDisplayPage: React.FC = () => {
  // Set title for the student display window
  useEffect(() => {
    document.title = 'Student Display - Classroom Decision Simulator';
  }, []);

  return (
    <div className="h-screen">
      <StudentDisplay />
    </div>
  );
};

export default StudentDisplayPage;