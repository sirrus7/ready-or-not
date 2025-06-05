// src/views/host/components/Dashboard/DeleteConfirmModal.tsx - Enhanced for draft vs active games
import React from 'react';
import {AlertTriangle, Trash2, XCircle, RefreshCw, Edit, Activity} from 'lucide-react';
import Modal from '@shared/components/UI/Modal';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    gameToDelete: { id: string; name: string; type: 'draft' | 'active' } | null;
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

    const isDraft = gameToDelete.type === 'draft';
    const gameTypeLabel = isDraft ? 'draft' : 'active';
    const gameTypeIcon = isDraft ? <Edit size={16}/> : <Activity size={16}/>;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Confirm Delete ${isDraft ? 'Draft' : 'Active'} Game`}
            size="sm"
        >
            <div className="p-1">
                <div className="flex items-start">
                    <div
                        className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 sm:mx-0 sm:h-8 sm:w-8">
                        <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true"/>
                    </div>
                    <div className="ml-3 text-left">
                        <div className="flex items-center mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDraft
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                            }`}>
                                {gameTypeIcon}
                                <span className="ml-1">{isDraft ? 'Draft' : 'Active'} Game</span>
                            </span>
                        </div>

                        <p className="text-sm text-gray-700 mt-0.5">
                            Are you sure you want to delete the {gameTypeLabel} game{' '}
                            <strong className="font-semibold">{gameToDelete.name}</strong>?
                        </p>

                        {isDraft ? (
                            <p className="text-xs text-orange-600 mt-2">
                                This will permanently delete the draft game and all setup progress.
                                You will need to start the game creation process from the beginning.
                            </p>
                        ) : (
                            <p className="text-xs text-red-600 mt-2">
                                This action cannot be undone. All associated team data, decisions,
                                and KPIs for this session will be permanently removed.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                    <button
                        type="button"
                        className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm disabled:opacity-50 w-full sm:w-auto ${
                            isDraft
                                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        }`}
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <RefreshCw className="animate-spin h-5 w-5 mr-2"/>
                        ) : (
                            <Trash2 className="h-5 w-5 mr-2"/>
                        )}
                        {isDeleting ? 'Deleting...' : `Yes, Delete ${isDraft ? 'Draft' : 'Game'}`}
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
