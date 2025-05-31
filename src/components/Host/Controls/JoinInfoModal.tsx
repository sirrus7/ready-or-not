// src/components/Host/Controls/JoinInfoModal.tsx
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Modal from '../../UI/Modal';

interface JoinInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string | null;
}

const JoinInfoModal: React.FC<JoinInfoModalProps> = ({ isOpen, onClose, sessionId }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

    const CompanyDisplayBaseUrl = `${window.location.origin}/student-game`;
    const studentJoinUrl = `${CompanyDisplayBaseUrl}/${sessionId}`;

    // Generate QR code when modal opens
    useEffect(() => {
        if (isOpen && sessionId) {
            QRCode.toDataURL(studentJoinUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
                .then(url => {
                    setQrCodeDataUrl(url);
                })
                .catch(err => {
                    console.error('Error generating QR code:', err);
                    setQrCodeDataUrl(null);
                });
        }
    }, [isOpen, studentJoinUrl, sessionId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Company Join Information" size="md">
            <div className="p-2 text-center">
                <p className="text-sm text-gray-600 mb-2">Students join at:</p>
                <div className="bg-gray-100 p-3 rounded-md mb-3">
                    <a
                        href={studentJoinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-600 hover:text-blue-800 break-all text-lg"
                    >
                        {studentJoinUrl}
                    </a>
                </div>
                {sessionId && qrCodeDataUrl && (
                    <div className="flex justify-center my-4">
                        <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                            <img
                                src={qrCodeDataUrl}
                                alt="QR Code for student join link"
                                className="w-48 h-48"
                            />
                            <p className="text-xs text-gray-500 mt-2">Scan to join game</p>
                        </div>
                    </div>
                )}
                <p className="text-xs text-gray-500 mb-3">
                    Students will also need their Team Name and Team Passcode.
                </p>
                <button
                    onClick={onClose}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default JoinInfoModal;
