// src/views/host/components/DecisionHistoryButton.tsx
import React from 'react';
import {CheckCircle2, LucideProps} from 'lucide-react';

interface DecisionHistoryButtonProps {
    label: string;
    isCurrent: boolean;
    isCompleted: boolean;
    icon: React.ElementType<LucideProps>;
    onClick: () => void;
    isExpanded?: boolean;
    allSubmitted?: boolean;
}

const DecisionHistoryButton: React.FC<DecisionHistoryButtonProps> = ({
    label,
    isCurrent,
    isCompleted,
    icon: Icon,
    onClick,
    isExpanded = false,
    allSubmitted = false
}) => {
    let baseClasses = `w-full flex items-center p-3 transition-all duration-300 text-left text-sm ${
        isExpanded ? 'rounded-t-lg' : 'rounded-lg'
    }`;
    let textClasses = "font-medium";
    let iconClasses = "mr-3 flex-shrink-0";

    if (isCurrent && isExpanded) {
        // Current + expanded: Use green background if all submitted, otherwise orange
        if (allSubmitted) {
            baseClasses += " bg-green-100 text-gray-800 shadow-sm border-2 border-green-500";
            textClasses += " font-semibold text-green-900";
            iconClasses += " text-green-600";
        } else {
            baseClasses += " bg-game-orange-50 text-gray-800 shadow-sm border-2 border-game-orange-500";
            textClasses += " font-semibold";
            iconClasses += " text-game-orange-600";
        }
    } else if (isCurrent) {
        // Current but not expanded: Use green background if all submitted, otherwise orange
        if (allSubmitted) {
            baseClasses += " bg-green-100 text-gray-800 shadow-md border-2 border-green-500";
            textClasses += " font-semibold text-green-900";
            iconClasses += " text-green-600";
        } else {
            baseClasses += " bg-game-orange-50 text-gray-800 shadow-md border-2 border-game-orange-500";
            textClasses += " font-semibold";
            iconClasses += " text-game-orange-600";
        }
    } else if (isCompleted) {
        // Completed buttons: clickable with green styling
        baseClasses += " bg-white text-gray-700 cursor-pointer hover:bg-gray-100 border border-gray-300";
        textClasses += " text-gray-800";
        iconClasses += " text-green-600";
    } else { // Upcoming
        baseClasses += " bg-gray-100 text-gray-400 cursor-not-allowed opacity-60";
        textClasses += " text-gray-500";
        iconClasses += " text-gray-400";
    }

    return (
        <button
            onClick={onClick}
            className={baseClasses}
            disabled={!isCurrent && !isCompleted}
            title={isCompleted ? `Review: ${label}` : label}
        >
            <Icon size={20} className={iconClasses}/>
            <div className="flex-grow min-w-0">
                <span className={`block leading-tight truncate ${textClasses}`}>{label}</span>
            </div>
            {allSubmitted && isCurrent && (
                <span className="ml-2 text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded-full flex-shrink-0">
                    ✓ DONE
                </span>
            )}
            {isCompleted && !isCurrent && (
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0"/>
            )}
        </button>
    );
};

export default DecisionHistoryButton;