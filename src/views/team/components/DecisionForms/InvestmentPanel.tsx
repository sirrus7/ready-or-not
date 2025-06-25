// src/views/team/components/DecisionForms/InvestmentPanel.tsx
// FIXED: Restored better UX - gray out unaffordable options, improved immediate purchase modal

import React, {useState} from 'react';
import {InvestmentOption} from '@shared/types';
import {CheckCircle, Zap, X} from 'lucide-react';
import {InvestmentDisplayUtils} from "@shared/utils/InvestmentDisplayUtils.ts";

interface InvestmentPanelProps {
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggle: (optionIndex: number, cost: number) => void;
    onImmediatePurchase: (optionIndex: number, cost: number) => Promise<void>;
    isSubmitting: boolean;
    immediatePurchases: string[];
}

// Simple modal component for immediate purchases
const ImmediatePurchaseModal: React.FC<{
    option: InvestmentOption;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isPurchasing: boolean;
}> = ({option, isOpen, onConfirm, onCancel, isPurchasing}) => {
    if (!isOpen || !option) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-600">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400"/>
                        Immediate Purchase
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white"
                        disabled={isPurchasing}
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400 mb-2">
                            ${(option.cost / 1000).toFixed(0)}K
                        </div>
                        <h4 className="text-lg font-semibold text-white mb-2">
                            {option.id}. {option.name}
                        </h4>
                        {option.description && (
                            <p className="text-sm text-gray-300 leading-relaxed">
                                {option.description}
                            </p>
                        )}
                    </div>

                    <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3">
                        <p className="text-sm text-yellow-200">
                            <strong>Immediate Purchase:</strong> This investment will be applied instantly
                            and cannot be undone. You'll receive the effects immediately.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 border-t border-gray-600">
                    <button
                        onClick={onCancel}
                        disabled={isPurchasing}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isPurchasing}
                        className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPurchasing ? (
                            <>
                                <div
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4"/>
                                Confirm Purchase
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const formatCurrency = (amount: number): string => {
    return `$${(amount / 1000).toFixed(0)}K`;
};

const InvestmentPanel: React.FC<InvestmentPanelProps> = ({
                                                             investmentOptions,
                                                             selectedInvestmentIds,
                                                             spentBudget,
                                                             investUpToBudget,
                                                             onInvestmentToggle,
                                                             onImmediatePurchase,
                                                             isSubmitting,
                                                             immediatePurchases
                                                         }) => {
    const [showImmediateModal, setShowImmediateModal] = useState<number | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const remainingBudget = investUpToBudget - spentBudget;

    const handleImmediatePurchaseConfirm = async () => {
        if (showImmediateModal === null) return;

        setIsPurchasing(true);
        try {
            const option = investmentOptions[showImmediateModal];
            await onImmediatePurchase(showImmediateModal, option.cost);
            setShowImmediateModal(null);
        } catch (error) {
            console.error('[InvestmentPanel] Immediate purchase failed:', error);
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Budget Display */}
            <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300">Remaining Budget:</span>
                    <span className={`text-lg font-bold ${
                        remainingBudget < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                        {formatCurrency(remainingBudget)}
                    </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    Total Budget: {formatCurrency(investUpToBudget)} | Spent: {formatCurrency(spentBudget)}
                </div>
            </div>

            {/* Investment Options */}
            <div className="space-y-3">
                {investmentOptions.map((opt, optionIndex) => {
                    const isSelected = selectedInvestmentIds.includes(opt.id);
                    const isImmediatePurchased = immediatePurchases.includes(opt.id);
                    const isImmediate = opt.is_immediate_purchase || false;
                    const isDisabled = isImmediatePurchased || isSubmitting;

                    // FIXED: Include immediate purchases as "selected" for checkbox display
                    const isChecked = isSelected || isImmediatePurchased;

                    // FIXED: Gray out if unaffordable (unless already selected or purchased)
                    const isUnaffordable = !isChecked && (remainingBudget < opt.cost);
                    const isInteractable = !isDisabled && !isUnaffordable;

                    return (
                        <div
                            key={opt.id}
                            className={`relative border-2 rounded-lg transition-all duration-200 ${
                                isImmediatePurchased
                                    ? 'border-green-400 bg-green-900/30 shadow-lg'  // Green for purchased immediate purchases
                                    : isDisabled
                                        ? 'border-gray-600 bg-gray-800/50 opacity-60'
                                        : isUnaffordable
                                            ? 'border-gray-600 bg-gray-800/30 opacity-50'
                                            : isChecked
                                                ? 'border-blue-400 bg-blue-900/30 shadow-lg'
                                                : 'border-gray-500 bg-gray-800/50 hover:bg-gray-700/50'
                            }`}
                        >
                            <label className={`flex items-start p-4 ${
                                isInteractable ? 'cursor-pointer' : 'cursor-not-allowed'
                            }`}>
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0 rounded disabled:opacity-50"
                                    checked={isChecked}
                                    disabled={!isInteractable}
                                    onChange={() => {
                                        if (!isInteractable) return;

                                        if (isImmediate && !isImmediatePurchased) {
                                            setShowImmediateModal(optionIndex);
                                        } else {
                                            onInvestmentToggle(optionIndex, opt.cost);
                                        }
                                    }}
                                />

                                {/* Investment Content */}
                                <div className="ml-4 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className={`font-medium ${
                                            isImmediatePurchased
                                                ? 'text-green-100'  // Green text for purchased immediate purchases
                                                : isUnaffordable
                                                    ? 'text-gray-400'
                                                    : 'text-white'
                                        }`}>
                                            {InvestmentDisplayUtils.getDisplayId(opt.id, true)}. {opt.name}
                                        </span>
                                        {isImmediate && !isImmediatePurchased && (
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-600">
                                                <Zap className="mr-1" size={12}/>
                                                Immediate
                                            </span>
                                        )}
                                        {isImmediatePurchased && (
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-600">
                                                <CheckCircle className="mr-1" size={12}/>
                                                Purchased
                                            </span>
                                        )}
                                    </div>

                                    {opt.description && (
                                        <p className={`text-xs leading-relaxed mb-2 ${
                                            isImmediatePurchased
                                                ? 'text-green-200'  // Green text for purchased immediate purchases
                                                : isUnaffordable
                                                    ? 'text-gray-500'
                                                    : 'text-gray-300'
                                        }`}>
                                            {opt.description}
                                        </p>
                                    )}

                                    {/* Next Step Notification for purchased Business Growth Strategy */}
                                    {isImmediatePurchased && opt.id === 'A' && (
                                        <div className="bg-green-800/30 rounded-lg p-3 mb-3">
                                            <p className="text-green-100 text-sm font-medium">
                                                📋 Next Step: Get your Business Growth Strategy Report from the host
                                            </p>
                                        </div>
                                    )}

                                    {/* Cost Display */}
                                    <div className="flex justify-between items-center">
                                        <span className={`text-lg font-bold ${
                                            isImmediatePurchased
                                                ? 'text-green-400'
                                                : isChecked
                                                    ? 'text-blue-200'
                                                    : isUnaffordable
                                                        ? 'text-gray-500'
                                                        : 'text-yellow-300'
                                        }`}>
                                            {formatCurrency(opt.cost)}
                                        </span>
                                        {isUnaffordable && !isChecked && (
                                            <span className="text-xs text-red-400 font-medium">
                                                Insufficient Budget
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </label>

                            {/* Selection Indicator */}
                            {isChecked && (
                                <div className="absolute top-2 right-2">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                        isImmediatePurchased ? 'bg-green-500' : 'bg-blue-500'
                                    }`}>
                                        <CheckCircle className="w-3 h-3 text-white"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Immediate Purchase Modal */}
            {showImmediateModal !== null && (
                <ImmediatePurchaseModal
                    option={investmentOptions[showImmediateModal]}
                    isOpen={true}
                    onConfirm={handleImmediatePurchaseConfirm}
                    onCancel={() => setShowImmediateModal(null)}
                    isPurchasing={isPurchasing}
                />
            )}
        </div>
    );
};

export default InvestmentPanel;
