// src/components/Host/Controls/HostAlertModal.tsx
import React from 'react';
import { Lightbulb } from 'lucide-react';
import Modal from '@shared/components/UI/Modal';
import { useGameContext } from '@app/providers/GameProvider';

const AlertModal: React.FC = () => {
    const { state, clearHostAlert, setCurrentHostAlertState } = useGameContext();

    if (!state.currentHostAlert) return null;

    return (
        <Modal
            isOpen={!!state.currentHostAlert}
            onClose={() => setCurrentHostAlertState(null)}
            title={state.currentHostAlert.title || "Game Host Alert!"}
            hideCloseButton={false}
        >
            <div className="p-1">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0 sm:h-8 sm:w-8">
                        <Lightbulb className="h-5 w-5 text-blue-600" aria-hidden="true"/>
                    </div>
                    <div className="ml-3 text-left">
                        <p className="text-sm text-gray-600 mt-1">{state.currentHostAlert.message}</p>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={clearHostAlert}
                    >
                        Next
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentHostAlertState(null)}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm sm:mr-3"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AlertModal;