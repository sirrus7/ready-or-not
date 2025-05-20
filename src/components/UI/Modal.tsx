// src/components/UI/Modal.tsx
import React, {Fragment, useRef} from 'react';
import {X} from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl'; // Optional size prop
    hideCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
                                         isOpen,
                                         onClose,
                                         title,
                                         children,
                                         size = 'md', // Default size
                                         hideCloseButton = false,
                                     }) => {
    const cancelButtonRef = useRef(null);

    if (!isOpen) {
        return null;
    }

    const sizeClasses = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
    };

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay, show/hide based on modal state. */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                    onClick={!hideCloseButton ? onClose : undefined} // Close on overlay click if close button isn't hidden
                ></div>

                {/* This element is to trick the browser into centering the modal contents. */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          ​
        </span>

                {/* Modal panel, show/hide based on modal state. */}
                <div
                    className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}
                >
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg leading-6 font-semibold text-gray-900" id="modal-title">
                                        {title}
                                    </h3>
                                    {!hideCloseButton && (
                                        <button
                                            type="button"
                                            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none"
                                            onClick={onClose}
                                            aria-label="Close modal"
                                        >
                                            <X size={20}/>
                                        </button>
                                    )}
                                </div>
                                <div className="mt-4 border-t border-gray-200 pt-4">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Optional: Add a footer here if you commonly need action buttons outside the children */}
                    {/* Example:
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={onClose} ref={cancelButtonRef}>
              Cancel
            </button>
          </div>
          */}
                </div>
            </div>
        </div>
    );
};

export default Modal;