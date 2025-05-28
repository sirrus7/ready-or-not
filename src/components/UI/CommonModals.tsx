// src/components/UI/CommonModals.tsx - Combine frequently used modals

import React from 'react';
import Modal from './Modal';
import {  AlertTriangle } from 'lucide-react';

// Team Join Info Modal
export const TeamJoinModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    joinUrl: string;
    qrCodeUrl?: string;
}> = ({ isOpen, onClose, joinUrl, qrCodeUrl }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Join Information">
        <div className="text-center space-y-4">
            <div className="bg-gray-100 p-3 rounded">
                <a href={joinUrl} target="_blank" className="text-blue-600 font-mono break-all">
                    {joinUrl}
                </a>
            </div>
            {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-48 h-48" />
            )}
        </div>
    </Modal>
);

// Team Codes Modal
export const TeamCodesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    teams: Array<{ id: string; name: string; passcode: string }>;
}> = ({ isOpen, onClose, teams }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Team Access Codes">
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {teams.map(team => (
                <div key={team.id} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{team.name}</span>
                    <span className="font-mono text-blue-600">{team.passcode}</span>
                </div>
            ))}
        </div>
    </Modal>
);

// Confirmation Modal
export const ConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'warning' }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-4">
            <div className="flex items-start space-x-3">
                <AlertTriangle className={`mt-1 ${variant === 'danger' ? 'text-red-500' : 'text-yellow-500'}`} />
                <p className="text-gray-700">{message}</p>
            </div>
            <div className="flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className={`px-4 py-2 rounded text-white ${
                        variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    </Modal>
);