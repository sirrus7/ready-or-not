import { AppState } from '../types';

export const openStudentDisplay = () => {
  // Features for the new window
  const features = 'width=1200,height=800,resizable=yes,scrollbars=yes,status=yes';
  
  // Open a new window with the student display URL
  const studentWindow = window.open('/student-display', 'StudentDisplay', features);
  
  // Focus the new window
  if (studentWindow) {
    studentWindow.focus();
  }
  
  return studentWindow;
};

export const isSecondaryWindow = () => {
  return window.name === 'StudentDisplay';
};