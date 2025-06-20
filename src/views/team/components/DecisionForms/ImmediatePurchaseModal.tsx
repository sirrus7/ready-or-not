// src/views/team/components/DecisionForms/ImmediatePurchaseModal.tsx
// Modal component for immediate purchase confirmations (Strategy investments)

import React from 'react';
import {InvestmentOption} from '@shared/types';
import {Zap, FileText, AlertTriangle} from 'lucide-react';
import Modal from '@shared/components/UI/Modal';

interface ImmediatePurchaseModalProps {
    option: InvestmentOption;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isPurchasing: boolean;
}

const formatCurrency = (amount: number): string => {
    return `$${(amount / 1000).toFixed(0)}K`;
};

const ImmediatePurchaseModal: React.FC<ImmediatePurchaseModalProps> = ({
                                                                           option,
                                                                           isOpen,
                                                                           onConfirm,
                                                                           onCancel,
                                                                           isPurchasing
                                                                       }) => {
    if (!option) return null;

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title="Immediate Purchase">
            <div className="space-y-6">
                {/* Investment Header */}
                <div className="text-center pb-4 border-b border-gray-600">
                    <div className="flex items-center justify-center mb-3">
                        <div className="w-12 h-12 bg-yellow-900/50 rounded-full flex items-center justify-center">
                            <Zap className="w-6 h-6 text-yellow-400"/>
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        {option.id}. {option.name}
                    </h3>
                    <div className="text-2xl font-bold text-yellow-300">
                        {formatCurrency(option.cost)}
                    </div>
                </div>

                {/* Investment Description */}
                {option.description && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-300 leading-relaxed">
                            {option.description}
                        </p>
                    </div>
                )}

                {/* Immediate Purchase Benefits */}
                {option.immediate_purchase_message && (
                    <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <FileText className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"/>
                            <div>
                                <h4 className="font-medium text-blue-300 mb-2">Immediate Benefit:</h4>
                                <p className="text-blue-200 text-sm leading-relaxed">
                                    {option.immediate_purchase_message}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Information */}
                {option.report_name && (
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-green-400"/>
                            <div>
                                <h4 className="font-medium text-green-300">You'll Receive:</h4>
                                <p className="text-green-200 text-sm">
                                    {option.report_name}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Host Notification Info */}
                {option.host_notification_message && (
                    <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0"/>
                            <p className="text-orange-200 text-xs">
                                <strong>Note:</strong> Your host will be notified to deliver your report.
                            </p>
                        </div>
                    </div>
                )}

                {/* Purchase Warning */}
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"/>
                        <div>
                            <h4 className="font-medium text-yellow-300 mb-1">Important:</h4>
                            <ul className="text-yellow-200 text-sm space-y-1">
                                <li>• This purchase will be made immediately</li>
                                <li>• The cost will be deducted from your budget right away</li>
                                <li>• You cannot undo this purchase once confirmed</li>
                                <li>• The report will be delivered by your host</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                    <button
                        onClick={onCancel}
                        disabled={isPurchasing}
                        className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isPurchasing}
                        className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        {isPurchasing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Purchasing...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4"/>
                                <span>Confirm Purchase</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ImmediatePurchaseModal;
