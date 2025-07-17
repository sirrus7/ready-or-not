// src/views/host/components/GameControls/ExitModal.tsx
import React from 'react';
import Modal from '@shared/components/UI/Modal';
import { AppState } from '@shared/types';

interface ExitGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmExit: (state: AppState) => void;
}

/**
 * `ExitGameModal` is a confirmation modal for the host to exit the current game session.
 * When confirmed, it broadcasts a close command and navigates the host back to the dashboard.
 */
const ExitGameModal: React.FC<ExitGameModalProps> = ({isOpen, onClose, onConfirmExit}) => {

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Save & Exit Game"
            size="sm"
        >
            <div className="p-1">
                <p className="text-sm text-gray-700">
                    Are you sure you want to save and exit this game session and return to the dashboard?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Your current game progress is saved. This will also close the presentation display if it's open.
                </p>
                <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm w-full sm:w-auto"
                        onClick={onConfirmExit}
                    >
                        Yes, Save & Exit
                    </button>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm w-full sm:w-auto"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ExitGameModal;
