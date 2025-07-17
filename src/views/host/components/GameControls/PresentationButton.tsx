// src/views/host/components/GameControls/PresentationButton.tsx - Simplified with master-slave pattern
import React from 'react';
import { ExternalLink, Wifi } from 'lucide-react';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface PresentationButtonProps {
  connectionStatus: ConnectionStatus;
  isDisabled: boolean;
  onOpenDisplay: () => void;
}

const PresentationButton: React.FC<PresentationButtonProps> = ({ connectionStatus, onOpenDisplay, isDisabled }) => {
  const getButtonStyling = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          bgClass: 'bg-green-50 border-green-200',
          textClass: 'text-green-700',
          iconClass: 'text-green-500',
          statusText: 'Presentation Display Active',
          statusIcon: <Wifi size={16} className="text-green-500 ml-2"/>
        };
      case 'connecting':
        return {
          bgClass: 'bg-yellow-50 border-yellow-200',
          textClass: 'text-yellow-700',
          iconClass: 'text-yellow-500',
          statusText: 'Connecting to Display...',
          statusIcon: <Wifi size={16} className="text-yellow-500 animate-pulse ml-2"/>
        };
      default:
        return {
          bgClass: 'bg-game-orange-600',
          textClass: 'text-white',
          iconClass: 'text-white',
          statusText: 'Launch Presentation Display',
          statusIcon: null
        };
    }
  };

  const styling = getButtonStyling();

  return (
    <button
      disabled={isDisabled}
      onClick={onOpenDisplay}
      className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors shadow-md text-sm ${styling.bgClass} ${styling.textClass} hover:opacity-90`}
    >
      {!isDisabled && <ExternalLink size={16} className={styling.iconClass}/>}
      <span>{styling.statusText}</span>
      {styling.statusIcon}
    </button>
  );
};

export default PresentationButton;
