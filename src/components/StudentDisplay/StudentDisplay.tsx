import React from 'react';
import SlideContent from './SlideContent';
import SlideControls from './SlideControls';

const StudentDisplay: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-auto">
        <SlideContent />
      </div>
      <SlideControls />
    </div>
  );
};

export default StudentDisplay;