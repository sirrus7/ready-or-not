import React from 'react';
import { useAppContext } from '../../context/AppContext';

const SlideContent: React.FC = () => {
  const { state } = useAppContext();
  
  const currentSlide = state.slides.find(slide => slide.id === state.currentSlide);
  
  if (!currentSlide) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800 text-white">
        <p className="text-xl">No slide selected</p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${currentSlide.background}`}>
      <div className="absolute top-4 right-4 bg-black/20 rounded-full px-4 py-1">
        <span className="text-sm font-medium">SLIDE: {currentSlide.id}</span>
      </div>
      
      <h1 className="text-4xl font-bold mb-8 text-center">{currentSlide.title}</h1>
      
      <div className="text-6xl font-bold mb-10 text-center">
        {currentSlide.content.main}
      </div>
      
      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
        {currentSlide.content.details.map((detail, index) => (
          <div 
            key={index} 
            className="bg-white/20 backdrop-blur-sm rounded-lg p-5 text-center transform transition-transform hover:scale-105"
          >
            <p className="text-xl font-medium">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlideContent;