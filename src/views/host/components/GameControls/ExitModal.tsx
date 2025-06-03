// src/views/host/components/GameControls/ExitModal.tsx
import React from 'react';
import {useNavigate} from 'react-router-dom';
import Modal from '@shared/components/UI/Modal';

interface ExitGameModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * `ExitGameModal` is a confirmation modal for the host to exit the current game session.
 * When confirmed, it navigates the host back to the dashboard.
 */
const ExitGameModal: React.FC<ExitGameModalProps> = ({isOpen, onClose}) => {
    // Consume `state` from `GameContext` to get the current session ID.
    const navigate = useNavigate(); // Hook for navigation.


    /**
     * Handles the confirmation of exiting the game.
     * It navigates to the dashboard.
     */
    const confirmExitGame = () => {
        onClose(); // Close the modal.
        navigate('/dashboard');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Exit Game"
            size="sm"
        >
            <div className="p-1">
                <p className="text-sm text-gray-700">
                    Are you sure you want to exit this game session and return to the dashboard?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Your current game progress is saved.
                </p>
                <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm w-full sm:w-auto"
                        onClick={confirmExitGame}
                    >
                        Yes, Exit Game
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
