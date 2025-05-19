import React from 'react';
import { Decision } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface DecisionButtonProps {
  decision: Decision;
}

const DecisionButton: React.FC<DecisionButtonProps> = ({ decision }) => {
  const { state, selectDecision } = useAppContext();
  const isActive = state.currentSlide === decision.slideNumber;

  return (
    <button
      onClick={() => selectDecision(decision.id)}
      className={`
        relative flex flex-col items-center justify-center 
        p-4 rounded-lg transition-all duration-200 
        h-full w-full
        ${isActive 
          ? 'bg-blue-600 text-white shadow-lg scale-105' 
          : 'bg-white text-gray-800 shadow hover:shadow-md hover:bg-gray-50'
        }
      `}
    >
      <span className="font-bold text-lg">{decision.label}</span>
      {decision.details && (
        <span className={`text-sm mt-1 ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
          {decision.details}
        </span>
      )}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45" />
      )}
    </button>
  );
};

export default DecisionButton;