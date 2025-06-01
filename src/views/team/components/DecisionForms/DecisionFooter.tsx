// src/components/Game/DecisionPanel/components/DecisionFooter.tsx
import React from 'react';
import {CheckCircle, Hourglass} from 'lucide-react';

const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface DecisionFooterProps {
    timeRemainingSeconds?: number;
    isSubmitDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
}

const DecisionFooter: React.FC<DecisionFooterProps> = ({
                                                           timeRemainingSeconds,
                                                           isSubmitDisabled,
                                                           isSubmitting,
                                                           onSubmit
                                                       }) => {
    return (
        <div className="border-t border-gray-700 bg-gray-800/80 rounded-b-xl p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {timeRemainingSeconds !== undefined && (
                    <div className={`text-lg font-mono px-4 py-2 rounded-lg ${
                        timeRemainingSeconds <= 60
                            ? 'text-red-400 bg-red-900/30 animate-pulse'
                            : 'text-yellow-400 bg-yellow-900/30'
                    }`}>
                        <Hourglass size={18} className="inline mr-2 relative -top-px"/>
                        Time: {formatTime(timeRemainingSeconds)}
                    </div>
                )}
                <button
                    onClick={onSubmit}
                    disabled={isSubmitDisabled}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px]"
                >
                    {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <CheckCircle size={20}/>
                    )}
                    Submit Decisions
                </button>
            </div>
        </div>
    );
};

export default DecisionFooter;
