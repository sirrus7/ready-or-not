// src/components/Game/DecisionPanel/components/ConfirmationModal.tsx
import React from 'react';
import Modal from '../../../UI/Modal';
import { GamePhaseNode } from '../../../../types';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    currentPhase: GamePhaseNode | null;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
                                                                 isOpen,
                                                                 onClose,
                                                                 onConfirm,
                                                                 currentPhase
                                                             }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Submission"
            size="sm"
        >
            <div className="p-2">
                <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to submit these decisions for {currentPhase?.label || "this phase"}?
                    This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                        Yes, Submit
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
