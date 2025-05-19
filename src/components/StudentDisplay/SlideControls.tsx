import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Users, 
  Globe, 
  Save,
  Trophy
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SlideControls: React.FC = () => {
  const { state, previousSlide, nextSlide, togglePlayPause, updateNotes } = useAppContext();
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="bg-gray-800 text-white p-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          <button 
            onClick={previousSlide}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            onClick={nextSlide}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
          
          <button 
            onClick={togglePlayPause}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
        
        <div className="flex space-x-3">
          <button 
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Team Codes"
          >
            <Users size={20} />
          </button>
          
          <button 
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Team Website"
          >
            <Globe size={20} />
          </button>
          
          <button 
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Save"
          >
            <Save size={20} />
          </button>
          
          <button 
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Show Leaderboard"
          >
            <Trophy size={20} />
          </button>
          
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              showNotes ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Notes
          </button>
        </div>
      </div>
      
      {showNotes && (
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <textarea
            className="w-full bg-gray-800 text-white p-3 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            rows={3}
            placeholder="Take notes here..."
            value={state.notes}
            onChange={(e) => updateNotes(e.target.value)}
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default SlideControls;