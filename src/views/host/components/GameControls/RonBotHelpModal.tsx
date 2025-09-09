// src/views/host/components/GameControls/RonBotHelpModal.tsx
import React, {useState, useEffect} from 'react';
import QRCode from 'qrcode';
import Modal from '@shared/components/UI/Modal';
import {ExternalLink} from 'lucide-react';

interface RonBotHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RONBOT_GPT_URL = 'https://chatgpt.com/g/g-681d465a11e88191850316345a0a3731-ready-or-not-2-0-faq-troubleshooting-assistant';

const RonBotHelpModal: React.FC<RonBotHelpModalProps> = ({isOpen, onClose}) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);

    // Generate QR code when modal opens
    useEffect(() => {
        if (isOpen && !qrCodeDataUrl) {
            setIsGeneratingQR(true);
            QRCode.toDataURL(RONBOT_GPT_URL, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
                .then(qr => {
                    setQrCodeDataUrl(qr);
                    setIsGeneratingQR(false);
                })
                .catch(err => {
                    console.error('Error generating RonBot QR code:', err);
                    setQrCodeDataUrl(null);
                    setIsGeneratingQR(false);
                });
        }
    }, [isOpen, qrCodeDataUrl]);

    const handleOpenInBrowser = () => {
        window.open(RONBOT_GPT_URL, '_blank', 'noopener,noreferrer');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="RonBot Help" size="md">
            <div className="p-4 text-center">
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Open RonBot Helper within the browser or on your phone to answer player questions and troubleshoot tech support questions.
                    </p>
                </div>

                {/* QR Code Section */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                        Scan with your phone to open on mobile:
                    </p>

                    {isGeneratingQR ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Generating QR code...</span>
                        </div>
                    ) : qrCodeDataUrl ? (
                        <img
                            src={qrCodeDataUrl}
                            alt="QR Code for RonBot GPT Assistant"
                            className="mx-auto border border-gray-200 rounded"
                        />
                    ) : (
                        <div className="h-48 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-500">Failed to generate QR code</span>
                        </div>
                    )}
                </div>

                {/* Open in Browser Button */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={handleOpenInBrowser}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <ExternalLink size={18}/>
                        Open in Browser
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default RonBotHelpModal;
