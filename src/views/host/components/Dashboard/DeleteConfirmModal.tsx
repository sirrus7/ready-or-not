// src/pages/DashboardPage/components/DeleteConfirmModal.tsx - Delete confirmation
import React from 'react';
import { AlertTriangle, Trash2, XCircle, RefreshCw } from 'lucide-react';
import Modal from '@shared/components/UI/Modal';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    gameToDelete: { id: string; name: string } | null;
    isDeleting: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
                                                                   isOpen,
                                                                   gameToDelete,
                                                                   isDeleting,
                                                                   onConfirm,
                                                                   onClose
                                                               }) => {
    if (!gameToDelete) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Delete Game Session"
            size="sm"
        >
            <div className="p-1">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 sm:mx-0 sm:h-8 sm:w-8">
                        <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true"/>
                    </div>
                    <div className="ml-3 text-left">
                        <p className="text-sm text-gray-700 mt-0.5">
                            Are you sure you want to delete the game session{' '}
                            <strong className="font-semibold">{gameToDelete.name}</strong>?
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                            This action cannot be undone. All associated team data, decisions, and KPIs for this session will be permanently removed.
                        </p>
                    </div>
                </div>
                <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50 w-full sm:w-auto"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <RefreshCw className="animate-spin h-5 w-5 mr-2"/>
                        ) : (
                            <Trash2 className="h-5 w-5 mr-2"/>
                        )}
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 w-full sm:w-auto"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        <XCircle className="h-5 w-5 mr-2"/>
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmModal;
