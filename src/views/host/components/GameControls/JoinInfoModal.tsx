// src/components/Host/Controls/JoinInfoModal.tsx
import React, {useState, useEffect} from 'react';
import QRCode from 'qrcode';
import Modal from '@shared/components/UI/Modal';
import {generateTeamJoinUrl} from '@shared/utils/urlUtils';

interface JoinInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string | null;
    joinInfo: { joinUrl: string; qrCodeDataUrl: string } | null;
    setJoinInfo: (info: { joinUrl: string; qrCodeDataUrl: string } | null) => void;
}

const JoinInfoModal: React.FC<JoinInfoModalProps> = ({isOpen, onClose, sessionId, joinInfo, setJoinInfo}) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [displayUrl, setDisplayUrl] = useState<string>('');
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);

    // Generate QR code when modal opens
    useEffect(() => {
        if (isOpen && sessionId) {
            setIsLoadingUrl(true);
            setDisplayUrl('');
            setQrCodeDataUrl(null);

            generateTeamJoinUrl(sessionId).then(url => {
                setDisplayUrl(url);
                setIsLoadingUrl(false);

                QRCode.toDataURL(url, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                })
                    .then(qr => {
                        setQrCodeDataUrl(qr);
                        // Update parent state for broadcasting
                        setJoinInfo({ joinUrl: url, qrCodeDataUrl: qr });
                    })
                    .catch(err => {
                        console.error('Error generating QR code:', err);
                        setQrCodeDataUrl(null);
                    });
            });
        }
    }, [isOpen, sessionId]);

    // Clear join info when modal closes
    useEffect(() => {
        if (!isOpen) {
            setJoinInfo(null);
        }
    }, [isOpen, setJoinInfo]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Team Join Information" size="md">
            <div className="p-2 text-center">
                <p className="text-sm text-gray-600 mb-2">Teams join at:</p>
                <div className="bg-gray-100 p-3 rounded-md mb-3">
                    {isLoadingUrl ? (
                        <div className="h-7 animate-pulse bg-gray-300 rounded-md"></div>
                    ) : (
                        <a
                            href={displayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-game-orange-600 hover:text-game-orange-800 break-all text-lg"
                        >
                            {displayUrl}
                        </a>
                    )}
                </div>
                {isLoadingUrl && (
                    <div className="flex justify-center my-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
                    </div>
                )}

                {!isLoadingUrl && sessionId && qrCodeDataUrl && (
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
                    Players will also need their Team Name and Team Passcode.
                </p>
                <button
                    onClick={onClose}
                    className="mt-2 px-4 py-2 bg-game-orange-500 text-white rounded-md hover:bg-game-orange-600 transition"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default JoinInfoModal;
