// src/components/TeacherHost/GamePhaseNodeButton.tsx
import React from 'react';
import {GamePhaseNode} from '../../types';
// Import specific icons you know you'll use, or use a more specific type if possible.
// For dynamic rendering, it's often better to have a mapping.
import {
    HelpCircle,
    PlayCircle,
    DollarSign,
    ListChecks,
    AlertTriangle,
    TrendingUp,
    BarChart3,
    Trophy,
    Settings2,
    Repeat,
    Info,
    Video,
    Zap,
    Users,
    FileText,
    Flag,
    CheckCircle2,
    // Add any other icons used in your gameStructure.ts here
    Layers // Example, if used
} from 'lucide-react';

// It's safer and more performant to create a mapping for dynamic icons
const iconMap: { [key: string]: React.ElementType } = {
    HelpCircle,
    PlayCircle,
    DollarSign,
    ListChecks,
    AlertTriangle,
    TrendingUp,
    BarChart3,
    Trophy,
    Settings2,
    Repeat,
    Info,
    Video,
    Zap,
    Users,
    FileText,
    Flag,
    Layers, // Ensure all icons used in gameStructure.ts phase.icon_name are here
    // Add other icons as needed
};


interface GamePhaseNodeButtonProps {
    phase: GamePhaseNode;
    isCurrent: boolean;
    isCompleted: boolean;
    onClick: () => void;
}

const GamePhaseNodeButton: React.FC<GamePhaseNodeButtonProps> = ({phase, isCurrent, isCompleted, onClick}) => {
    // Use the iconMap for type safety and cleaner dynamic rendering
    const IconComponent = iconMap[phase.icon_name] || HelpCircle;

    let buttonClasses = "relative flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 h-full w-full text-xs shadow focus:outline-none focus:ring-2 focus:ring-offset-2";
    let textClasses = "";
    let subTextClasses = "";
    let iconClasses = "mb-1";

    if (isCurrent) {
        buttonClasses += " bg-blue-600 text-white shadow-lg scale-105 ring-blue-500";
        textClasses = "font-semibold";
        subTextClasses = "text-blue-200";
        iconClasses += " text-white";
    } else if (isCompleted) {
        buttonClasses += " bg-gray-300 text-gray-500 cursor-default opacity-70"; // Changed to cursor-default
        textClasses = "font-medium";
        subTextClasses = "text-gray-400";
        iconClasses += " text-gray-500";
    } else { // Upcoming
        buttonClasses += " bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md ring-gray-300";
        textClasses = "font-medium text-gray-800";
        subTextClasses = "text-gray-500";
        iconClasses += " text-blue-600";
    }

    return (
        <button
            onClick={onClick}
            className={buttonClasses}
            // Disable clicking if it's completed AND not current.
            // OR if it's upcoming and not the next logical step (this logic is in GameJourneyMap)
            disabled={isCompleted && !isCurrent}
            title={phase.label + (phase.sub_label ? ` (${phase.sub_label})` : '')}
        >
            <IconComponent size={20} className={iconClasses} strokeWidth={isCurrent ? 2.5 : 2}/>
            <span className={`block text-center leading-tight ${textClasses}`}>{phase.label}</span>
            {phase.sub_label && (
                <span className={`block text-center text-xs leading-tight ${subTextClasses}`}>
          {phase.sub_label}
        </span>
            )}
            {isCompleted && !isCurrent && (
                <CheckCircle2 size={16} className="absolute top-1 right-1 text-green-600"/>
            )}
            {isCurrent && (
                <div
                    className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45"/>
            )}
        </button>
    );
};

export default GamePhaseNodeButton;