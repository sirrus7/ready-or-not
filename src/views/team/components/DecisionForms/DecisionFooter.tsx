// src/views/team/components/DecisionForms/DecisionFooter.tsx - FINAL with Inline Confirmation
import React, {useState, useEffect} from 'react';
import {CheckCircle, Hourglass, AlertCircle, X, ThumbsUp} from 'lucide-react';

interface DecisionFooterProps {
    isSubmitDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
    isValidSubmission: boolean;
    submissionSummary: string;
    hasError?: boolean;
}

const DecisionFooter: React.FC<DecisionFooterProps> = ({
                                                           isSubmitDisabled,
                                                           isSubmitting,
                                                           onSubmit,
                                                           isValidSubmission,
                                                           submissionSummary,
                                                           hasError = false
                                                       }) => {
    const [isConfirming, setIsConfirming] = useState(false);

    // Reset confirmation state if the submission becomes invalid again (e.g., user changes selection)
    useEffect(() => {
        if (!isValidSubmission) {
            setIsConfirming(false);
        }
    }, [isValidSubmission]);

    const handleInitialSubmitClick = () => {
        if (isValidSubmission) {
            setIsConfirming(true);
        }
    };

    const handleCancelConfirm = () => {
        setIsConfirming(false);
    };

    const handleFinalConfirm = () => {
        onSubmit();
    };

    // If we are in the confirmation step, render the confirmation UI
    if (isConfirming) {
        return (
            <div className="border-t-2 border-yellow-500 bg-yellow-900/40 p-4 animate-fade-in">
                <div className="text-center">
                    <h4 className="text-lg font-semibold text-yellow-300 mb-2">Confirm Your Submission</h4>
                    <p className="text-sm text-yellow-200 mb-4">{submissionSummary}</p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={handleCancelConfirm}
                            disabled={isSubmitting}
                            className="flex items-center justify-center gap-2 py-2 px-5 rounded-lg font-medium bg-gray-600 text-gray-200 hover:bg-gray-500 transition-colors"
                        >
                            <X size={18}/>
                            <span>Review Again</span>
                        </button>
                        <button
                            onClick={handleFinalConfirm}
                            disabled={isSubmitting}
                            className="flex items-center justify-center gap-2 py-2 px-6 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-lg"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <ThumbsUp size={18}/>
                            )}
                            <span>{isSubmitting ? 'Locking in...' : 'Yes, Lock it In'}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default state: render the initial submit button
    return (
        <div className="border-t border-gray-700 bg-gray-800/80 rounded-b-xl p-4">
            <div className="flex flex-col gap-4">
                {/* Submission Summary */}
                {isValidSubmission && submissionSummary && (
                    <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ready to Submit:</p>
                        <p className="text-sm text-gray-200">{submissionSummary}</p>
                    </div>
                )}

                {/* Main Submit Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={handleInitialSubmitClick}
                        disabled={isSubmitDisabled}
                        className={`
                            flex-1 w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 
                            py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg
                            ${isSubmitDisabled
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                        }`}
                    >
                        {isSubmitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : isValidSubmission ? (
                            <CheckCircle size={20}/>
                        ) : (
                            <Hourglass size={20}/>
                        )}
                        <span>{isSubmitting ? 'Submitting...' : 'Submit Decision'}</span>
                    </button>
                </div>

                {/* Submission Guidelines */}
                {!isValidSubmission && !hasError && (
                    <div className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                        <AlertCircle size={16} className="text-yellow-400"/>
                        <span>Complete your selection to enable submission.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DecisionFooter;
