import React from 'react';
import { Play, Pause, Save, Trophy, Users, RotateCcw } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface ControlActionsProps {
  onOpenStudentDisplay: () => void;
}

const ControlActions: React.FC<ControlActionsProps> = ({ onOpenStudentDisplay }) => {
  const { state, togglePlayPause, resetState } = useAppContext();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <button 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          onClick={onOpenStudentDisplay}
        >
          <span className="font-medium">Launch Student Display</span>
        </button>
        
        <button 
          className="flex items-center justify-center gap-2 bg-gray-800 text-white py-3 px-6 rounded-lg hover:bg-gray-900 transition-colors shadow-md"
          onClick={togglePlayPause}
        >
          {state.isPlaying ? (
            <>
              <Pause size={20} />
              <span className="font-medium">Pause</span>
            </>
          ) : (
            <>
              <Play size={20} />
              <span className="font-medium">Play</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <button className="flex flex-col items-center justify-center gap-1 bg-white p-3 rounded-lg hover:bg-gray-50 transition-colors shadow">
          <Users size={20} className="text-blue-600" />
          <span className="text-sm font-medium">Team</span>
        </button>
        
        <button className="flex flex-col items-center justify-center gap-1 bg-white p-3 rounded-lg hover:bg-gray-50 transition-colors shadow">
          <Save size={20} className="text-emerald-600" />
          <span className="text-sm font-medium">Submit</span>
        </button>
        
        <button className="flex flex-col items-center justify-center gap-1 bg-white p-3 rounded-lg hover:bg-gray-50 transition-colors shadow">
          <Trophy size={20} className="text-amber-600" />
          <span className="text-sm font-medium">Selection</span>
        </button>
        
        <button 
          className="flex flex-col items-center justify-center gap-1 bg-white p-3 rounded-lg hover:bg-gray-50 transition-colors shadow"
          onClick={resetState}
        >
          <RotateCcw size={20} className="text-red-600" />
          <span className="text-sm font-medium">Reset</span>
        </button>
      </div>
    </div>
  );
};

export default ControlActions;