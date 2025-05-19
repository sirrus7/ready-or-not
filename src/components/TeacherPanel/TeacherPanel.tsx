import React from 'react';
import DecisionGrid from './DecisionGrid';
import ControlActions from './ControlActions';
import { Layers } from 'lucide-react';

interface TeacherPanelProps {
  onOpenStudentDisplay: () => void;
}

const TeacherPanel: React.FC<TeacherPanelProps> = ({ onOpenStudentDisplay }) => {
  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Layers className="mr-2 text-blue-600" size={24} />
          Teacher Control Panel
        </h2>
        <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded shadow-sm">
          Session Active
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Decision Options</h3>
        <DecisionGrid />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Controls</h3>
        <ControlActions onOpenStudentDisplay={onOpenStudentDisplay} />
      </div>
    </div>
  );
};

export default TeacherPanel;