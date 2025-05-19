import React from 'react';
import DecisionButton from './DecisionButton';
import { useAppContext } from '../../context/AppContext';

const DecisionGrid: React.FC = () => {
  const { state } = useAppContext();

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {state.decisions.map((decision) => (
        <div key={decision.id} className="h-24">
          <DecisionButton decision={decision} />
        </div>
      ))}
    </div>
  );
};

export default DecisionGrid;