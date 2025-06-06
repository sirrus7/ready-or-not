// src/views/team/components/DecisionForms/DecisionFooter.tsx - ENHANCED
import React from 'react';
import {CheckCircle, Hourglass, AlertCircle, RefreshCw, Clock} from 'lucide-react';

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
    isValidSubmission: boolean;
    submissionSummary: string;
    retrySubmission?: () => void;
    hasError?: boolean;
}

const DecisionFooter: React.FC<DecisionFooterProps> = ({
                                                           timeRemainingSeconds,
                                                           isSubmitDisabled,
                                                           isSubmitting,
                                                           onSubmit,
                                                           isValidSubmission,
                                                           submissionSummary,
                                                           retrySubmission,
                                                           hasError = false
                                                       }) => {
    const isTimeRunningOut = timeRemainingSeconds !== undefined && timeRemainingSeconds <= 60;
    const isTimeAlmostOut = timeRemainingSeconds !== undefined && timeRemainingSeconds <= 30;

    return (
        <div className="border-t border-gray-700 bg-gray-800/80 rounded-b-xl p-4">
            <div className="flex flex-col gap-4">
                {/* Timer Display */}
                {timeRemainingSeconds !== undefined && (
                    <div
                        className={`flex items-center justify-center text-lg font-mono px-4 py-2 rounded-lg transition-all ${
                            isTimeAlmostOut
                                ? 'text-red-300 bg-red-900/50 animate-pulse border border-red-600'
                                : isTimeRunningOut
                                    ? 'text-yellow-300 bg-yellow-900/30 border border-yellow-600'
                                    : 'text-blue-300 bg-blue-900/30 border border-blue-600'
                        }`}>
                        <Clock size={18} className="mr-2"/>
                        Time Remaining: {formatTime(timeRemainingSeconds)}
                    </div>
                )}

                {/* Submission Summary */}
                {isValidSubmission && submissionSummary && (
                    <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ready to Submit:</p>
                        <p className="text-sm text-gray-200">{submissionSummary}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Main Submit Button */}
                    <button
                        onClick={onSubmit}
                        disabled={isSubmitDisabled}
                        className={`
                            flex-1 w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 
                            py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg
                            ${isSubmitDisabled
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : isValidSubmission
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/25'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                        }
                        `}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Submitting...</span>
                            </>
                        ) : isValidSubmission ? (
                            <>
                                <CheckCircle size={20}/>
                                <span>Submit Decision</span>
                            </>
                        ) : (
                            <>
                                <Hourglass size={20}/>
                                <span>Complete Selection</span>
                            </>
                        )}
                    </button>

                    {/* Retry Button (shown on error) */}
                    {hasError && retrySubmission && (
                        <button
                            onClick={retrySubmission}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw size={16}/>
                            Retry
                        </button>
                    )}
                </div>

                {/* Submission Guidelines */}
                {!isValidSubmission && (
                    <div className="text-center">
                        <div className="flex items-center justify-center text-sm text-gray-400 mb-2">
                            <AlertCircle size={16} className="mr-2"/>
                            <span>Complete your selection to submit</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            You can submit with no investments selected (spending $0).
                        </p>
                    </div>
                )}

                {/* Time Warning */}
                {isTimeRunningOut && (
                    <div className={`text-center text-sm ${
                        isTimeAlmostOut ? 'text-red-300' : 'text-yellow-300'
                    }`}>
                        <AlertCircle size={16} className="inline mr-1"/>
                        {isTimeAlmostOut ? 'Time almost up!' : 'Time running out!'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DecisionFooter;
