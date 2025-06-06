// src/components/Game/DecisionPanel/components/ConfirmationModal.tsx
import React from 'react';
import Modal from '@shared/components/UI/Modal';
import {GamePhaseNode} from '@shared/types';
import {CheckCircle, AlertTriangle} from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    currentPhase: GamePhaseNode | null;
    submissionSummary?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
                                                                 isOpen,
                                                                 onClose,
                                                                 onConfirm,
                                                                 currentPhase,
                                                                 submissionSummary
                                                             }) => {
    const handleConfirm = async () => {
        try {
            await onConfirm();
        } catch (error) {
            console.error('[ConfirmationModal] Confirmation failed:', error);
            // onConfirm should handle its own error states
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Your Decision"
            size="md"
        >
            <div className="p-4">
                <div className="flex items-start mb-4">
                    <div
                        className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0 sm:h-8 sm:w-8">
                        <CheckCircle className="h-5 w-5 text-blue-600"/>
                    </div>
                    <div className="ml-3 text-left">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Submit {currentPhase?.label || "Decision"}?
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                            Please review your selection before submitting. This action cannot be undone.
                        </p>

                        {submissionSummary && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Selection:</p>
                                <p className="text-sm text-gray-800 font-medium">{submissionSummary}</p>
                            </div>
                        )}

                        <div className="flex items-center text-xs text-amber-600 bg-amber-50 rounded-md p-2">
                            <AlertTriangle size={14} className="mr-2 flex-shrink-0"/>
                            <span>Once submitted, you cannot change your decision until the next phase.</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row-reverse gap-3">
                    <button
                        onClick={handleConfirm}
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm w-full sm:w-auto"
                    >
                        Yes, Submit Decision
                    </button>
                    <button
                        onClick={onClose}
                        className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm w-full sm:w-auto"
                    >
                        Review Again
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
