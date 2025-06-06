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
        // REFACTOR: Make completed buttons clickable and give them a distinct, but active, style.
        baseClasses += " bg-white text-gray-700 cursor-pointer hover:bg-gray-100 border border-gray-300";
        textClasses += " text-gray-800";
        subTextClasses += " text-gray-500";
        iconClasses += " text-green-600";
    } else { // Upcoming
        baseClasses += " bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
        textClasses += " text-gray-500";
        subTextClasses += " text-gray-400";
        iconClasses += " text-gray-400";
    }

    return (
        <button
            onClick={onClick}
            className={baseClasses}
            // REFACTOR: Only disable if it's upcoming. Completed buttons are now clickable for review.
            disabled={!isCurrent && !isCompleted}
            title={isCompleted ? `Review: ${label}` : label}
        >
            <Icon size={20} className={iconClasses}/>
            <div className="flex-grow min-w-0">
                <span className={`block leading-tight truncate ${textClasses}`}>{label}</span>
                <span className={`block leading-tight ${subTextClasses}`}>Round {round}</span>
            </div>
            {isCompleted && <CheckCircle2 size={18} className="text-green-500 flex-shrink-0"/>}
        </button>
    );
};

export default DecisionHistoryButton;
