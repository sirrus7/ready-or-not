// src/views/host/components/DecisionHistoryButton.tsx
import React from 'react';
import {CheckCircle2, LucideProps} from 'lucide-react';

interface DecisionHistoryButtonProps {
    label: string;
    round: number;
    isCurrent: boolean;
    isCompleted: boolean;
    icon: React.ElementType<LucideProps>;
    onClick: () => void;
}

const DecisionHistoryButton: React.FC<DecisionHistoryButtonProps> = ({
                                                                         label,
                                                                         round,
                                                                         isCurrent,
                                                                         isCompleted,
                                                                         icon: Icon,
                                                                         onClick
                                                                     }) => {
    let baseClasses = "w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left text-sm shadow-sm";
    let textClasses = "font-medium";
    let subTextClasses = "text-xs";
    let iconClasses = "mr-3 flex-shrink-0";

    if (isCurrent) {
        baseClasses += " bg-blue-600 text-white shadow-lg scale-105 border-2 border-blue-400";
        textClasses += " font-semibold";
        subTextClasses += " text-blue-200";
        iconClasses += " text-white";
    } else if (isCompleted) {
        baseClasses += " bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300";
        textClasses += " text-gray-600";
        subTextClasses += " text-gray-400";
        iconClasses += " text-gray-500";
    } else { // Upcoming
        baseClasses += " bg-white text-gray-700 hover:bg-gray-100 cursor-pointer";
        textClasses += " text-gray-800";
        subTextClasses += " text-gray-500";
        iconClasses += " text-blue-600";
    }

    return (
        <button onClick={onClick} className={baseClasses} title={`Review: ${label}`}>
            <Icon size={20} className={iconClasses}/>
            <div className="flex-grow">
                <span className={`block leading-tight ${textClasses}`}>{label}</span>
                <span className={`block leading-tight ${subTextClasses}`}>Round {round}</span>
            </div>
            {isCompleted && <CheckCircle2 size={18} className="text-green-600 flex-shrink-0"/>}
        </button>
    );
};

export default DecisionHistoryButton;
